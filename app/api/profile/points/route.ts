import { NextResponse } from "next/server"
import supabaseClient from "@/lib/supabase/supabaseClient"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get("email")

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    // Get customer data by email
    const { data: customerData, error: customerError } = await supabaseClient
      .from("customers")
      .select("user_id")
      .eq("email", email)
      .single()

    if (customerError) {
      return NextResponse.json({ error: `Error fetching customer data: ${customerError.message}` }, { status: 500 })
    }

    // Get bookings for this user (assuming you have a bookings table)
    const { data: bookingsData, error: bookingsError } = await supabaseClient
      .from("bookings")
      .select("*")
      .eq("user_id", customerData.user_id)
      .order("created_at", { ascending: false })

    if (bookingsError) {
      console.error("Error fetching bookings:", bookingsError)
      // Return empty history if bookings table doesn't exist or has different structure
      return NextResponse.json({ pointHistory: [] })
    }

    // Process bookings into point history
    const pointHistoryData = bookingsData?.map((booking: any) => {
      const points = Math.floor((booking.total_price || 0) / 500000) // 1 point per 500,000 VND
      return {
        id: booking.id,
        date: booking.created_at || booking.departure_date,
        description: `Flight booking - ${booking.reference || `BK${booking.id}`}`,
        points: points,
        type: "earned",
      }
    }) || []

    return NextResponse.json({ pointHistory: pointHistoryData })
  } catch (error: any) {
    console.error("Error fetching point history:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}