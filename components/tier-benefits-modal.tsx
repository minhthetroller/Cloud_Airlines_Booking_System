"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Check, X } from "lucide-react"

interface TierBenefitsModalProps {
  currentTier: string
  children: React.ReactNode
}

export default function TierBenefitsModal({ currentTier, children }: TierBenefitsModalProps) {
  const [open, setOpen] = useState(false)

  const benefits = {
    stratus: {
      "Priority check-in": true,
      "Priority boarding": false,
      "Extra baggage allowance": "5kg",
      "Bonus points on flights": "10%",
      "Access to airport lounges": false,
      "Priority waitlist": false,
      "Guaranteed seats": false,
      "Complimentary upgrades": false,
      "Dedicated customer service": false,
      "Companion benefits": false,
      "Tier validity": "Permanent",
    },
    altostratus: {
      "Priority check-in": true,
      "Priority boarding": true,
      "Extra baggage allowance": "10kg",
      "Bonus points on flights": "25%",
      "Access to airport lounges": true,
      "Priority waitlist": true,
      "Guaranteed seats": false,
      "Complimentary upgrades": false,
      "Dedicated customer service": false,
      "Companion benefits": false,
      "Tier validity": "Permanent",
    },
    cirrus: {
      "Priority check-in": true,
      "Priority boarding": true,
      "Extra baggage allowance": "15kg",
      "Bonus points on flights": "50%",
      "Access to airport lounges": "Premium",
      "Priority waitlist": true,
      "Guaranteed seats": true,
      "Complimentary upgrades": true,
      "Dedicated customer service": true,
      "Companion benefits": true,
      "Tier validity": "Permanent",
    },
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-4xl bg-[#0a1e29] text-white border-[#1a3a4a]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-[#9b6a4f]">Tier Benefits Comparison</DialogTitle>
        </DialogHeader>
        <div className="mt-6 overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#1a3a4a]">
                <th className="text-left py-3 px-4">Benefit</th>
                <th className="text-center py-3 px-4">
                  <div className="flex flex-col items-center">
                    <span className="text-lg font-bold">Stratus</span>
                    <span className="text-xs text-gray-400">0 points</span>
                  </div>
                </th>
                <th className="text-center py-3 px-4">
                  <div className="flex flex-col items-center">
                    <span className="text-lg font-bold">Altostratus</span>
                    <span className="text-xs text-gray-400">5,000+ points</span>
                  </div>
                </th>
                <th className="text-center py-3 px-4">
                  <div className="flex flex-col items-center">
                    <span className="text-lg font-bold">Cirrus</span>
                    <span className="text-xs text-gray-400">10,000+ points</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(benefits.stratus).map(([benefit, _], index) => (
                <tr key={index} className="border-b border-[#1a3a4a]">
                  <td className="py-4 px-4 font-medium">{benefit}</td>
                  <td className="py-4 px-4 text-center">
                    {typeof benefits.stratus[benefit] === "boolean" ? (
                      benefits.stratus[benefit] ? (
                        <Check className="h-5 w-5 text-green-500 mx-auto" />
                      ) : (
                        <X className="h-5 w-5 text-red-500 mx-auto" />
                      )
                    ) : (
                      <span>{benefits.stratus[benefit]}</span>
                    )}
                  </td>
                  <td className="py-4 px-4 text-center">
                    {typeof benefits.altostratus[benefit] === "boolean" ? (
                      benefits.altostratus[benefit] ? (
                        <Check className="h-5 w-5 text-green-500 mx-auto" />
                      ) : (
                        <X className="h-5 w-5 text-red-500 mx-auto" />
                      )
                    ) : (
                      <span>{benefits.altostratus[benefit]}</span>
                    )}
                  </td>
                  <td className="py-4 px-4 text-center">
                    {typeof benefits.cirrus[benefit] === "boolean" ? (
                      benefits.cirrus[benefit] ? (
                        <Check className="h-5 w-5 text-green-500 mx-auto" />
                      ) : (
                        <X className="h-5 w-5 text-red-500 mx-auto" />
                      )
                    ) : (
                      <span>{benefits.cirrus[benefit]}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 p-4 bg-[#0f2d3c] rounded-lg">
          <h3 className="font-bold text-[#9b6a4f] mb-2">Your Current Tier: {currentTier}</h3>
          <p className="text-sm text-gray-300">
            {currentTier === "Stratus"
              ? "Earn 5,000 more points to upgrade to Altostratus tier and enjoy additional benefits."
              : currentTier === "Altostratus"
                ? "Earn 5,000 more points to upgrade to Cirrus tier and enjoy premium benefits."
                : "Congratulations! You've reached our highest tier level with maximum benefits."}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
