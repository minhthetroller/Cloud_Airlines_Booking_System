import "server-only"

import { randomInt } from "crypto"
import { and, desc, eq, inArray, ne, sql } from "drizzle-orm"
import type { BookingDraft, GuestInformation } from "@/lib/booking/types"
import { db, type Db, type Tx } from "@/lib/db"
import { airplanes, bookings, customers, flightprices, flights, passengers, payments, seats, tickets } from "@/lib/db/schema"
import { loadDraft, patchDraft } from "@/lib/redis/booking-draft"
import { redis } from "@/lib/redis/client"
import { acquireSeatHolds, missingSeatHolds, releaseAllSeatHolds } from "@/lib/redis/seat-holds"
import type { SessionUser } from "./auth"
import { HttpError, isUniqueViolation } from "./http"

// How long a Pending booking keeps its seats while the customer pays
export const PAYMENT_WINDOW_MS = 30 * 60 * 1000
const PENDING_GRACE_MS = 5 * 60 * 1000

const SEAT_TAKEN_MESSAGE = "One or more selected seats are no longer available"
const REFERENCE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"

const generateBookingReference = () =>
  Array.from({ length: 6 }, () => REFERENCE_CHARS[randomInt(REFERENCE_CHARS.length)]).join("")

const generateTicketNumber = () => `CA${String(randomInt(10_000_000)).padStart(7, "0")}`

const toPassengerType = (value?: string): "Adult" | "Child" | "Infant" => {
  const v = (value || "").toLowerCase()
  return v === "child" ? "Child" : v === "infant" ? "Infant" : "Adult"
}

const emptyToNull = (value?: string | null) => (value && value.trim() ? value.trim() : null)

/**
 * Pending bookings past their payment deadline lose their seats: the booking becomes Expired
 * and its tickets Cancelled, which frees the (flight, seat) pairs in the partial unique index.
 */
export async function expireStaleBookings(executor: Db | Tx = db): Promise<void> {
  await executor.execute(sql`
    with expired as (
      update bookings set bookingstatus = 'Expired'
      where bookingstatus = 'Pending' and expiresat is not null and expiresat < now()
      returning bookingid
    ), cancelled_tickets as (
      update tickets set status = 'Cancelled'
      where bookingid in (select bookingid from expired) and status <> 'Cancelled'
      returning ticketid
    )
    update payments set paymentstatus = 'Expired'
    where bookingid in (select bookingid from expired) and paymentstatus = 'Pending'
  `)
}

/** Reuses the customer record of a known person, otherwise creates one. */
async function findOrCreateCustomer(tx: Tx, passenger: GuestInformation, primary: GuestInformation): Promise<number> {
  const identityCardNumber = emptyToNull(passenger.identityCardNumber)
  const passportNumber = emptyToNull(passenger.passportNumber)

  if (identityCardNumber) {
    const [existing] = await tx
      .select({ customerid: customers.customerid })
      .from(customers)
      .where(eq(customers.identitycardnumber, identityCardNumber))
      .limit(1)
    if (existing) return existing.customerid
  } else if (passportNumber) {
    const [existing] = await tx
      .select({ customerid: customers.customerid })
      .from(customers)
      .where(
        and(
          eq(customers.passportnumber, passportNumber),
          eq(customers.firstname, passenger.firstName),
          eq(customers.lastname, passenger.lastName),
        ),
      )
      .limit(1)
    if (existing) return existing.customerid
  }

  const [created] = await tx
    .insert(customers)
    .values({
      firstname: passenger.firstName,
      lastname: passenger.lastName,
      email: passenger.email || primary.email,
      phonenumber: passenger.phone || primary.phone,
      dateofbirth: emptyToNull(passenger.dateOfBirth),
      nationality: passenger.nationality,
      passportnumber: passportNumber,
      passportexpiry: emptyToNull(passenger.passportExpiry),
      identitycardnumber: identityCardNumber,
      pronoun: passenger.pronoun,
      gender: "Not specified",
      country: passenger.nationality,
      city: "Not specified",
    })
    .returning({ customerid: customers.customerid })
  return created.customerid
}

interface Leg {
  flightId: number
  price: number
  seatIds: number[]
}

