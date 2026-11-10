import { getDraftId } from "@/lib/redis/booking-draft"
import { getSessionUser } from "@/lib/server/auth"
import { createBooking } from "@/lib/server/bookings"
import { HttpError, route } from "@/lib/server/http"

// Creates the booking from the current draft in a single transaction
export const POST = route(async () => {
  const draftId = await getDraftId()
  if (!draftId) throw new HttpError(400, "Booking session has expired. Please start again.")
  return createBooking(draftId, await getSessionUser())
})
