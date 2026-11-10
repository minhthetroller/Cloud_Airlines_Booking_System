import "server-only"

import { and, eq, sql } from "drizzle-orm"
import { CURRENCY } from "@/config"
import { db } from "@/lib/db"
import { bookings, payments, tickets, users } from "@/lib/db/schema"
import { loadDraft, patchDraft } from "@/lib/redis/booking-draft"
import { stripe } from "@/lib/stripe/stripe"
import { formatAmountForStripeFromVND } from "@/utils/stripe-helpers"
import { expireStaleBookings, PAYMENT_WINDOW_MS } from "./bookings"
import { HttpError, isUniqueViolation } from "./http"

// 500,000 VND = 1 point
const VND_PER_POINT = 500000

/**
 * Starts a Stripe Checkout attempt for a Pending booking. Each attempt gets its own payment row,
 * so a cancelled attempt can be retried while the booking is still within its payment window.
 */
export async function startCheckout(draftId: string, bookingId: number, origin: string) {
  await expireStaleBookings()

  const payment = await db.transaction(async (tx) => {
    const [booking] = await tx.select().from(bookings).where(eq(bookings.bookingid, bookingId)).for("update")
    if (!booking) throw new HttpError(404, "Booking not found")
    if (booking.bookingstatus !== "Pending") {
      throw new HttpError(409, "Payment session has expired. Please try booking again.")
    }

    await tx
      .update(payments)
      .set({ paymentstatus: "Cancelled" })
      .where(and(eq(payments.bookingid, bookingId), eq(payments.paymentstatus, "Pending")))

    const [created] = await tx
      .insert(payments)
      .values({
        bookingid: bookingId,
        amount: booking.totalprice,
        currencycode: "VND",
        paymentmethod: "Credit Card",
        paymentstatus: "Pending",
      })
      .returning()
    return created
  })

  // Stripe requires at least 30 minutes; the booking outlives the session slightly so a
  // payment made in the last seconds still finds its seats.
  const expiresAt = Math.floor((Date.now() + PAYMENT_WINDOW_MS) / 1000) + 60

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      submit_type: "pay",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: CURRENCY,
            product_data: {
              name: "Airline Ticket",
              description: `Booking ID: ${bookingId}`,
            },
            unit_amount: formatAmountForStripeFromVND(payment.amount),
          },
        },
      ],
      payment_method_types: ["card"],
      metadata: { bookingId: String(bookingId), paymentId: String(payment.paymentid) },
      success_url: `${origin}/ticket-confirmation?session_id={CHECKOUT_SESSION_ID}&payment_status=success`,
      cancel_url: `${origin}/payment?payment_status=cancelled`,
      automatic_tax: { enabled: false },
      billing_address_collection: "auto",
      customer_creation: "if_required",
      ui_mode: "hosted",
      expires_at: expiresAt,
    })

    await db.transaction(async (tx) => {
      await tx.update(payments).set({ stripesessionid: session.id }).where(eq(payments.paymentid, payment.paymentid))
      await tx
        .update(bookings)
        .set({ expiresat: new Date(expiresAt * 1000 + 2 * 60 * 1000) })
        .where(and(eq(bookings.bookingid, bookingId), eq(bookings.bookingstatus, "Pending")))
    })

    const draft = await loadDraft(draftId)
    if (draft) await patchDraft(draftId, { booking: { ...draft.booking, paymentId: payment.paymentid } })

    return { url: session.url, client_secret: session.client_secret, paymentId: payment.paymentid }
  } catch (err) {
    await db.update(payments).set({ paymentstatus: "Cancelled" }).where(eq(payments.paymentid, payment.paymentid))
    throw err
  }
}

export interface CompletedPayment {
  alreadyProcessed: boolean
  bookingId: number
  confirmed: boolean
}

/**
 * Applies a successful Stripe payment: payment Completed, booking and tickets Confirmed and
 * loyalty points credited, all in one transaction. Safe to call more than once per payment.
 */
export async function completePayment(paymentId: number, transactionId: string | null): Promise<CompletedPayment> {
  return db.transaction(async (tx) => {
    const [payment] = await tx.select().from(payments).where(eq(payments.paymentid, paymentId)).for("update")
    if (!payment) throw new HttpError(404, "Payment not found")

    if (payment.paymentstatus === "Completed") {
      return { alreadyProcessed: true, bookingId: payment.bookingid, confirmed: true }
    }

    await tx
      .update(payments)
      .set({ paymentmethod: "Credit Card", paymentstatus: "Completed", transactionid: transactionId })
      .where(eq(payments.paymentid, paymentId))

    const [booking] = await tx.select().from(bookings).where(eq(bookings.bookingid, payment.bookingid)).for("update")

    let confirmed = true
    try {
      // Savepoint: if the booking had already expired and a seat was resold, only this part is undone
      await tx.transaction(async (sp) => {
        await sp
          .update(bookings)
          .set({ bookingstatus: "Confirmed", expiresat: null })
          .where(eq(bookings.bookingid, booking.bookingid))
        await sp.update(tickets).set({ status: "Confirmed" }).where(eq(tickets.bookingid, booking.bookingid))
      })
    } catch (err) {
      if (!isUniqueViolation(err, "tickets_flight_seat_active_uq")) throw err
      confirmed = false
      console.error(
        `Payment ${paymentId} completed for booking ${booking.bookingid} after its seats were released. Refund required.`,
      )
    }

    if (confirmed && booking.userid) {
      const points = Math.floor(booking.totalprice / VND_PER_POINT)
      if (points > 0) {
        await tx
          .update(users)
          .set({ pointsavailable: sql`${users.pointsavailable} + ${points}` })
          .where(eq(users.userid, booking.userid))
      }
    }

    return { alreadyProcessed: false, bookingId: booking.bookingid, confirmed }
  })
}

/** Marks one checkout attempt as abandoned. The booking stays Pending so the customer can retry. */
export async function closePayment(paymentId: number, bookingId: number, status: "Cancelled" | "Expired") {
  await db
    .update(payments)
    .set({ paymentstatus: status })
    .where(and(eq(payments.paymentid, paymentId), eq(payments.bookingid, bookingId), eq(payments.paymentstatus, "Pending")))
}

export async function findPaymentByStripeSession(sessionId: string) {
  const [payment] = await db.select().from(payments).where(eq(payments.stripesessionid, sessionId)).limit(1)
  return payment ?? null
}
