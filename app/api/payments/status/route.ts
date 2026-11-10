import { getDraftId, loadDraft } from "@/lib/redis/booking-draft"
import { getLatestPayment } from "@/lib/server/bookings"
import { route } from "@/lib/server/http"
import { findPaymentByStripeSession } from "@/lib/server/payments"

export const dynamic = "force-dynamic"

export const GET = route(async (request) => {
  const sessionId = new URL(request.url).searchParams.get("session_id")
  if (sessionId) {
    return { paymentstatus: (await findPaymentByStripeSession(sessionId))?.paymentstatus ?? null }
  }

  const draftId = await getDraftId()
  const bookingId = draftId ? (await loadDraft(draftId))?.booking.bookingId : null
  return { paymentstatus: bookingId ? ((await getLatestPayment(bookingId))?.paymentstatus ?? null) : null }
})
