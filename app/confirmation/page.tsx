"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ChevronRight, AlertCircle, Check, ArrowLeft } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { format } from "date-fns"
import { api } from "@/lib/api/client"
import type { GuestInformation } from "@/lib/booking/types"
import { flushDraft } from "@/lib/store/draftSync"
import { useAppDispatch, useAppStore, useHydrated } from "@/lib/store/hooks"
import { setBookingProgress, setPassengers as storePassengers } from "@/lib/store/slices/bookingSlices"

interface SelectedFlightDetails {
  flightId: number
  class: string
  fareType: string
  price: number
  flightNumber?: string
  departureTime?: string
  arrivalTime?: string
  departureAirport?: string
  arrivalAirport?: string
  duration?: string
}

interface Seat {
  seatid: number
  airplanetypeid: number
  seatnumber: string
  classid: number
  seattype: string
}

interface CustomerInfo {
  name: string
  email: string
  phone: string
  passportNumber?: string
  identityCardNumber?: string
}

interface PassengerInfo {
  firstName: string
  lastName: string
  passportNumber?: string
  identityCardNumber?: string
  isPrimary?: boolean
}

export default function ConfirmationPage() {
  const router = useRouter()
  const dispatch = useAppDispatch()
  const store = useAppStore()
  const hydrated = useHydrated()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [departureFlight, setDepartureFlight] = useState<SelectedFlightDetails | null>(null)
  const [returnFlight, setReturnFlight] = useState<SelectedFlightDetails | null>(null)
  const [departureSeat, setDepartureSeat] = useState<Seat | null>(null)
  const [returnSeat, setReturnSeat] = useState<Seat | null>(null)
  const [departureSeats, setDepartureSeats] = useState<Seat[]>([])
  const [returnSeats, setReturnSeats] = useState<Seat[]>([])
  const [isRoundTrip, setIsRoundTrip] = useState(false)
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null)
  const [passengers, setPassengers] = useState<PassengerInfo[]>([])
  const [bookingReference, setBookingReference] = useState<string>("")
  const [contactInfo, setContactInfo] = useState<any>(null)
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({})

  const splitFullName = (fullName: string) => {
    const parts = fullName.trim().split(" ")
    
    return { 
      firstName: parts[0] || "", 
      lastName: parts[1] || "", 
    }
  }

  useEffect(() => {
    if (!hydrated) return

    const state = store.getState()

    // Check if user is logged in
    const loggedIn = !!state.auth.user
    const email = state.auth.user?.email ?? null

    // If there's an existing booking reference, use it
    if (state.booking.bookingReference) {
      setBookingReference(state.booking.bookingReference)
    } else {
      // Otherwise generate a new one
      const newReference = generateBookingReference()
      setBookingReference(newReference)
      dispatch(setBookingProgress({ bookingReference: newReference }))
    }

    // Load flight, seat, passenger and contact details from the store
    const loadBookingDetails = async () => {
      try {
        setLoading(true)

        // Load flight details
        const { departure: parsedDepartureFlight, return: parsedReturnFlight } = state.flights

        if (!parsedDepartureFlight) {
          throw new Error("No departure flight selected")
        }

        setDepartureFlight(parsedDepartureFlight)

        if (parsedReturnFlight) {
          setReturnFlight(parsedReturnFlight)
          setIsRoundTrip(true)
        }

        // Load seat details: one seat per passenger for each flight
        const allDepartureSeats = state.seats.departure
        const allReturnSeats = state.seats.return

        if (allDepartureSeats.length > 0) {
          setDepartureSeats(allDepartureSeats)
          setDepartureSeat(allDepartureSeats[0])
        } else {
          throw new Error("No departure seat selected")
        }

        if (allReturnSeats.length > 0 && parsedReturnFlight) {
          setReturnSeats(allReturnSeats)
          setReturnSeat(allReturnSeats[0])
        }

        // Load passenger information
        let parsedPassengers: GuestInformation[] = state.passengers
        if (parsedPassengers.length > 0) {
          // Ensure at least one passenger is marked as primary
          if (!parsedPassengers.some((p) => p.isPrimary)) {
            parsedPassengers = parsedPassengers.map((p, index) => (index === 0 ? { ...p, isPrimary: true } : p))
            dispatch(storePassengers(parsedPassengers))
          }

          setPassengers(parsedPassengers)
        }

        // Load contact information
        const parsedContact = state.contact
        if (parsedContact) {
          const nameData = splitFullName(parsedContact.contactName || "")
          setContactInfo({
            ...parsedContact,
            firstName: nameData.firstName,
            lastName: nameData.lastName
          })
        } else if (parsedPassengers.length > 0) {
          // If no contact info, try to use primary passenger info
          const primaryPassenger = parsedPassengers.find((p) => p.isPrimary) || parsedPassengers[0]
          if (primaryPassenger) {
            setContactInfo({
              firstName: primaryPassenger.firstName || "",
              lastName: primaryPassenger.lastName || "",
              email: primaryPassenger.email || (loggedIn ? email : ""),
              phone: primaryPassenger.phone || "",
            })
          }
        }

        // If logged in, fetch customer info from the server
        if (loggedIn && email) {
          try {
            const { customerDetails: customerData } = await api.get<{ customerDetails: any }>("/api/profile")

            // Set customer info with actual data from database
            setCustomerInfo({
              name: `${customerData.firstname} ${customerData.lastname}`,
              email: email,
              phone: customerData.phonenumber || "N/A",
            })
          } catch (err) {
            console.error("Error fetching customer data:", err)
            // Fallback to default info if the request fails
            setCustomerInfo({
              name: "User",
              email: email,
              phone: "N/A",
            })
          }
        }
      } catch (err: any) {
        console.error("Error loading booking details:", err)
        setError(err.message || "Failed to load booking details")
      } finally {
        setLoading(false)
      }
    }

    loadBookingDetails()
  }, [hydrated, store, dispatch])

  // Calculate total price - Fixed to properly calculate the total price
  const calculateTotalPrice = () => {
    let total = 0
    if (departureFlight && typeof departureFlight.price === "number") {
      total += departureFlight.price
    }
    if (returnFlight && typeof returnFlight.price === "number") {
      total += returnFlight.price
    }

    // Multiply by number of passengers
    const passengerCount = Math.max(passengers.length, 1)
    total = total * passengerCount

    // Ensure we have a valid number
    if (isNaN(total) || total <= 0) {
      console.warn("Invalid total price calculated, using default price")
      total = 1500000 // Default price if calculation fails
    }

    return total
  }

  // Generate a random booking reference
  const generateBookingReference = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    let result = ""
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN").format(amount)
  }

  // Creates the booking on the server before moving on to payment. Customers, booking,
  // passengers and tickets are written in a single database transaction.
  const handleContinueToPayment = async () => {
    try {
      setLoading(true)
      setError(null)
      setValidationErrors({})

      if (!departureFlight || !departureSeat || passengers.length === 0) {
        throw new Error("Booking information is missing. Please try again.")
      }

      // Make sure the server has the latest version of the booking draft
      await dispatch(flushDraft())

      const created = await api.post<{ bookingId: number; bookingReference: string; totalPrice: number }>(
        "/api/bookings",
      )

      // Keep the booking details for the payment page
      dispatch(
        setBookingProgress({
          bookingId: created.bookingId,
          bookingReference: created.bookingReference,
          totalPrice: created.totalPrice,
        }),
      )

      // Redirect to payment page
      router.push("/payment")
    } catch (err: any) {
      console.error("Error proceeding to payment:", err)
      setError(err.message || "Failed to process booking. Please try again.")
      setLoading(false)
    }
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
        <Button onClick={() => router.push("/results")} className="mt-4">
          Return to Flight Selection
        </Button>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-[#0f2d3c] pb-20 text-white">
      <div className="w-full bg-[#1a3a4a] py-4">
        <div className="container mx-auto px-4">
          {/* Progress Steps - Now full width */}
          <div className="flex justify-between w-full">
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white font-bold">
                1
              </div>
              <span className="text-xs text-white mt-1">Passenger</span>
            </div>
            <div className="flex-1 h-1 bg-gray-300 self-center mx-2"></div>
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white font-bold">
                2
              </div>
              <span className="text-xs text-white mt-1">Contact</span>
            </div>
            <div className="flex-1 h-1 bg-gray-300 self-center mx-2"></div>
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                3
              </div>
              <span className="text-xs text-white mt-1">Confirmation</span>
            </div>
            <div className="flex-1 h-1 bg-gray-300 self-center mx-2"></div>
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-gray-400 flex items-center justify-center text-white font-bold">
                4
              </div>
              <span className="text-xs text-white mt-1">Payment</span>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="flex items-start max-w-2xl mb-8 items-center">
          <button onClick={() => router.back()} className="mr-4 text-white hover:text-gray-300 transition-colors">
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="text-2xl font-bold text-white">Booking Confirmation</h1>
        </div>

        {/* Booking Reference */}
        <section className="mb-6 bg-green-600 rounded-lg p-4">
          <div className="flex items-center">
            <Check className="h-6 w-6 mr-2" />
            <div>
              <h2 className="text-xl font-bold">Booking Reference: {bookingReference}</h2>
              <p>Please save this reference for your records</p>
            </div>
          </div>
        </section>

        {/* Validation Errors */}
        {Object.keys(validationErrors).length > 0 && (
          <section className="mb-6 bg-red-600 rounded-lg p-4">
            <div className="flex items-center">
              <AlertCircle className="h-6 w-6 mr-2" />
              <div>
                <h2 className="text-xl font-bold">Validation Errors</h2>
                <ul className="list-disc list-inside">
                  {Object.values(validationErrors).map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        )}

        {/* Passenger Information */}
        <section className="mb-6 bg-[#1a3a4a] rounded-lg p-4">
          <h2 className="text-xl font-bold mb-4">Passenger Information</h2>
          {passengers && passengers.length > 0 ? (
            <div className="space-y-4">
              {passengers.map((passenger, index) => (
                <div key={index} className="border-b border-gray-700 pb-4 last:border-b-0 last:pb-0">
                  <h3 className="font-medium text-lg mb-2">
                    {passenger.isPrimary ? "Primary Passenger" : `Passenger ${index + 1}`}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="font-medium">Name</p>
                      <p>{`${passenger.firstName} ${passenger.lastName}`}</p>
                    </div>
                    {passenger.passportNumber && (
                      <div className={validationErrors[`passenger_${index}_passport`] ? "text-red-500" : ""}>
                        <p className="font-medium">Passport Number</p>
                        <p className={validationErrors[`passenger_${index}_passport`] ? "border-b border-red-500" : ""}>
                          {passenger.passportNumber}
                        </p>
                        {validationErrors[`passenger_${index}_passport`] && (
                          <p className="text-sm">{validationErrors[`passenger_${index}_passport`]}</p>
                        )}
                      </div>
                    )}
                    {passenger.identityCardNumber && (
                      <div className={validationErrors[`passenger_${index}_idcard`] ? "text-red-500" : ""}>
                        <p className="font-medium">Identity Card Number</p>
                        <p className={validationErrors[`passenger_${index}_idcard`] ? "border-b border-red-500" : ""}>
                          {passenger.identityCardNumber}
                        </p>
                        {validationErrors[`passenger_${index}_idcard`] && (
                          <p className="text-sm">{validationErrors[`passenger_${index}_idcard`]}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : customerInfo ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="font-medium">Name</p>
                <p>{customerInfo.name}</p>
              </div>
              {customerInfo.passportNumber && (
                <div>
                  <p className="font-medium">Passport Number</p>
                  <p>{customerInfo.passportNumber}</p>
                </div>
              )}
              {customerInfo.identityCardNumber && (
                <div>
                  <p className="font-medium">Identity Card Number</p>
                  <p>{customerInfo.identityCardNumber}</p>
                </div>
              )}
            </div>
          ) : (
            <p>Passenger information not available</p>
          )}
        </section>

        {/* Contact Information */}
        <section className="mb-6 bg-[#1a3a4a] rounded-lg p-4">
          <h2 className="text-xl font-bold mb-2">Contact Information</h2>
          {contactInfo ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="font-medium">Name</p>
                <p>{`${contactInfo.contactName || ""}`}</p>
              </div>
              <div>
                <p className="font-medium">Email</p>
                <p>{contactInfo.contactEmail || "N/A"}</p>
              </div>
              <div>
                <p className="font-medium">Phone</p>
                <p>{contactInfo.contactPhone || "N/A"}</p>
              </div>
            </div>
          ) : customerInfo ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="font-medium">Name</p>
                <p>{customerInfo.name || "N/A"}</p>
              </div>
              <div>
                <p className="font-medium">Email</p>
                <p>{customerInfo.email || "N/A"}</p>
              </div>
              <div>
                <p className="font-medium">Phone</p>
                <p>{customerInfo.phone || "N/A"}</p>
              </div>
            </div>
          ) : (
            <p>Contact information not available</p>
          )}
        </section>

        {/* Departure Flight */}
        <section className="mb-6 bg-[#1a3a4a] rounded-lg p-4">
          <h2 className="text-xl font-bold mb-2">Departure Flight</h2>
          {departureFlight && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="font-medium">Flight Number</p>
                <p>{departureFlight.flightNumber}</p>
                <p className="font-medium mt-2">Route</p>
                <p>
                  {departureFlight.departureAirport} → {departureFlight.arrivalAirport}
                </p>
                <p className="font-medium mt-2">Date & Time</p>
                <p>
                  {departureFlight.departureTime &&
                    format(new Date(departureFlight.departureTime), "MMM d, yyyy HH:mm")}
                </p>
              </div>
              <div>
                <p className="font-medium">Class</p>
                <p>{departureFlight.fareType}</p>
                <p className="font-medium mt-2">Seat(s)</p>
                <p>
                  {(() => {
                    // Get all departure seats from the store
                    const allDepartureSeatsData = departureSeats.length > 0 ? departureSeats : null
                    if (allDepartureSeatsData) {
                      try {
                        const allDepartureSeats = allDepartureSeatsData
                        if (Array.isArray(allDepartureSeats) && allDepartureSeats.length > 0) {
                          // Extract and join seat numbers
                          return allDepartureSeats
                            .map((seat) => seat.seatnumber)
                            .filter(Boolean)
                            .join(", ")
                        }
                      } catch (err) {
                        console.error("Error parsing departure seats:", err)
                      }
                    }

                    // Fallback to single seat if multiple seats aren't available
                    return departureSeat
                      ? typeof departureSeat.seatnumber === "string"
                        ? departureSeat.seatnumber
                        : `Seat ID: ${departureSeat.seatid}`
                      : "Not selected"
                  })()}
                </p>
                <p className="font-medium mt-2">Price</p>
                <p>{formatCurrency(departureFlight.price)} VND</p>
              </div>
            </div>
          )}
        </section>

        {/* Return Flight (if round trip) */}
        {isRoundTrip && returnFlight && (
          <section className="mb-6 bg-[#1a3a4a] rounded-lg p-4">
            <h2 className="text-xl font-bold mb-2">Return Flight</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="font-medium">Flight Number</p>
                <p>{returnFlight.flightNumber}</p>
                <p className="font-medium mt-2">Route</p>
                <p>
                  {returnFlight.departureAirport} → {returnFlight.arrivalAirport}
                </p>
                <p className="font-medium mt-2">Date & Time</p>
                <p>{returnFlight.departureTime && format(new Date(returnFlight.departureTime), "MMM d, yyyy HH:mm")}</p>
              </div>
              <div>
                <p className="font-medium">Class</p>
                <p>{returnFlight.fareType}</p>
                <p className="font-medium mt-2">Seat(s)</p>
                <p>
                  {(() => {
                    // Get all return seats from the store
                    const allReturnSeatsData = returnSeats.length > 0 ? returnSeats : null
                    if (allReturnSeatsData) {
                      try {
                        const allReturnSeats = allReturnSeatsData
                        if (Array.isArray(allReturnSeats) && allReturnSeats.length > 0) {
                          // Extract and join seat numbers
                          return allReturnSeats
                            .map((seat) => seat.seatnumber)
                            .filter(Boolean)
                            .join(", ")
                        }
                      } catch (err) {
                        console.error("Error parsing return seats:", err)
                      }
                    }

                    // Fallback to single seat if multiple seats aren't available
                    return returnSeat?.seatnumber || "Not selected"
                  })()}
                </p>
                <p className="font-medium mt-2">Price</p>
                <p>{formatCurrency(returnFlight.price)} VND</p>
              </div>
            </div>
          </section>
        )}

        {/* Total Price */}
        <section className="mb-6 bg-[#1a3a4a] rounded-lg p-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">Total Price</h2>
            <p className="text-2xl font-bold">{formatCurrency(calculateTotalPrice())} VND</p>
          </div>
        </section>
      </div>

      {/* Sticky bar at the bottom */}
      <div className="fixed bottom-0 left-0 right-0 z-10 bg-white p-4 shadow-lg">
        <div className="container mx-auto flex items-center justify-between">
          <div className="text-xl font-bold text-[#0f2d3c]">Total: {formatCurrency(calculateTotalPrice())} VND</div>
          <Button className="bg-[#0f2d3c] hover:bg-[#0f2d3c]/90" onClick={handleContinueToPayment} disabled={loading}>
            {loading ? "Processing..." : "Continue to Payment"}
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </div>
    </main>
  )
}
