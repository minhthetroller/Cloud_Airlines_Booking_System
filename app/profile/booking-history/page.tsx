"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { AlertCircle, Calendar, Plane, ArrowLeft, ChevronDown, ChevronUp, X, AlertTriangle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { format } from "date-fns"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import axios from "axios"

interface Booking {
  bookingid: string
  bookingreference: string
  bookingdatetime: string
  totalprice: number
  currencycode: string
  bookingstatus: string
  flights: {
    flightid: string
    flightnumber: string
    departureairport: string
    arrivalairport: string
    departuredatetime: string
    status: string
  }[]
  expanded?: boolean
  tickets?: any[]
  payment?: any
}

export default function BookingHistoryPage() {
  const router = useRouter()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { isAuthenticated, user } = useAuth()
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [bookingToCancel, setBookingToCancel] = useState<string | null>(null)
  const [cancelLoading, setCancelLoading] = useState(false)
  const [cancelError, setCancelError] = useState<string | null>(null)
  const [cancelSuccess, setCancelSuccess] = useState(false)

  useEffect(() => {
    // Check if user is authenticated
    if (!isAuthenticated) {
      router.push("/login")
      return
    }

    fetchBookingHistory()
  }, [isAuthenticated, user, router])

  const fetchBookingHistory = async () => {
    try {
      setLoading(true)
      setError(null)

      // Get user email from auth context
      if (!user?.email) {
        throw new Error("User email not found")
      }

      const response = await axios.get(`/api/profile/booking-history?email=${encodeURIComponent(user.email)}`)
      
      const data = response.data
      setBookings(data.bookings)
    } catch (err: any) {
      console.error("Error fetching booking history:", err)
      setError(err.response?.data?.error || err.message || "Failed to load booking history")
    } finally {
      setLoading(false)
    }
  }

  const toggleBookingDetails = async (index: number) => {
    const updatedBookings = [...bookings]
    const booking = updatedBookings[index]

    // Toggle expanded state
    booking.expanded = !booking.expanded

    // If expanding and we don't have ticket details yet, fetch them
    if (booking.expanded && (!booking.tickets || !booking.payment)) {
      try {
        const response = await axios.post('/api/profile/booking-history', {
          bookingId: booking.bookingid,
        })

        const data = response.data
        booking.tickets = data.tickets
        booking.payment = data.payment
      } catch (err: any) {
        console.error("Error fetching booking details:", err)
      }
    }

    setBookings(updatedBookings)
  }

  const openCancelDialog = (bookingId: string) => {
    setBookingToCancel(bookingId)
    setCancelDialogOpen(true)
    setCancelError(null)
    setCancelSuccess(false)
  }

  const handleCancelBooking = async () => {
    if (!bookingToCancel) return

    setCancelLoading(true)
    setCancelError(null)

    try {
      const response = await axios.put('/api/profile/booking-history', {
        bookingId: bookingToCancel,
      })

      // Update the local state
      setBookings((prevBookings) =>
        prevBookings.map((booking) =>
          booking.bookingid === bookingToCancel ? { ...booking, bookingstatus: "Cancelled" } : booking,
        ),
      )

      setCancelSuccess(true)

      // Close dialog after a short delay
      setTimeout(() => {
        setCancelDialogOpen(false)
        fetchBookingHistory() // Refresh the data
      }, 2000)
    } catch (err: any) {
      console.error("Error cancelling booking:", err)
      setCancelError(err.response?.data?.error || err.message || "Failed to cancel booking. Please try again.")
    } finally {
      setCancelLoading(false)
    }
  }

  // Format currency
  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("vi-VN").format(amount)
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
        <Button onClick={() => router.push("/profile")} className="mt-4">
          Return to Profile
        </Button>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-[#0f2d3c] text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center mb-8">
          <Link href="/profile" className="mr-4 text-white hover:text-gray-300 transition-colors">
            <ArrowLeft className="h-6 w-6" />
          </Link>
          <h1 className="text-3xl font-bold">Booking History</h1>
        </div>

        {bookings.length > 0 ? (
          <div className="space-y-6">
            {bookings.map((booking, index) => (
              <div key={booking.bookingid} className="bg-[#1a3a4a] rounded-lg overflow-hidden">
                <div className="bg-[#0a1e29] p-4 flex justify-between items-center">
                  <div>
                    <p className="text-gray-400">Booking Reference</p>
                    <p className="text-xl font-bold">{booking.bookingreference}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-400">Booking Date</p>
                    <p>{format(new Date(booking.bookingdatetime), "MMM d, yyyy")}</p>
                  </div>
                </div>

                <div className="p-4">
                  {booking.flights.map((flight, flightIndex) => (
                    <div
                      key={flightIndex}
                      className="mb-4 pb-4 border-b border-[#2a4a5a] last:border-0 last:mb-0 last:pb-0"
                    >
                      <div className="flex items-center mb-2">
                        <Plane className="mr-2 h-4 w-4 text-[#9b6a4f]" />
                        <span className="font-medium">{flight.flightnumber}</span>
                        <span
                          className={`ml-auto px-2 py-1 rounded-full text-xs ${
                            booking.bookingstatus === "Confirmed"
                              ? "bg-green-500/20 text-green-500"
                              : booking.bookingstatus === "Cancelled"
                                ? "bg-red-500/20 text-red-500"
                                : "bg-yellow-500/20 text-yellow-500"
                          }`}
                        >
                          {booking.bookingstatus}
                        </span>
                      </div>
                      <div className="flex items-center">
                        <div>
                          <p className="font-medium">
                            {flight.departureairport} → {flight.arrivalairport}
                          </p>
                          <div className="flex items-center mt-1 text-sm text-gray-400">
                            <Calendar className="mr-1 h-3 w-3" />
                            {format(new Date(flight.departuredatetime), "MMM d, yyyy HH:mm")}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  <div className="flex justify-between items-center mt-4 pt-4 border-t border-[#2a4a5a]">
                    <div>
                      <p className="text-gray-400">Total Price</p>
                      <p className="text-xl font-bold">
                        {formatCurrency(booking.totalprice, booking.currencycode)} {booking.currencycode}
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        className="border-[#9b6a4f] text-[#9b6a4f] hover:bg-[#9b6a4f] hover:text-white transition-colors flex items-center"
                        onClick={() => toggleBookingDetails(index)}
                      >
                        {booking.expanded ? (
                          <>
                            <ChevronUp className="mr-1 h-4 w-4" /> Hide Details
                          </>
                        ) : (
                          <>
                            <ChevronDown className="mr-1 h-4 w-4" /> View Details
                          </>
                        )}
                      </Button>

                      {booking.bookingstatus !== "Cancelled" && (
                        <Button
                          variant="outline"
                          className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white transition-colors flex items-center"
                          onClick={() => openCancelDialog(booking.bookingid)}
                        >
                          <X className="mr-1 h-4 w-4" /> Cancel
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Expanded details section */}
                  {booking.expanded && (
                    <div className="mt-4 pt-4 border-t border-[#2a4a5a] animate-fadeIn">
                      {/* Tickets and passengers */}
                      {booking.tickets && booking.tickets.length > 0 ? (
                        <div className="mb-6">
                          <h3 className="text-lg font-semibold mb-3">Tickets & Passengers</h3>
                          <div className="space-y-4">
                            {booking.tickets.map((ticket: any, ticketIndex: number) => (
                              <div key={ticketIndex} className="bg-[#0a1e29] p-3 rounded-md">
                                <div className="flex justify-between items-center mb-2">
                                  <div className="flex items-center">
                                    <Plane className="mr-2 h-4 w-4 text-[#9b6a4f]" />
                                    <span>{ticket.flights?.flightnumber}</span>
                                  </div>
                                  <span className="text-sm">
                                    Ticket #{ticket.ticketid ? String(ticket.ticketid).substring(0, 8) : "N/A"}
                                  </span>
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-sm">
                                  <div>
                                    <p className="text-gray-400">Passenger</p>
                                    <p>
                                      {ticket.passengers?.customers?.pronoun || ""}{" "}
                                      {ticket.passengers?.customers?.firstname || ""}{" "}
                                      {ticket.passengers?.customers?.lastname || ""}
                                    </p>
                                  </div>

                                  <div>
                                    <p className="text-gray-400">Seat</p>
                                    <p>{ticket.seats?.seatnumber || "Not assigned"}</p>
                                  </div>

                                  <div>
                                    <p className="text-gray-400">Class</p>
                                    <p>{ticket.seats?.seatclass || "Economy"}</p>
                                  </div>

                                  <div>
                                    <p className="text-gray-400">Status</p>
                                    <p
                                      className={
                                        booking.bookingstatus === "Confirmed"
                                          ? "text-green-500"
                                          : booking.bookingstatus === "Cancelled"
                                            ? "text-red-500"
                                            : "text-yellow-500"
                                      }
                                    >
                                      {booking.bookingstatus}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="mb-6 text-center py-4">
                          <p className="text-gray-400">Ticket details not available</p>
                        </div>
                      )}

                      {/* Payment information */}
                      {booking.payment ? (
                        <div>
                          <h3 className="text-lg font-semibold mb-3">Payment Information</h3>
                          <div className="bg-[#0a1e29] p-3 rounded-md">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <p className="text-gray-400">Payment Method</p>
                                <p>{booking.payment.paymentmethod}</p>
                              </div>

                              <div>
                                <p className="text-gray-400">Payment Date</p>
                                <p>{format(new Date(booking.payment.paymentdatetime), "MMM d, yyyy")}</p>
                              </div>

                              <div>
                                <p className="text-gray-400">Amount</p>
                                <p>
                                  {formatCurrency(booking.payment.amount, booking.payment.currencycode)}{" "}
                                  {booking.payment.currencycode}
                                </p>
                              </div>

                              <div>
                                <p className="text-gray-400">Status</p>
                                <p
                                  className={
                                    booking.payment.paymentstatus === "Completed"
                                      ? "text-green-500"
                                      : booking.payment.paymentstatus === "Failed"
                                        ? "text-red-500"
                                        : "text-yellow-500"
                                  }
                                >
                                  {booking.payment.paymentstatus}
                                </p>
                              </div>

                              {booking.payment.transactionid && (
                                <div className="col-span-2">
                                  <p className="text-gray-400">Transaction ID</p>
                                  <p>{booking.payment.transactionid}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-4">
                          <p className="text-gray-400">Payment details not available</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-[#1a3a4a] rounded-lg">
            <div className="mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mx-auto text-gray-500"
              >
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <h4 className="text-xl font-bold mb-2">No Bookings Found</h4>
            <p className="text-gray-400 mb-6">You don't have any bookings in our system yet.</p>
            <Link href="/">
              <Button className="bg-[#9b6a4f] hover:bg-[#9b6a4f]/90">Book Your First Flight</Button>
            </Link>
          </div>
        )}
      </div>

      {/* Cancel Booking Confirmation Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-xl">Cancel Booking</DialogTitle>
            <DialogDescription className="text-gray-500 pt-2">
              Are you sure you want to cancel this booking? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {cancelError && (
            <Alert variant="destructive" className="mt-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{cancelError}</AlertDescription>
            </Alert>
          )}

          {cancelSuccess && (
            <Alert className="mt-2 bg-green-500/10 text-green-500 border-green-500">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>Booking cancelled successfully!</AlertDescription>
            </Alert>
          )}

          <div className="bg-amber-50 border border-amber-200 rounded-md p-3 flex items-start mt-2">
            <AlertTriangle className="h-5 w-5 text-amber-500 mr-2 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">
              <p className="font-medium">Please note:</p>
              <p>
                Cancelling your booking may be subject to airline policies and fees. Refunds, if applicable, will be
                processed according to the fare rules.
              </p>
            </div>
          </div>

          <DialogFooter className="flex gap-3 sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setCancelDialogOpen(false)} disabled={cancelLoading}>
              Keep My Booking
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleCancelBooking}
              disabled={cancelLoading || cancelSuccess}
              className="bg-red-600 hover:bg-red-700"
            >
              {cancelLoading ? "Cancelling..." : "Yes, Cancel Booking"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}
