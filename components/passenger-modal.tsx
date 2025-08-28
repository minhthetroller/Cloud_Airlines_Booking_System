"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useLanguage } from "@/lib/language-context"

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
  const { t } = useLanguage()

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
          <DialogTitle>{t("passengersAndClass")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium">{t("adults")}</h3>
                <p className="text-xs text-gray-500">{t("adultsAgeDescription")}</p>
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
                <h3 className="text-sm font-medium">{t("children")}</h3>
                <p className="text-xs text-gray-500">{t("childrenAgeDescription")}</p>
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
                <h3 className="text-sm font-medium">{t("infants")}</h3>
                <p className="text-xs text-gray-500">{t("infantsAgeDescription")}</p>
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
            <h3 className="text-sm font-medium">{t("cabinClass")}</h3>
            <Select value={details.travelClass} onValueChange={handleClassChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("selectCabinClass")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="economy-saver">{t("economySaver")}</SelectItem>
                <SelectItem value="economy-flex">{t("economyFlex")}</SelectItem>
                <SelectItem value="premium-economy">{t("premiumEconomy")}</SelectItem>
                <SelectItem value="business">{t("business")}</SelectItem>
                <SelectItem value="first">{t("firstClass")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={handleConfirm}>{t("confirm")}</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
