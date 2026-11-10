import { randomUUID } from "crypto"
import { eq, sql } from "drizzle-orm"
import { afterAll, beforeEach, describe, expect, it } from "vitest"
import { db, pool } from "@/lib/db"
import { bookings, payments, tickets, users } from "@/lib/db/schema"
import { redis } from "@/lib/redis/client"
import { acquireSeatHolds, heldSeatIds, missingSeatHolds, releaseSeatHolds } from "@/lib/redis/seat-holds"
import { cancelBooking, createBooking, expireStaleBookings } from "@/lib/server/bookings"
import { availabilityByClass } from "@/lib/server/flights"
import { completePayment } from "@/lib/server/payments"
import { getSeatMap, holdSeats } from "@/lib/server/seats"
import { count, FARE, type Fixture, makeDraft, resetFixture } from "./helpers"

let fx: Fixture

beforeEach(async () => {
  fx = await resetFixture()
})

afterAll(async () => {
  await redis.quit()
  await pool.end()
})

describe("seat holds (Redis)", () => {
  it("lets exactly one of many concurrent drafts hold a seat", async () => {
    const seatId = fx.seatIds[0]
    const results = await Promise.all(
      Array.from({ length: 20 }, () => acquireSeatHolds(randomUUID(), fx.flightId, [seatId])),
    )
    expect(results.filter((taken) => taken.length === 0)).toHaveLength(1)
    expect(await heldSeatIds(fx.flightId)).toEqual([seatId])
  })

  it("holds several seats all-or-nothing", async () => {
    const [a, b, c] = fx.seatIds
    await acquireSeatHolds("draft-1", fx.flightId, [b])
    expect(await acquireSeatHolds("draft-2", fx.flightId, [a, b, c])).toEqual([b])
    expect(await missingSeatHolds("draft-2", fx.flightId, [a, c])).toEqual([a, c])
  })

  it("only releases holds owned by the caller and expires on its own", async () => {
    const seatId = fx.seatIds[0]
    await acquireSeatHolds("owner", fx.flightId, [seatId])
    expect(await releaseSeatHolds("intruder", fx.flightId, [seatId])).toBe(0)
    expect(await heldSeatIds(fx.flightId)).toEqual([seatId])

    const ttl = await redis.pttl(`hold:${fx.flightId}:${seatId}`)
    expect(ttl).toBeGreaterThan(0)
    expect(ttl).toBeLessThanOrEqual(15 * 60 * 1000)

    await redis.del(`hold:${fx.flightId}:${seatId}`) // what expiry does
    expect(await acquireSeatHolds("next", fx.flightId, [seatId])).toEqual([])
  })

  it("shows held and sold seats as occupied without writing to Postgres", async () => {
    const [held, sold] = fx.seatIds
    await holdSeats("draft-1", fx.flightId, [held])
    const draftId = await makeDraft(fx.flightId, [sold], "sold")
    await createBooking(draftId, null)

    const map = await getSeatMap(fx.flightId)
    const occupied = map.seats.filter((s) => s.isoccupied).map((s) => s.seatid)
    expect(occupied.sort()).toEqual([held, sold].sort())
    expect(await count("tickets")).toBe(1)

    // 6 bookable seats, one sold and one held
    expect((await availabilityByClass([fx.flightId])).get(fx.flightId)).toEqual({ 1: 4 })
  })

  it("refuses holds on sold, blocked or foreign seats", async () => {
    const draftId = await makeDraft(fx.flightId, [fx.seatIds[0]], "a")
    await createBooking(draftId, null)
    await expect(holdSeats("other", fx.flightId, [fx.seatIds[0]])).rejects.toMatchObject({ status: 409 })
    await expect(holdSeats("other", fx.flightId, [fx.blockedSeatId])).rejects.toMatchObject({ status: 400 })
    await expect(holdSeats("other", fx.flightId, [999999])).rejects.toMatchObject({ status: 400 })
  })
})

