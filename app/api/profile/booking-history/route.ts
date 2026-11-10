import { requireUser } from "@/lib/server/auth"
import {
  assertBookingOwner,
  cancelBooking,
  getLatestPayment,
  getTicketsForBooking,
  listUserBookings,
} from "@/lib/server/bookings"
import { HttpError, readJson, route } from "@/lib/server/http"

export const dynamic = "force-dynamic"

export const GET = route(async () => {
  const session = await requireUser()
  const bookings = await listUserBookings(session.userId)
  return { bookings: bookings.map((booking) => ({ ...booking, expanded: false })) }
})

export const POST = route(async (request) => {
  const session = await requireUser()
  const bookingId = Number((await readJson(request)).bookingId)
  if (!bookingId) throw new HttpError(400, "Booking ID is required")
  await assertBookingOwner(bookingId, session.userId)

  const [tickets, payment] = await Promise.all([getTicketsForBooking(bookingId), getLatestPayment(bookingId)])
  return { tickets, payment }
})

export const PUT = route(async (request) => {
  const session = await requireUser()
  const bookingId = Number((await readJson(request)).bookingId)
  if (!bookingId) throw new HttpError(400, "Booking ID is required")
  await assertBookingOwner(bookingId, session.userId)

  // Booking and tickets are cancelled together, which frees the seats
  await cancelBooking(bookingId)
  return { success: true, message: "Booking cancelled successfully" }
})