function draftLegs(draft: BookingDraft): Leg[] {
  const count = draft.passengers.length
  if (!draft.flights.departure) throw new HttpError(400, "No flight selected")
  if (count === 0) throw new HttpError(400, "Passenger information is missing")

  const legs: Leg[] = [
    {
      flightId: draft.flights.departure.flightId,
      price: draft.flights.departure.price,
      seatIds: draft.seats.departure.map((s) => s.seatid),
    },
  ]
  if (draft.flights.return) {
    legs.push({
      flightId: draft.flights.return.flightId,
      price: draft.flights.return.price,
      seatIds: draft.seats.return.map((s) => s.seatid),
    })
  }

  for (const leg of legs) {
    if (leg.seatIds.length !== count || new Set(leg.seatIds).size !== count) {
      throw new HttpError(400, "Every passenger needs a seat on each flight")
    }
  }
  return legs
}

export interface CreatedBooking {
  bookingId: number
  bookingReference: string
  totalPrice: number
}

/**
 * Turns a booking draft into a Pending booking. Customers, booking, passengers and tickets are
 * written in one transaction, so a failure at any point leaves nothing behind.
 */
export async function createBooking(draftId: string, user: SessionUser | null): Promise<CreatedBooking> {
  // Guards against double submits of the same draft
  const lockKey = `bookinglock:${draftId}`
  if ((await redis.set(lockKey, "1", "EX", 30, "NX")) !== "OK") {
    throw new HttpError(409, "Your booking is already being processed")
  }

  try {
    const draft = await loadDraft(draftId)
    if (!draft) throw new HttpError(400, "Booking session has expired. Please start again.")

    if (draft.booking.bookingId) {
      const [existing] = await db.select().from(bookings).where(eq(bookings.bookingid, draft.booking.bookingId)).limit(1)
      if (existing && (existing.bookingstatus === "Pending" || existing.bookingstatus === "Confirmed")) {
        return {
          bookingId: existing.bookingid,
          bookingReference: existing.bookingreference,
          totalPrice: existing.totalprice,
        }
      }
      throw new HttpError(409, "This booking has expired. Please start a new booking.")
    }

    const legs = draftLegs(draft)
    const passengerCount = draft.passengers.length
    const primary = draft.passengers[0]

    // The draft must still own every seat lock. An expired lock is retaken if the seat is still free.
    for (const leg of legs) {
      const missing = await missingSeatHolds(draftId, leg.flightId, leg.seatIds)
      if (missing.length > 0) {
        const taken = await acquireSeatHolds(draftId, leg.flightId, missing)
        if (taken.length > 0) throw new HttpError(409, SEAT_TAKEN_MESSAGE, { conflictSeatIds: taken })
      }
    }

    let created: CreatedBooking
    try {
      created = await db.transaction(async (tx) => {
        await expireStaleBookings(tx)

        // Fares and seats are re-read from the database, the draft only says which ones were picked
        const priceRows = await tx
          .select({ flightid: flightprices.flightid, price: flightprices.price })
          .from(flightprices)
          .where(
            inArray(
              flightprices.flightid,
              legs.map((l) => l.flightId),
            ),
          )

        const seatClass = new Map<number, number>()
        for (const leg of legs) {
          if (!priceRows.some((p) => p.flightid === leg.flightId && p.price === leg.price)) {
            throw new HttpError(409, "The selected fare is no longer available. Please search again.")
          }
          const seatRows = await tx
            .select({ seatid: seats.seatid, classid: seats.classid })
            .from(seats)
            .innerJoin(airplanes, eq(airplanes.airplanetypeid, seats.airplanetypeid))
            .innerJoin(flights, eq(flights.airplaneid, airplanes.airplaneid))
            .where(and(eq(flights.flightid, leg.flightId), inArray(seats.seatid, leg.seatIds), ne(seats.seattype, "blocked")))
          if (seatRows.length !== leg.seatIds.length) throw new HttpError(400, "Invalid seat selection")
          seatRows.forEach((s) => seatClass.set(s.seatid, s.classid))
        }

        const totalPrice = legs.reduce((total, leg) => total + leg.price, 0) * passengerCount

        const customerIds: number[] = []
        for (let i = 0; i < passengerCount; i++) {
          const passenger = draft.passengers[i]
          const ownRecord = i === 0 && user && Number(passenger.customerId) === user.customerId
          customerIds.push(ownRecord ? user.customerId : await findOrCreateCustomer(tx, passenger, primary))
        }

        if (draft.contact) {
          await tx
            .update(customers)
            .set({
              contactname: draft.contact.contactName,
              contactemail: draft.contact.contactEmail,
              contactphone: draft.contact.contactPhone,
              addressline: draft.contact.address,
              city: draft.contact.city,
              country: draft.contact.country,
            })
            .where(eq(customers.customerid, customerIds[0]))
        }

        // Keep the reference the customer has already seen unless it is taken
        let bookingReference = draft.booking.bookingReference ?? ""
        for (let attempt = 0; ; attempt++) {
          if (/^[A-Z0-9]{6}$/.test(bookingReference)) {
            const [clash] = await tx
              .select({ bookingid: bookings.bookingid })
              .from(bookings)
              .where(eq(bookings.bookingreference, bookingReference))
              .limit(1)
            if (!clash) break
          }
          if (attempt >= 5) throw new Error("Could not allocate a booking reference")
          bookingReference = generateBookingReference()
        }

        const [booking] = await tx
          .insert(bookings)
          .values({
            bookingstatus: "Pending",
            totalprice: totalPrice,
            currencycode: "VND",
            bookingreference: bookingReference,
            userid: user?.userId ?? null,
            expiresat: new Date(Date.now() + PAYMENT_WINDOW_MS + PENDING_GRACE_MS),
          })
          .returning({ bookingid: bookings.bookingid })

        const passengerRows = await tx
          .insert(passengers)
          .values(
            customerIds.map((customerid, i) => ({
              customerid,
              bookingid: booking.bookingid,
              passengertype: toPassengerType(draft.passengers[i].passengerType),
            })),
          )
          .returning({ passengerid: passengers.passengerid })

        const ticketNumbers = new Set<string>()
        while (ticketNumbers.size < passengerCount * legs.length) ticketNumbers.add(generateTicketNumber())
        const numbers = [...ticketNumbers]

        // The partial unique index on (flightid, seatid) rejects a seat someone else already holds a ticket for
        await tx.insert(tickets).values(
          legs.flatMap((leg, legIndex) =>
            passengerRows.map((passenger, i) => ({
              bookingid: booking.bookingid,
              flightid: leg.flightId,
              passengerid: passenger.passengerid,
              seatid: leg.seatIds[i],
              classid: seatClass.get(leg.seatIds[i]) as number,
              status: "Pending" as const,
              ticketprice: leg.price,
              ticketnumber: numbers[legIndex * passengerCount + i],
            })),
          ),
        )

        return { bookingId: booking.bookingid, bookingReference, totalPrice }
      })
    } catch (err) {
      if (isUniqueViolation(err, "tickets_flight_seat_active_uq")) throw new HttpError(409, SEAT_TAKEN_MESSAGE)
      throw err
    }

    // Tickets now guard the seats, the temporary locks are no longer needed
    await releaseAllSeatHolds(draftId)
    await patchDraft(draftId, {
      booking: { ...created, paymentId: null },
    })

    return created
  } finally {
    await redis.del(lockKey)
  }
}

