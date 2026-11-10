import { z } from "zod"
import { getDraftId, loadDraft } from "@/lib/redis/booking-draft"
import { cancelBooking, getBooking } from "@/lib/server/bookings"
import { readJson, route } from "@/lib/server/http"
import { closePayment } from "@/lib/server/payments"

const body = z.object({ status: z.enum(["Cancelled", "Expired"]) })

// Called when the customer backs out of Stripe (Cancelled) or the payment timer runs out (Expired)
export const POST = route(async (request) => {
  const { status } = body.parse(await readJson(request))
  const draftId = await getDraftId()
  const progress = draftId ? (await loadDraft(draftId))?.booking : null
  if (!progress?.bookingId) return { success: true }

  if (status === "Expired") {
    // The payment window is over: a booking that is still unpaid expires and its seats are freed
    const booking = await getBooking(progress.bookingId)
    if (booking?.bookingstatus === "Pending") await cancelBooking(progress.bookingId, "Expired")
  } else if (progress.paymentId) {
    await closePayment(progress.paymentId, progress.bookingId, "Cancelled")
  }
  return { success: true }
})