describe("booking transaction", () => {
  it("writes customers, booking, passengers and tickets together", async () => {
    const seatIds = fx.seatIds.slice(0, 2)
    const draftId = await makeDraft(fx.flightId, seatIds, "p")
    await holdSeats(draftId, fx.flightId, seatIds)

    const created = await createBooking(draftId, null)

    expect(created.totalPrice).toBe(FARE * 2)
    const [booking] = await db.select().from(bookings).where(eq(bookings.bookingid, created.bookingId))
    expect(booking.bookingstatus).toBe("Pending")
    expect(booking.expiresat).not.toBeNull()
    expect(await count("passengers")).toBe(2)
    expect(await count("tickets", sql`status = 'Pending'`)).toBe(2)
    // The locks are handed over to the unique index
    expect(await heldSeatIds(fx.flightId)).toEqual([])
    // Submitting the same draft again returns the same booking
    expect((await createBooking(draftId, null)).bookingId).toBe(created.bookingId)
    expect(await count("bookings")).toBe(1)
  })

  it("books both legs of a round trip", async () => {
    const seatId = fx.seatIds[0]
    const draftId = await makeDraft(fx.flightId, [seatId], "rt", {
      flights: {
        departure: { flightId: fx.flightId, class: "economy", fareType: "Economy Saver", price: FARE },
        return: { flightId: fx.returnFlightId, class: "economy", fareType: "Economy Saver", price: FARE },
      },
      seats: {
        departure: [{ seatid: seatId, airplanetypeid: 1, seatnumber: "1A", classid: 1, seattype: "standard" }],
        return: [{ seatid: seatId, airplanetypeid: 1, seatnumber: "1A", classid: 1, seattype: "standard" }],
      },
    })
    const created = await createBooking(draftId, null)
    expect(created.totalPrice).toBe(FARE * 2)
    expect(await count("tickets")).toBe(2)
  })

  it("lets only one of two concurrent bookings take a seat", async () => {
    const seatId = fx.seatIds[0]
    const drafts = await Promise.all([makeDraft(fx.flightId, [seatId], "x"), makeDraft(fx.flightId, [seatId], "y")])

    const results = await Promise.allSettled(drafts.map((id) => createBooking(id, null)))

    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1)
    const rejected = results.find((r) => r.status === "rejected") as PromiseRejectedResult
    expect(rejected.reason.status).toBe(409)
    expect(await count("bookings")).toBe(1)
    expect(await count("tickets")).toBe(1)
  })

  it("rolls everything back when the unique index rejects a seat", async () => {
    const [free, contested] = fx.seatIds
    await createBooking(await makeDraft(fx.flightId, [contested], "first"), null)
    const before = { customers: await count("customers"), bookings: await count("bookings") }

    // Second draft: its first passenger would insert fine, the second seat is already ticketed
    const draftId = await makeDraft(fx.flightId, [free, contested], "late")
    await expect(createBooking(draftId, null)).rejects.toMatchObject({ status: 409 })

    expect(await count("customers")).toBe(before.customers)
    expect(await count("bookings")).toBe(before.bookings)
    expect(await count("passengers")).toBe(1)
    expect(await count("tickets")).toBe(1)
  })

  it("rejects a fare that does not exist for the flight", async () => {
    const draftId = await makeDraft(fx.flightId, [fx.seatIds[0]], "cheap", {
      flights: {
        departure: { flightId: fx.flightId, class: "economy", fareType: "Economy Saver", price: 1 },
        return: null,
      },
    })
    await expect(createBooking(draftId, null)).rejects.toMatchObject({ status: 409 })
    expect(await count("bookings")).toBe(0)
    expect(await count("customers")).toBe(1) // only the fixture user
  })

  it("frees the seats of an expired pending booking", async () => {
    const seatId = fx.seatIds[0]
    const first = await createBooking(await makeDraft(fx.flightId, [seatId], "slow"), null)
    await db.insert(payments).values({ bookingid: first.bookingId, amount: FARE })
    await db
      .update(bookings)
      .set({ expiresat: new Date(Date.now() - 1000) })
      .where(eq(bookings.bookingid, first.bookingId))

    await expireStaleBookings()

    const [expired] = await db.select().from(bookings).where(eq(bookings.bookingid, first.bookingId))
    expect(expired.bookingstatus).toBe("Expired")
    expect(await count("payments", sql`paymentstatus = 'Expired'`)).toBe(1)

    const second = await createBooking(await makeDraft(fx.flightId, [seatId], "fast"), null)
    expect(second.bookingId).not.toBe(first.bookingId)
    expect(await count("tickets", sql`status <> 'Cancelled'`)).toBe(1)
  })

  it("frees the seats of a cancelled booking", async () => {
    const seatId = fx.seatIds[0]
    const first = await createBooking(await makeDraft(fx.flightId, [seatId], "c1"), null)
    await cancelBooking(first.bookingId)
    expect((await getSeatMap(fx.flightId)).seats.some((s) => s.isoccupied)).toBe(false)
    await createBooking(await makeDraft(fx.flightId, [seatId], "c2"), null)
    expect(await count("tickets", sql`status = 'Pending'`)).toBe(1)
  })
})