const flightTime = (value: string) => value.replace(" ", "T")

/** Tickets of a booking in the nested shape the pages and the confirmation email expect. */
export async function getTicketsForBooking(bookingId: number) {
  const rows = await db
    .select({ ticket: tickets, flight: flights, seat: seats, passenger: passengers, customer: customers })
    .from(tickets)
    .innerJoin(flights, eq(flights.flightid, tickets.flightid))
    .innerJoin(seats, eq(seats.seatid, tickets.seatid))
    .innerJoin(passengers, eq(passengers.passengerid, tickets.passengerid))
    .innerJoin(customers, eq(customers.customerid, passengers.customerid))
    .where(eq(tickets.bookingid, bookingId))
    .orderBy(tickets.ticketid)

  return rows.map(({ ticket, flight, seat, passenger, customer }) => ({
    ...ticket,
    flights: {
      ...flight,
      departuredatetime: flightTime(flight.departuredatetime),
      arrivaldatetime: flightTime(flight.arrivaldatetime),
    },
    seats: seat,
    passengers: { ...passenger, customers: customer },
  }))
}

export async function getBooking(bookingId: number) {
  const [booking] = await db.select().from(bookings).where(eq(bookings.bookingid, bookingId)).limit(1)
  return booking ?? null
}

export async function getLatestPayment(bookingId: number) {
  const [payment] = await db
    .select()
    .from(payments)
    .where(eq(payments.bookingid, bookingId))
    .orderBy(desc(payments.paymentdatetime), desc(payments.paymentid))
    .limit(1)
  return payment ?? null
}

