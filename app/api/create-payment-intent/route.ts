import { headers } from "next/headers"
import { getDraftId, loadDraft } from "@/lib/redis/booking-draft"
import { HttpError, route } from "@/lib/server/http"
import { startCheckout } from "@/lib/server/payments"

// Creates a Stripe Checkout session for the booking of the current draft.
// The amount comes from the booking row, never from the client.
export const POST = route(async () => {
  const draftId = await getDraftId()
  const bookingId = draftId ? (await loadDraft(draftId))?.booking.bookingId : null
  if (!draftId || !bookingId) throw new HttpError(400, "Booking ID is missing. Please go back and try again.")

  const origin = (await headers()).get("origin") || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  return startCheckout(draftId, bookingId, origin.replace(/\/$/, ""))
})
