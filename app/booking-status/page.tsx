"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Plane, Calendar, CreditCard, User, MapPin } from "lucide-react"
import supabaseClient from "@/lib/supabase/supabaseClient"
import { format } from "date-fns"

export default function BookingStatusPage() {
  const router = useRouter()
  const [bookingReference, setBookingReference] = useState("")
  const [lastName, setLastName] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [bookingDetails, setBookingDetails] = useState<any | null>(null)
  const [tickets, setTickets] = useState<any[]>([])
  const [payment, setPayment] = useState<any | null>(null)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!bookingReference || !lastName) {
      setError("Please enter both booking reference and last name")
      return
    }

    setLoading(true)
    setError(null)
    setBookingDetails(null)
    setTickets([])
    setPayment(null)

    try {
      // Step 1: Find the booking by reference
      const { data: bookingData, error: bookingError } = await supabaseClient
        .from("bookings")
        .select("*")
        .eq("bookingreference", bookingReference)
        .single()

      if (bookingError || !bookingData) {
        throw new Error("Booking not found. Please check your booking reference.")
      }

      // Step 2: Verify the last name matches a passenger on this booking
      const { data: passengersData, error: passengersError } = await supabaseClient
        .from("passengers")
        .select("*, customers(*)")
        .eq("bookingid", bookingData.bookingid)

      if (passengersError || !passengersData || passengersData.length === 0) {
        throw new Error("No passengers found for this booking.")
      }

      // Check if any passenger's last name matches
      const lastNameMatch = passengersData.some(
        (passenger) =>
          passenger.customers &&
          passenger.customers.lastname &&
          passenger.customers.lastname.toLowerCase() === lastName.toLowerCase(),
      )

      if (!lastNameMatch) {
        throw new Error(
          "The last name you entered does not match any passenger on this booking. Please check and try again.",
        )
      }

      // Step 3: Get tickets for this booking
      const { data: ticketsData, error: ticketsError } = await supabaseClient
        .from("tickets")
        .select(`
          *,
          flights(*),
          seats(*),
          passengers(*, customers(*))
        `)
        .eq("bookingid", bookingData.bookingid)

      if (ticketsError) {
        console.error("Error fetching tickets:", ticketsError)
      }

      // Step 4: Get payment information
      const { data: paymentData, error: paymentError } = await supabaseClient
        .from("payments")
        .select("*")
        .eq("bookingid", bookingData.bookingid)
        .order("paymentdatetime", { ascending: false })
        .limit(1)
        .single()

      if (paymentError) {
        console.error("Error fetching payment:", paymentError)
      }

      // Set the data
      setBookingDetails(bookingData)
      setTickets(ticketsData || [])
      setPayment(paymentData)
    } catch (err: any) {
      console.error("Error searching for booking:", err)
      setError(err.message || "Failed to find booking. Please check your details and try again.")
    } finally {
      setLoading(false)
    }
  }

  // Format currency
  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("vi-VN").format(amount)
  }

  return (
    // Changed background color here to match the search button
    <main className="min-h-screen bg-[#0f2d3c]">
      {/* Added a div with white background for the header section */}
      <div className="w-full bg-white">
        <div className="container mx-auto px-4 py-8">
          {/* Modified header to match main_page.tsx: added mb-4 and wrapped logo */}
          <header className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Link href="/">
                <Image src="/logo.png" alt="STARLUX Airlines Logo" width={180} height={60} className="h-8 w-auto" />
              </Link>
            </div>
          </header>
        </div>
      </div>

      {/* Added some top padding to separate content from the new header background */}
      <div className="container mx-auto px-4 py-8 pt-8">
        <div className="mx-auto max-w-3xl">
          {/* Changed text color to white for better contrast on the new background */}
          <h1 className="mb-6 text-3xl font-bold text-white">Check Booking Status</h1>

          <div className="mb-8 rounded-lg bg-white p-6 shadow-md">
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bookingReference">Booking Reference</Label>
                <Input
                  id="bookingReference"
                  value={bookingReference}
                  onChange={(e) => setBookingReference(e.target.value)}
                  placeholder="Enter your booking reference"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Enter passenger's last name"
                  required
                />
              </div>

              <Button type="submit" className="w-full bg-[#0f2d3c]" disabled={loading}>
                {loading ? "Searching..." : "Search"}
              </Button>
            </form>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {bookingDetails && (
            <div className="space-y-6">
              <div className="rounded-lg bg-white p-6 shadow-md">
                <h2 className="mb-4 text-xl font-bold text-[#0f2d3c]">Booking Details</h2>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-sm text-gray-500">Booking Reference</p>
                    <p className="font-medium">{bookingDetails.bookingreference}</p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-500">Booking Date</p>
                    <p className="font-medium">{format(new Date(bookingDetails.bookingdatetime), "MMM d, yyyy")}</p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-500">Status</p>
                    <p
                      className={`font-medium ${
                        bookingDetails.bookingstatus === "Confirmed"
                          ? "text-green-600"
                          : bookingDetails.bookingstatus === "Cancelled"
                            ? "text-red-600"
                            : "text-yellow-600"
                      }`}
                    >
                      {bookingDetails.bookingstatus}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-500">Total Price</p>
                    <p className="font-medium">
                      {formatCurrency(bookingDetails.totalprice, bookingDetails.currencycode)}{" "}
                      {bookingDetails.currencycode}
                    </p>
                  </div>
                </div>
              </div>

              {tickets.length > 0 && (
                <div className="rounded-lg bg-white p-6 shadow-md">
                  <h2 className="mb-4 text-xl font-bold text-[#0f2d3c]">Flight Details</h2>

                  {tickets.map((ticket, index) => (
                    <div key={index} className="mb-6 border-b border-gray-200 pb-6 last:border-0 last:mb-0 last:pb-0">
                      <div className="mb-4 flex items-center justify-between">
                        <div className="flex items-center">
                          <Plane className="mr-2 h-5 w-5 text-[#0f2d3c]" />
                          <span className="font-medium">{ticket.flights?.flightnumber}</span>
                        </div>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-medium ${
                            ticket.flights?.status === "Confirmed"
                              ? "bg-green-100 text-green-800"
                              : ticket.flights?.status === "Cancelled"
                                ? "bg-red-100 text-red-800"
                                : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {ticket.flights?.status}
                        </span>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <div className="flex items-center">
                            <MapPin className="mr-2 h-4 w-4 text-gray-500" />
                            <div>
                              <p className="text-sm text-gray-500">From</p>
                              <p className="font-medium">{ticket.flights?.departureairportcode}</p>
                            </div>
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center">
                            <MapPin className="mr-2 h-4 w-4 text-gray-500" />
                            <div>
                              <p className="text-sm text-gray-500">To</p>
                              <p className="font-medium">{ticket.flights?.arrivalairportcode}</p>
                            </div>
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center">
                            <Calendar className="mr-2 h-4 w-4 text-gray-500" />
                            <div>
                              <p className="text-sm text-gray-500">Departure</p>
                              <p className="font-medium">
                                {ticket.flights?.departuredatetime
                                  ? format(new Date(ticket.flights.departuredatetime), "MMM d, yyyy HH:mm")
                                  : "N/A"}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center">
                            <Calendar className="mr-2 h-4 w-4 text-gray-500" />
                            <div>
                              <p className="text-sm text-gray-500">Arrival</p>
                              <p className="font-medium">
                                {ticket.flights?.arrivaldatetime
                                  ? format(new Date(ticket.flights.arrivaldatetime), "MMM d, yyyy HH:mm")
                                  : "N/A"}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 rounded-lg bg-gray-50 p-4">
                        <h3 className="mb-2 font-medium">Passenger & Seat</h3>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <User className="mr-2 h-4 w-4 text-gray-500" />
                            <span>
                              {ticket.passengers?.customers?.pronoun || ""}{" "}
                              {ticket.passengers?.customers?.firstname || ""}{" "}
                              {ticket.passengers?.customers?.lastname || ""}
                            </span>
                          </div>
                          <div>
                            <span className="rounded-md bg-[#0f2d3c] px-2 py-1 text-xs font-medium text-white">
                              Seat {ticket.seats?.seatnumber || "Not assigned"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {payment && (
                <div className="rounded-lg bg-white p-6 shadow-md">
                  <h2 className="mb-4 text-xl font-bold text-[#0f2d3c]">Payment Information</h2>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <div className="flex items-center">
                        <CreditCard className="mr-2 h-4 w-4 text-gray-500" />
                        <div>
                          <p className="text-sm text-gray-500">Payment Method</p>
                          <p className="font-medium">{payment.paymentmethod}</p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm text-gray-500">Amount</p>
                      <p className="font-medium">
                        {formatCurrency(payment.amount, payment.currencycode)} {payment.currencycode}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-gray-500">Date</p>
                      <p className="font-medium">{format(new Date(payment.paymentdatetime), "MMM d, yyyy HH:mm")}</p>
                    </div>

                    <div>
                      <p className="text-sm text-gray-500">Status</p>
                      <p
                        className={`font-medium ${
                          payment.paymentstatus === "Completed"
                            ? "text-green-600"
                            : payment.paymentstatus === "Failed"
                              ? "text-red-600"
                              : "text-yellow-600"
                        }`}
                      >
                        {payment.paymentstatus}
                      </p>
                    </div>

                    {payment.transactionid && (
                      <div>
                        <p className="text-sm text-gray-500">Transaction ID</p>
                        <p className="font-medium">{payment.transactionid}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
