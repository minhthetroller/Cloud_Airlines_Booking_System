import "server-only"

import { and, asc, eq, inArray, ne, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { airplanes, airplanetypes, flights, seats, tickets } from "@/lib/db/schema"
import { acquireSeatHolds, heldSeatIds, releaseSeatHolds } from "@/lib/redis/seat-holds"
import { expireStaleBookings } from "./bookings"
import { HttpError } from "./http"

export const SEAT_TAKEN_MESSAGE = "One or more selected seats are no longer available"

/** Seat ids on the flight that already belong to a live ticket. */
export async function soldSeatIds(flightId: number, among?: number[]): Promise<number[]> {
  const rows = await db
    .select({ seatid: tickets.seatid })
    .from(tickets)
    .where(
      and(
        eq(tickets.flightid, flightId),
        ne(tickets.status, "Cancelled"),
        among ? inArray(tickets.seatid, among) : undefined,
      ),
    )
  return rows.map((r) => r.seatid)
}

/** Seat layout of the flight's aircraft with each seat flagged as occupied when sold or held. */
export async function getSeatMap(flightId: number) {
  await expireStaleBookings()

  const [airplaneType] = await db
    .select({
      airplanetypeid: airplanetypes.airplanetypeid,
      modelname: airplanetypes.modelname,
      manufacturer: airplanetypes.manufacturer,
      totalseats: airplanetypes.totalseats,
    })
    .from(flights)
    .innerJoin(airplanes, eq(airplanes.airplaneid, flights.airplaneid))
    .innerJoin(airplanetypes, eq(airplanetypes.airplanetypeid, airplanes.airplanetypeid))
    .where(eq(flights.flightid, flightId))
    .limit(1)

  if (!airplaneType) throw new HttpError(404, "Flight not found")

  const [seatRows, sold, held] = await Promise.all([
    db.select().from(seats).where(eq(seats.airplanetypeid, airplaneType.airplanetypeid)).orderBy(asc(seats.seatid)),
    soldSeatIds(flightId),
    heldSeatIds(flightId),
  ])

  const occupied = new Set([...sold, ...held])

  return {
    airplaneType,
    seats: seatRows.map((seat) => ({ ...seat, isoccupied: occupied.has(seat.seatid) })),
  }
}

/** Number of the given seats that really exist on this flight's aircraft and can be booked. */
export async function countBookableSeats(flightId: number, seatIds: number[]): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(seats)
    .innerJoin(airplanes, eq(airplanes.airplanetypeid, seats.airplanetypeid))
    .innerJoin(flights, eq(flights.airplaneid, airplanes.airplaneid))
    .where(and(eq(flights.flightid, flightId), inArray(seats.seatid, seatIds), ne(seats.seattype, "blocked")))
  return row?.n ?? 0
}

/**
 * Temporarily locks seats for a booking draft. Nothing is written to Postgres.
 * `releaseSeatIds` lets a passenger swap seats: the old seat is freed once the new one is held.
 */
export async function holdSeats(draftId: string, flightId: number, seatIds: number[], releaseSeatIds: number[] = []) {
  const unique = [...new Set(seatIds)]
  if (unique.length > 0) {
    if ((await countBookableSeats(flightId, unique)) !== unique.length) {
      throw new HttpError(400, "Invalid seat selection")
    }

    await expireStaleBookings()
    const sold = await soldSeatIds(flightId, unique)
    if (sold.length > 0) throw new HttpError(409, SEAT_TAKEN_MESSAGE, { conflictSeatIds: sold })

    const taken = await acquireSeatHolds(draftId, flightId, unique)
    if (taken.length > 0) throw new HttpError(409, SEAT_TAKEN_MESSAGE, { conflictSeatIds: taken })
  }

  const toRelease = releaseSeatIds.filter((id) => !unique.includes(id))
  if (toRelease.length > 0) await releaseSeatHolds(draftId, flightId, toRelease)
}
