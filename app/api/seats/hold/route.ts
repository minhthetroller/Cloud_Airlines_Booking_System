import { z } from "zod"
import { ensureDraftId, getDraftId } from "@/lib/redis/booking-draft"
import { releaseAllSeatHolds, releaseSeatHolds } from "@/lib/redis/seat-holds"
import { readJson, route } from "@/lib/server/http"
import { holdSeats } from "@/lib/server/seats"

const seatIds = z.array(z.number().int().positive()).max(20)

const holdBody = z.object({
  flightId: z.number().int().positive(),
  seatIds,
  // Seats to free once the new ones are held (a passenger changing seat)
  releaseSeatIds: seatIds.optional(),
})

const releaseBody = z.object({
  flightId: z.number().int().positive().optional(),
  seatIds: seatIds.optional(),
})

// Temporarily lock seats for the current booking draft
export const POST = route(async (request) => {
  const { flightId, seatIds, releaseSeatIds } = holdBody.parse(await readJson(request))
  const draftId = await ensureDraftId()
  await holdSeats(draftId, flightId, seatIds, releaseSeatIds)
  return { success: true }
})

// Release some seats of a flight, or every seat held by the draft when no body is given
export const DELETE = route(async (request) => {
  const draftId = await getDraftId()
  if (!draftId) return { success: true }

  const { flightId, seatIds } = releaseBody.parse(await request.json().catch(() => ({})))
  if (flightId && seatIds) await releaseSeatHolds(draftId, flightId, seatIds)
  else await releaseAllSeatHolds(draftId)
  return { success: true }
})
