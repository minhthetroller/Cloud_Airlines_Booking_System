"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { AlertCircle, Check, ArrowLeft, Home } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { api } from "@/lib/api/client"
import { useAppDispatch, useAppStore, useHydrated } from "@/lib/store/hooks"
import { discardBooking } from "@/lib/store/session"
import axios from "axios"

interface Ticket {
  ticketid: string
  ticketnumber: string
  bookingid: string
  flightid: number
  passengerid: string
  seatid: number
  status: string
  ticketprice: number
  classid: number
  flights?: any
  passengers?: {
    passengerid: string
    bookingid: number
    customerid: number
    passengertype: string
    customers?: {
      customerid: number
      firstname: string
      lastname: string
      passportnumber?: string
      identitycardnumber?: string
      [key: string]: any
    }
  }
  seats?: any
}

function TicketConfirmationContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [paymentProcessing, setPaymentProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [bookingId, setBookingId] = useState<string | null>(null)
  const [bookingReference, setBookingReference] = useState<string | null>(null)
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [contactEmail, setContactEmail] = useState<string | null>(null)
  const [booking, setBooking] = useState<any | null>(null)
  const dispatch = useAppDispatch()
  const store = useAppStore()
  const hydrated = useHydrated()

  useEffect(() => {
    if (!hydrated) return

    // Check if we're coming from Stripe
    const sessionId = searchParams.get('session_id');
    const paymentStatus = searchParams.get('payment_status');

    if (sessionId && paymentStatus === 'success') {
      console.log('Payment successful via Stripe, session:', sessionId);
      setPaymentProcessing(true);
      // Start polling for payment completion
      pollPaymentStatus(sessionId);
      return
    }

    // Not coming from Stripe: load the booking of the current session
    fetchTicketDetails(sessionId);
  }, [searchParams, hydrated]);

  // Function to poll payment status when coming from Stripe
  const pollPaymentStatus = async (sessionId: string) => {
    const maxAttempts = 30; // Poll for up to 30 seconds
    let attempts = 0;
    
    const checkPaymentStatus = async () => {
      try {
        const paymentData = await api.get<{ paymentstatus: string | null }>(
          `/api/payments/status?session_id=${encodeURIComponent(sessionId)}`,
        );

        if (!paymentData.paymentstatus) {
          console.log("No payment found, fetching tickets anyway");
          setPaymentProcessing(false);
          fetchTicketDetails(sessionId);
          return;
        }

        if (paymentData.paymentstatus === "Completed") {
          console.log("✅ Payment confirmed as completed, fetching tickets");
          setPaymentProcessing(false);
          fetchTicketDetails(sessionId);
          return;
        }

        attempts++;
        if (attempts < maxAttempts) {
          console.log(`Waiting for payment completion... (${attempts}/${maxAttempts})`);
          setTimeout(checkPaymentStatus, 1000); // Check again in 1 second
        } else {
          console.log("Payment status polling timeout, fetching tickets anyway");
          setPaymentProcessing(false);
          fetchTicketDetails(sessionId);
        }
      } catch (err) {
        console.error("Error in payment status polling:", err);
        setPaymentProcessing(false);
        fetchTicketDetails(sessionId); // Fallback
      }
    };

    checkPaymentStatus();
  };

  // Loads the booking with its tickets from the server. After the Stripe redirect the booking
  // is found through the checkout session, otherwise through the booking in progress.
  const fetchTicketDetails = async (sessionId: string | null) => {
    try {
      setLoading(true)

      const details = await api.get<{ booking: any; tickets: Ticket[]; contactEmail: string | null }>(
        `/api/bookings/current${sessionId ? `?session_id=${encodeURIComponent(sessionId)}` : ""}`,
      )

      setBooking(details.booking)
      setBookingId(String(details.booking.bookingid))
      setBookingReference(details.booking.bookingreference)
      setContactEmail(store.getState().contact?.contactEmail || details.contactEmail || null)

      console.log("Tickets data:", details.tickets)
      setTickets(details.tickets)

      // The booking is complete: forget the in-progress booking
      if (details.booking.bookingstatus === "Confirmed") {
        dispatch(discardBooking())
      }
    } catch (err: any) {
      console.error("Error fetching ticket details:", err)
      setError(err.message || "Failed to load ticket details")
    } finally {
      setLoading(false)
    }
  }

  const handleResendEmail = async () => {
    if (!contactEmail || !bookingReference || tickets.length === 0) {
      setError("Missing required information to resend email")
      return
    }

    try {
      setLoading(true)

      const response = await axios.post("/api/send-ticket-confirmation", {
        email: contactEmail,
        booking: booking,
        tickets: tickets,
      });

      alert("Confirmation email sent successfully!")
    } catch (err: any) {
      console.error("Error resending email:", err)
      setError("Failed to resend email. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleReturnHome = () => {
    router.push("/")
  }

  if (paymentProcessing) {
    return (
      <div className="min-h-screen bg-[#0f2d3c] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-white mb-2">Processing Payment</h2>
          <p className="text-gray-300">Please wait while we confirm your payment...</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f2d3c] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0f2d3c] flex flex-col items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={() => router.push("/")} className="mt-4">
          Return to Home
        </Button>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-[#0f2d3c] pb-20 text-white">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-start max-w-3xl mx-auto mb-8">
          <button onClick={() => router.push("/")} className="mr-4 text-white hover:text-gray-300 transition-colors">
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="text-2xl font-bold text-white">Ticket Confirmation</h1>
        </div>

        {/* Success Message */}
        <section className="mb-6 bg-green-600 rounded-lg p-4 max-w-3xl mx-auto">
          <div className="flex items-center">
            <Check className="h-6 w-6 mr-2" />
            <div>
              <h2 className="text-xl font-bold">Payment Successful</h2>
              <p>Your payment has been processed and your tickets are confirmed.</p>
            </div>
          </div>
        </section>

        {/* Booking Reference */}
        <section className="mb-6 bg-[#1a3a4a] rounded-lg p-4 max-w-3xl mx-auto">
          <h2 className="text-xl font-bold mb-2">Booking Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="font-medium">Booking Reference</p>
              <p className="text-lg">{bookingReference}</p>
            </div>
            {contactEmail && (
              <div>
                <p className="font-medium">Confirmation Email</p>
                <p>Sent to: {contactEmail}</p>
              </div>
            )}
          </div>
        </section>

        {/* Tickets */}
        <section className="mb-6 max-w-3xl mx-auto">
          <h2 className="text-xl font-bold mb-4">Your Tickets</h2>

          {tickets.length > 0 ? (
            <div className="space-y-4">
              {tickets.map((ticket) => (
                <div key={ticket.ticketid} className="bg-[#1a3a4a] rounded-lg p-4 print:border print:border-gray-300">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-bold">
                        {ticket.flights?.departureairportcode} → {ticket.flights?.arrivalairportcode}
                      </h3>
                      <p className="text-sm text-gray-300">Flight {ticket.flights?.flightnumber}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">Ticket #{ticket.ticketnumber}</p>
                      <p className="text-sm text-gray-300">
                        {ticket.status === "Confirmed" ? (
                          <span className="text-green-400">✓ Confirmed</span>
                        ) : (
                          ticket.status
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="font-medium">Passenger</p>
                      <p>
                        {ticket.passengers?.customers?.firstname} {ticket.passengers?.customers?.lastname}
                      </p>

                      {ticket.passengers?.customers?.passportnumber && (
                        <p className="text-sm text-gray-300">Passport: {ticket.passengers.customers.passportnumber}</p>
                      )}
                      {ticket.passengers?.customers?.identitycardnumber && (
                        <p className="text-sm text-gray-300">
                          ID Card: {ticket.passengers.customers.identitycardnumber}
                        </p>
                      )}
                      {ticket.passengers?.passengertype && (
                        <p className="text-sm text-gray-300">Type: {ticket.passengers.passengertype}</p>
                      )}
                    </div>
                    <div>
                      <p className="font-medium">Seat</p>
                      <p>
                        {ticket.seats
                          ? ticket.seats.seatnumber
                          : typeof ticket.seatid === "number"
                            ? `Seat ID: ${ticket.seatid}`
                            : "Unknown"}
                      </p>
                      {ticket.seats?.seattype && <p className="text-sm text-gray-300">Type: {ticket.seats.seattype}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="font-medium">Departure Time</p>
                      <p>
                        {ticket.flights?.departuredatetime
                          ? new Date(ticket.flights.departuredatetime).toLocaleString()
                          : "N/A"}
                      </p>
                      {ticket.flights?.arrivaldatetime && (
                        <p className="text-sm text-gray-300">
                          Arrival: {new Date(ticket.flights.arrivaldatetime).toLocaleString()}
                        </p>
                      )}
                      {ticket.flights?.travelmiles && (
                        <p className="text-sm text-gray-300">Miles: {ticket.flights.travelmiles}</p>
                      )}
                    </div>
                    <div>
                      <p className="font-medium">Price</p>
                      <p>{new Intl.NumberFormat("vi-VN").format(ticket.ticketprice || 0)} VND</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p>No tickets found.</p>
          )}
        </section>

        {/* Actions */}
        <div className="flex justify-center space-x-4 max-w-3xl mx-auto">
          <Button onClick={handleReturnHome} className="bg-green-600 hover:bg-green-700">
            <Home className="h-4 w-4 mr-2" />
            Return to Home Page
          </Button>
          {contactEmail && (
            <Button onClick={handleResendEmail} variant="outline" className="border-[#9b6a4f] text-[#9b6a4f]">
              Resend Email
            </Button>
          )}
        </div>
      </div>
    </main>
  )
}

// Loading component for Suspense fallback
function TicketConfirmationLoading() {
  return (
    <div className="min-h-screen bg-[#0f2d3c] flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
    </div>
  )
}

// Main component wrapped with Suspense
export default function TicketConfirmationPage() {
  return (
    <Suspense fallback={<TicketConfirmationLoading />}>
      <TicketConfirmationContent />
    </Suspense>
  )
}
