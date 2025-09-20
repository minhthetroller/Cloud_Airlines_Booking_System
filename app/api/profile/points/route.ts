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

    const { data: bookingsData, error: bookingsError } = await supabaseClient
      .from("bookings")
      .select("*")
      .eq("userid", userData.userid)
      .order("bookingdatetime", { ascending: false })

    if (bookingsError) {
      console.error("Error fetching bookings:", bookingsError)
      return NextResponse.json({ error: bookingsError.message }, { status: 500 })
    }

    const pointHistoryData = bookingsData.map((booking: any) => {
      const points = Math.floor(booking.totalprice / 500000)
      return {
        id: booking.bookingid,
        date: booking.bookingdatetime,
        description: `Flight booking - ${booking.bookingreference}`,
        points: points,
        type: "earned",
      }
    })

    return NextResponse.json({ pointHistory: pointHistoryData })
  } catch (error: any) {
    console.error("Error fetching point history:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}