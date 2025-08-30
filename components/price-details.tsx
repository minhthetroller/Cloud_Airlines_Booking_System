"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import supabaseClient from "@/lib/supabase"
import { Skeleton } from "@/components/ui/skeleton"

interface TicketClass {
  classid: number
  classname: string
  description: string
  cabintype: string
  bookingcodeinfo: string
  seatselectioninfo: string
  checkedbagageinfo: string
  mileagemultiplier: number
  upgraderules: string
  reissuefeedefaultamount: number
  reissuefeedefaultcurr: string
  refundfeedefaultamount: number
  refundfeedefaultcurr: string
}

interface PriceDetailsProps {
  flightId: string
  selectedClass: string
  onClose: () => void
  onSelect: (fareType: string, price: number) => void
  availabilityCount?: number
  totalPassengers?: number
}

export default function PriceDetails({
  flightId,
  selectedClass,
  onClose,
  onSelect,
  availabilityCount = 0,
  totalPassengers = 1,
}: PriceDetailsProps) {
  const [selectedFare, setSelectedFare] = useState<string | null>(null)
  const [fareOptions, setFareOptions] = useState<Array<{ type: string; price: number | null; availability: number }>>(
    [],
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [ticketClassDetails, setTicketClassDetails] = useState<Record<number, TicketClass>>({})
  const [flightDetails, setFlightDetails] = useState<{ travelmiles: number } | null>(null)

  // Fetch flight details to get travel miles
  useEffect(() => {
    const fetchFlightDetails = async () => {
      try {
        const { data, error } = await supabaseClient
          .from("flights")
          .select("travelmiles")
          .eq("flightid", flightId)
          .single()

        if (error) throw error
        setFlightDetails(data)
      } catch (err) {
        console.error("Error fetching flight details:", err)
        // Set default travel miles if not available
        setFlightDetails({ travelmiles: 1200 })
      }
    }

    fetchFlightDetails()
  }, [flightId])

  // Fetch ticket class details
  useEffect(() => {
    const fetchTicketClasses = async () => {
      try {
        const { data, error } = await supabaseClient.from("ticketclasses").select("*")

        if (error) throw error

        const classDetails: Record<number, TicketClass> = {}
        data.forEach((ticketClass: TicketClass) => {
          classDetails[ticketClass.classid] = ticketClass
        })

        setTicketClassDetails(classDetails)
      } catch (err) {
        console.error("Error fetching ticket classes:", err)
      }
    }

    fetchTicketClasses()
  }, [])

  useEffect(() => {
    const fetchPrices = async () => {
      if (!selectedClass || !flightId) return

      setLoading(true)
      setError(null)

      try {
        // Define default options based on selected class
        let defaultOptions = []

        if (selectedClass === "economy") {
          defaultOptions = [
            { type: "Economy Saver", price: null, availability: 0, classId: 1 },
            { type: "Economy Flex", price: null, availability: 0, classId: 2 },
            { type: "Premium Economy", price: null, availability: 0, classId: 3 },
          ]
        } else if (selectedClass === "first-class") {
          defaultOptions = [
            { type: "Business", price: null, availability: 0, classId: 4 },
            { type: "First Class", price: null, availability: 0, classId: 5 },
          ]
        }

        // Map selected class to appropriate class IDs
        let classIds: number[] = []

        if (selectedClass === "economy") {
          // Economy includes Economy Saver, Economy Flex, Premium Economy
          classIds = [1, 2, 3]
        } else if (selectedClass === "first-class") {
          // First Class includes First Class and Business
          classIds = [4, 5]
        }

        // Fetch prices for this flight and selected classes
        const { data: priceData, error: priceError } = await supabaseClient
          .from("flightprices")
          .select("price, classid, currencycode")
          .eq("flightid", flightId)
          .in("classid", classIds)

        if (priceError) throw new Error(priceError.message)

        // Get flight details to get the airplane ID
        const { data: flightData, error: flightError } = await supabaseClient
          .from("flights")
          .select("airplaneid")
          .eq("flightid", flightId)
          .single()

        if (flightError) throw new Error(flightError.message)

        // Get airplane type ID from the airplane
        const { data: airplaneData, error: airplaneError } = await supabaseClient
          .from("airplanes")
          .select("airplanetypeid")
          .eq("airplaneid", flightData.airplaneid)
          .single()

        if (airplaneError) throw new Error(airplaneError.message)

        const airplaneTypeId = airplaneData.airplanetypeid

        // Get all seats for this airplane type
        const { data: seatsData, error: seatsError } = await supabaseClient
          .from("seats")
          .select("seatid, classid")
          .eq("airplanetypeid", airplaneTypeId)
          .in("classid", classIds)

        if (seatsError) throw new Error(seatsError.message)

        // Count total seats by class
        const totalSeatsByClass: Record<number, number> = {}
        seatsData.forEach((seat) => {
          if (!totalSeatsByClass[seat.classid]) {
            totalSeatsByClass[seat.classid] = 0
          }
          totalSeatsByClass[seat.classid]++
        })

        // Get occupied seats for this flight
        const { data: occupiedSeatsData, error: occupiedSeatsError } = await supabaseClient
          .from("flightseatoccupancy")
          .select("seatid")
          .eq("flightid", flightId)
          .eq("isoccupied", true)

        if (occupiedSeatsError) throw new Error(occupiedSeatsError.message)

        // If there are occupied seats, get their class IDs
        const occupiedSeatsByClass: Record<number, number> = {}
        classIds.forEach((classId) => {
          occupiedSeatsByClass[classId] = 0
        })

        if (occupiedSeatsData && occupiedSeatsData.length > 0) {
          // Get all seat IDs from occupied seats
          const occupiedSeatIds = occupiedSeatsData.map((seat) => seat.seatid)

          // Get class information for these seats
          const { data: seatClassData, error: seatClassError } = await supabaseClient
            .from("seats")
            .select("seatid, classid")
            .in("seatid", occupiedSeatIds)
            .in("classid", classIds)

          if (seatClassError) throw new Error(seatClassError.message)

          // Count occupied seats by class
          seatClassData?.forEach((seat) => {
            if (!occupiedSeatsByClass[seat.classid]) {
              occupiedSeatsByClass[seat.classid] = 0
            }
            occupiedSeatsByClass[seat.classid]++
          })
        }

        // Calculate available seats by class
        const availableSeatsByClass: Record<number, number> = {}
        classIds.forEach((classId) => {
          availableSeatsByClass[classId] = Math.max(
            0,
            (totalSeatsByClass[classId] || 0) - (occupiedSeatsByClass[classId] || 0),
          )
        })

        // Create a map of the fetched prices by class ID
        const fetchedPrices: Record<number, { price: number; availability: number }> = {}

        if (priceData && priceData.length > 0) {
          priceData.forEach((item) => {
            fetchedPrices[item.classid] = {
              price: item.price,
              availability: availableSeatsByClass[item.classid] || 0,
            }
          })
        }

        // Update default options with fetched data where available
        const updatedOptions = defaultOptions.map((option) => {
          const classId = option.classId
          const fetchedData = fetchedPrices[classId]

          return {
            type: option.type,
            price: fetchedData ? fetchedData.price : null,
            availability: fetchedData ? fetchedData.availability : 0,
          }
        })

        setFareOptions(updatedOptions)
      } catch (err: any) {
        console.error("Error fetching prices:", err)
        setError(err.message)

        // Fallback to default values with null prices
        let defaultOptions = []

        if (selectedClass === "economy") {
          defaultOptions = [
            { type: "Economy Saver", price: null, availability: 0 },
            { type: "Economy Flex", price: null, availability: 0 },
            { type: "Premium Economy", price: null, availability: 0 },
          ]
        } else if (selectedClass === "first-class") {
          defaultOptions = [
            { type: "Business", price: null, availability: 0 },
            { type: "First Class", price: null, availability: 0 },
          ]
        }

        setFareOptions(defaultOptions)
      } finally {
        setLoading(false)
      }
    }

    fetchPrices()
  }, [flightId, selectedClass, ticketClassDetails])

  const getClassId = (fareType: string) => {
    switch (fareType) {
      case "Economy Saver":
        return 1
      case "Economy Flex":
        return 2
      case "Premium Economy":
        return 3
      case "Business":
        return 4
      case "First Class":
        return 5
      default:
        return 1
    }
  }

  if (!selectedClass) return null

  const isEconomy = selectedClass === "economy"
  const isFirstClass = selectedClass === "first-class"

  // Get destination image based on route (in a real app, this would be dynamic)
  const destinationImage = {
    src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/los_angeles.jpg-WsfM3OwitTxdQcj4JZujQFCPne7l1H.jpeg",
    alt: "Los Angeles",
  }

  const handleSelectFare = (type: string, price: number) => {
    setSelectedFare(type)
    onSelect(type, price)
  }

  // Format currency
  const formatCurrency = (amount: number | null) => {
    if (amount === null) return "Not Available"
    return new Intl.NumberFormat("vi-VN").format(amount)
  }

  // Calculate mileage accrual
  const calculateMileageAccrual = (fareType: string) => {
    const classId = getClassId(fareType)
    const mileageMultiplier = ticketClassDetails[classId]?.mileagemultiplier || 1
    const travelMiles = flightDetails?.travelmiles || 1200

    return Math.round(travelMiles * mileageMultiplier)
  }

  // Get booking code info
  const getBookingCodeInfo = (fareType: string) => {
    const classId = getClassId(fareType)
    return (
      ticketClassDetails[classId]?.bookingcodeinfo ||
      (fareType === "Economy Saver"
        ? "HAN-TPE: Economy(L)\nTPE-KIX: Economy(L)"
        : fareType === "Economy Flex"
          ? "HAN-TPE: Economy(Y)\nTPE-KIX: Economy(Y)"
          : fareType === "Premium Economy"
            ? "HAN-TPE: Premium Economy(W)\nTPE-KIX: Premium Economy(W)"
            : fareType === "Business"
              ? "HAN-TPE: Business(H)\nTPE-KIX: Business(H)"
              : "HAN-TPE: First(F)\nTPE-KIX: First(F)")
    )
  }

  // Get seat selection info
  const getSeatSelectionInfo = (fareType: string) => {
    const classId = getClassId(fareType)
    return (
      ticketClassDetails[classId]?.seatselectioninfo ||
      (fareType === "Economy Saver"
        ? "Standard Seats Only"
        : fareType === "Economy Flex"
          ? "Complimentary For Forward And Standard Seats"
          : fareType === "Premium Economy"
            ? "Complimentary Premium Economy Seats"
            : "Complimentary Premium Seats")
    )
  }

  // Get checked baggage info
  const getCheckedBaggageInfo = (fareType: string) => {
    const classId = getClassId(fareType)
    return (
      ticketClassDetails[classId]?.checkedbagageinfo ||
      (fareType === "Economy Saver"
        ? "First Piece: Free (20kg)\nSecond Piece: Paid\nEach Piece 20 Kg (44 Lbs)"
        : fareType === "Economy Flex"
          ? "First Piece: Free\nSecond Piece: Free\nEach Piece 23 Kg (50 Lbs)"
          : fareType === "Premium Economy"
            ? "First Piece: Free\nSecond Piece: Free\nEach Piece 25 Kg (55 Lbs)"
            : "First Piece: Free\nSecond Piece: Free\nEach Piece 32 Kg (70 Lbs)")
    )
  }

  // Get upgrade rules
  const getUpgradeRules = (fareType: string) => {
    const classId = getClassId(fareType)
    return ticketClassDetails[classId]?.upgraderules || (fareType === "Economy Saver" ? "Not Applicable" : "Applicable")
  }

  // Get reissue fee
  const getReissueFee = (fareType: string) => {
    const classId = getClassId(fareType)
    const amount =
      ticketClassDetails[classId]?.reissuefeedefaultamount ||
      (fareType === "Economy Saver" ? 50 : fareType === "Economy Flex" ? 30 : 0)
    const currency = ticketClassDetails[classId]?.reissuefeedefaultcurr || "USD"

    return amount === 0 ? "Free" : `${currency} ${amount}`
  }

  // Get refund fee
  const getRefundFee = (fareType: string) => {
    const classId = getClassId(fareType)
    const amount =
      ticketClassDetails[classId]?.refundfeedefaultamount ||
      (fareType === "Economy Saver" ? 100 : fareType === "Economy Flex" ? 75 : 50)
    const currency = ticketClassDetails[classId]?.refundfeedefaultcurr || "USD"

    return `${currency} ${amount}`
  }

  return (
    <div className="w-full overflow-hidden transition-all duration-300 bg-[#f7e9e0]">
      <div className="container mx-auto px-4 py-6">
        <div className="flex">
          {/* Destination image sidebar */}
          <div className="hidden w-1/5 pr-4 md:block h-full">
            <div className="relative h-full">
              <Image
                src={destinationImage.src || "/placeholder.svg"}
                alt={destinationImage.alt}
                fill
                className="object-cover"
                style={{ position: "absolute", height: "100%" }}
              />
            </div>
          </div>

          {/* Fare options */}
          <div className="flex flex-1 flex-wrap gap-4">
            <div className="flex w-full items-center justify-between pb-2">
              <div>
                <h2 className="text-xl font-bold text-[#0f2d3c]">
                  {isEconomy ? "Economy Options" : isFirstClass ? "Premium Options" : "Fare Options"}
                </h2>
                <p className="text-sm text-green-600">{availabilityCount} seats available</p>
                {totalPassengers > 1 && (
                  <p className="text-sm text-[#0f2d3c]">Booking for {totalPassengers} passengers</p>
                )}
              </div>
              <div className="text-right">
                <span className="text-sm text-[#aa846e]">Product comparison</span>
                <Info className="ml-2 inline-block h-5 w-5 cursor-pointer text-[#aa846e]" />
              </div>
            </div>

            {loading ? (
              <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="rounded-lg bg-[#f5f0ea] p-4 min-h-[650px]">
                    <Skeleton className="h-6 w-24 mb-2 bg-gray-300" />
                    <Skeleton className="h-8 w-32 mb-4 bg-gray-300" />
                    <Skeleton className="h-10 w-full mb-4 bg-gray-300" />
                    <div className="space-y-4">
                      {[1, 2, 3, 4, 5, 6, 7].map((j) => (
                        <div key={j} className="mb-4">
                          <Skeleton className="h-4 w-32 mb-1 bg-gray-300" />
                          <Skeleton className="h-4 w-full bg-gray-300" />
                          <Skeleton className="h-4 w-3/4 mt-1 bg-gray-300" />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="w-full text-center py-8 text-red-500">{error}</div>
            ) : (
              <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-3">
                {/* Fare options */}
                {fareOptions.map((fare) => (
                  <div key={fare.type} className="rounded-lg bg-[#f5f0ea] p-4">
                    <div className="mb-2 rounded bg-[#0f2d3c] px-2 py-1 text-center text-sm font-medium text-white">
                      {fare.type}
                    </div>
                    <div className="mb-2 text-center text-xl font-bold text-[#8a6a56]">
                      {fare.price === null ? "Not Available" : <>VND {formatCurrency(fare.price)}</>}
                    </div>
                    {totalPassengers > 1 && fare.price !== null && (
                      <div className="mb-4 text-center text-sm text-[#8a6a56]">
                        Total: VND {formatCurrency(fare.price * totalPassengers)} for {totalPassengers} passengers
                      </div>
                    )}
                    <Button
                      className={`w-full border-2 border-[#0f2d3c] transition-colors ${
                        fare.price !== null && fare.availability > 0
                          ? "bg-[#fef7f1] text-[#0f2d3c] hover:bg-[#0f2d3c] hover:text-white"
                          : "bg-gray-200 text-gray-500 cursor-not-allowed border-gray-300"
                      }`}
                      onClick={() =>
                        fare.price !== null && fare.availability > 0 && handleSelectFare(fare.type, fare.price)
                      }
                      disabled={fare.price === null || fare.availability <= 0}
                    >
                      {fare.price === null
                        ? "Not Available"
                        : fare.availability > 0
                          ? `Select (${fare.availability} left)`
                          : "Sold Out"}
                    </Button>

                    <div className="mt-4 space-y-4 text-sm">
                      <div>
                        <div className="font-medium text-[#0f2d3c]">Booking Class</div>
                        {getBookingCodeInfo(fare.type)
                          .split("\n")
                          .map((line, i) => (
                            <div key={i} className="text-[#aa846e]">
                              {line}
                            </div>
                          ))}
                      </div>

                      <div>
                        <div className="flex items-center font-medium text-[#0f2d3c]">
                          Seat Selection <Info className="ml-1 h-4 w-4 text-[#0f2d3c]" />
                        </div>
                        <div className="text-[#aa846e]">{getSeatSelectionInfo(fare.type)}</div>
                      </div>

                      <div>
                        <div className="flex items-center font-medium text-[#0f2d3c]">
                          Checked Baggage <Info className="ml-1 h-4 w-4 text-[#0f2d3c]" />
                        </div>
                        {getCheckedBaggageInfo(fare.type)
                          .split("\n")
                          .map((line, i) => (
                            <div key={i} className="text-[#aa846e]">
                              {line}
                            </div>
                          ))}
                      </div>

                      <div>
                        <div className="flex items-center font-medium text-[#0f2d3c]">
                          COSMILE Mileage Accrual <Info className="ml-1 h-4 w-4 text-[#0f2d3c]" />
                        </div>
                        <div className="text-[#aa846e]">{calculateMileageAccrual(fare.type)}</div>
                      </div>

                      <div>
                        <div className="font-medium text-[#0f2d3c]">COSMILE Upgrade Award</div>
                        <div className="text-[#aa846e]">{getUpgradeRules(fare.type)}</div>
                      </div>

                      <div>
                        <div className="font-medium text-[#0f2d3c]">Reissue Fee(Each Time)</div>
                        <div className="text-[#aa846e]">{getReissueFee(fare.type)}</div>
                      </div>

                      <div>
                        <div className="font-medium text-[#0f2d3c]">Refund Fee</div>
                        <div className="text-[#aa846e]">{getRefundFee(fare.type)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
