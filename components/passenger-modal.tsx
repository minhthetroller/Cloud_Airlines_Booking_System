"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface PassengerDetails {
  adults: number
  children: number
  infants: number
  travelClass: string
}

interface PassengerModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (details: PassengerDetails) => void
  initialDetails?: PassengerDetails
}

export default function PassengerModal({
  isOpen,
  onClose,
  onConfirm,
  initialDetails = { adults: 1, children: 0, infants: 0, travelClass: "economy-saver" },
}: PassengerModalProps) {
  const [details, setDetails] = useState<PassengerDetails>(initialDetails)

  const handleIncrement = (type: keyof Pick<PassengerDetails, "adults" | "children" | "infants">) => {
    setDetails((prev) => {
      // Maximum 9 passengers total
      const total = prev.adults + prev.children + prev.infants
      if (total >= 9) return prev

      // Maximum 4 infants
      if (type === "infants" && prev.infants >= 4) return prev

      // Infants cannot exceed adults
      if (type === "infants" && prev.infants >= prev.adults) return prev

      return { ...prev, [type]: prev[type] + 1 }
    })
  }

  const handleDecrement = (type: keyof Pick<PassengerDetails, "adults" | "children" | "infants">) => {
    setDetails((prev) => {
      // Minimum 1 adult
      if (type === "adults" && prev.adults <= 1) return prev

      // Cannot have fewer adults than infants
      if (type === "adults" && prev.adults <= prev.infants) return prev

      // Cannot go below 0
      if (prev[type] <= 0) return prev

      return { ...prev, [type]: prev[type] - 1 }
    })
  }

  const handleClassChange = (value: string) => {
    setDetails((prev) => ({ ...prev, travelClass: value }))
  }

  const handleConfirm = () => {
    onConfirm(details)
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Passengers & Class</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium">Adults</h3>
                <p className="text-xs text-gray-500">Age 12+</p>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-full"
                  onClick={() => handleDecrement("adults")}
                  disabled={details.adults <= 1}
                >
                  -
                </Button>
                <span className="w-6 text-center">{details.adults}</span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-full"
                  onClick={() => handleIncrement("adults")}
                  disabled={details.adults + details.children + details.infants >= 9}
                >
                  +
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium">Children</h3>
                <p className="text-xs text-gray-500">Age 2-11</p>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-full"
                  onClick={() => handleDecrement("children")}
                  disabled={details.children <= 0}
                >
                  -
                </Button>
                <span className="w-6 text-center">{details.children}</span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-full"
                  onClick={() => handleIncrement("children")}
                  disabled={details.adults + details.children + details.infants >= 9}
                >
                  +
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium">Infants</h3>
                <p className="text-xs text-gray-500">Under 2</p>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-full"
                  onClick={() => handleDecrement("infants")}
                  disabled={details.infants <= 0}
                >
                  -
                </Button>
                <span className="w-6 text-center">{details.infants}</span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-full"
                  onClick={() => handleIncrement("infants")}
                  disabled={
                    details.infants >= 4 ||
                    details.infants >= details.adults ||
                    details.adults + details.children + details.infants >= 9
                  }
                >
                  +
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-medium">Cabin Class</h3>
            <Select value={details.travelClass} onValueChange={handleClassChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select cabin class" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="economy-saver">Economy Saver</SelectItem>
                <SelectItem value="economy-flex">Economy Flex</SelectItem>
                <SelectItem value="premium-economy">Premium Economy</SelectItem>
                <SelectItem value="business">Business</SelectItem>
                <SelectItem value="first">First Class</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={handleConfirm}>Confirm</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
