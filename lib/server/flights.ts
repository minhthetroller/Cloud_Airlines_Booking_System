import "server-only"

import { asc, ne, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { airports, ticketclasses } from "@/lib/db/schema"
import { heldSeatIdsByFlight } from "@/lib/redis/seat-holds"
import { expireStaleBookings } from "./bookings"

const ECONOMY_CLASS_IDS = [1, 2, 3]
const FIRST_CLASS_IDS = [4, 5]

const idList = (ids: number[]) =>
  sql.join(
    ids.map((id) => sql`${id}`),
    sql`, `,
  )

export async function listAirports(exclude?: string | null) {
  const query = db
    .select({
      airportcode: airports.airportcode,
      airportname: airports.airportname,
      city: airports.city,
      country: airports.country,
    })
    .from(airports)
  return exclude ? query.where(ne(airports.airportcode, exclude)).orderBy(asc(airports.city)) : query.orderBy(asc(airports.city))
}

export async function listTicketClasses() {
  return db.select().from(ticketclasses).orderBy(asc(ticketclasses.classid))
}

/**
 * Free seats per class for each flight: seats of the aircraft type, minus seats with a live
 * ticket (one grouped query), minus seats currently held in Redis.
 */
export async function availabilityByClass(flightIds: number[]): Promise<Map<number, Record<number, number>>> {
  const result = new Map<number, Record<number, number>>()
  if (flightIds.length === 0) return result

  const { rows } = await db.execute<{ flightid: number; classid: number; free: number }>(sql`
    select f.flightid, s.classid, (count(*) - count(t.ticketid))::int as free
    from flights f
    join airplanes a on a.airplaneid = f.airplaneid
    join seats s on s.airplanetypeid = a.airplanetypeid and s.seattype <> 'blocked'
    left join tickets t on t.flightid = f.flightid and t.seatid = s.seatid and t.status <> 'Cancelled'
    where f.flightid in (${idList(flightIds)})
    group by f.flightid, s.classid
  `)
  for (const row of rows) {
    const byClass = result.get(row.flightid) ?? {}
    byClass[row.classid] = row.free
    result.set(row.flightid, byClass)
  }

  const held = await heldSeatIdsByFlight(flightIds)
  const heldSeatIds = [...new Set([...held.values()].flat())]
  if (heldSeatIds.length > 0) {
    // Seats that are both held and ticketed were already subtracted above
    const { rows: heldRows } = await db.execute<{ flightid: number; classid: number; held: number }>(sql`
      select h.flightid, s.classid, count(*)::int as held
      from (values ${sql.join(
        [...held.entries()].flatMap(([flightId, ids]) => ids.map((seatId) => sql`(${flightId}::int, ${seatId}::int)`)),
        sql`, `,
      )}) as h(flightid, seatid)
      join seats s on s.seatid = h.seatid and s.seattype <> 'blocked'
      where not exists (
        select 1 from tickets t
        where t.flightid = h.flightid and t.seatid = h.seatid and t.status <> 'Cancelled'
      )
      group by h.flightid, s.classid
    `)
    for (const row of heldRows) {
      const byClass = result.get(row.flightid)
      if (byClass) byClass[row.classid] = Math.max(0, (byClass[row.classid] ?? 0) - row.held)
    }
  }

  return result
}

const sum = (byClass: Record<number, number> | undefined, classIds: number[]) =>
  classIds.reduce((total, id) => total + (byClass?.[id] ?? 0), 0)

/** Flights on one route and day, each with its lowest fares and remaining seats. */
export async function searchFlights(from: string, to: string, date: string) {
  await expireStaleBookings()

  const { rows } = await db.execute<{
    flightid: number
    flightnumber: string
    departureairportcode: string
    arrivalairportcode: string
    departuredatetime: string
    arrivaldatetime: string
    status: string
    travelmiles: number | null
    airplaneid: number
    airplanetypeid: number
    economyPrice: number | null
    firstClassPrice: number | null
  }>(sql`
    select
      f.flightid, f.flightnumber, f.departureairportcode, f.arrivalairportcode,
      to_char(f.departuredatetime, 'YYYY-MM-DD"T"HH24:MI:SS') as departuredatetime,
      to_char(f.arrivaldatetime, 'YYYY-MM-DD"T"HH24:MI:SS') as arrivaldatetime,
      f.status, f.travelmiles, f.airplaneid, a.airplanetypeid,
      min(p.price) filter (where p.classid in (${idList(ECONOMY_CLASS_IDS)}))::float8 as "economyPrice",
      min(p.price) filter (where p.classid in (${idList(FIRST_CLASS_IDS)}))::float8 as "firstClassPrice"
    from flights f
    join airplanes a on a.airplaneid = f.airplaneid
    left join flightprices p on p.flightid = f.flightid
    where f.departureairportcode = ${from}
      and f.arrivalairportcode = ${to}
      and f.departuredatetime >= ${date}::date
      and f.departuredatetime < ${date}::date + 1
    group by f.flightid, a.airplanetypeid
    order by f.departuredatetime
  `)

  const availability = await availabilityByClass(rows.map((r) => r.flightid))

  return rows.map((flight) => ({
    ...flight,
    economyAvailability: sum(availability.get(flight.flightid), ECONOMY_CLASS_IDS),
    firstClassAvailability: sum(availability.get(flight.flightid), FIRST_CLASS_IDS),
  }))
}

/** Lowest fare and flight count per day for the date strip, in one query. */
export async function datePrices(from: string, to: string, start: string, days: number, classId: number) {
  const { rows } = await db.execute<{ date: string; price: number | null; flightCount: number }>(sql`
    select
      to_char(f.departuredatetime, 'YYYY-MM-DD') as date,
      min(p.price)::float8 as price,
      count(distinct f.flightid)::int as "flightCount"
    from flights f
    left join flightprices p on p.flightid = f.flightid and p.classid = ${classId}
    where f.departureairportcode = ${from}
      and f.arrivalairportcode = ${to}
      and f.departuredatetime >= ${start}::date
      and f.departuredatetime < ${start}::date + ${days}::int
    group by 1
  `)
  return rows
}

/** Fares of one flight for the fare picker: price and free seats per class, plus mileage. */
export async function fareOptions(flightId: number, classIds: number[]) {
  const { rows } = await db.execute<{ travelmiles: number | null; classid: number | null; price: number | null; currencycode: string | null }>(sql`
    select f.travelmiles, p.classid, p.price::float8 as price, p.currencycode
    from flights f
    left join flightprices p on p.flightid = f.flightid and p.classid in (${idList(classIds)})
    where f.flightid = ${flightId}
  `)
  if (rows.length === 0) return null

  const availability = (await availabilityByClass([flightId])).get(flightId) ?? {}

  return {
    travelmiles: rows[0].travelmiles,
    fares: rows
      .filter((r) => r.classid !== null)
      .map((r) => ({
        classid: r.classid as number,
        price: r.price as number,
        currencycode: r.currencycode,
        availability: availability[r.classid as number] ?? 0,
      })),
  }
}
