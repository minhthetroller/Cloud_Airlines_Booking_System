import { randomUUID } from "crypto"
import { sql } from "drizzle-orm"
import { type BookingDraft, emptyDraft, type GuestInformation } from "@/lib/booking/types"
import { db } from "@/lib/db"
import * as schema from "@/lib/db/schema"
import { patchDraft } from "@/lib/redis/booking-draft"
import { redis } from "@/lib/redis/client"

export const FARE = 1500000

export interface Fixture {
  flightId: number
  returnFlightId: number
  seatIds: number[]
  blockedSeatId: number
  userId: number
}

/** Wipes both stores and creates one aircraft, two flights and one user. */
export async function resetFixture(): Promise<Fixture> {
  await redis.flushdb()
  await db.execute(sql`
    truncate table payments, tickets, passengers, bookings, sessions, users, customers,
      flightprices, flights, seats, airplanes, airplanetypes, ticketclasses, airports
    restart identity cascade
  `)

  await db.insert(schema.airports).values([
    { airportcode: "HAN", airportname: "Noi Bai", city: "Hanoi", country: "Vietnam" },
    { airportcode: "SGN", airportname: "Tan Son Nhat", city: "Ho Chi Minh City", country: "Vietnam" },
  ])
  await db.insert(schema.ticketclasses).values([1, 2, 3, 4, 5].map((classid) => ({ classid, classname: `Class ${classid}` })))
  const [type] = await db
    .insert(schema.airplanetypes)
    .values({ modelname: "A321", manufacturer: "Airbus", totalseats: 7 })
    .returning()
  const seatRows = await db
    .insert(schema.seats)
    .values([
      ...["1A", "1B", "1C", "1D", "1E", "1F"].map((seatnumber) => ({
        airplanetypeid: type.airplanetypeid,
        seatnumber,
        classid: 1,
        seattype: "standard",
      })),
      { airplanetypeid: type.airplanetypeid, seatnumber: "3A", classid: 1, seattype: "blocked" },
    ])
    .returning()
  const [plane] = await db.insert(schema.airplanes).values({ airplanetypeid: type.airplanetypeid }).returning()
  const flightRows = await db
    .insert(schema.flights)
    .values([
      {
        flightnumber: "CA100",
        departureairportcode: "HAN",
        arrivalairportcode: "SGN",
        departuredatetime: "2030-01-10 06:00:00",
        arrivaldatetime: "2030-01-10 08:10:00",
        travelmiles: 716,
        airplaneid: plane.airplaneid,
      },
      {
        flightnumber: "CA110",
        departureairportcode: "SGN",
        arrivalairportcode: "HAN",
        departuredatetime: "2030-01-12 08:45:00",
        arrivaldatetime: "2030-01-12 10:55:00",
        travelmiles: 716,
        airplaneid: plane.airplaneid,
      },
    ])
    .returning()
  await db
    .insert(schema.flightprices)
    .values(flightRows.map((f) => ({ flightid: f.flightid, classid: 1, price: FARE, currencycode: "VND" })))

  const [customer] = await db.insert(schema.customers).values({ firstname: "Test", lastname: "User", email: "test@example.com" }).returning()
  const [user] = await db
    .insert(schema.users)
    .values({ customerid: customer.customerid, username: "test@example.com", accountstatus: "verified" })
    .returning()

  return {
    flightId: flightRows[0].flightid,
    returnFlightId: flightRows[1].flightid,
    seatIds: seatRows.filter((s) => s.seattype !== "blocked").map((s) => s.seatid),
    blockedSeatId: seatRows[seatRows.length - 1].seatid,
    userId: user.userid,
  }
}

export function passenger(tag: string): GuestInformation {
  return {
    firstName: `First${tag}`,
    lastName: `Last${tag}`,
    email: `${tag}@example.com`,
    phone: "0900000000",
    dateOfBirth: "1990-01-01",
    nationality: "Vietnam",
    passportNumber: `P${tag}`,
    passportExpiry: "2035-01-01",
    identityCardNumber: "",
    pronoun: "Mr.",
    passengerType: "adult",
  }
}

const seat = (seatid: number) => ({ seatid, airplanetypeid: 1, seatnumber: "", classid: 1, seattype: "standard" })

/** Stores a booking draft for one flight in Redis and returns its id. */
export async function makeDraft(flightId: number, seatIds: number[], tag: string, overrides: Partial<BookingDraft> = {}) {
  const draftId = randomUUID()
  await patchDraft(draftId, {
    ...emptyDraft,
    search: { adults: seatIds.length, children: 0, infants: 0, travelClass: "economy" },
    flights: {
      departure: { flightId, class: "economy", fareType: "Economy Saver", price: FARE },
      return: null,
    },
    seats: { departure: seatIds.map(seat), return: [] },
    passengers: seatIds.map((_, i) => passenger(`${tag}${i}`)),
    ...overrides,
  })
  return draftId
}

export async function count(table: "bookings" | "customers" | "passengers" | "tickets" | "payments", where = sql`true`) {
  const { rows } = await db.execute<{ n: number }>(sql`select count(*)::int as n from ${sql.identifier(table)} where ${where}`)
  return rows[0].n
}
