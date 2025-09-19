"use client"

import React, { useState, useEffect, useCallback } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { ChevronLeft, ChevronRight, Info, Plane, Calendar, ChevronDown, ArrowRight, AlertCircle, X } from "lucide-react"
import Link from "next/link"
import { format, addDays, subDays, parseISO } from "date-fns"
import FlightResultsSkeleton from "./flight-results-skeleton"
import PriceDetails from "@/components/price-details"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog"
import supabaseClient from "@/lib/supabase/supabaseClient"
import { useBooking } from "@/lib/contexts/booking-context"
import {NavigateOptions} from "next/dist/shared/lib/app-router-context.shared-runtime";

interface Airport {
  airportcode: string
  airportname: string
  city: string
  country: string
}

interface FlightResult {
  flightid: number
  flightnumber: string
  departureairportcode: string
  arrivalairportcode: string
  departuredatetime: string
  arrivaldatetime: string
  status: string
  travelmiles: number
  departureAirport?: Airport
  arrivalAirport?: Airport
  economyPrice?: number | null
  firstClassPrice?: number | null
  duration?: string
  economyAvailability?: number
  firstClassAvailability?: number
  airplanetypeid?: number
  airplaneid?: number
}

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
  airplanetypeid?: number
}

interface FlightPrice {
  flightid: number
  classid: number
  price: number
  availabilitycount: number
  currencycode: string
}

interface TicketClass {
  classid: number
  classname: string
}

interface DateOption {
  date: Date
  day: string
  dayOfMonth: string
  price: number | null
  formattedDate: string
  flightCount: number
}

interface PassengerDetails {
  adults: number
  children: number
  infants: number
  travelClass: string
}

