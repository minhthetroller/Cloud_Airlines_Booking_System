"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { CalendarIcon, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import AirportSelector from "@/components/airport-selector"
import PassengerModal from "@/components/passenger-modal"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

export default function BookingForm() {
  const [tripType, setTripType] = useState("round-trip")
  const [fromLocation, setFromLocation] = useState("")
  const [toLocation, setToLocation] = useState("")
  const [departDate, setDepartDate] = useState<Date>()
  const [returnDate, setReturnDate] = useState<Date>()
  const [isPassengerModalOpen, setIsPassengerModalOpen] = useState(false)
  const [passengerDetails, setPassengerDetails] = useState({
    adults: 1,
    children: 0,
    infants: 0,
    travelClass: "economy-saver",
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const router = useRouter()

  const getTotalPassengers = () => {
    return passengerDetails.adults + passengerDetails.children + passengerDetails.infants
  }

  const getPassengerSummary = () => {
    const total = getTotalPassengers()
    const classDisplay = passengerDetails.travelClass
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
    return `${total} Passenger${total !== 1 ? "s" : ""}, ${classDisplay}`
  }

  const handleSearch = async () => {
    if (!fromLocation || !toLocation || !departDate) {
      setError("Please select departure, destination, and travel dates")
      return
    }

    if (tripType === "round-trip" && !returnDate) {
      setError("Please select a return date")
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Format dates for URL
      const departDateStrUrl = departDate ? format(departDate, "yyyy-MM-dd") : ""
      const returnDateStr = returnDate ? format(returnDate, "yyyy-MM-dd") : ""

      // Store passenger details in session storage for use throughout the booking process
      sessionStorage.setItem("passengerDetails", JSON.stringify(passengerDetails))
      sessionStorage.setItem("totalPassengers", getTotalPassengers().toString())

      // Navigate to results page with query parameters
      router.push(
        `/results?from=${fromLocation}&to=${toLocation}&tripType=${tripType}&departDate=${departDateStrUrl}${
          returnDateStr ? `&returnDate=${returnDateStr}` : ""
        }&adults=${passengerDetails.adults}&children=${passengerDetails.children}&infants=${
          passengerDetails.infants
        }&class=${passengerDetails.travelClass}`,
      )
    } catch (err) {
      console.error("Error checking flights:", err)
      setError("Failed to check flight availability")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-lg bg-white p-6 shadow-lg">
      <div className="mb-6">
        <RadioGroup defaultValue="round-trip" className="flex gap-4" onValueChange={setTripType}>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="round-trip" id="round-trip" />
            <Label htmlFor="round-trip" className="text-black">
              Round Trip
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="one-way" id="one-way" />
            <Label htmlFor="one-way" className="text-black">
              One Way
            </Label>
          </div>
        </RadioGroup>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <AirportSelector
          id="from-location"
          label="From"
          value={fromLocation}
          onChange={setFromLocation}
          placeholder="Select departure"
          excludeAirport={toLocation}
        />

        <AirportSelector
          id="to-location"
          label="To"
          value={toLocation}
          onChange={setToLocation}
          placeholder="Select destination"
          excludeAirport={fromLocation}
        />

        <div>
          <Label className="mb-2 block text-sm font-medium text-black">Depart</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start border-gray-300 bg-white text-left font-normal text-black hover:bg-gray-50",
                  !departDate && "text-gray-500",
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {departDate ? format(departDate, "PPP") : <span>Select date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar mode="single" selected={departDate} onSelect={setDepartDate} initialFocus />
            </PopoverContent>
          </Popover>
        </div>

        {tripType === "round-trip" && (
          <div>
            <Label className="mb-2 block text-sm font-medium text-black">Return</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start border-gray-300 bg-white text-left font-normal text-black hover:bg-gray-50",
                    !returnDate && "text-gray-500",
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {returnDate ? format(returnDate, "PPP") : <span>Select date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={returnDate}
                  onSelect={setReturnDate}
                  initialFocus
                  disabled={(date) => (departDate ? date < departDate : false)}
                />
              </PopoverContent>
            </Popover>
          </div>
        )}
      </div>

      <div className="mt-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <Label className="mb-2 block text-sm font-medium text-black">Passengers & Class</Label>
          <Button
            variant="outline"
            className="w-full justify-start border-gray-300 bg-white text-left font-normal text-black hover:bg-gray-50 md:w-auto"
            onClick={() => setIsPassengerModalOpen(true)}
          >
            <Users className="mr-2 h-4 w-4" />
            {getPassengerSummary()}
          </Button>
          <PassengerModal
            isOpen={isPassengerModalOpen}
            onClose={() => setIsPassengerModalOpen(false)}
            onConfirm={(details) => {
              setPassengerDetails(details)
              setIsPassengerModalOpen(false)
            }}
            initialDetails={passengerDetails}
          />
        </div>

        <Button className="bg-[#0f2d3c] hover:bg-[#0f2d3c]/90" size="lg" onClick={handleSearch} disabled={loading}>
          {loading ? "Searching..." : "Search Flights"}
        </Button>
      </div>
    </div>
  )
}
