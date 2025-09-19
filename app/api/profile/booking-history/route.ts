import { NextResponse } from "next/server"
import supabaseClient from "@/lib/supabase/supabaseClient"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get("email")

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    // Get user record from users table
    const { data: userData, error: userError } = await supabaseClient
      .from("users")
      .select("userid")
      .eq("username", email)
      .single()

    if (userError) {
      return NextResponse.json({ error: `Error fetching user data: ${userError.message}` }, { status: 500 })
    }

    // Get bookings for this user
    const { data: bookingsData, error: bookingsError } = await supabaseClient
      .from("bookings")
      .select("*")
      .eq("userid", userData.userid)
      .order("bookingdatetime", { ascending: false })

    if (bookingsError) {
      return NextResponse.json({ error: `Error fetching bookings: ${bookingsError.message}` }, { status: 500 })
    }

    // For each booking, get the associated flights
    const bookingsWithFlights = await Promise.all(
      bookingsData.map(async (booking: any) => {
        // Get tickets for this booking
        const { data: ticketsData, error: ticketsError } = await supabaseClient
          .from("tickets")
          .select("flightid")
          .eq("bookingid", booking.bookingid)

        if (ticketsError) {
          console.error(`Error fetching tickets for booking ${booking.bookingid}:`, ticketsError)
          return {
            ...booking,
            flights: [],
            expanded: false,
          }
        }

        // Get flight details for each ticket
        const flightIds = ticketsData.map((ticket: any) => ticket.flightid)
        const { data: flightsData, error: flightsError } = await supabaseClient
          .from("flights")
          .select("*")
          .in("flightid", flightIds)

        if (flightsError) {
          console.error(`Error fetching flights for booking ${booking.bookingid}:`, flightsError)
          return {
            ...booking,
            flights: [],
            expanded: false,
          }
        }

        return {
          ...booking,
          flights: flightsData,
          expanded: false,
        }
      }),
    )

    return NextResponse.json({ bookings: bookingsWithFlights })
  } catch (error: any) {
    console.error("Error fetching booking history:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { bookingId } = await request.json()

    if (!bookingId) {
      return NextResponse.json({ error: "Booking ID is required" }, { status: 400 })
    }

    // Fetch tickets with passenger and seat details
    const { data: ticketsData, error: ticketsError } = await supabaseClient
      .from("tickets")
      .select(`
        *,
        flights(*),
        passengers(*, customers(*)),
        seats(*)
      `)
      .eq("bookingid", bookingId)

    if (ticketsError) {
      return NextResponse.json({ error: `Error fetching ticket details: ${ticketsError.message}` }, { status: 500 })
    }

    // Fetch payment information
    const { data: paymentData, error: paymentError } = await supabaseClient
      .from("payments")
      .select("*")
      .eq("bookingid", bookingId)
      .order("paymentdatetime", { ascending: false })
      .limit(1)

    if (paymentError) {
      return NextResponse.json({ error: `Error fetching payment details: ${paymentError.message}` }, { status: 500 })
    }

    return NextResponse.json({
      tickets: ticketsData,
      payment: paymentData && paymentData.length > 0 ? paymentData[0] : null,
    })
  } catch (error: any) {
    console.error("Error fetching booking details:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const { bookingId } = await request.json()

    if (!bookingId) {
      return NextResponse.json({ error: "Booking ID is required" }, { status: 400 })
    }

    // Update booking status to Cancelled
    const { error: bookingUpdateError } = await supabaseClient
      .from("bookings")
      .update({ bookingstatus: "Cancelled" })
      .eq("bookingid", bookingId)

    if (bookingUpdateError) {
      return NextResponse.json({ error: `Failed to cancel booking: ${bookingUpdateError.message}` }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: "Booking cancelled successfully" })
  } catch (error: any) {
    console.error("Error cancelling booking:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}