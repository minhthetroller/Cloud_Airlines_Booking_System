import { NextResponse } from "next/server"
import supabaseClient from "@/lib/supabase/supabaseClient"
import { format } from "date-fns"

// Generate a more sophisticated COSMILE ID
function generateCosmileId(userId: string, firstName: string, lastName: string, email: string): string {
  // Create a hash-based approach for better uniqueness and readability
  const nameInitials = (firstName.charAt(0) + lastName.charAt(0)).toUpperCase()
  const emailPrefix = email.split('@')[0].substring(0, 2).toUpperCase()
  
  // Use a portion of the user ID to ensure uniqueness
  const userIdHash = userId.substring(0, 8).toUpperCase()
  
  // Generate a check digit for validation
  const checkDigit = (userId.charCodeAt(0) + firstName.charCodeAt(0) + lastName.charCodeAt(0)) % 10
  
  return `${nameInitials}${emailPrefix}${userIdHash.substring(0, 4)}${checkDigit}`
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get("email")

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    // Get customer details by email (since email is stored in customers table)
    const { data: customerData, error: customerError } = await supabaseClient
      .from("customers")
      .select("*")
      .eq("email", email)
      .single()

    if (customerError) {
      return NextResponse.json({ error: customerError.message }, { status: 500 })
    }

    // Get recent bookings for the customer (assuming bookings table uses user_id)
    // Note: You may need to adjust this based on your actual bookings table structure
    const { data: recentBookings, error: recentBookingsError } = await supabaseClient
      .from("bookings")
      .select("*")
      .eq("user_id", customerData.user_id)
      .order("created_at", { ascending: false })
      .limit(5)

    if (recentBookingsError) {
      console.error("Error fetching recent bookings:", recentBookingsError)
    }

    // Process recent bookings data (simplified for now)
    let processedRecentBookings: any[] = []
    if (recentBookings && recentBookings.length > 0) {
      processedRecentBookings = recentBookings.map((booking: any) => ({
        id: booking.id,
        reference: booking.reference || `BK${booking.id}`,
        flightNumber: booking.flight_number || "Unknown",
        departureAirport: booking.departure_airport || "Unknown", 
        arrivalAirport: booking.arrival_airport || "Unknown",
        departureDate: booking.departure_date
          ? format(new Date(booking.departure_date), "MMM dd, yyyy")
          : "Unknown",
        status: booking.status || "Pending",
        price: booking.total_price || 0,
      }))
    }

    // Determine tier based on points
    const points = customerData.points_available || 0
    let tier = "Stratus"
    if (points >= 10000) {
      tier = "Cirrus"
    } else if (points >= 5000) {
      tier = "Altostratus"
    }

    // Calculate points needed for next tier
    let pointsForNextTier = 0
    let nextTier = ""
    if (tier === "Stratus") {
      pointsForNextTier = Math.max(0, 5000 - points)
      nextTier = "Altostratus"
    } else if (tier === "Altostratus") {
      pointsForNextTier = Math.max(0, 10000 - points)
      nextTier = "Cirrus"
    } else {
      pointsForNextTier = 0
      nextTier = "Max Tier Achieved"
    }

    return NextResponse.json({
      user: {
        id: customerData.user_id,
        email: email,
        firstName: customerData.firstname,
        lastName: customerData.lastname,
        title: customerData.pronoun,
        points: points,
        tier,
        cosmileId: generateCosmileId(customerData.user_id, customerData.firstname, customerData.lastname, customerData.email),
        lastLogin: format(new Date(), "MMM dd, yyyy HH:mm (OOOO)"),
        pointsForNextTier,
        nextTier,
      },
      customerDetails: customerData,
      recentBookings: processedRecentBookings,
      ids: {
        userId: customerData.user_id,
        customerId: customerData.user_id, // Using user_id as customerId for consistency
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

    // Update customer details using user_id
    const { data, error } = await supabaseClient
      .from("customers")
      .update(customerDetails)
      .eq("user_id", userId)
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
