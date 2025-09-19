import supabaseClient from '@/lib/supabase/supabaseClient'

export interface FlightBookingData {
  // Passenger Information
  firstName: string
  lastName: string
  email: string
  phoneNumber: string
  dateOfBirth: string
  gender: 'Male' | 'Female' | 'Other'
  
  // Flight Information
  departureFlightId: number
  returnFlightId?: number
  
  // Seat Selection
  departureSeats: number[]
  returnSeats?: number[]
  
  // Payment Information
  totalAmount: number
  paymentIntentId?: string
  
  // Booking Reference
  bookingReference: string
}

export interface BookingResult {
  success: boolean
  bookingId?: number
  message: string
  error?: string
}

export interface PaymentConfirmationData {
  bookingId: number
  paymentIntentId: string
  amountPaid: number
  paymentMethod: string
}

export interface PaymentResult {
  success: boolean
  message: string
  error?: string
}

export interface CancelBookingData {
  bookingId: number
  cancelReason?: string
}

export interface CancelResult {
  success: boolean
  refundAmount?: number
  message: string
  error?: string
}

/**
 * Service for handling booking operations using Supabase RPC calls
 * to stored procedures that ensure atomic transactions
 */
export class BookingService {
  /**
   * Process a complete flight booking using the stored procedure
   * This will handle all database operations atomically
   */
  static async processFlightBooking(
    bookingData: FlightBookingData
  ): Promise<BookingResult> {
    try {
      const { data, error } = await supabaseClient.rpc('process_flight_booking', {
        p_first_name: bookingData.firstName,
        p_last_name: bookingData.lastName,
        p_email: bookingData.email,
        p_phone_number: bookingData.phoneNumber,
        p_date_of_birth: bookingData.dateOfBirth,
        p_gender: bookingData.gender,
        p_departure_flight_id: bookingData.departureFlightId,
        p_return_flight_id: bookingData.returnFlightId || null,
        p_departure_seats: bookingData.departureSeats,
        p_return_seats: bookingData.returnSeats || null,
        p_total_amount: bookingData.totalAmount,
        p_booking_reference: bookingData.bookingReference,
        p_payment_intent_id: bookingData.paymentIntentId || null
      })

      if (error) {
        console.error('Error processing flight booking:', error)
        return {
          success: false,
          message: 'Failed to process booking',
          error: error.message
        }
      }

      // The stored procedure returns booking_id and status
      if (data && data.booking_id) {
        return {
          success: true,
          bookingId: data.booking_id,
          message: 'Booking processed successfully'
        }
      } else {
        return {
          success: false,
          message: 'Booking processing failed - no booking ID returned'
        }
      }
    } catch (error) {
      console.error('Exception in processFlightBooking:', error)
      return {
        success: false,
        message: 'System error during booking processing',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Confirm payment for a booking using the stored procedure
   * This updates payment status and confirms the booking
   */
  static async confirmBookingPayment(
    paymentData: PaymentConfirmationData
  ): Promise<PaymentResult> {
    try {
      const { data, error } = await supabaseClient.rpc('confirm_booking_payment', {
        p_booking_id: paymentData.bookingId,
        p_payment_intent_id: paymentData.paymentIntentId,
        p_amount_paid: paymentData.amountPaid,
        p_payment_method: paymentData.paymentMethod
      })

      if (error) {
        console.error('Error confirming booking payment:', error)
        return {
          success: false,
          message: 'Failed to confirm payment',
          error: error.message
        }
      }

      // Check if the procedure executed successfully
      if (data && data.success) {
        return {
          success: true,
          message: 'Payment confirmed successfully'
        }
      } else {
        return {
          success: false,
          message: data?.message || 'Payment confirmation failed'
        }
      }
    } catch (error) {
      console.error('Exception in confirmBookingPayment:', error)
      return {
        success: false,
        message: 'System error during payment confirmation',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Cancel a booking using the stored procedure
   * This handles refunds and seat release atomically
   */
  static async cancelBooking(
    cancelData: CancelBookingData
  ): Promise<CancelResult> {
    try {
      const { data, error } = await supabaseClient.rpc('cancel_booking', {
        p_booking_id: cancelData.bookingId,
        p_cancel_reason: cancelData.cancelReason || 'User requested cancellation'
      })

      if (error) {
        console.error('Error cancelling booking:', error)
        return {
          success: false,
          message: 'Failed to cancel booking',
          error: error.message
        }
      }

      // The stored procedure returns refund amount and status
      if (data && data.success) {
        return {
          success: true,
          refundAmount: data.refund_amount,
          message: 'Booking cancelled successfully'
        }
      } else {
        return {
          success: false,
          message: data?.message || 'Booking cancellation failed'
        }
      }
    } catch (error) {
      console.error('Exception in cancelBooking:', error)
      return {
        success: false,
        message: 'System error during booking cancellation',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Validate booking data before processing
   */
  static validateBookingData(bookingData: FlightBookingData): { 
    valid: boolean
    errors: string[] 
  } {
    const errors: string[] = []

    // Validate required fields
    if (!bookingData.firstName?.trim()) {
      errors.push('First name is required')
    }
    if (!bookingData.lastName?.trim()) {
      errors.push('Last name is required')
    }
    if (!bookingData.email?.trim()) {
      errors.push('Email is required')
    }
    if (!bookingData.phoneNumber?.trim()) {
      errors.push('Phone number is required')
    }
    if (!bookingData.dateOfBirth) {
      errors.push('Date of birth is required')
    }
    if (!bookingData.gender) {
      errors.push('Gender is required')
    }
    if (!bookingData.departureFlightId || bookingData.departureFlightId <= 0) {
      errors.push('Valid departure flight is required')
    }
    if (!bookingData.departureSeats || bookingData.departureSeats.length === 0) {
      errors.push('At least one departure seat must be selected')
    }
    if (!bookingData.totalAmount || bookingData.totalAmount <= 0) {
      errors.push('Valid total amount is required')
    }
    if (!bookingData.bookingReference?.trim()) {
      errors.push('Booking reference is required')
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (bookingData.email && !emailRegex.test(bookingData.email)) {
      errors.push('Invalid email format')
    }

    // Validate return flight and seats if provided
    if (bookingData.returnFlightId) {
      if (bookingData.returnFlightId <= 0) {
        errors.push('Invalid return flight ID')
      }
      if (!bookingData.returnSeats || bookingData.returnSeats.length === 0) {
        errors.push('Return seats are required when return flight is selected')
      }
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * Generate a unique booking reference
   */
  static generateBookingReference(): string {
    const timestamp = Date.now().toString(36).toUpperCase()
    const random = Math.random().toString(36).substring(2, 8).toUpperCase()
    return `CB${timestamp}${random}`
  }
}