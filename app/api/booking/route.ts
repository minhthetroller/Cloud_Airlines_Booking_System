import { NextResponse } from "next/server"
import supabaseClient from "@/lib/supabase/supabaseClient"

// API route to process complete flight booking using the stored procedure
export async function POST(request: Request) {
  try {
    const bookingData = await request.json()
    
    const {
      userId,
      isGuest = false,
      bookingReference,
      totalPrice,
      currencyCode = 'VND',
      departureFlightId,
      returnFlightId = null,
      passengers,
      passengerTypes,
      departureSeats,
      returnSeats = null,
      contactName,
      contactEmail,
      contactPhone,
      paymentMethod,
      paymentTransactionId = null
    } = bookingData

    // Validate required fields
    if (!bookingReference || !totalPrice || !departureFlightId || !passengers || !passengerTypes || !departureSeats) {
      return NextResponse.json({ 
        success: false, 
        error: "Missing required booking data" 
      }, { status: 400 })
    }

    // Call the stored procedure
    const { data, error } = await supabaseClient.rpc('process_flight_booking', {
      p_user_id: isGuest ? null : userId,
      p_is_guest: isGuest,
      p_booking_reference: bookingReference,
      p_total_price: totalPrice,
      p_currency_code: currencyCode,
      p_departure_flight_id: departureFlightId,
      p_return_flight_id: returnFlightId,
      p_passengers: passengers,
      p_passenger_types: passengerTypes,
      p_departure_seats: departureSeats,
      p_return_seats: returnSeats,
      p_contact_name: contactName,
      p_contact_email: contactEmail,
      p_contact_phone: contactPhone,
      p_payment_method: paymentMethod,
      p_payment_transaction_id: paymentTransactionId
    })

    if (error) {
      console.error("Stored procedure error:", error)
      return NextResponse.json({
        success: false,
        error: error.message,
        details: error.details
      }, { status: 500 })
    }

    return NextResponse.json(data)

  } catch (error: any) {
    console.error("Booking API error:", error)
    return NextResponse.json({
      success: false,
      error: "Internal server error",
      message: error.message
    }, { status: 500 })
  }
}

// API route to confirm payment
export async function PUT(request: Request) {
  try {
    const { bookingId, paymentId, transactionId, paymentStatus } = await request.json()

    if (!bookingId || !paymentId) {
      return NextResponse.json({ 
        success: false, 
        error: "Missing booking ID or payment ID" 
      }, { status: 400 })
    }

    // Call the payment confirmation stored procedure
    const { data, error } = await supabaseClient.rpc('confirm_booking_payment', {
      p_booking_id: bookingId,
      p_payment_id: paymentId,
      p_transaction_id: transactionId,
      p_payment_status: paymentStatus || 'Completed'
    })

    if (error) {
      console.error("Payment confirmation error:", error)
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500 })
    }

    return NextResponse.json(data)

  } catch (error: any) {
    console.error("Payment confirmation API error:", error)
    return NextResponse.json({
      success: false,
      error: "Internal server error",
      message: error.message
    }, { status: 500 })
  }
}

// API route to cancel booking
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const bookingId = searchParams.get('bookingId')
    const reason = searchParams.get('reason') || 'User cancellation'

    if (!bookingId) {
      return NextResponse.json({ 
        success: false, 
        error: "Missing booking ID" 
      }, { status: 400 })
    }

    // Call the booking cancellation stored procedure
    const { data, error } = await supabaseClient.rpc('cancel_booking', {
      p_booking_id: parseInt(bookingId),
      p_reason: reason
    })

    if (error) {
      console.error("Booking cancellation error:", error)
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500 })
    }

    return NextResponse.json(data)

  } catch (error: any) {
    console.error("Booking cancellation API error:", error)
    return NextResponse.json({
      success: false,
      error: "Internal server error",
      message: error.message
    }, { status: 500 })
  }
}