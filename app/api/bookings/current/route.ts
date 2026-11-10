import { getDraftId, loadDraft } from "@/lib/redis/booking-draft"
import { getBookingDetails } from "@/lib/server/bookings"
import { HttpError, route } from "@/lib/server/http"
import { findPaymentByStripeSession } from "@/lib/server/payments"

export const dynamic = "force-dynamic"

// The booking being completed: found through the Stripe session on return from checkout,
// otherwise through the booking draft cookie.
export const GET = route(async (request) => {
  const sessionId = new URL(request.url).searchParams.get("session_id")

  let bookingId: number | null = null
  if (sessionId) bookingId = (await findPaymentByStripeSession(sessionId))?.bookingid ?? null
  if (!bookingId) {
    const draftId = await getDraftId()
    bookingId = draftId ? ((await loadDraft(draftId))?.booking.bookingId ?? null) : null
  }
  if (!bookingId) throw new HttpError(404, "No booking information found. Please check your booking reference.")

  const details = await getBookingDetails(bookingId)
  if (!details) throw new HttpError(404, "No booking information found. Please check your booking reference.")
  return details
})
