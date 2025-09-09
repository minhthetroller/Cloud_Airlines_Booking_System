"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ChevronRight, AlertCircle, Check, ArrowLeft } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { format } from "date-fns"
import supabaseClient from "@/lib/supabase-client"

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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [departureFlight, setDepartureFlight] = useState<SelectedFlightDetails | null>(null)
  const [returnFlight, setReturnFlight] = useState<SelectedFlightDetails | null>(null)
  const [departureSeat, setDepartureSeat] = useState<Seat | null>(null)
  const [returnSeat, setReturnSeat] = useState<Seat | null>(null)
  const [isRoundTrip, setIsRoundTrip] = useState(false)
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null)
  const [passengers, setPassengers] = useState<PassengerInfo[]>([])
  const [bookingReference, setBookingReference] = useState<string>("")
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [customerId, setCustomerId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [existingBookingId, setExistingBookingId] = useState<string | null>(null)
  const [contactInfo, setContactInfo] = useState<any>(null)
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({})
  const [bookingCreated, setBookingCreated] = useState(false)
  const [dataLoaded, setDataLoaded] = useState(false)

  useEffect(() => {
    // Check if user is logged in
    const loggedIn = sessionStorage.getItem("isLoggedIn") === "true"
    const email = sessionStorage.getItem("userEmail")
    const customerIdFromSession = sessionStorage.getItem("customerId")
    const userIdFromSession = sessionStorage.getItem("userId")
    const bookingId = sessionStorage.getItem("bookingId")
    const storedBookingReference = sessionStorage.getItem("bookingReference")

    setIsLoggedIn(loggedIn)
    setUserEmail(email)
    setCustomerId(customerIdFromSession)
    setUserId(userIdFromSession)

    // If there's an existing booking ID, store it
    if (bookingId) {
      setExistingBookingId(bookingId)
      setBookingCreated(true)
    }

    // If there's an existing booking reference, use it
    if (storedBookingReference) {
      setBookingReference(storedBookingReference)
    } else {
      // Otherwise generate a new one
      setBookingReference(generateBookingReference())
    }

    // Load flight and seat details from session storage
    const loadBookingDetails = async () => {
      let parsedDepartureFlight: SelectedFlightDetails | null = null
      let parsedDepartureSeat: Seat | null = null
      let parsedReturnFlight: SelectedFlightDetails | null = null
      let parsedReturnSeat: Seat | null = null
      let parsedPassengers: PassengerInfo[] = []
      let finalCustomerId: string | null = customerIdFromSession

      try {
        setLoading(true)

        // Load flight details
        const departureFlightData =
          sessionStorage.getItem("selectedDepartureFlight") || sessionStorage.getItem("departureFlight")
        const returnFlightData =
          sessionStorage.getItem("selectedReturnFlight") || sessionStorage.getItem("returnFlight")

        if (!departureFlightData) {
          throw new Error("No departure flight selected")
        }

        parsedDepartureFlight = JSON.parse(departureFlightData)
        setDepartureFlight(parsedDepartureFlight)

        if (returnFlightData) {
          parsedReturnFlight = JSON.parse(returnFlightData)
          setReturnFlight(parsedReturnFlight)
          setIsRoundTrip(true)
        }

        // Load seat details - first try to get all seats
        const allDepartureSeatsData = sessionStorage.getItem("allDepartureSeats")
        const allReturnSeatsData = sessionStorage.getItem("allReturnSeats")

        // If all seats aren't available, fall back to single seat
        const departureSeatData = sessionStorage.getItem("selectedDepartureSeat")
        const returnSeatData = sessionStorage.getItem("selectedReturnSeat")

        if (allDepartureSeatsData) {
          const allDepartureSeats = JSON.parse(allDepartureSeatsData)
          if (allDepartureSeats && allDepartureSeats.length > 0) {
            parsedDepartureSeat = allDepartureSeats[0]
            setDepartureSeat(parsedDepartureSeat)
          }
        } else if (departureSeatData) {
          parsedDepartureSeat = JSON.parse(departureSeatData)
          setDepartureSeat(parsedDepartureSeat)
        } else {
          throw new Error("No departure seat selected")
        }

        if (allReturnSeatsData) {
          const allReturnSeats = JSON.parse(allReturnSeatsData)
          if (allReturnSeats && allReturnSeats.length > 0) {
            parsedReturnSeat = allReturnSeats[0]
            setReturnSeat(parsedReturnSeat)
          }
        } else if (returnSeatData && returnFlightData) {
          parsedReturnSeat = JSON.parse(returnSeatData)
          setReturnSeat(parsedReturnSeat)
        }

        // Load passenger information
        const passengersData = sessionStorage.getItem("passengers")
        if (passengersData) {
          parsedPassengers = JSON.parse(passengersData)

          // Ensure at least one passenger is marked as primary
          if (parsedPassengers.length > 0 && !parsedPassengers.some((p) => p.isPrimary)) {
            parsedPassengers[0].isPrimary = true
            sessionStorage.setItem("passengers", JSON.stringify(parsedPassengers))
          }

          setPassengers(parsedPassengers)
        } else {
          // Create a default passenger if none exists
          const guestInfo = sessionStorage.getItem("guestInformation")
          if (guestInfo) {
            const parsedInfo = JSON.parse(guestInfo)
            const defaultPassenger = {
              firstName: parsedInfo.firstName || "",
              lastName: parsedInfo.lastName || "",
              passportNumber: parsedInfo.passportNumber || "",
              identityCardNumber: parsedInfo.identityCardNumber || "",
              isPrimary: true,
            }
            parsedPassengers = [defaultPassenger]
            setPassengers(parsedPassengers)
            sessionStorage.setItem("passengers", JSON.stringify(parsedPassengers))
          } else {
            // Check if we need to create multiple passengers based on passenger count
            const totalPassengersStr = sessionStorage.getItem("totalPassengers")
            const passengerTypesStr = sessionStorage.getItem("passengerTypes")

            if (totalPassengersStr) {
              const totalPassengers = Number.parseInt(totalPassengersStr)
              const passengerTypes = passengerTypesStr
                ? JSON.parse(passengerTypesStr)
                : { adults: 1, children: 0, infants: 0 }

              // If logged in, create first passenger from user info
              if (loggedIn && email) {
                try {
                  // Get user record from users table
                  const { data: userData, error: userError } = await supabaseClient
                    .from("users")
                    .select("*")
                    .eq("username", email)
                    .single()

                  if (userError) throw userError

                  // Get customer details
                  const { data: customerData, error: customerError } = await supabaseClient
                    .from("customers")
                    .select("*")
                    .eq("customerid", userData.customerid)
                    .single()

                  if (customerError) throw customerError

                  // Create primary passenger from customer data
                  const primaryPassenger = {
                    firstName: customerData.firstname || "",
                    lastName: customerData.lastname || "",
                    passportNumber: customerData.passportnumber || "",
                    identityCardNumber: customerData.identitycardnumber || "",
                    isPrimary: true,
                  }

                  parsedPassengers = [primaryPassenger]

                  // Create placeholder passengers for remaining count
                  for (let i = 1; i < totalPassengers; i++) {
                    parsedPassengers.push({
                      firstName: "",
                      lastName: "",
                      passportNumber: "",
                      identityCardNumber: "",
                      isPrimary: false,
                    })
                  }

                  setPassengers(parsedPassengers)
                  sessionStorage.setItem("passengers", JSON.stringify(parsedPassengers))
                } catch (err) {
                  console.error("Error creating passengers from user data:", err)
                }
              }
            }
          }
        }

        // Load contact information
        const contactData = sessionStorage.getItem("contactInformation")
        if (contactData) {
          try {
            const parsedContact = JSON.parse(contactData)
            setContactInfo(parsedContact)
            console.log("Loaded contact information:", parsedContact)
          } catch (err) {
            console.error("Error parsing contact information:", err)
          }
        } else {
          // If no contact info, try to use primary passenger info
          if (parsedPassengers.length > 0) {
            const primaryPassenger = parsedPassengers.find((p) => p.isPrimary) || parsedPassengers[0]
            if (primaryPassenger) {
              const defaultContact = {
                firstName: primaryPassenger.firstName || "",
                lastName: primaryPassenger.lastName || "",
                email: primaryPassenger.email || (loggedIn ? email : ""),
                phone: primaryPassenger.phone || "",
              }
              setContactInfo(defaultContact)
              sessionStorage.setItem("contactInformation", JSON.stringify(defaultContact))
              console.log("Created default contact information from passenger:", defaultContact)
            }
          }
        }

        // If logged in, fetch customer info from database
        if (loggedIn && email) {
          try {
            // Get user record from users table
            const { data: userData, error: userError } = await supabaseClient
              .from("users")
              .select("*")
              .eq("username", email)
              .single()

            if (userError) throw userError

            // Get customer details
            const { data: customerData, error: customerError } = await supabaseClient
              .from("customers")
              .select("*")
              .eq("customerid", userData.customerid)
              .single()

            if (customerError) throw customerError

            // Set customer info with actual data from database
            setCustomerInfo({
              name: `${customerData.firstname} ${customerData.lastname}`,
              email: email,
              phone: customerData.phonenumber || "N/A",
            })

            // Store customer ID for later use
            finalCustomerId = customerData.customerid
            setCustomerId(finalCustomerId)
            sessionStorage.setItem("customerId", finalCustomerId)
            setUserId(userData.userid)
          } catch (err) {
            console.error("Error fetching customer data:", err)
            // Fallback to default info if database fetch fails
            setCustomerInfo({
              name: "User",
              email: email,
              phone: "N/A",
            })
          }
        } else {
          // For guest users, use data from session storage if available
          const guestInfo = sessionStorage.getItem("guestInformation")
          if (guestInfo) {
            const parsedInfo = JSON.parse(guestInfo)
            setCustomerInfo({
              name: `${parsedInfo.firstName} ${parsedInfo.lastName}`,
              email: parsedInfo.email,
              phone: parsedInfo.phone || "N/A",
              passportNumber: parsedInfo.passportNumber,
              identityCardNumber: parsedInfo.identityCardNumber,
            })

            // Create a customer record for the guest if we don't have one yet
            if (!finalCustomerId) {
              const newCustomerId = await createGuestCustomer(parsedInfo)
              if (newCustomerId) {
                finalCustomerId = newCustomerId
              }
            }
          }
        }

        // Mark data as loaded
        setDataLoaded(true)

        // Create booking and passengers if not already created
        if (
          !bookingId &&
          !bookingCreated &&
          parsedDepartureFlight &&
          parsedDepartureSeat &&
          parsedPassengers.length > 0 &&
          finalCustomerId
        ) {
          console.log("Creating booking during initial load")
          const success = await createBookingAndPassengers(
            parsedDepartureFlight,
            parsedDepartureSeat,
            parsedReturnFlight,
            parsedReturnSeat,
            parsedPassengers,
            finalCustomerId,
          )

          if (success) {
            console.log("Successfully created booking during initial load")
          } else {
            console.error("Failed to create booking during initial load")
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
  }, [])

  // Create a customer record for a guest user
  const createGuestCustomer = async (guestInfo: any) => {
    try {
      if (!guestInfo) return null

      // Create a new customer record
      const { data: newCustomer, error: customerError } = await supabaseClient
        .from("customers")
        .insert({
          firstname: guestInfo.firstName || "",
          lastname: guestInfo.lastName || "",
          email: guestInfo.email || "",
          phonenumber: guestInfo.phone || null,
        })
        .select("customerid")
        .single()

      if (customerError) {
        console.error("Error creating customer:", customerError)
        return null
      }

      // Store the customer ID
      setCustomerId(newCustomer.customerid)
      sessionStorage.setItem("customerId", newCustomer.customerid)
      console.log("Created customer ID:", newCustomer.customerid)

      return newCustomer.customerid
    } catch (err) {
      console.error("Error creating guest customer:", err)
      return null
    }
  }

  // Calculate total price - Fixed to properly calculate the total price
  const calculateTotalPrice = () => {
    console.log("Calculating total price with:", {
      departureFlight: departureFlight ? { price: departureFlight.price } : null,
      returnFlight: returnFlight ? { price: returnFlight.price } : null,
      passengers: passengers.length,
    })

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

    console.log("Calculated total price:", total, "for", passengerCount, "passengers")
    return total
  }

  // Create booking and passenger records when the page loads
  const createBookingAndPassengers = async (
    departureFlight: SelectedFlightDetails,
    departureSeat: Seat,
    returnFlight: SelectedFlightDetails | null,
    returnSeat: Seat | null,
    passengers: PassengerInfo[],
    customerId: string,
  ) => {
    try {
      console.log("Creating booking and passengers with:", {
        departureFlight: !!departureFlight,
        departureSeat: !!departureSeat,
        returnFlight: !!returnFlight,
        returnSeat: !!returnSeat,
        passengers: passengers.length,
        customerId: customerId,
      })

      if (!departureFlight || !departureSeat) {
        throw new Error("Flight or seat information is missing")
      }

      if (!passengers || passengers.length === 0) {
        throw new Error("Passenger information is missing")
      }

      if (!customerId) {
        throw new Error("Customer ID is missing")
      }

      // Get all departure and return seats
      const allDepartureSeats = JSON.parse(sessionStorage.getItem("allDepartureSeats") || "null") || []
      const allReturnSeats = JSON.parse(sessionStorage.getItem("allReturnSeats") || "null") || []

      // Calculate the total price
      const totalPrice = calculateTotalPrice()
      console.log("Total price for booking:", totalPrice)

      // Update existing booking record status to "Confirmed" instead of creating a new one
      const bookingId = sessionStorage.getItem("bookingId")
      if (!bookingId) {
        throw new Error("Booking ID not found. Please try again.")
      }

      // Update the booking status to "Confirmed"
      const { error: updateBookingError } = await supabaseClient
        .from("bookings")
        .update({
          bookingstatus: "Confirmed",
          totalprice: totalPrice, // Update the total price in case it changed
        })
        .eq("bookingid", bookingId)

      if (updateBookingError) {
        console.error("Error updating booking status:", updateBookingError)
        throw new Error(`Error updating booking status: ${updateBookingError.message}`)
      }

      console.log("Updated booking status to Confirmed for ID:", bookingId)

      // Create passenger records for each passenger
      for (let i = 0; i < passengers.length; i++) {
        const passenger = passengers[i]

        // Get the appropriate seat for this passenger or use the first seat as fallback
        const passengerDepartureSeat = allDepartureSeats.length > i ? allDepartureSeats[i] : departureSeat
        const passengerReturnSeat = allReturnSeats.length > i ? allReturnSeats[i] : returnSeat

        // Determine passenger type
        let passengerType = "Adult"
        const passengerTypesData = JSON.parse(sessionStorage.getItem("passengerTypes") || "{}")
        if (i < passengerTypesData.adults) {
          passengerType = "Adult"
        } else if (i < passengerTypesData.adults + passengerTypesData.children) {
          passengerType = "Child"
        } else {
          passengerType = "Infant"
        }

        // Create passenger record with only the required fields according to the schema
        const { data: passengerData, error: passengerError } = await supabaseClient
          .from("passengers")
          .insert({
            customerid: customerId,
            bookingid: bookingId,
            passengertype: passengerType,
          })
          .select("passengerid")
          .single()

        if (passengerError) {
          console.error("Error creating passenger:", passengerError)
          throw new Error(`Error creating passenger: ${passengerError.message}`)
        }

        if (!passengerData || !passengerData.passengerid) {
          throw new Error("Failed to get passenger ID after creation")
        }

        console.log("Created passenger with ID:", passengerData.passengerid)

        // Create ticket for departure flight
        const { error: departureTicketError } = await supabaseClient.from("tickets").insert({
          bookingid: bookingId,
          flightid: departureFlight.flightId,
          passengerid: passengerData.passengerid,
          seatid: passengerDepartureSeat.seatid,
          status: "Confirmed", // Changed from ticketstatus to status
          ticketprice: departureFlight.price,
          classid: passengerDepartureSeat.classid,
          ticketnumber: generateTicketNumber(),
        })

        if (departureTicketError) {
          console.error("Error creating departure ticket:", departureTicketError)
          throw new Error(`Error creating departure ticket: ${departureTicketError.message}`)
        }

        // Update flightseatoccupancy for departure seat
        const { error: departureOccupancyError } = await supabaseClient.from("flightseatoccupancy").upsert(
          {
            flightid: departureFlight.flightId,
            seatid: passengerDepartureSeat.seatid,
            isoccupied: true,
          },
          { onConflict: "flightid,seatid" },
        )

        if (departureOccupancyError) {
          console.error("Error updating departure seat occupancy:", departureOccupancyError)
          throw new Error(`Error updating departure seat occupancy: ${departureOccupancyError.message}`)
        }

        // Create ticket for return flight if it exists
        if (isRoundTrip && returnFlight && passengerReturnSeat) {
          const { error: returnTicketError } = await supabaseClient.from("tickets").insert({
            bookingid: bookingId,
            flightid: returnFlight.flightId,
            passengerid: passengerData.passengerid,
            seatid: passengerReturnSeat.seatid,
            status: "Confirmed", // Changed from ticketstatus to status
            ticketprice: returnFlight.price,
            classid: passengerReturnSeat.classid,
            ticketnumber: generateTicketNumber(),
          })

          if (returnTicketError) {
            console.error("Error creating return ticket:", returnTicketError)
            throw new Error(`Error creating return ticket: ${returnTicketError.message}`)
          }

          // Update flightseatoccupancy for return seat
          const { error: returnOccupancyError } = await supabaseClient.from("flightseatoccupancy").upsert(
            {
              flightid: returnFlight.flightId,
              seatid: passengerReturnSeat.seatid,
              isoccupied: true,
            },
            { onConflict: "flightid,seatid" },
          )

          if (returnOccupancyError) {
            console.error("Error updating return seat occupancy:", returnOccupancyError)
            throw new Error(`Error updating return seat occupancy: ${returnOccupancyError.message}`)
          }
        }
      }

      setBookingCreated(true)
      console.log("Booking and passengers created successfully")
    } catch (err: any) {
      console.error("Error creating booking and passengers:", err)
      setError(err.message || "Failed to create booking. Please try again.")
      return false
    }
    return true
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

  // Check for duplicate passport or ID numbers
  const checkForDuplicates = async (passengers: PassengerInfo[]) => {
    const errors: { [key: string]: string } = {}

    for (let i = 0; i < passengers.length; i++) {
      const passenger = passengers[i]

      // Check passport number
      if (passenger.passportNumber) {
        const { data: passportData, error: passportError } = await supabaseClient
          .from("passengers")
          .select("passengerid")
          .eq("passportnumber", passenger.passportNumber)
          .limit(1)

        if (!passportError && passportData && passportData.length > 0) {
          errors[`passenger_${i}_passport`] = "This passport number is already in use"
        }
      }

      // Check identity card number
      if (passenger.identityCardNumber) {
        const { data: idCardData, error: idCardError } = await supabaseClient
          .from("passengers")
          .select("passengerid")
          .eq("identitycardnumber", passenger.identityCardNumber)
          .limit(1)

        if (!idCardError && idCardData && idCardData.length > 0) {
          errors[`passenger_${i}_idcard`] = "This identity card number is already in use"
        }
      }
    }

    return errors
  }

  // Generate a random ticket number
  const generateTicketNumber = () => {
    const prefix = "CA"
    const randomDigits = Math.floor(Math.random() * 10000000)
      .toString()
      .padStart(7, "0")
    return `${prefix}${randomDigits}`
  }

  // Update the handleContinueToPayment function to ensure booking is created before navigation
  const handleContinueToPayment = async () => {
    try {
      setLoading(true)
      setError(null)
      setValidationErrors({})

      // Check for duplicate passport/ID numbers
      const duplicateErrors = await checkForDuplicates(passengers)
      if (Object.keys(duplicateErrors).length > 0) {
        setValidationErrors(duplicateErrors)
        throw new Error("Some passenger information is already in use. Please check highlighted fields.")
      }

      // If booking hasn't been created yet, create it now
      if (!bookingCreated && !existingBookingId && departureFlight && departureSeat && customerId) {
        console.log("Creating booking before payment")
        const success = await createBookingAndPassengers(
          departureFlight,
          departureSeat,
          returnFlight,
          returnSeat,
          passengers,
          customerId,
        )

        if (!success) {
          throw new Error("Failed to create booking. Please try again.")
        }

        // Double check that booking ID is in session storage
        const bookingId = sessionStorage.getItem("bookingId")
        if (!bookingId) {
          throw new Error("Booking ID not found. Please try again.")
        }
        console.log("Booking created successfully with ID:", bookingId)
      } else if (!existingBookingId && !sessionStorage.getItem("bookingId")) {
        throw new Error("Booking information is missing. Please try again.")
      }

      // Store total price in session storage for payment page
      sessionStorage.setItem("totalPrice", calculateTotalPrice().toString())

      // Store contact information for email confirmation
      if (contactInfo) {
        sessionStorage.setItem("contactEmail", contactInfo.email)
      } else if (customerInfo) {
        sessionStorage.setItem("contactEmail", customerInfo.email)
      }

      // Redirect to payment page
      router.push("/payment")
    } catch (err: any) {
      console.error("Error proceeding to payment:", err)
      setError(err.message || "Failed to process booking. Please try again.")
      setLoading(false)
    }
  }

  // Effect to create booking once data is loaded
  useEffect(() => {
    const createBookingIfNeeded = async () => {
      if (
        dataLoaded &&
        !bookingCreated &&
        !existingBookingId &&
        departureFlight &&
        departureSeat &&
        passengers.length > 0 &&
        customerId
      ) {
        try {
          console.log("Attempting to create booking from useEffect")
          const success = await createBookingAndPassengers(
            departureFlight,
            departureSeat,
            returnFlight,
            returnSeat,
            passengers,
            customerId,
          )

          if (success) {
            console.log("Successfully created booking from useEffect")
          } else {
            console.error("Failed to create booking from useEffect")
          }
        } catch (err) {
          console.error("Error creating booking in effect:", err)
        }
      } else {
        console.log("Skipping booking creation, conditions not met:", {
          dataLoaded,
          bookingCreated,
          existingBookingId: !!existingBookingId,
          departureFlight: !!departureFlight,
          departureSeat: !!departureSeat,
          passengersLength: passengers.length,
          customerId: !!customerId,
        })
      }
    }

    createBookingIfNeeded()
  }, [dataLoaded, bookingCreated, existingBookingId, departureFlight, departureSeat, passengers, customerId])

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
        <div className="flex items-start max-w-2xl mx-auto mb-8">
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
                <p>{`${contactInfo.firstName || ""} ${contactInfo.lastName || ""}`}</p>
              </div>
              <div>
                <p className="font-medium">Email</p>
                <p>{contactInfo.email || "N/A"}</p>
              </div>
              <div>
                <p className="font-medium">Phone</p>
                <p>{contactInfo.phone || "N/A"}</p>
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
                    // Get all departure seats from session storage
                    const allDepartureSeatsData = sessionStorage.getItem("allDepartureSeats")
                    if (allDepartureSeatsData) {
                      try {
                        const allDepartureSeats = JSON.parse(allDepartureSeatsData)
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
                    // Get all return seats from session storage
                    const allReturnSeatsData = sessionStorage.getItem("allReturnSeats")
                    if (allReturnSeatsData) {
                      try {
                        const allReturnSeats = JSON.parse(allReturnSeatsData)
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