describe("payment completion", () => {
  const user = () => ({ userId: fx.userId, customerId: 1, email: "test@example.com", role: "user" })

  it("confirms the booking and credits points exactly once", async () => {
    const created = await createBooking(await makeDraft(fx.flightId, fx.seatIds.slice(0, 2), "pay"), user())
    const [payment] = await db.insert(payments).values({ bookingid: created.bookingId, amount: created.totalPrice }).returning()

    const first = await completePayment(payment.paymentid, "pi_123")
    const second = await completePayment(payment.paymentid, "pi_123")

    expect(first).toMatchObject({ alreadyProcessed: false, confirmed: true })
    expect(second.alreadyProcessed).toBe(true)

    const [booking] = await db.select().from(bookings).where(eq(bookings.bookingid, created.bookingId))
    expect(booking.bookingstatus).toBe("Confirmed")
    expect(await count("tickets", sql`status = 'Confirmed'`)).toBe(2)
    const [account] = await db.select().from(users).where(eq(users.userid, fx.userId))
    expect(account.pointsavailable).toBe(Math.floor((FARE * 2) / 500000))
  })

  it("processes concurrent webhook deliveries once", async () => {
    const created = await createBooking(await makeDraft(fx.flightId, [fx.seatIds[0]], "dup"), user())
    const [payment] = await db.insert(payments).values({ bookingid: created.bookingId, amount: created.totalPrice }).returning()

    const results = await Promise.all(Array.from({ length: 5 }, () => completePayment(payment.paymentid, "pi_dup")))

    expect(results.filter((r) => !r.alreadyProcessed)).toHaveLength(1)
    const [account] = await db.select().from(users).where(eq(users.userid, fx.userId))
    expect(account.pointsavailable).toBe(Math.floor(FARE / 500000))
  })

  it("does not confirm a late payment whose seat was resold", async () => {
    const seatId = fx.seatIds[0]
    const late = await createBooking(await makeDraft(fx.flightId, [seatId], "late"), null)
    const [payment] = await db.insert(payments).values({ bookingid: late.bookingId, amount: late.totalPrice }).returning()
    await db.update(bookings).set({ expiresat: new Date(Date.now() - 1000) }).where(eq(bookings.bookingid, late.bookingId))
    await createBooking(await makeDraft(fx.flightId, [seatId], "new"), null) // expires the first booking

    const result = await completePayment(payment.paymentid, "pi_late")

    expect(result.confirmed).toBe(false)
    const [booking] = await db.select().from(bookings).where(eq(bookings.bookingid, late.bookingId))
    expect(booking.bookingstatus).toBe("Expired")
    expect(await count("payments", sql`paymentstatus = 'Completed'`)).toBe(1)
    expect(await db.select().from(tickets).where(eq(tickets.status, "Pending"))).toHaveLength(1)
  })
})
