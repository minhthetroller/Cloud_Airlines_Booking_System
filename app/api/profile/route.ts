import { format } from "date-fns"
import { getProfile, tierForPoints, updateCustomerDetails } from "@/lib/server/accounts"
import { requireUser } from "@/lib/server/auth"
import { listUserBookings } from "@/lib/server/bookings"
import { HttpError, readJson, route } from "@/lib/server/http"

export const dynamic = "force-dynamic"

export const GET = route(async () => {
  const session = await requireUser()
  const profile = await getProfile(session.userId)
  if (!profile) throw new HttpError(404, "User not found")
  const { user: userRecord, customer: customerData } = profile

  // Recent bookings with their flights, loaded in two queries
  const recentBookings = (await listUserBookings(session.userId, 5))
    .filter((booking) => booking.flights.length > 0)
    .map((booking) => {
      const flight = booking.flights[0]
      return {
        id: booking.bookingid,
        reference: booking.bookingreference,
        flightNumber: flight?.flightnumber || "Unknown",
        departureAirport: flight?.departureairportcode || "Unknown",
        arrivalAirport: flight?.arrivalairportcode || "Unknown",
        departureDate: flight?.departuredatetime ? format(new Date(flight.departuredatetime), "MMM dd, yyyy") : "Unknown",
        status: booking.bookingstatus || "Pending",
        price: booking.totalprice || 0,
      }
    })

  // Determine tier based on points
  const points = userRecord.pointsavailable || 0
  const tier = tierForPoints(points)

  // Calculate points needed for next tier
  let pointsForNextTier = 0
  let nextTier = ""
  if (tier === "Stratus") {
    pointsForNextTier = 5000 - points
    nextTier = "Altostratus"
  } else if (tier === "Altostratus") {
    pointsForNextTier = 10000 - points
    nextTier = "Cirrus"
  } else {
    pointsForNextTier = 0
    nextTier = "Max Tier Achieved"
  }

  return {
    user: {
      id: userRecord.userid,
      email: userRecord.username,
      firstName: customerData.firstname,
      lastName: customerData.lastname,
      title: customerData.pronoun,
      points,
      tier,
      cosmileId: `${1000000 + userRecord.userid}`,
      lastLogin: format(new Date(), "MMM dd, yyyy HH:mm (OOOO)"),
      pointsForNextTier,
      nextTier,
    },
    customerDetails: customerData,
    recentBookings,
    ids: {
      userId: userRecord.userid,
      customerId: userRecord.customerid,
    },
  }
})

export const PUT = route(async (request) => {
  const session = await requireUser()
  const { customerDetails } = await readJson(request)
  if (!customerDetails) throw new HttpError(400, "User ID and customer details are required")

  const data = await updateCustomerDetails(session.customerId, customerDetails)
  return { success: true, data }
})
