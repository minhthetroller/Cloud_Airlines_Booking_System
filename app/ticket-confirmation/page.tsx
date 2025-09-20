"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { AlertCircle, Check, ArrowLeft, Home } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import supabaseClient from "@/lib/supabase/supabaseClient"
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

  useEffect(() => {
    // Check if we're coming from Stripe
    const sessionId = searchParams.get('session_id');
    const paymentStatus = searchParams.get('payment_status');

    if (sessionId && paymentStatus === 'success') {
      console.log('Payment successful via Stripe, session:', sessionId);
      setPaymentProcessing(true);
      // Start polling for payment completion
      pollPaymentStatus();
    }

    // Get booking information from session storage (works for both flows)
    const storedBookingId = sessionStorage.getItem("bookingId");
    const storedBookingReference = sessionStorage.getItem("bookingReference");
    const storedContactEmail = sessionStorage.getItem("contactEmail");

    if (storedBookingId) {
      setBookingId(storedBookingId);
      setBookingReference(storedBookingReference);
      setContactEmail(storedContactEmail);
      
      // If not coming from Stripe, fetch tickets immediately
      if (!sessionId) {
        fetchTicketDetails();
      }
    } else {
      setError("No booking information found. Please check your booking reference.");
      setLoading(false);
    }
  }, [searchParams]);

  // Function to poll payment status when coming from Stripe
  const pollPaymentStatus = async () => {
    const maxAttempts = 30; // Poll for up to 30 seconds
    let attempts = 0;
    
    const checkPaymentStatus = async () => {
      try {
        const storedPaymentId = sessionStorage.getItem("paymentId");
        if (!storedPaymentId) {
          console.log("No payment ID found, fetching tickets anyway");
          fetchTicketDetails();
          return;
        }

        const { data: paymentData, error } = await supabaseClient
          .from("payments")
          .select("paymentstatus")
          .eq("paymentid", storedPaymentId)
          .single();

        if (error) {
          console.error("Error checking payment status:", error);
          fetchTicketDetails(); // Fallback to fetching tickets
          return;
        }

        if (paymentData.paymentstatus === "Completed") {
          console.log("✅ Payment confirmed as completed, fetching tickets");
          setPaymentProcessing(false);
          fetchTicketDetails();
          return;
        }

        attempts++;
        if (attempts < maxAttempts) {
          console.log(`Waiting for payment completion... (${attempts}/${maxAttempts})`);
          setTimeout(checkPaymentStatus, 1000); // Check again in 1 second
        } else {
          console.log("Payment status polling timeout, fetching tickets anyway");
          setPaymentProcessing(false);
          fetchTicketDetails();
        }
      } catch (err) {
        console.error("Error in payment status polling:", err);
        setPaymentProcessing(false);
        fetchTicketDetails(); // Fallback
      }
    };

    checkPaymentStatus();
  };

  const fetchTicketDetails = async () => {
    try {
      setLoading(true)

      // Get booking ID from session storage
      const storedBookingId = sessionStorage.getItem("bookingId")
      const storedBookingReference = sessionStorage.getItem("bookingReference")
      const contactDetails = sessionStorage.getItem("contactInformation") || null

      if (!storedBookingId) {
        throw new Error("Booking ID not found")
      }

      setBookingId(storedBookingId)
      setBookingReference(storedBookingReference)
      setContactEmail(JSON.parse(contactDetails || "null")?.contactEmail || null)

      console.log("Fetching tickets for booking ID:", storedBookingId)

      // Fetch tickets with related data using correct table joins
      const { data: ticketsData, error: ticketsError } = await supabaseClient
        .from("tickets")
        .select(`
          *,
          flights(
            flightid, 
            flightnumber, 
            departureairportcode, 
            arrivalairportcode, 
            departuredatetime, 
            arrivaldatetime, 
            status,
            travelmiles
          ),
          passengers(
            passengerid, 
            bookingid,
            customerid,
            passengertype,
            customers(
              customerid,
              firstname, 
              lastname, 
              passportnumber, 
              identitycardnumber,
              gender,
              nationality,
              dateofbirth
            )
          ),
          seats(
            seatid, 
            seatnumber, 
            classid, 
            seattype
          )
        `)
        .eq("bookingid", storedBookingId)

      if (ticketsError) {
        console.error("Error fetching tickets:", ticketsError)
        throw new Error(`Error fetching tickets: ${ticketsError.message}`)
      }

      console.log("Tickets data:", ticketsData)

      if (!ticketsData || ticketsData.length === 0) {
        console.warn("No tickets found for booking ID:", storedBookingId)

        // Try to create tickets if none exist
        const success = await createTicketsForBooking(storedBookingId)
        if (success) {
          // Fetch tickets again after creation with the same detailed query
          const { data: newTicketsData, error: newTicketsError } = await supabaseClient
            .from("tickets")
            .select(`
              *,
              flights(
                flightid, 
                flightnumber, 
                departureairportcode, 
                arrivalairportcode, 
                departuredatetime, 
                arrivaldatetime, 
                status,
                travelmiles
              ),
              passengers(
                passengerid, 
                bookingid,
                customerid,
                passengertype,
                customers(
                  customerid,
                  firstname, 
                  lastname, 
                  passportnumber, 
                  identitycardnumber,
                  gender,
                  nationality,
                  dateofbirth
                )
              ),
              seats(
                seatid, 
                seatnumber, 
                classid, 
                seattype
              )
            `)
            .eq("bookingid", storedBookingId)

          if (newTicketsError) {
            console.error("Error fetching new tickets:", newTicketsError)
          } else if (newTicketsData && newTicketsData.length > 0) {
            console.log("Successfully created and fetched tickets:", newTicketsData)
            setTickets(newTicketsData)
          }
        }
      } else {
        setTickets(ticketsData)
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

      // Get booking details
      const { data: bookingData, error: bookingError } = await supabaseClient
        .from("bookings")
        .select("*")
        .eq("bookingid", bookingId)
        .single()

      if (bookingError) throw bookingError

      const response = await axios.post("/api/send-ticket-confirmation", {
        email: contactEmail,
        booking: bookingData,
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

  // Add a new function to create tickets if they don't exist
  const createTicketsForBooking = async (bookingId: string): Promise<boolean> => {
    try {
      console.log("Attempting to create tickets for booking:", bookingId)

      // Get passenger records for this booking
      const { data: passengerData, error: passengerError } = await supabaseClient
        .from("passengers")
        .select("*, customers(*)")
        .eq("bookingid", bookingId)

      if (passengerError || !passengerData || passengerData.length === 0) {
        console.error("No passengers found for booking:", bookingId)
        return false
      }

      // Get flight information from session storage
      const departureFlight = JSON.parse(sessionStorage.getItem("selectedDepartureFlight") || "null")
      const returnFlight = JSON.parse(sessionStorage.getItem("selectedReturnFlight") || "null")

      // Get all departure and return seats
      const allDepartureSeats = JSON.parse(sessionStorage.getItem("allDepartureSeats") || "null") || []
      const allReturnSeats = JSON.parse(sessionStorage.getItem("allReturnSeats") || "null") || []

      // Fallback to single seats if multiple seats aren't available
      const departureSeat =
        allDepartureSeats.length > 0
          ? allDepartureSeats[0]
          : JSON.parse(sessionStorage.getItem("selectedDepartureSeat") || "null")
      const returnSeat =
        allReturnSeats.length > 0
          ? allReturnSeats[0]
          : JSON.parse(sessionStorage.getItem("selectedReturnSeat") || "null")

      if (!departureFlight) {
        console.error("Missing flight information")
        return false
      }

      // Create tickets for each passenger
      for (let i = 0; i < passengerData.length; i++) {
        const passenger = passengerData[i]

        // Get the appropriate seat for this passenger or use the first seat as fallback
        const passengerDepartureSeat = allDepartureSeats.length > i ? allDepartureSeats[i] : departureSeat
        const passengerReturnSeat = allReturnSeats.length > i ? allReturnSeats[i] : returnSeat

        if (!passengerDepartureSeat) {
          console.error(`Missing departure seat for passenger ${i + 1}`)
          continue
        }

        // Create departure ticket with unique ticket number
        const { error: departureTicketError } = await supabaseClient.from("tickets").insert({
          bookingid: bookingId,
          flightid: departureFlight.flightId,
          passengerid: passenger.passengerid,
          seatid: passengerDepartureSeat.seatid,
          status: "Confirmed",
          ticketprice: departureFlight.price || 0,
          classid: passengerDepartureSeat.classid || 1,
          ticketnumber: generateTicketNumber(),
        })

        if (departureTicketError) {
          console.error("Error creating departure ticket:", departureTicketError)
          continue
        }

        // Create return ticket if applicable
        if (returnFlight && passengerReturnSeat) {
          const { error: returnTicketError } = await supabaseClient.from("tickets").insert({
            bookingid: bookingId,
            flightid: returnFlight.flightId,
            passengerid: passenger.passengerid,
            seatid: passengerReturnSeat.seatid,
            status: "Confirmed",
            ticketprice: returnFlight.price || 0,
            classid: passengerReturnSeat.classid || 1,
            ticketnumber: generateTicketNumber(),
          })

          if (returnTicketError) {
            console.error("Error creating return ticket:", returnTicketError)
          }
        }
      }

      return true
    } catch (err) {
      console.error("Error creating tickets:", err)
      return false
    }
  }

  // Add the generateTicketNumber function
  const generateTicketNumber = () => {
    const prefix = "CA"
    const randomDigits = Math.floor(Math.random() * 10000000)
      .toString()
      .padStart(7, "0")
    return `${prefix}${randomDigits}`
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
