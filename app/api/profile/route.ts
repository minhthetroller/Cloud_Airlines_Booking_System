import { NextResponse } from "next/server"
import supabaseClient from "@/lib/supabase/supabaseClient"
import { format } from "date-fns"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get("email")

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    // Get user record from users table
    const { data: userRecord, error: userRecordError } = await supabaseClient
      .from("users")
      .select("*")
      .eq("username", email)
      .single()

    if (userRecordError) {
      return NextResponse.json({ error: userRecordError.message }, { status: 500 })
    }

    // Get customer details
    const { data: customerData, error: customerError } = await supabaseClient
      .from("customers")
      .select("*")
      .eq("customerid", userRecord.customerid)
      .single()

    if (customerError) {
      return NextResponse.json({ error: customerError.message }, { status: 500 })
    }

    // Get recent bookings for the recent bookings section (limit to 5)
    const { data: recentBookings, error: recentBookingsError } = await supabaseClient
      .from("bookings")
      .select("*")
      .eq("userid", userRecord.userid)
      .order("bookingdatetime", { ascending: false })
      .limit(5)

    if (recentBookingsError) {
      console.error("Error fetching recent bookings:", recentBookingsError)
    }

    // Process recent bookings data
    let processedRecentBookings: any[] = []
    if (recentBookings && recentBookings.length > 0) {
      const bookingsWithFlights = await Promise.all(
        recentBookings.map(async (booking: any) => {
          // Get tickets for this booking
          const { data: ticketsData, error: ticketsError } = await supabaseClient
            .from("tickets")
            .select("*, flights(*)")
            .eq("bookingid", booking.bookingid)

          if (ticketsError) {
            console.error("Error fetching tickets:", ticketsError)
            return null
          }

          if (!ticketsData || ticketsData.length === 0) {
            return null
          }

          // Use the first ticket's flight data
          const ticket = ticketsData[0]
          const flight = ticket.flights

          return {
            id: booking.bookingid,
            reference: booking.bookingreference,
            flightNumber: flight?.flightnumber || "Unknown",
            departureAirport: flight?.departureairportcode || "Unknown",
            arrivalAirport: flight?.arrivalairportcode || "Unknown",
            departureDate: flight?.departuredatetime
              ? format(new Date(flight.departuredatetime), "MMM dd, yyyy")
              : "Unknown",
            status: booking.bookingstatus || "Pending",
            price: booking.totalprice || 0,
          }
        }),
      )

      // Filter out null values
      processedRecentBookings = bookingsWithFlights.filter((booking) => booking !== null)
    }

    // Determine tier based on points
    let tier = "Stratus"
    if (userRecord.pointsavailable > 10000) {
      tier = "Cirrus"
    } else if (userRecord.pointsavailable > 5000) {
      tier = "Altostratus"
    }

    // Calculate points needed for next tier
    let pointsForNextTier = 0
    let nextTier = ""
    if (tier === "Stratus") {
      pointsForNextTier = 5000 - (userRecord.pointsavailable || 0)
      nextTier = "Altostratus"
    } else if (tier === "Altostratus") {
      pointsForNextTier = 10000 - (userRecord.pointsavailable || 0)
      nextTier = "Cirrus"
    } else {
      pointsForNextTier = 0
      nextTier = "Max Tier Achieved"
    }

    return NextResponse.json({
      user: {
        id: userRecord.userid,
        email: email,
        firstName: customerData.firstname,
        lastName: customerData.lastname,
        title: customerData.pronoun,
        points: userRecord.pointsavailable || 0,
        tier,
        cosmileId: `${1000000 + Number.parseInt(userRecord.userid)}`,
        lastLogin: format(new Date(), "MMM dd, yyyy HH:mm (OOOO)"),
        pointsForNextTier,
        nextTier,
      },
      customerDetails: customerData,
      recentBookings: processedRecentBookings,
      ids: {
        userId: userRecord.userid,
        customerId: userRecord.customerid,
      }
    })
  } catch (error: any) {
    console.error("Error fetching profile data:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { userId, customerDetails } = body

    if (!userId || !customerDetails) {
      return NextResponse.json({ error: "User ID and customer details are required" }, { status: 400 })
    }

    // Get user record to find customer ID
    const { data: userRecord, error: userRecordError } = await supabaseClient
      .from("users")
      .select("customerid")
      .eq("userid", userId)
      .single()

    if (userRecordError) {
      return NextResponse.json({ error: userRecordError.message }, { status: 500 })
    }

    // Update customer details
    const { data, error } = await supabaseClient
      .from("customers")
      .update(customerDetails)
      .eq("customerid", userRecord.customerid)
      .select()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error("Error updating profile data:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