export default function ResultsPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { state, setPassengerDetails, setDepartureFlight, setReturnFlight, dispatch } = useBooking()
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [departureResults, setDepartureResults] = useState<FlightResult[]>([])
  const [returnResults, setReturnResults] = useState<FlightResult[]>([])
  const [airports, setAirports] = useState<Record<string, Airport>>({})
  const [ticketClasses, setTicketClasses] = useState<Record<number, string>>({})
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [activeFlightId, setActiveFlightId] = useState<number | null>(null)
  const [activeClass, setActiveClass] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<string>("departure")
  const [dates, setDates] = useState<DateOption[]>([])
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false)
  const isFirstRender = React.useRef(true)
  const [expectedFlightCount, setExpectedFlightCount] = useState(2)
  const [hasShownNoFlights, setHasShownNoFlights] = useState(false)

  // Get selected flights from context
  const selectedDepartureFlight = state.selectedDepartureFlight
  const selectedReturnFlight = state.selectedReturnFlight
  const passengerDetails = state.passengerDetails || {
    adults: 1,
    children: 0,
    infants: 0,
    travelClass: "economy-saver",
  }
  const totalPassengers = state.totalPassengers || 1

  // Get search parameters
  const from = searchParams.get("from") || ""
  const to = searchParams.get("to") || ""
  const tripType = searchParams.get("tripType") || "one-way"
  const departDate = searchParams.get("departDate") || ""
  const returnDate = searchParams.get("returnDate") || ""
  const isRoundTrip = tripType === "round-trip"
  const selectedClass = searchParams.get("class") || "economy"

  // Centralized useEffect for fetching flights when search params change
  useEffect(() => {
    const fetchFlights = async () => {
      if (!from || !to || !departDate || Object.keys(airports).length === 0) {
        return
      }

      setLoading(true)
      setError(null)
      setDepartureResults([])
      setReturnResults([])

      try {
        // Parse the date strings to Date objects
        const departDateObj = departDate ? new Date(departDate) : null
        const returnDateObj = returnDate ? new Date(returnDate) : null

        // Format dates for database query (YYYY-MM-DD)
        const formattedDepartDate = departDateObj
          ? `${departDateObj.getFullYear()}-${String(departDateObj.getMonth() + 1).padStart(2, "0")}-${String(
              departDateObj.getDate(),
            ).padStart(2, "0")}`
          : null

        console.log("Searching for flights:", { from, to, departDate: formattedDepartDate })

        // Step 1: Fetch departure flights with proper date filtering
        let departureQuery = supabaseClient
          .from("flights")
          .select(
            `
        flightid, 
        flightnumber, 
        departureairportcode, 
        arrivalairportcode, 
        departuredatetime, 
        arrivaldatetime, 
        status,
        travelmiles,
        airplaneid
      `,
          )
          .eq("departureairportcode", from)
          .eq("arrivalairportcode", to)

        // Add date filtering if a date was provided
        if (formattedDepartDate) {
          departureQuery = departureQuery
            .gte("departuredatetime", `${formattedDepartDate}T00:00:00`)
            .lt("departuredatetime", `${formattedDepartDate}T23:59:59`)
        }

        const { data: departureData, error: departureError } = await departureQuery

        if (departureError) throw new Error(departureError.message)

        // Step 2: Fetch return flights if round trip with similar filtering
        let returnData = null
        if (isRoundTrip && returnDateObj) {
          const formattedReturnDate = `${returnDateObj.getFullYear()}-${String(returnDateObj.getMonth() + 1).padStart(
            2,
            "0",
          )}-${String(returnDateObj.getDate()).padStart(2, "0")}`

          let returnQuery = supabaseClient
            .from("flights")
            .select(
              `
          flightid, 
          flightnumber, 
          departureairportcode, 
          arrivalairportcode, 
          departuredatetime, 
          arrivaldatetime, 
          status,
          travelmiles,
          airplaneid
        `,
            )
            .eq("departureairportcode", to)
            .eq("arrivalairportcode", from)

          // Add date filtering for return flight
          if (formattedReturnDate) {
            returnQuery = returnQuery
              .gte("departuredatetime", `${formattedReturnDate}T00:00:00`)
              .lt("departuredatetime", `${formattedReturnDate}T23:59:59`)
          }

          const { data, error: returnError } = await returnQuery

          if (returnError) throw new Error(returnError.message)
          returnData = data
        }

        // Step 3: Get all flight IDs to check availability and prices
        const flightIds = [
          ...(departureData?.map((f) => f.flightid) || []),
          ...(returnData?.map((f) => f.flightid) || []),
        ]

        if (flightIds.length === 0) {
          setLoading(false)
          setDepartureResults([])
          setReturnResults([])
          return
        }

        // Step 4: Fetch flight prices in one query
        const { data: flightPricesData, error: flightPricesError } = await supabaseClient
          .from("flightprices")
          .select("flightid, classid, price, currencycode")
          .in("flightid", flightIds)

        if (flightPricesError) throw new Error(flightPricesError.message)

        // Create maps for prices by flight ID and class ID
        const priceMap: Record<number, Record<number, number>> = {}

        flightPricesData?.forEach((item) => {
          if (!priceMap[item.flightid]) {
            priceMap[item.flightid] = {}
          }
          priceMap[item.flightid][item.classid] = item.price
        })

        // Step 5: Fetch seat availability from flightseatoccupancy
        // First, get all airplane IDs from the flights
        const airplaneIds = [
          ...new Set([...(departureData?.map((f) => f.airplaneid) || []), ...(returnData?.map((f) => f.airplaneid) || [])]),
        ]

        // Get all seats for these airplane types
        const { data: seatsData, error: seatsError } = await supabaseClient
          .from("seats")
          .select("seatid, airplanetypeid, classid")
          .in("airplanetypeid", airplaneIds)

        if (seatsError) throw new Error(seatsError.message)

        // Group seats by airplane type and class
        const seatsByAirplaneAndClass: Record<number, Record<number, number>> = {}
        seatsData?.forEach((seat) => {
          if (!seatsByAirplaneAndClass[seat.airplanetypeid]) {
            seatsByAirplaneAndClass[seat.airplanetypeid] = {}
          }

          if (!seatsByAirplaneAndClass[seat.airplanetypeid][seat.classid]) {
            seatsByAirplaneAndClass[seat.airplanetypeid][seat.classid] = 0
          }

          seatsByAirplaneAndClass[seat.airplanetypeid][seat.classid]++
        })

        // Get occupied seats for each flight
        const { data: occupiedSeatsData, error: occupiedSeatsError } = await supabaseClient
          .from("flightseatoccupancy")
          .select("flightid, seatid, isoccupied")
          .in("flightid", flightIds)
          .eq("isoccupied", true)

        if (occupiedSeatsError) throw new Error(occupiedSeatsError.message)

        // Count occupied seats by flight and seat class
        const occupiedSeatsByFlight: Record<number, Record<number, number>> = {}

        // Initialize with zero counts
        flightIds.forEach((flightId) => {
          occupiedSeatsByFlight[flightId] = {
            1: 0, // Economy Saver
            2: 0, // Economy Flex
            3: 0, // Premium Economy
            4: 0, // Business
            5: 0, // First Class
          }
        })

        // If there are occupied seats, we need to get their class IDs
        if (occupiedSeatsData && occupiedSeatsData.length > 0) {
          // Get all seat IDs from occupied seats
          const occupiedSeatIds = occupiedSeatsData.map((seat) => seat.seatid)

          // Get class information for these seats
          const { data: seatClassData, error: seatClassError } = await supabaseClient
            .from("seats")
            .select("seatid, classid")
            .in("seatid", occupiedSeatIds)

          if (seatClassError) throw new Error(seatClassError.message)

          // Create a map of seat IDs to class IDs
          const seatToClassMap: Record<number, number> = {}
          seatClassData?.forEach((seat) => {
            seatToClassMap[seat.seatid] = seat.classid
          })

          // Count occupied seats by flight and class
          occupiedSeatsData.forEach((occupiedSeat) => {
            const flightId = occupiedSeat.flightid
            const classId = seatToClassMap[occupiedSeat.seatid]

            if (flightId && classId) {
              if (!occupiedSeatsByFlight[flightId]) {
                occupiedSeatsByFlight[flightId] = {}
              }

              if (!occupiedSeatsByFlight[flightId][classId]) {
                occupiedSeatsByFlight[flightId][classId] = 0
              }

              occupiedSeatsByFlight[flightId][classId]++
            }
          })
        }

        // Step 6: Process departure flights with availability and price data
        const processedDepartureFlights =
          departureData?.map((flight) => {
            const departureTime = parseISO(flight.departuredatetime)
            const arrivalTime = parseISO(flight.arrivaldatetime)
            const durationMs = arrivalTime.getTime() - departureTime.getTime()
            const hours = Math.floor(durationMs / (1000 * 60 * 60))
            const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60))

            // Get total seats by class for this airplane
            const airplaneTypeId = 1 // Default to 1 if not available
            const totalSeatsByClass = seatsByAirplaneAndClass[airplaneTypeId] || {
              1: 30, // Default Economy Saver seats
              2: 20, // Default Economy Flex seats
              3: 10, // Default Premium Economy seats
              4: 8, // Default Business seats
              5: 4, // Default First Class seats
            }

            // Get occupied seats for this flight
            const occupiedSeats = occupiedSeatsByFlight[flight.flightid] || {
              1: 0,
              2: 0,
              3: 0,
              4: 0,
              5: 0,
            }

            // Calculate available seats by class
            const availableSeats = {
              1: Math.max(0, (totalSeatsByClass[1] || 0) - (occupiedSeats[1] || 0)),
              2: Math.max(0, (totalSeatsByClass[2] || 0) - (occupiedSeats[2] || 0)),
              3: Math.max(0, (totalSeatsByClass[3] || 0) - (occupiedSeats[3] || 0)),
              4: Math.max(0, (totalSeatsByClass[4] || 0) - (occupiedSeats[4] || 0)),
              5: Math.max(0, (totalSeatsByClass[5] || 0) - (occupiedSeats[5] || 0)),
            }

            // Calculate total availability for Economy (classes 1, 2, 3)
            const economyAvailability = availableSeats[1] + availableSeats[2] + availableSeats[3]

            // Calculate total availability for First Class (classes 4, 5)
            const firstClassAvailability = availableSeats[4] + availableSeats[5]

            // Get lowest price for Economy (classes 1, 2, 3)
            const economyPrices = [
              priceMap[flight.flightid]?.[1],
              priceMap[flight.flightid]?.[2],
              priceMap[flight.flightid]?.[3],
            ].filter(Boolean)

            const economyPrice = economyPrices.length > 0 ? Math.min(...economyPrices) : null

            // Get lowest price for First Class (classes 4, 5)
            const firstClassPrices = [priceMap[flight.flightid]?.[4], priceMap[flight.flightid]?.[5]].filter(Boolean)

            const firstClassPrice = firstClassPrices.length > 0 ? Math.min(...firstClassPrices) : null

            return {
              ...flight,
              departureAirport: airports[flight.departureairportcode],
              arrivalAirport: airports[flight.arrivalairportcode],
              economyPrice,
              firstClassPrice,
              duration: `${hours}h ${minutes} mins`,
              economyAvailability,
              firstClassAvailability,
            }
          }) || []

        // Step 7: Process return flights with availability and price data
        const processedReturnFlights =
          returnData?.map((flight) => {
            const departureTime = parseISO(flight.departuredatetime)
            const arrivalTime = parseISO(flight.arrivaldatetime)
            const durationMs = arrivalTime.getTime() - departureTime.getTime()
            const hours = Math.floor(durationMs / (1000 * 60 * 60))
            const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60))

            // Get total seats by class for this airplane
            const airplaneTypeId = 1 // Default to 1 if not available
            const totalSeatsByClass = seatsByAirplaneAndClass[airplaneTypeId] || {
              1: 30, // Default Economy Saver seats
              2: 20, // Default Economy Flex seats
              3: 10, // Default Premium Economy seats
              4: 8, // Default Business seats
              5: 4, // Default First Class seats
            }

            // Get occupied seats for this flight
            const occupiedSeats = occupiedSeatsByFlight[flight.flightid] || {
              1: 0,
              2: 0,
              3: 0,
              4: 0,
              5: 0,
            }

            // Calculate available seats by class
            const availableSeats = {
              1: Math.max(0, (totalSeatsByClass[1] || 0) - (occupiedSeats[1] || 0)),
              2: Math.max(0, (totalSeatsByClass[2] || 0) - (occupiedSeats[2] || 0)),
              3: Math.max(0, (totalSeatsByClass[3] || 0) - (occupiedSeats[3] || 0)),
              4: Math.max(0, (totalSeatsByClass[4] || 0) - (occupiedSeats[4] || 0)),
              5: Math.max(0, (totalSeatsByClass[5] || 0) - (occupiedSeats[5] || 0)),
            }

            // Calculate total availability for Economy (classes 1, 2, 3)
            const economyAvailability = availableSeats[1] + availableSeats[2] + availableSeats[3]

            // Calculate total availability for First Class (classes 4, 5)
            const firstClassAvailability = availableSeats[4] + availableSeats[5]

            // Get lowest price for Economy (classes 1, 2, 3)
            const economyPrices = [
              priceMap[flight.flightid]?.[1],
              priceMap[flight.flightid]?.[2],
              priceMap[flight.flightid]?.[3],
            ].filter(Boolean)

            const economyPrice = economyPrices.length > 0 ? Math.min(...economyPrices) : null

            // Get lowest price for First Class (classes 4, 5)
            const firstClassPrices = [priceMap[flight.flightid]?.[4], priceMap[flight.flightid]?.[5]].filter(Boolean)

            const firstClassPrice = firstClassPrices.length > 0 ? Math.min(...firstClassPrices) : null

            return {
              ...flight,
              departureAirport: airports[flight.departureairportcode],
              arrivalAirport: airports[flight.arrivalairportcode],
              economyPrice,
              firstClassPrice,
              duration: `${hours}h ${minutes} mins`,
              economyAvailability,
              firstClassAvailability,
            }
          }) || []

        setDepartureResults(processedDepartureFlights)
        setReturnResults(processedReturnFlights)
      } catch (err: any) {
        console.error("Error fetching flights:", err)
        setError("Failed to load flight information")
      } finally {
        setLoading(false)
      }
    }

    fetchFlights()
  }, [from, to, departDate, returnDate, isRoundTrip, airports])

  // Load passenger details from URL params and session storage
  useEffect(() => {
    const adults = Number.parseInt(searchParams.get("adults") || "1")
    const children = Number.parseInt(searchParams.get("children") || "0")
    const infants = Number.parseInt(searchParams.get("infants") || "0")
    const travelClass = searchParams.get("class") || "economy-saver"

    const details = {
      adults,
      children,
      infants,
      travelClass,
    }

    // Only update state if values have changed to prevent infinite loops
    if (
      passengerDetails.adults !== adults ||
      passengerDetails.children !== children ||
      passengerDetails.infants !== infants ||
      passengerDetails.travelClass !== travelClass
    ) {
      // Update passenger details in context instead of session storage
      setPassengerDetails(details)
      dispatch({ type: 'SET_TOTAL_PASSENGERS', payload: adults + children + infants })
    }
  }, [searchParams, passengerDetails, setPassengerDetails, dispatch])

  // Fetch airports data
  useEffect(() => {
    const fetchAirports = async () => {
      try {
        const { data, error } = await supabaseClient.from("airports").select("airportcode, airportname, city, country")

        if (error) throw new Error(error.message)

        // Convert to a lookup object for easier access
        const airportsMap: Record<string, Airport> = {}
        data?.forEach((airport) => {
          airportsMap[airport.airportcode] = airport
        })

        setAirports(airportsMap)
      } catch (err) {
        console.error("Error fetching airports:", err)
        setError("Failed to load airport information")
      }
    }

    fetchAirports()
  }, [])

  // Fetch ticket classes
  useEffect(() => {
    const fetchTicketClasses = async () => {
      try {
        const { data, error } = await supabaseClient.from("ticketclasses").select("classid, classname")

        if (error) throw new Error(error.message)

        // Convert to a lookup object for easier access
        const classesMap: Record<number, string> = {}
        data?.forEach((ticketClass) => {
          classesMap[ticketClass.classid] = ticketClass.classname
        })

        setTicketClasses(classesMap)
      } catch (err) {
        console.error("Error fetching ticket classes:", err)
      }
    }

    fetchTicketClasses()
  }, [])

  // Generate dates for the date selector with actual prices and flight counts
  const fetchPricesForDates = async () => {
    if (!from || !to || !selectedDate) return

    try {
      // Get selected travel class ID
      const classId = selectedClass === "first-class" ? 4 : 1

      const dates = Array.from({ length: 7 }, (_, i) => {
        return addDays(selectedDate, i - 3)
      })

      const formattedDates = dates.map((date) => {
        return {
          date,
          day: format(date, "EEE"),
          dayOfMonth: format(date, "MMM d"),
          price: null, // Will be populated with actual price
          formattedDate: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
            date.getDate(),
          ).padStart(2, "0")}`,
          flightCount: 0, // Will be populated with actual flight count
        }
      })

      // Query flights for this date
      const pricesPromises = formattedDates.map(async (dateObj) => {
        const { data: flightsData } = await supabaseClient
          .from("flights")
          .select(`flightid`)
          .eq("departureairportcode", from)
          .eq("arrivalairportcode", to)
          .gte("departuredatetime", `${dateObj.formattedDate}T00:00:00`)
          .lt("departuredatetime", `${dateObj.formattedDate}T23:59:59`)

        if (!flightsData || flightsData.length === 0) {
          return { ...dateObj, price: null, flightCount: 0 }
        }

        // Get flight IDs for this date
        const flightIds = flightsData.map((f) => f.flightid)
        const flightCount = flightIds.length

        // Update expected flight count for the selected date to show appropriate number of skeletons
        if (dateObj.formattedDate === format(new Date(departDate), "yyyy-MM-dd")) {
          setExpectedFlightCount(flightCount > 0 ? flightCount : 1)
        }

        // Get prices and availability for these flights
        const { data: priceData } = await supabaseClient
          .from("flightprices")
          .select("price, flightid")
          .in("flightid", flightIds)
          .eq("classid", classId)
          .order("price", { ascending: true })
          .limit(1)

        // Use the lowest price or a fallback
        const lowestPrice = priceData && priceData.length > 0 ? priceData[0].price : null

        return { ...dateObj, price: lowestPrice, flightCount }
      })

      const datesWithPrices = await Promise.all(pricesPromises)

      // Only update state if the data has actually changed
      if (JSON.stringify(datesWithPrices) !== JSON.stringify(dates)) {
        setDates(datesWithPrices)
      }
    } catch (err) {
      console.error("Error fetching prices for dates:", err)
    }
  }

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      fetchPricesForDates()
    } else {
      // For subsequent renders, use a debounce to prevent too many calls
      const timer = setTimeout(() => {
        fetchPricesForDates()
      }, 300)

      return () => clearTimeout(timer)
    }
  }, [from, to, selectedDate, selectedClass])

  // Generate dates for the date selector
  const handlePreviousDays = () => {
    const newSelectedDate = subDays(selectedDate, 7)
    setSelectedDate(newSelectedDate)

    // Create a loading state for the dates with flightCount = -1
    const loadingDates = Array.from({ length: 7 }, (_, i) => {
      const date = addDays(newSelectedDate, i - 3)
      return {
        date,
        day: format(date, "EEE"),
        dayOfMonth: format(date, "MMM d"),
        price: null,
        formattedDate: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
          date.getDate(),
        ).padStart(2, "0")}`,
        flightCount: -1, // Use -1 to indicate loading
      }
    })
    setDates(loadingDates)
  }

  const handleNextDays = () => {
    const newSelectedDate = addDays(selectedDate, 7)
    setSelectedDate(newSelectedDate)

    // Create a loading state for the dates with flightCount = -1
    const loadingDates = Array.from({ length: 7 }, (_, i) => {
      const date = addDays(newSelectedDate, i - 3)
      return {
        date,
        day: format(date, "EEE"),
        dayOfMonth: format(date, "MMM d"),
        price: null,
        formattedDate: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
          date.getDate(),
        ).padStart(2, "0")}`,
        flightCount: -1, // Use -1 to indicate loading
      }
    })
    setDates(loadingDates)
  }

  // Format currency
  const formatCurrency = (amount: number | null) => {
    if (amount === null) return "Not Available"
    return new Intl.NumberFormat("vi-VN").format(amount)
  }

  const handleSelectClass = (flightId: number, classType: string) => {
    // Always set the active flight and class, never close it
    setActiveFlightId(flightId)
    setActiveClass(classType)
  }

  const handleSelectFare = (fareType: string, price: number) => {
    if (!activeFlightId || !activeClass) return

    // Find the flight details
    const isReturnFlight = activeTab === "return"
    const flight = isReturnFlight
      ? returnResults.find((f) => f.flightid === activeFlightId)
      : departureResults.find((f) => f.flightid === activeFlightId)

    if (!flight) return

    const flightDetails = {
      flightId: activeFlightId,
      class: activeClass,
      fareType,
      price: price, // This is the base price per passenger
      flightNumber: flight.flightnumber,
      departureTime: flight.departuredatetime,
      arrivalTime: flight.arrivaldatetime,
      departureAirport: flight.departureairportcode,
      arrivalAirport: flight.arrivalairportcode,
      duration: flight.duration,
      // Use a default airplanetypeid since it's not in the flights table
      airplanetypeid: 1, // Default to a standard airplane type
    }

    // Determine if this is a departure or return flight selection
    if (activeTab === "departure" || !isRoundTrip) {
      setDepartureFlight(flightDetails)

      // If round trip, automatically switch to return tab after selecting departure
      if (isRoundTrip && !selectedReturnFlight) {
        setActiveTab("return")
      }
    } else {
      setReturnFlight(flightDetails)
    }

    // Do NOT reset active selections - keep them open
    // setActiveFlightId(null);
    // setActiveClass(null);
  }

  const getTotalPrice = () => {
    let total = 0
    if (selectedDepartureFlight) {
      total += selectedDepartureFlight.price * totalPassengers
    }
    if (selectedReturnFlight) {
      total += selectedReturnFlight.price * totalPassengers
    }
    return total
  }

  const handleContinue = () => {
    if (isRoundTrip && (!selectedDepartureFlight || !selectedReturnFlight)) {
      alert("Please select both departure and return flights")
      return
    }

    if (!isRoundTrip && !selectedDepartureFlight) {
      alert("Please select a flight")
      return
    }

    // Flight details are already stored in context via setDepartureFlight/setReturnFlight
    // No need for session storage - context handles persistence

    // Navigate to seat selection page with passenger counts in the URL
    router.push(
      `/seat-selection?adults=${passengerDetails.adults}&children=${passengerDetails.children}&infants=${passengerDetails.infants}`,
    )
  }

  const renderFlightResults = (results: FlightResult[], isReturn = false) => {
    if (results.length === 0 && !loading) {
      // Only show "No flights found" if we haven't shown it before or if we had flights before
      if (!hasShownNoFlights || departureResults.length > 0) {
        setHasShownNoFlights(true)
      }
      return (
        <div className="rounded-lg bg-white p-6 text-center text-[#0f2d3c]">
          <p>No flights found for this route and date. Please try different dates or destinations.</p>
        </div>
      )
    }

    // Reset the flag when we have flights
    if (results.length > 0 && hasShownNoFlights) {
      setHasShownNoFlights(false)
    }

    return (
      <section className="space-y-4">
        {results.map((flight) => {
          const isSelected = isReturn
            ? selectedReturnFlight?.flightId === flight.flightid
            : selectedDepartureFlight?.flightId === flight.flightid

          const departureTime = new Date(flight.departuredatetime)
          const arrivalTime = new Date(flight.arrivaldatetime)

          return (
            <div key={flight.flightid} className="overflow-hidden rounded-lg">
              <div className="bg-white p-4 text-[#0f2d3c]">
                <div className="grid grid-cols-12 gap-4">
                  {/* Flight numbers and info */}
                  <div className="col-span-2">
                    <div className="flex items-center gap-2">
                      <span>{flight.flightnumber}</span>
                      <Info size={16} className="cursor-pointer text-blue-600" />
                    </div>
                    <div className="mt-2 text-sm">{format(departureTime, "MMM d, yyyy")}</div>
                    <div className="mt-1 text-xs text-gray-500">{flight.status}</div>
                  </div>

                  {/* Flight times and duration */}
                  <div className="col-span-6">
                    <div className="grid grid-cols-3 items-center">
                      <div className="text-left">
                        <div className="text-2xl font-bold">{format(departureTime, "HH:mm")}</div>
                        <div className="text-lg font-medium">{flight.departureairportcode}</div>
                        <div className="text-xs text-gray-500">
                          {flight.departureAirport?.city || flight.departureairportcode}
                        </div>
                      </div>

                      <div className="text-center">
                        <div className="relative">
                          <div className="flex items-center justify-center">
                            <div className="text-sm">{flight.duration}</div>
                          </div>
                          <div className="relative mt-2 flex items-center">
                            <div className="h-[1px] w-full flex-grow bg-gray-300"></div>
                            <Plane size={16} className="mx-2 rotate-90" />
                            <div className="h-[1px] w-full flex-grow bg-gray-300"></div>
                          </div>
                          <div className="mt-2 text-center text-sm">Direct</div>
                        </div>
                      </div>

                      <div className="text-right pr-4">
                        <div className="text-2xl font-bold">{format(arrivalTime, "HH:mm")}</div>
                        <div className="text-lg font-medium">{flight.arrivalairportcode}</div>
                        <div className="text-xs text-gray-500">
                          {flight.arrivalAirport?.city || flight.arrivalairportcode}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Pricing */}
                  <div className="col-span-4 grid grid-cols-2 gap-4">
                    {/* Economy */}
                    <div
                      className={`flex cursor-pointer flex-col items-center justify-center rounded p-2 transition-colors ${
                        activeFlightId === flight.flightid && activeClass === "economy"
                          ? "bg-[#6d7276] text-white"
                          : isSelected && selectedDepartureFlight?.class === "economy"
                            ? "bg-[#6d7276]/20"
                            : "hover:bg-gray-100"
                      }`}
                      onClick={() => handleSelectClass(flight.flightid, "economy")}
                    >
                      <div className="text-center font-medium">Economy</div>
                      <div className="mt-4 text-center">
                        <div className="text-sm text-gray-500">from VND</div>
                        <div className="text-xl font-bold">
                          {flight.economyPrice ? formatCurrency(flight.economyPrice) : "Not Available"}
                        </div>
                      </div>
                      <div className="mt-2 text-xs">
                        {flight.economyAvailability! > 0 ? `${flight.economyAvailability} seats left` : "Sold out"}
                      </div>
                      <div
                        className={`mt-2 h-1 w-full rounded ${
                          activeFlightId === flight.flightid && activeClass === "economy" ? "bg-white" : "bg-[#6d7276]"
                        }`}
                      ></div>
                    </div>

                    {/* First Class */}
                    <div
                      className={`flex cursor-pointer flex-col items-center justify-center rounded p-2 transition-colors ${
                        activeFlightId === flight.flightid && activeClass === "first-class"
                          ? "bg-[#8a7a4e] text-white"
                          : isSelected && selectedDepartureFlight?.class === "first-class"
                            ? "bg-[#8a7a4e]/20"
                            : "hover:bg-gray-100"
                      }`}
                      onClick={() => handleSelectClass(flight.flightid, "first-class")}
                    >
                      <div className="text-center font-medium">First Class</div>
                      <div className="mt-4 text-center">
                        <div className="text-sm text-gray-500">from VND</div>
                        <div className="text-xl font-bold">
                          {flight.firstClassPrice ? formatCurrency(flight.firstClassPrice) : "Not Available"}
                        </div>
                      </div>
                      <div className="mt-2 text-xs">
                        {flight.firstClassAvailability! > 0
                          ? `${flight.firstClassAvailability} seats left`
                          : "Sold out"}
                      </div>
                      <div
                        className={`mt-2 h-1 w-full rounded ${
                          activeFlightId === flight.flightid && activeClass === "first-class"
                            ? "bg-white"
                            : "bg-[#8a7a4e]"
                        }`}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Price details section that slides down */}
              {activeFlightId === flight.flightid && activeClass && (
                <PriceDetails
                  flightId={flight.flightid.toString()}
                  selectedClass={activeClass}
                  onClose={() => {
                    setActiveFlightId(null)
                    setActiveClass(null)
                  }}
                  onSelect={handleSelectFare}
                  availabilityCount={
                    activeClass === "economy" ? flight.economyAvailability : flight.firstClassAvailability
                  }
                  totalPassengers={totalPassengers}
                />
              )}
            </div>
          )
        })}
      </section>
    )
  }

  // Format for display
  const fromDisplay = airports[from]?.city || from
  const toDisplay = airports[to]?.city || to

  useEffect(() => {
    if (departDate) {
      // When date changes from URL, immediately update the selected date
      // and trigger a smooth scroll to center it
      const newDate = new Date(departDate);
      setSelectedDate(newDate);

      // Calculate which dates will be in the date selector based on this date
      // to ensure the new selection is centered
      const datesForView = Array.from({ length: 7 }, (_, i) => {
        return addDays(newDate, i - 3) // Center the selected date
      });

      // Update dates array immediately with basic info for smoother transition
      // until the full data loads
      const quickFormatDates = datesForView.map((date) => ({
        date,
        day: format(date, "EEE"),
        dayOfMonth: format(date, "MMM d"),
        price: null,
        formattedDate: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
          date.getDate(),
        ).padStart(2, "0")}`,
        flightCount: 0,
      }));

      setDates(quickFormatDates);

      // Also reset selections when the date changes
      dispatch({ type: 'SET_DEPARTURE_FLIGHT', payload: null })
      dispatch({ type: 'SET_RETURN_FLIGHT', payload: null })
      setActiveFlightId(null)
      setActiveClass(null)
    }
  }, [departDate])

  // Adding a new function to handle date selection
  const handleDateSelection = (date: DateOption) => {
    // Don't show skeleton loading if there are no flights for this date
    if (date.flightCount === 0) {
      setLoading(false)
      setExpectedFlightCount(0)
      // Don't reset hasShownNoFlights when switching between dates with no flights
    } else {
      // Set expected flight count before navigation to ensure skeleton shows correct count
      setExpectedFlightCount(date.flightCount > 0 ? date.flightCount : 1)
      // Reset the flag when selecting a date with flights
      setHasShownNoFlights(false)
    }

    // Create a new URL with updated departure date
    const currentParams = new URLSearchParams(window.location.search)
    currentParams.set("departDate", date.formattedDate)

    // Update the URL. The central useEffect will handle fetching.
    // Using router.push to ensure the page re-renders with new searchParams
    router.push(`${window.location.pathname}?${currentParams.toString()}`)
  }

  // Auto-dismiss error messages after a delay
  useEffect(() => {
    // If there's an error message, set a timer to clear it
    if (error) {
      const timer = setTimeout(() => {
        setError(null);
      }, 5000); // Auto-dismiss after 5 seconds

      return () => clearTimeout(timer); // Cleanup timer on unmount
    }
  }, [error]);

  return (
    <main className="min-h-screen bg-[#0f2d3c] pb-20 text-white">
      <div className="container mx-auto px-4 py-6">
        <header className="mb-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">
              {isRoundTrip ? "Round trip" : "One way"}: {fromDisplay} - {toDisplay}
            </h1>
            <Link href="#" className="flex items-center gap-1 text-sm">
              <span className="text-yellow-400">
                <Calendar className="h-5 w-5" />
              </span>
              See a month fare
            </Link>
          </div>
        </header>

        {error && (
          <Alert variant="destructive" className="mb-4 bg-red-500/10 text-white border-red-500">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Date selector */}
        <section className="mb-6 overflow-hidden rounded-lg bg-white">
          <div className="flex items-center justify-between bg-gray-100 px-4 py-3 text-[#0f2d3c]">
            <button onClick={handlePreviousDays} className="flex items-center gap-1 text-sm font-medium">
              <ChevronLeft size={16} />
              Previous 7 days
            </button>
            <button onClick={handleNextDays} className="flex items-center gap-1 text-sm font-medium">
              Next 7 days
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="grid grid-cols-7">
            {dates.map((date) => {
              // Check if this date matches the search date (departDate)
              const searchDateObj = departDate ? new Date(departDate) : new Date()
              const isSelected = date.formattedDate === format(searchDateObj, "yyyy-MM-dd")
              return (
                <button
                  key={date.dayOfMonth}
                  className={`cursor-pointer p-4 text-center ${
                    isSelected ? "bg-[#3a2d4c] text-white" : "bg-[#f8f0ff] text-[#0f2d3c] hover:bg-[#e8e0ef]"
                  }`}
                  onClick={() => handleDateSelection(date)}
                >
                  <div className="font-medium">
                    {date.day}, {date.dayOfMonth}
                  </div>
                  <div className="mt-1 text-sm">
                    {date.flightCount === -1 ? (
                      "Loading..."
                    ) : date.flightCount > 0 ? (
                      `${date.flightCount} Flight${date.flightCount > 1 ? "s" : ""}`
                    ) : (
                      "No flights"
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </section>

        {/* Results section - only show skeleton if we expect flights */}
        {loading && expectedFlightCount > 0 ? (
          <FlightResultsSkeleton count={expectedFlightCount} />
        ) : isRoundTrip ? (
          <Tabs defaultValue="departure" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4 bg-[#0f2d3c]/50">
              <TabsTrigger value="departure" className={`${selectedDepartureFlight ? "text-green-400" : ""}`}>
                Departure Flight {selectedDepartureFlight && "✓"}
              </TabsTrigger>
              <TabsTrigger value="return" className={`${selectedReturnFlight ? "text-green-400" : ""}`}>
                Return Flight {selectedReturnFlight && "✓"}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="departure">
              <div className="mb-4 flex items-center gap-2 text-lg">
                <span>{fromDisplay}</span>
                <ArrowRight className="h-4 w-4" />
                <span>{toDisplay}</span>
              </div>
              {renderFlightResults(departureResults)}
            </TabsContent>
            <TabsContent value="return">
              <div className="mb-4 flex items-center gap-2 text-lg">
                <span>{toDisplay}</span>
                <ArrowRight className="h-4 w-4" />
                <span>{fromDisplay}</span>
              </div>
              {renderFlightResults(returnResults, true)}
            </TabsContent>
          </Tabs>
        ) : (
          renderFlightResults(departureResults)
        )}
      </div>

      {/* Flight Details Dialog */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Flight Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <h3 className="font-medium">Departure Flight</h3>
              {selectedDepartureFlight && (
                <div className="space-y-1 text-sm">
                  <p>
                    <span className="font-medium">Flight:</span> {selectedDepartureFlight.flightNumber}
                  </p>
                  <p>
                    <span className="font-medium">From:</span> {selectedDepartureFlight.departureAirport} (
                    {format(new Date(selectedDepartureFlight.departureTime!), "HH:mm, MMM d")})
                  </p>
                  <p>
                    <span className="font-medium">To:</span> {selectedDepartureFlight.arrivalAirport} (
                    {format(new Date(selectedDepartureFlight.arrivalTime!), "HH:mm, MMM d")})
                  </p>
                  <p>
                    <span className="font-medium">Duration:</span> {selectedDepartureFlight.duration}
                  </p>
                  <p>
                    <span className="font-medium">Class:</span> {selectedDepartureFlight.fareType}
                  </p>
                  <p>
                    <span className="font-medium">Price per passenger:</span> VND{" "}
                    {formatCurrency(selectedDepartureFlight.price)}
                  </p>
                </div>
              )}
            </div>

            {isRoundTrip && selectedReturnFlight && (
              <div className="space-y-2">
                <h3 className="font-medium">Return Flight</h3>
                <div className="space-y-1 text-sm">
                  <p>
                    <span className="font-medium">Flight:</span> {selectedReturnFlight.flightNumber}
                  </p>
                  <p>
                    <span className="font-medium">From:</span> {selectedReturnFlight.departureAirport} (
                    {format(new Date(selectedReturnFlight.departureTime!), "HH:mm, MMM d")})
                  </p>
                  <p>
                    <span className="font-medium">To:</span> {selectedReturnFlight.arrivalAirport} (
                    {format(new Date(selectedReturnFlight.arrivalTime!), "HH:mm, MMM d")})
                  </p>
                  <p>
                    <span className="font-medium">Duration:</span> {selectedReturnFlight.duration}
                  </p>
                  <p>
                    <span className="font-medium">Class:</span> {selectedReturnFlight.fareType}
                  </p>
                  <p>
                    <span className="font-medium">Price per passenger:</span> VND{" "}
                    {formatCurrency(selectedReturnFlight.price)}
                  </p>
                </div>
              </div>
            )}

            <div className="pt-4 border-t">
              <p className="font-medium">Passengers: {totalPassengers}</p>
              <p className="font-medium">Total Price: VND {formatCurrency(getTotalPrice())}</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Sticky bar at the bottom */}
      {(selectedDepartureFlight || selectedReturnFlight) && (
        <div className="fixed bottom-0 left-0 right-0 z-10 bg-white p-4 shadow-lg">
          <div className="container mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsDetailsDialogOpen(true)}
                className="flex items-center text-[#0f2d3c] hover:text-[#0f2d3c]/70 transition-colors"
              >
                <span className="font-medium">Details</span>
                <ChevronDown className="ml-1 h-4 w-4" />
              </button>
              <div className="text-xl font-bold text-[#0f2d3c]">Total: VND {formatCurrency(getTotalPrice())}</div>
            </div>
            <Button
              className="bg-[#0f2d3c] hover:bg-[#0f2d3c]/90"
              onClick={handleContinue}
              disabled={isRoundTrip && (!selectedDepartureFlight || !selectedReturnFlight)}
            >
              Next
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </main>
  )
}