/** Booking, tickets and latest payment, plus the address the confirmation was (or will be) sent to. */
export async function getBookingDetails(bookingId: number) {
  const booking = await getBooking(bookingId)
  if (!booking) return null
  const [ticketRows, payment] = await Promise.all([getTicketsForBooking(bookingId), getLatestPayment(bookingId)])
  const firstCustomer = ticketRows[0]?.passengers.customers
  return {
    booking,
    tickets: ticketRows,
    payment,
    contactEmail: firstCustomer?.contactemail || firstCustomer?.email || null,
  }
}

/** Public lookup by booking reference, checked against a passenger's last name. */
export async function lookupBooking(reference: string, lastName: string) {
  const [booking] = await db.select().from(bookings).where(eq(bookings.bookingreference, reference)).limit(1)
  if (!booking) throw new HttpError(404, "Booking not found. Please check your booking reference.")

  const names = await db
    .select({ lastname: customers.lastname })
    .from(passengers)
    .innerJoin(customers, eq(customers.customerid, passengers.customerid))
    .where(eq(passengers.bookingid, booking.bookingid))

  if (names.length === 0) throw new HttpError(404, "No passengers found for this booking.")
  if (!names.some((n) => n.lastname.toLowerCase() === lastName.toLowerCase())) {
    throw new HttpError(
      403,
      "The last name you entered does not match any passenger on this booking. Please check and try again.",
    )
  }

  const [ticketRows, payment] = await Promise.all([getTicketsForBooking(booking.bookingid), getLatestPayment(booking.bookingid)])
  return { booking, tickets: ticketRows, payment }
}

/** A user's bookings, newest first, each with its flights (two queries in total). */
export async function listUserBookings(userId: number, limit?: number) {
  const query = db
    .select()
    .from(bookings)
    .where(eq(bookings.userid, userId))
    .orderBy(desc(bookings.bookingdatetime))
  const bookingRows = await (limit ? query.limit(limit) : query)
  if (bookingRows.length === 0) return []

  const flightRows = await db
    .selectDistinct({ bookingid: tickets.bookingid, flight: flights })
    .from(tickets)
    .innerJoin(flights, eq(flights.flightid, tickets.flightid))
    .where(
      inArray(
        tickets.bookingid,
        bookingRows.map((b) => b.bookingid),
      ),
    )
    .orderBy(flights.departuredatetime)

  const flightsByBooking = new Map<number, Array<typeof flights.$inferSelect>>()
  for (const { bookingid, flight } of flightRows) {
    const list = flightsByBooking.get(bookingid) ?? []
    list.push({
      ...flight,
      departuredatetime: flightTime(flight.departuredatetime),
      arrivaldatetime: flightTime(flight.arrivaldatetime),
    })
    flightsByBooking.set(bookingid, list)
  }

  return bookingRows.map((booking) => ({ ...booking, flights: flightsByBooking.get(booking.bookingid) ?? [] }))
}

export async function assertBookingOwner(bookingId: number, userId: number) {
  const booking = await getBooking(bookingId)
  if (!booking || booking.userid !== userId) throw new HttpError(404, "Booking not found")
  return booking
}

/** Cancels a booking and frees its seats in one transaction. */
export async function cancelBooking(bookingId: number, status: "Cancelled" | "Expired" = "Cancelled") {
  await db.transaction(async (tx) => {
    await tx.update(bookings).set({ bookingstatus: status }).where(eq(bookings.bookingid, bookingId))
    await tx.update(tickets).set({ status: "Cancelled" }).where(eq(tickets.bookingid, bookingId))
    await tx
      .update(payments)
      .set({ paymentstatus: status })
      .where(and(eq(payments.bookingid, bookingId), eq(payments.paymentstatus, "Pending")))
  })
}
