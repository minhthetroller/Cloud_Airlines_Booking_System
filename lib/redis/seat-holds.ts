import "server-only"

import { redis } from "./client"

// A seat hold is a temporary lock owned by one booking draft.
//   hold:{flightId}:{seatId}  -> draftId, expires on its own (the lock itself)
//   holds:{draftId}           -> set of "flightId:seatId" owned by the draft
//   flightholds:{flightId}    -> sorted set seatId -> expiry ms, to list held seats without scanning
export const HOLD_TTL_MS = 15 * 60 * 1000

const holdKey = (flightId: number, seatId: number) => `hold:${flightId}:${seatId}`
const ownerKey = (draftId: string) => `holds:${draftId}`
const flightKey = (flightId: number) => `flightholds:${flightId}`

// All-or-nothing: if any seat is held by someone else nothing is taken.
// ARGV: draftId, ttlMs, nowMs, flightId, seatId...
const ACQUIRE = `
local owner, ttl, now, flight = ARGV[1], tonumber(ARGV[2]), tonumber(ARGV[3]), ARGV[4]
local taken = {}
for i = 5, #ARGV do
  local current = redis.call('GET', 'hold:' .. flight .. ':' .. ARGV[i])
  if current and current ~= owner then taken[#taken + 1] = ARGV[i] end
end
if #taken > 0 then return taken end
for i = 5, #ARGV do
  redis.call('SET', 'hold:' .. flight .. ':' .. ARGV[i], owner, 'PX', ttl)
  redis.call('SADD', 'holds:' .. owner, flight .. ':' .. ARGV[i])
  redis.call('ZADD', 'flightholds:' .. flight, now + ttl, ARGV[i])
end
redis.call('PEXPIRE', 'holds:' .. owner, ttl)
redis.call('PEXPIRE', 'flightholds:' .. flight, ttl)
return {}
`

// Releases only holds still owned by the draft. ARGV: draftId, "flightId:seatId"... (none = everything)
const RELEASE = `
local owner = ARGV[1]
local members = {}
if #ARGV == 1 then
  members = redis.call('SMEMBERS', 'holds:' .. owner)
else
  for i = 2, #ARGV do members[#members + 1] = ARGV[i] end
end
local released = 0
for _, member in ipairs(members) do
  local sep = string.find(member, ':', 1, true)
  local flight, seat = string.sub(member, 1, sep - 1), string.sub(member, sep + 1)
  if redis.call('GET', 'hold:' .. member) == owner then
    redis.call('DEL', 'hold:' .. member)
    redis.call('ZREM', 'flightholds:' .. flight, seat)
    released = released + 1
  end
  redis.call('SREM', 'holds:' .. owner, member)
end
return released
`

// Pushes the expiry of every hold the draft still owns. ARGV: draftId, ttlMs, nowMs
const EXTEND = `
local owner, ttl, now = ARGV[1], tonumber(ARGV[2]), tonumber(ARGV[3])
local extended = 0
for _, member in ipairs(redis.call('SMEMBERS', 'holds:' .. owner)) do
  local sep = string.find(member, ':', 1, true)
  local flight, seat = string.sub(member, 1, sep - 1), string.sub(member, sep + 1)
  if redis.call('GET', 'hold:' .. member) == owner then
    redis.call('PEXPIRE', 'hold:' .. member, ttl)
    redis.call('ZADD', 'flightholds:' .. flight, now + ttl, seat)
    if redis.call('PTTL', 'flightholds:' .. flight) < ttl then redis.call('PEXPIRE', 'flightholds:' .. flight, ttl) end
    extended = extended + 1
  else
    redis.call('SREM', 'holds:' .. owner, member)
  end
end
if extended > 0 then redis.call('PEXPIRE', 'holds:' .. owner, ttl) end
return extended
`

/** Returns the seat ids that could not be held (empty array = every seat is now held by the draft). */
export async function acquireSeatHolds(draftId: string, flightId: number, seatIds: number[]): Promise<number[]> {
  if (seatIds.length === 0) return []
  const taken = (await redis.eval(ACQUIRE, 0, draftId, HOLD_TTL_MS, Date.now(), flightId, ...seatIds)) as string[]
  return taken.map(Number)
}

export async function releaseSeatHolds(draftId: string, flightId: number, seatIds: number[]): Promise<number> {
  if (seatIds.length === 0) return 0
  return (await redis.eval(RELEASE, 0, draftId, ...seatIds.map((id) => `${flightId}:${id}`))) as number
}

export async function releaseAllSeatHolds(draftId: string): Promise<number> {
  return (await redis.eval(RELEASE, 0, draftId)) as number
}

export async function extendSeatHolds(draftId: string, ttlMs = HOLD_TTL_MS): Promise<number> {
  return (await redis.eval(EXTEND, 0, draftId, ttlMs, Date.now())) as number
}

/** Seat ids from the list that the draft does not currently hold. */
export async function missingSeatHolds(draftId: string, flightId: number, seatIds: number[]): Promise<number[]> {
  if (seatIds.length === 0) return []
  const owners = await redis.mget(seatIds.map((id) => holdKey(flightId, id)))
  return seatIds.filter((_, i) => owners[i] !== draftId)
}

/** Seat ids currently held on each flight, by anyone. */
export async function heldSeatIdsByFlight(flightIds: number[]): Promise<Map<number, number[]>> {
  const result = new Map<number, number[]>()
  if (flightIds.length === 0) return result
  const now = Date.now()
  const pipeline = redis.pipeline()
  for (const flightId of flightIds) {
    pipeline.zremrangebyscore(flightKey(flightId), "-inf", now)
    pipeline.zrangebyscore(flightKey(flightId), now, "+inf")
  }
  const replies = (await pipeline.exec()) ?? []
  flightIds.forEach((flightId, i) => {
    const [, members] = replies[i * 2 + 1] ?? []
    result.set(flightId, ((members as string[]) ?? []).map(Number))
  })
  return result
}

export async function heldSeatIds(flightId: number): Promise<number[]> {
  return (await heldSeatIdsByFlight([flightId])).get(flightId) ?? []
}

export const seatHoldKeys = { holdKey, ownerKey, flightKey }
