import { z } from "zod"
import { lookupBooking } from "@/lib/server/bookings"
import { readJson, route } from "@/lib/server/http"

const body = z.object({
  bookingReference: z.string().min(1),
  lastName: z.string().min(1),
})

export const POST = route(async (request) => {
  const { bookingReference, lastName } = body.parse(await readJson(request))
  return lookupBooking(bookingReference.trim(), lastName.trim())
})
