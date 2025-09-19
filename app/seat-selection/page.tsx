"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ChevronRight, AlertCircle, Trash2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { format } from "date-fns"
import supabaseClient from "@/lib/supabase/supabaseClient"
import SeatMap from "@/components/seat-map"
import LoginOrGuestDialog from "@/components/login-or-guest-dialog"

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
  isoccupied?: boolean
}

interface PassengerSeat {
  seatid: number
  seatnumber: string
  classid: number
  seattype: string
  airplanetypeid: number
  isAutoAssigned?: boolean
}

interface CustomerInfo {
  name: string
  email: string
  phone: string
}

export default function SeatSelectionPage() {
  const router = useRouter()
  const [selectedDepartureFlight, setSelectedDepartureFlight] = useState<SelectedFlightDetails | null>(null)
  const [selectedReturnFlight, setSelectedReturnFlight] = useState<SelectedFlightDetails | null>(null)
  const [initialLoading, setInitialLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [airplaneType, setAirplaneType] = useState<any | null>(null)
  const [seats, setSeats] = useState<Seat[]>([])
  const [selectedSeat, setSelectedSeat] = useState<Seat | null>(null)
  const [activeFlightType, setActiveFlightType] = useState<"departure" | "return">("departure")
  const [selectedDepartureSeat, setSelectedDepartureSeat] = useState<Seat | null>(null)
  const [selectedReturnSeat, setSelectedReturnSeat] = useState<Seat | null>(null)
  const [userClassId, setUserClassId] = useState<number>(1) // Default to Economy Saver
  const [loginOrGuestDialogOpen, setLoginOrGuestDialogOpen] = useState(false)
  const [occupiedSeats, setOccupiedSeats] = useState<Set<string>>(new Set())
  const [reservationIds, setReservationIds] = useState({ departure: null, return: null })
  const [fareType, setFareType] = useState<string>("Economy Saver")
  const [isRoundTrip, setIsRoundTrip] = useState(false)
  const [currentPassengerIndex, setCurrentPassengerIndex] = useState(0)
  const [totalPassengers, setTotalPassengers] = useState(1)
  const [passengerTypes, setPassengerTypes] = useState({ adults: 1, children: 0, infants: 0 })
  const [selectedSeats, setSelectedSeats] = useState<PassengerSeat[]>([])
  const [departureSelectedSeats, setDepartureSelectedSeats] = useState<PassengerSeat[]>([])
  const [returnSelectedSeats, setReturnSelectedSeats] = useState<PassengerSeat[]>([])

  // Load flight details from session storage
  useEffect(() => {
    const departureFlight = sessionStorage.getItem("selectedDepartureFlight")
    const returnFlight = sessionStorage.getItem("selectedReturnFlight")

    if (!departureFlight) {
      router.push("/results")
      return
    }

    const parsedDepartureFlight = JSON.parse(departureFlight)
    setSelectedDepartureFlight(parsedDepartureFlight)
    setFareType(parsedDepartureFlight.fareType)

    if (returnFlight) {
      setSelectedReturnFlight(JSON.parse(returnFlight))
      setIsRoundTrip(true)
    }

    // Set initial active flight
    setActiveFlightType("departure")

    // Set user class ID based on fare type
    const initialFareType = parsedDepartureFlight.fareType
    if (initialFareType === "Economy Saver") setUserClassId(1)
    else if (initialFareType === "Economy Flex") setUserClassId(2)
    else if (initialFareType === "Premium Economy") setUserClassId(3)
    else if (initialFareType === "Business") setUserClassId(4)
    else if (initialFareType === "First Class") setUserClassId(5)
  }, [router])

  useEffect(() => {
    // Get passenger count from session storage or URL parameters
    const searchParams = new URLSearchParams(window.location.search)
    const adults = Number.parseInt(searchParams.get("adults") || "1")
    const children = Number.parseInt(searchParams.get("children") || "0")
    const infants = Number.parseInt(searchParams.get("infants") || "0")

    // Also try to get from session storage if URL params are not available
    const storedPassengerDetails = sessionStorage.getItem("passengerDetails")
    if (
      storedPassengerDetails &&
      !searchParams.get("adults") &&
      !searchParams.get("children") &&
      !searchParams.get("infants")
    ) {
      const details = JSON.parse(storedPassengerDetails)
      setPassengerTypes({
        adults: details.adults || 1,
        children: details.children || 0,
        infants: details.infants || 0,
      })
      setTotalPassengers((details.adults || 1) + (details.children || 0) + (details.infants || 0))
    } else {
      setPassengerTypes({
        adults,
        children,
        infants,
      })
      const totalPassengers = adults + children + infants
      setTotalPassengers(totalPassengers)
    }

    // Initialize selected seats arrays
    setDepartureSelectedSeats([])
    setReturnSelectedSeats([])

    // Store passenger counts in session storage
    sessionStorage.setItem("passengerCounts", JSON.stringify({ adults, children, infants }))
  }, [])

  // Fetch airplane type and seats when flight details are loaded
  useEffect(() => {
    const fetchAirplaneAndSeats = async () => {
      if (!selectedDepartureFlight && !selectedReturnFlight) return

      setInitialLoading(true)
      setError(null)

      try {
        // Get the active flight
        const activeFlight = activeFlightType === "departure" ? selectedDepartureFlight : selectedReturnFlight
        if (!activeFlight) return

        // Always use a default airplane type ID since it's not available in the flight details
        const airplaneTypeId = 1 // Default airplane type ID

        // Fetch airplane type
        const { data: airplaneData, error: airplaneError } = await supabaseClient
          .from("airplanetypes")
          .select("*")
          .eq("airplanetypeid", airplaneTypeId)
          .single()

        if (airplaneError) throw new Error(airplaneError.message)
        setAirplaneType(airplaneData)

        // Fetch seats for this airplane type
        const { data: seatsData, error: seatsError } = await supabaseClient
          .from("seats")
          .select("*")
          .eq("airplanetypeid", airplaneTypeId)

        if (seatsError) throw new Error(seatsError.message)

        // Fetch occupied seats from flightseatoccupancy table
        const { data: occupiedSeatsData, error: occupiedSeatsError } = await supabaseClient
          .from("flightseatoccupancy")
          .select("seatid")
          .eq("flightid", activeFlight.flightId)
          .eq("isoccupied", true)

        if (occupiedSeatsError) throw new Error(occupiedSeatsError.message)

        // Create a set of occupied seat IDs
        const occupiedSeatIds = new Set(occupiedSeatsData?.map((item: any) => item.seatid) || [])

        // Process seats data
        const processedSeats = seatsData.map((seat: Seat) => ({
          ...seat,
          isoccupied: occupiedSeatIds.has(seat.seatid),
        }))

        setSeats(processedSeats)

        // Create a set of occupied seat numbers for display
        const occupiedSeatNumbers = new Set()
        processedSeats.forEach((seat: Seat) => {
          if (seat.isoccupied) {
            occupiedSeatNumbers.add(seat.seatnumber)
          }
        })
        setOccupiedSeats(occupiedSeatNumbers)

        // Load previously selected seats
        const storedSeats = JSON.parse(
          sessionStorage.getItem(`selectedSeats_${activeFlightType}`) || "[]",
        ) as PassengerSeat[]

        if (activeFlightType === "departure") {
          setDepartureSelectedSeats(storedSeats)
          setSelectedSeats(storedSeats)
          if (storedSeats.length > 0) {
            // Find the seat object for the first selected seat
            const firstSeatObj = processedSeats.find((s) => s.seatid === storedSeats[0]?.seatid)
            if (firstSeatObj) {
              setSelectedDepartureSeat(firstSeatObj)
              setSelectedSeat(firstSeatObj)
            }
          }
        } else {
          setReturnSelectedSeats(storedSeats)
          setSelectedSeats(storedSeats)
          if (storedSeats.length > 0) {
            // Find the seat object for the first selected seat
            const firstSeatObj = processedSeats.find((s) => s.seatid === storedSeats[0]?.seatid)
            if (firstSeatObj) {
              setSelectedReturnSeat(firstSeatObj)
              setSelectedSeat(firstSeatObj)
            }
          }
        }
      } catch (err: any) {
        console.error("Error fetching airplane and seats:", err)
        setError(err.message || "Failed to load seat information")
      } finally {
        setInitialLoading(false)
      }
    }

    fetchAirplaneAndSeats()
  }, [selectedDepartureFlight, selectedReturnFlight, activeFlightType])

  const handleSeatSelect = async (seat: Seat) => {
    if (seat.isoccupied) return // Cannot select occupied seats

    // Check if seat is already selected by another passenger in the current session
    const isAlreadySelected = selectedSeats.some((selectedSeat) => selectedSeat.seatid === seat.seatid)
    if (isAlreadySelected) {
      alert("This seat is already selected by another passenger in your group")
      return
    }

    try {
      // Determine which flight we're selecting a seat for
      const flightId =
        activeFlightType === "departure" ? selectedDepartureFlight?.flightId : selectedReturnFlight?.flightId

      if (!flightId) {
        throw new Error("Flight ID not found")
      }

      // Mark the seat as occupied in the database
      const { error: occupyError } = await supabaseClient.from("flightseatoccupancy").upsert({
        flightid: flightId,
        seatid: seat.seatid,
        isoccupied: true,
      })

      if (occupyError) {
        throw new Error(`Error reserving seat: ${occupyError.message}`)
      }

      // Update the local state to mark the new seat as selected
      const updatedSeats = seats.map((s) => {
        if (s.seatid === seat.seatid) {
          return { ...s, isoccupied: true }
        }
        return s
      })
      setSeats(updatedSeats)

      // Add to occupied seats (for tracking purposes)
      const newOccupied = new Set(occupiedSeats)
      newOccupied.add(seat.seatnumber)
      setOccupiedSeats(newOccupied)

      // Create a passenger seat object
      const passengerSeat: PassengerSeat = {
        seatid: seat.seatid,
        seatnumber: seat.seatnumber,
        classid: seat.classid,
        seattype: seat.seattype,
        airplanetypeid: seat.airplanetypeid,
      }

      // Update the selected seats
      const updatedSelectedSeats = [...selectedSeats]

      // If we're replacing a seat, release the old one
      if (updatedSelectedSeats.length > currentPassengerIndex) {
        const oldSeat = updatedSelectedSeats[currentPassengerIndex]
        if (oldSeat) {
          // Release the old seat in the database
          await supabaseClient
            .from("flightseatoccupancy")
            .update({ isoccupied: false })
            .eq("flightid", flightId)
            .eq("seatid", oldSeat.seatid)

          // Update local state to mark the old seat as available
          const updatedSeatsAfterRelease = updatedSeats.map((s) => {
            if (s.seatid === oldSeat.seatid) {
              return { ...s, isoccupied: false }
            }
            return s
          })
          setSeats(updatedSeatsAfterRelease)

          // Remove from occupied seats
          newOccupied.delete(oldSeat.seatnumber)
          setOccupiedSeats(newOccupied)
        }
      }

      // Add or replace the seat at the current passenger index
      updatedSelectedSeats[currentPassengerIndex] = passengerSeat
      setSelectedSeats(updatedSelectedSeats)

      // Update the flight-specific selected seats
      if (activeFlightType === "departure") {
        setDepartureSelectedSeats(updatedSelectedSeats)
        if (currentPassengerIndex === 0) {
          setSelectedDepartureSeat(seat)
        }
      } else {
        setReturnSelectedSeats(updatedSelectedSeats)
        if (currentPassengerIndex === 0) {
          setSelectedReturnSeat(seat)
        }
      }

      // Update the selected seat for display
      setSelectedSeat(seat)

      // Store the selected seats in session storage
      sessionStorage.setItem(`selectedSeats_${activeFlightType}`, JSON.stringify(updatedSelectedSeats))

      // Also store the first seat for backward compatibility
      if (updatedSelectedSeats.length > 0) {
        const firstSeatObj = seats.find((s) => s.seatid === updatedSelectedSeats[0].seatid)
        if (firstSeatObj) {
          sessionStorage.setItem(
            `selected${activeFlightType.charAt(0).toUpperCase() + activeFlightType.slice(1)}Seat`,
            JSON.stringify(firstSeatObj),
          )
        }
      }

      // Move to next passenger if not the last one
      if (currentPassengerIndex < totalPassengers - 1) {
        setCurrentPassengerIndex(currentPassengerIndex + 1)
      }
    } catch (err: any) {
      console.error("Error reserving seat:", err)
      alert("Failed to reserve seat. Please try again.")
    }
  }

  // Function to remove a selected seat
  const handleRemoveSeat = async (index: number) => {
    try {
      // Determine which flight we're removing a seat from
      const flightId =
        activeFlightType === "departure" ? selectedDepartureFlight?.flightId : selectedReturnFlight?.flightId

      if (!flightId) {
        throw new Error("Flight ID not found")
      }

      const currentSelectedSeats = activeFlightType === "departure" ? departureSelectedSeats : returnSelectedSeats

      // Get the seat to remove
      const seatToRemove = currentSelectedSeats[index]
      if (!seatToRemove) return

      // Release the seat in the database
      await supabaseClient
        .from("flightseatoccupancy")
        .update({ isoccupied: false })
        .eq("flightid", flightId)
        .eq("seatid", seatToRemove.seatid)

      // Update local state to mark the seat as available
      const updatedSeats = seats.map((s) => {
        if (s.seatid === seatToRemove.seatid) {
          return { ...s, isoccupied: false }
        }
        return s
      })
      setSeats(updatedSeats)

      // Remove from occupied seats
      const newOccupied = new Set(occupiedSeats)
      newOccupied.delete(seatToRemove.seatnumber)
      setOccupiedSeats(newOccupied)

      // Remove the seat from the selected seats array
      const updatedSelectedSeats = [...currentSelectedSeats]
      updatedSelectedSeats.splice(index, 1)

      // Update the flight-specific selected seats
      if (activeFlightType === "departure") {
        setDepartureSelectedSeats(updatedSelectedSeats)
        if (index === 0 && updatedSelectedSeats.length > 0) {
          const firstSeatObj = seats.find((s) => s.seatid === updatedSelectedSeats[0].seatid)
          if (firstSeatObj) {
            setSelectedDepartureSeat(firstSeatObj)
          } else {
            setSelectedDepartureSeat(null)
          }
        } else if (updatedSelectedSeats.length === 0) {
          setSelectedDepartureSeat(null)
        }
      } else {
        setReturnSelectedSeats(updatedSelectedSeats)
        if (index === 0 && updatedSelectedSeats.length > 0) {
          const firstSeatObj = seats.find((s) => s.seatid === updatedSelectedSeats[0].seatid)
          if (firstSeatObj) {
            setSelectedReturnSeat(firstSeatObj)
          } else {
            setSelectedReturnSeat(null)
          }
        } else if (updatedSelectedSeats.length === 0) {
          setSelectedReturnSeat(null)
        }
      }

      setSelectedSeats(updatedSelectedSeats)

      // Store the updated selected seats in session storage
      sessionStorage.setItem(`selectedSeats_${activeFlightType}`, JSON.stringify(updatedSelectedSeats))

      // Set current passenger index to the removed seat's index to allow selecting a new seat
      setCurrentPassengerIndex(index)
    } catch (err: any) {
      console.error("Error removing seat:", err)
      alert("Failed to remove seat. Please try again.")
    }
  }

  // Function to find nearby available seats
  const findNearbySeats = (selectedSeatIds: number[], count: number): PassengerSeat[] => {
    if (count <= 0) return []

    // Get all available seats (not occupied and not already selected)
    const availableSeats = seats.filter((seat) => !seat.isoccupied && !selectedSeatIds.includes(seat.seatid))

    if (availableSeats.length === 0) return []

    // If no seats are selected yet, just return the first available seats
    if (selectedSeatIds.length === 0) {
      return availableSeats.slice(0, count).map((seat) => ({
        seatid: seat.seatid,
        seatnumber: seat.seatnumber,
        classid: seat.classid,
        seattype: seat.seattype,
        airplanetypeid: seat.airplanetypeid,
        isAutoAssigned: true,
      }))
    }

    // Find the last selected seat to use as reference
    const lastSelectedSeatId = selectedSeatIds[selectedSeatIds.length - 1]
    const lastSelectedSeat = seats.find((seat) => seat.seatid === lastSelectedSeatId)

    if (!lastSelectedSeat) return []

    // Parse seat number to get row and column
    const lastSeatRow = Number.parseInt(lastSelectedSeat.seatnumber.replace(/[A-Z]/g, ""))
    const lastSeatCol = lastSelectedSeat.seatnumber.replace(/[0-9]/g, "")

    // Sort available seats by proximity to the last selected seat
    // This is a simple implementation - in a real app, you'd want a more sophisticated algorithm
    const sortedSeats = [...availableSeats].sort((a, b) => {
      const aRow = Number.parseInt(a.seatnumber.replace(/[A-Z]/g, ""))
      const aCol = a.seatnumber.replace(/[0-9]/g, "")
      const bRow = Number.parseInt(b.seatnumber.replace(/[A-Z]/g, ""))
      const bCol = b.seatnumber.replace(/[0-9]/g, "")

      // Calculate "distance" - prioritize same row, then nearby rows
      const aRowDiff = Math.abs(aRow - lastSeatRow)
      const bRowDiff = Math.abs(bRow - lastSeatRow)

      // First prioritize same row
      if (aRow === lastSeatRow && bRow !== lastSeatRow) return -1
      if (bRow === lastSeatRow && aRow !== lastSeatRow) return 1

      // Then prioritize by row proximity
      if (aRowDiff !== bRowDiff) return aRowDiff - bRowDiff

      // If same row proximity, prioritize by class (same class is better)
      if (a.classid === lastSelectedSeat.classid && b.classid !== lastSelectedSeat.classid) return -1
      if (b.classid === lastSelectedSeat.classid && a.classid !== lastSelectedSeat.classid) return 1

      // If same class, just sort by seat number for consistency
      return a.seatnumber.localeCompare(b.seatnumber)
    })

    // Return the closest seats
    return sortedSeats.slice(0, count).map((seat) => ({
      seatid: seat.seatid,
      seatnumber: seat.seatnumber,
      classid: seat.classid,
      seattype: seat.seattype,
      airplanetypeid: seat.airplanetypeid,
      isAutoAssigned: true,
    }))
  }

  // Function to auto-assign remaining seats
  const autoAssignRemainingSeats = async () => {
    const currentSelectedSeats = activeFlightType === "departure" ? departureSelectedSeats : returnSelectedSeats
    const flightId =
      activeFlightType === "departure" ? selectedDepartureFlight?.flightId : selectedReturnFlight?.flightId

    if (!flightId) return

    // Calculate how many more seats we need
    const seatsNeeded = totalPassengers - currentSelectedSeats.length

    if (seatsNeeded <= 0) return // All seats are already selected

    // Get IDs of already selected seats
    const selectedSeatIds = currentSelectedSeats.map((seat) => seat.seatid)

    // Find nearby available seats
    const autoAssignedSeats = findNearbySeats(selectedSeatIds, seatsNeeded)

    if (autoAssignedSeats.length === 0) {
      setError("Not enough available seats to auto-assign. Please select seats manually.")
      return false
    }

    // Mark auto-assigned seats as occupied in the database
    for (const seat of autoAssignedSeats) {
      await supabaseClient.from("flightseatoccupancy").upsert({
        flightid: flightId,
        seatid: seat.seatid,
        isoccupied: true,
      })
    }

    // Update local state
    const updatedSeats = [...seats]
    for (const seat of autoAssignedSeats) {
      const index = updatedSeats.findIndex((s) => s.seatid === seat.seatid)
      if (index !== -1) {
        updatedSeats[index] = { ...updatedSeats[index], isoccupied: true }
      }
    }
    setSeats(updatedSeats)

    // Update occupied seats set
    const newOccupied = new Set(occupiedSeats)
    for (const seat of autoAssignedSeats) {
      newOccupied.add(seat.seatnumber)
    }
    setOccupiedSeats(newOccupied)

    // Add auto-assigned seats to selected seats
    const updatedSelectedSeats = [...currentSelectedSeats, ...autoAssignedSeats]

    // Update the flight-specific selected seats
    if (activeFlightType === "departure") {
      setDepartureSelectedSeats(updatedSelectedSeats)
      if (!selectedDepartureSeat && updatedSelectedSeats.length > 0) {
        const firstSeatObj = seats.find((s) => s.seatid === updatedSelectedSeats[0].seatid)
        if (firstSeatObj) {
          setSelectedDepartureSeat(firstSeatObj)
        }
      }
    } else {
      setReturnSelectedSeats(updatedSelectedSeats)
      if (!selectedReturnSeat && updatedSelectedSeats.length > 0) {
        const firstSeatObj = seats.find((s) => s.seatid === updatedSelectedSeats[0].seatid)
        if (firstSeatObj) {
          setSelectedReturnSeat(firstSeatObj)
        }
      }
    }

    setSelectedSeats(updatedSelectedSeats)

    // Store the selected seats in session storage
    sessionStorage.setItem(`selectedSeats_${activeFlightType}`, JSON.stringify(updatedSelectedSeats))

    return true
  }

  const handleUpgradeClass = (newClassId: number) => {
    // Update the user's class ID
    setUserClassId(newClassId)

    // Update the fare type based on the new class ID
    let newFareType = "Economy Saver"
    if (newClassId === 1) newFareType = "Economy Saver"
    else if (newClassId === 2) newFareType = "Economy Flex"
    else if (newClassId === 3) newFareType = "Premium Economy"
    else if (newClassId === 4) newFareType = "Business"
    else if (newClassId === 5) newFareType = "First Class"

    setFareType(newFareType)

    // Update the flight details with the new fare type
    if (activeFlightType === "departure" && selectedDepartureFlight) {
      const updatedFlight = { ...selectedDepartureFlight, fareType: newFareType }
      setSelectedDepartureFlight(updatedFlight)
      sessionStorage.setItem("selectedDepartureFlight", JSON.stringify(updatedFlight))
    } else if (activeFlightType === "return" && selectedReturnFlight) {
      const updatedFlight = { ...selectedReturnFlight, fareType: newFareType }
      setSelectedReturnFlight(updatedFlight)
      sessionStorage.setItem("selectedReturnFlight", JSON.stringify(updatedFlight))
    }
  }

  const handleDowngradeClass = (newClassId: number) => {
    // Update the user's class ID
    setUserClassId(newClassId)

    // Update the fare type based on the new class ID
    let newFareType = "Economy Saver"
    if (newClassId === 1) newFareType = "Economy Saver"
    else if (newClassId === 2) newFareType = "Economy Flex"
    else if (newClassId === 3) newFareType = "Premium Economy"
    else if (newClassId === 4) newFareType = "Business"
    else if (newClassId === 5) newFareType = "First Class"

    setFareType(newFareType)

    // Update the flight details with the new fare type
    if (activeFlightType === "departure" && selectedDepartureFlight) {
      const updatedFlight = { ...selectedDepartureFlight, fareType: newFareType }
      setSelectedDepartureFlight(updatedFlight)
      sessionStorage.setItem("selectedDepartureFlight", JSON.stringify(updatedFlight))
    } else if (activeFlightType === "return" && selectedReturnFlight) {
      const updatedFlight = { ...selectedReturnFlight, fareType: newFareType }
      setSelectedReturnFlight(updatedFlight)
      sessionStorage.setItem("selectedReturnFlight", JSON.stringify(updatedFlight))
    }
  }

  const handleContinue = async () => {
    const currentSelectedSeats = activeFlightType === "departure" ? departureSelectedSeats : returnSelectedSeats

    // Check if we need to auto-assign seats
    if (currentSelectedSeats.length < totalPassengers) {
      const autoAssignSuccess = await autoAssignRemainingSeats()
      if (!autoAssignSuccess) {
        return // Don't continue if auto-assignment failed
      }
    }

    if (isRoundTrip && activeFlightType === "departure") {
      // Switch to return flight seat selection
      setActiveFlightType("return")
      // Reset passenger index for return flight
      setCurrentPassengerIndex(0)
      return
    }

    // Store selected seats in session storage
    if (departureSelectedSeats.length > 0) {
      sessionStorage.setItem(
        "selectedDepartureSeat",
        JSON.stringify(seats.find((s) => s.seatid === departureSelectedSeats[0].seatid) || null),
      )
      sessionStorage.setItem("selectedSeats_departure", JSON.stringify(departureSelectedSeats))

      // Store all departure seats in a format that confirmation page can use
      const allDepartureSeats = departureSelectedSeats.map((seat) => {
        const seatObj = seats.find((s) => s.seatid === seat.seatid)
        return seatObj || seat
      })
      sessionStorage.setItem("allDepartureSeats", JSON.stringify(allDepartureSeats))

      // Ensure all selected departure seats are marked as occupied in the database
      for (const seat of departureSelectedSeats) {
        if (selectedDepartureFlight) {
          await supabaseClient.from("flightseatoccupancy").upsert(
            {
              flightid: selectedDepartureFlight.flightId,
              seatid: seat.seatid,
              isoccupied: true,
            },
            { onConflict: "flightid,seatid" },
          )
        }
      }
    }

    if (returnSelectedSeats.length > 0) {
      sessionStorage.setItem(
        "selectedReturnSeat",
        JSON.stringify(seats.find((s) => s.seatid === returnSelectedSeats[0].seatid) || null),
      )
      sessionStorage.setItem("selectedSeats_return", JSON.stringify(returnSelectedSeats))

      // Store all return seats in a format that confirmation page can use
      const allReturnSeats = returnSelectedSeats.map((seat) => {
        const seatObj = seats.find((s) => s.seatid === seat.seatid)
        return seatObj || seat
      })
      sessionStorage.setItem("allReturnSeats", JSON.stringify(allReturnSeats))

      // Ensure all selected return seats are marked as occupied in the database
      for (const seat of returnSelectedSeats) {
        if (selectedReturnFlight) {
          await supabaseClient.from("flightseatoccupancy").upsert(
            {
              flightid: selectedReturnFlight.flightId,
              seatid: seat.seatid,
              isoccupied: true,
            },
            { onConflict: "flightid,seatid" },
          )
        }
      }
    }

    // Store total number of passengers
    sessionStorage.setItem("totalPassengers", totalPassengers.toString())
    sessionStorage.setItem("passengerTypes", JSON.stringify(passengerTypes))

    // Check if user is already logged in via cookie-based session
    // IMPORTANT: Modified to use cookie-based authentication
    try {
      // Get session token from cookie
      const cookies = document.cookie.split(";")
      const sessionCookie = cookies.find((cookie) => cookie.trim().startsWith("session_token="))
      const sessionToken = sessionCookie ? sessionCookie.trim().split("=")[1] : null

      if (sessionToken) {
        // Query the sessions table to validate the token
        const { data: sessionData, error: sessionError } = await supabaseClient
          .from("sessions")
          .select("userid, expires")
          .eq("token", sessionToken)
          .single()

        if (sessionError) throw sessionError

        // Check if session is valid and not expired
        if (sessionData && new Date(sessionData.expires) > new Date()) {
          // Session is valid, get user data
          const { data: userData, error: userError } = await supabaseClient
            .from("users")
            .select("userid, customerid, username")
            .eq("userid", sessionData.userid)
            .single()

          if (userError) throw userError

          // Store user info in session storage
          sessionStorage.setItem("isLoggedIn", "true")
          sessionStorage.setItem("userEmail", userData.username)
          sessionStorage.setItem("userId", userData.userid.toString())
          sessionStorage.setItem("customerId", userData.customerid.toString())

          // Redirect to guest information page
          router.push("/guest-information")
          return
        }
      }

      // If we get here, user is not logged in or session is invalid
      setLoginOrGuestDialogOpen(true)
    } catch (error) {
      console.error("Error checking authentication:", error)
      // If there's an error, show the login dialog as fallback
      setLoginOrGuestDialogOpen(true)
    }
  }

  const handleSwitchFlight = () => {
    setActiveFlightType(activeFlightType === "departure" ? "return" : "departure")
    setCurrentPassengerIndex(0)

    // Update the selected seats based on the active flight type
    if (activeFlightType === "departure") {
      setSelectedSeats(returnSelectedSeats)
      if (returnSelectedSeats.length > 0) {
        const firstSeatObj = seats.find((s) => s.seatid === returnSelectedSeats[0].seatid)
        if (firstSeatObj) {
          setSelectedSeat(firstSeatObj)
        }
      } else {
        setSelectedSeat(null)
      }
    } else {
      setSelectedSeats(departureSelectedSeats)
      if (departureSelectedSeats.length > 0) {
        const firstSeatObj = seats.find((s) => s.seatid === departureSelectedSeats[0].seatid)
        if (firstSeatObj) {
          setSelectedSeat(firstSeatObj)
        }
      } else {
        setSelectedSeat(null)
      }
    }
  }

  const handleLoginSuccess = () => {
    // Close the dialog and redirect to guest information page
    setLoginOrGuestDialogOpen(false)
    router.push("/guest-information")
  }

  const handleGuestContinue = () => {
    // Close the dialog and redirect to guest information page
    setLoginOrGuestDialogOpen(false)
    router.push("/guest-information")
  }

  const handleCancelBooking = async () => {
    // Release all seat reservations
    try {
      // Release departure seats
      for (const seat of departureSelectedSeats) {
        if (selectedDepartureFlight) {
          await supabaseClient
            .from("flightseatoccupancy")
            .update({ isoccupied: false })
            .eq("flightid", selectedDepartureFlight.flightId)
            .eq("seatid", seat.seatid)
        }
      }

      // Release return seats
      for (const seat of returnSelectedSeats) {
        if (selectedReturnFlight) {
          await supabaseClient
            .from("flightseatoccupancy")
            .update({ isoccupied: false })
            .eq("flightid", selectedReturnFlight.flightId)
            .eq("seatid", seat.seatid)
        }
      }

      // Clear session storage and redirect to home
      sessionStorage.removeItem("selectedDepartureSeat")
      sessionStorage.removeItem("selectedReturnSeat")
      sessionStorage.removeItem("selectedSeats_departure")
      sessionStorage.removeItem("selectedSeats_return")
      router.push("/")
    } catch (err) {
      console.error("Error releasing seat reservations:", err)
    }
  }

  // Clean up reservations when component unmounts
  useEffect(() => {
    return () => {
      // Only release seat reservations if navigating away without completing booking
      const cleanup = async () => {
        try {
          // Check if we're navigating to the next step in the booking flow
          const nextStepUrls = ["/confirmation", "/guest-information", "/payment", "/ticket-confirmation"]
          const isNavigatingToNextStep = nextStepUrls.some((url) => window.location.pathname.includes(url))

          if (isNavigatingToNextStep) {
            console.log("Navigating to next step in booking flow, keeping seat reservations")
            return
          }

          console.log("Navigating away from booking flow, releasing seat reservations")

          // Release departure seats
          for (const seat of departureSelectedSeats) {
            if (selectedDepartureFlight) {
              await supabaseClient
                .from("flightseatoccupancy")
                .update({ isoccupied: false })
                .eq("flightid", selectedDepartureFlight.flightId)
                .eq("seatid", seat.seatid)
            }
          }

          // Release return seats
          for (const seat of returnSelectedSeats) {
            if (selectedReturnFlight) {
              await supabaseClient
                .from("flightseatoccupancy")
                .update({ isoccupied: false })
                .eq("flightid", selectedReturnFlight.flightId)
                .eq("seatid", seat.seatid)
            }
          }
        } catch (err) {
          console.error("Error releasing seat reservations during cleanup:", err)
        }
      }

      cleanup()
    }
  }, [departureSelectedSeats, returnSelectedSeats, selectedDepartureFlight, selectedReturnFlight])

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN").format(amount)
  }

  // Get active flight
  const activeFlight = activeFlightType === "departure" ? selectedDepartureFlight : selectedReturnFlight

  // Get current selected seats
  const currentSelectedSeats = activeFlightType === "departure" ? departureSelectedSeats : returnSelectedSeats

  if (initialLoading && !activeFlight) {
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

  if (!activeFlight) {
    return (
      <div className="min-h-screen bg-[#0f2d3c] flex flex-col items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>No flight selected. Please select a flight first.</AlertDescription>
        </Alert>
        <Button onClick={() => router.push("/results")} className="mt-4">
          Return to Flight Selection
        </Button>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-[#0f2d3c] pb-20 text-white">
      <div className="container mx-auto px-4 py-6">
        <header className="mb-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Seat Selection</h1>
            {isRoundTrip && (
              <Button variant="outline" onClick={handleSwitchFlight} className="border-white text-white">
                Switch to {activeFlightType === "departure" ? "Return" : "Departure"} Flight
              </Button>
            )}
          </div>
        </header>

        {/* Flight Info */}
        <section className="mb-6 bg-[#1a3a4a] rounded-lg p-4">
          <div className="flex flex-col md:flex-row justify-between">
            <div>
              <h2 className="text-xl font-bold mb-2">
                {activeFlightType === "departure" ? "Departure" : "Return"} Flight: {activeFlight.flightNumber}
              </h2>
              <p>
                {activeFlight.departureAirport} → {activeFlight.arrivalAirport}
              </p>
              <p>{activeFlight.departureTime && format(new Date(activeFlight.departureTime), "MMM d, yyyy HH:mm")}</p>
              <p>Class: {fareType}</p>
            </div>
            {airplaneType && (
              <div className="mt-4 md:mt-0">
                <h3 className="font-medium">Aircraft Information</h3>
                <p>Model: {airplaneType.modelname}</p>
                <p>Manufacturer: {airplaneType.manufacturer}</p>
                <p>Total Seats: {airplaneType.totalseats}</p>
              </div>
            )}
          </div>
        </section>

        {/* Passenger Info */}
        <section className="mb-6 bg-[#1a3a4a] rounded-lg p-4">
          <h2 className="text-xl font-bold mb-2">Passenger Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="font-medium">Adults</p>
              <p className="text-lg">{passengerTypes.adults}</p>
            </div>
            <div>
              <p className="font-medium">Children</p>
              <p className="text-lg">{passengerTypes.children}</p>
            </div>
            <div>
              <p className="font-medium">Infants</p>
              <p className="text-lg">{passengerTypes.infants}</p>
            </div>
          </div>
        </section>

        {/* Selected Seats */}
        {currentSelectedSeats.length > 0 && (
          <section className="mb-6 bg-[#1a3a4a] rounded-lg p-4">
            <h2 className="text-xl font-bold mb-4">Selected Seats</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {currentSelectedSeats.map((seat, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg ${
                    seat.isAutoAssigned
                      ? "bg-yellow-800/50 border border-yellow-600"
                      : "bg-blue-800/50 border border-blue-600"
                  } relative`}
                >
                  <button
                    onClick={() => handleRemoveSeat(index)}
                    className="absolute top-1 right-1 text-white hover:text-red-400"
                    aria-label="Remove seat"
                  >
                    <Trash2 size={16} />
                  </button>
                  <p className="font-bold text-lg">{seat.seatnumber}</p>
                  <p className="text-sm">{seat.isAutoAssigned ? "Auto-assigned" : "Selected"}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Seat Map */}
        <section className="mb-6">
          <div className="bg-white rounded-lg p-4 text-[#0f2d3c]">
            <h2 className="text-xl font-bold mb-4">Seat Map</h2>

            {initialLoading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#0f2d3c]"></div>
              </div>
            ) : seats.length > 0 ? (
              <SeatMap
                seats={seats}
                selectedSeat={selectedSeat}
                onSelectSeat={handleSeatSelect}
                userClassId={userClassId}
                onUpgradeClass={handleUpgradeClass}
                onDowngradeClass={handleDowngradeClass}
              />
            ) : (
              <div className="text-center py-8">
                <p>No seat map available for this flight. Please contact customer service.</p>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Sticky bar at the bottom */}
      <div className="fixed bottom-0 left-0 right-0 z-10 bg-white p-4 shadow-lg">
        <div className="container mx-auto flex justify-end">
          <div className="flex gap-4">
            <Button variant="outline" className="border-[#0f2d3c] text-[#0f2d3c]" onClick={handleCancelBooking}>
              Cancel
            </Button>
            <Button className="bg-[#0f2d3c] hover:bg-[#0f2d3c]/90" onClick={handleContinue}>
              {isRoundTrip && activeFlightType === "departure" ? "Next Flight" : "Continue"}
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Login or Guest Dialog */}
      <LoginOrGuestDialog
        open={loginOrGuestDialogOpen}
        onOpenChange={setLoginOrGuestDialogOpen}
        onLoginSuccess={handleLoginSuccess}
        onGuestContinue={handleGuestContinue}
      />
    </main>
  )
}
