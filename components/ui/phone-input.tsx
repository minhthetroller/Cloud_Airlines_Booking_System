"use client"

import type React from "react"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface PhoneInputProps {
  id: string
  value: string
  onChange: (value: string) => void
  defaultCountry?: string
}

interface CountryCode {
  code: string
  dial: string
  name: string
}

export function PhoneInput({ id, value, onChange, defaultCountry = "US" }: PhoneInputProps) {
  const [countryCode, setCountryCode] = useState(defaultCountry)
  const [phoneNumber, setPhoneNumber] = useState("")

  // Country codes with dial codes
  const countryCodes: CountryCode[] = [
    { code: "VN", dial: "+84", name: "Vietnam" },
    { code: "US", dial: "+1", name: "United States" },
    { code: "UK", dial: "+44", name: "United Kingdom" },
    { code: "CA", dial: "+1", name: "Canada" },
    { code: "AU", dial: "+61", name: "Australia" },
    { code: "JP", dial: "+81", name: "Japan" },
    { code: "TW", dial: "+886", name: "Taiwan" },
    { code: "CN", dial: "+86", name: "China" },
    { code: "HK", dial: "+852", name: "Hong Kong" },
    { code: "SG", dial: "+65", name: "Singapore" },
    { code: "MY", dial: "+60", name: "Malaysia" },
    { code: "TH", dial: "+66", name: "Thailand" },
    { code: "ID", dial: "+62", name: "Indonesia" },
    { code: "PH", dial: "+63", name: "Philippines" },
    { code: "KR", dial: "+82", name: "South Korea" },
    { code: "IN", dial: "+91", name: "India" },
    { code: "FR", dial: "+33", name: "France" },
    { code: "DE", dial: "+49", name: "Germany" },
    { code: "IT", dial: "+39", name: "Italy" },
    { code: "ES", dial: "+34", name: "Spain" },
  ]

  const handleCountryChange = (value: string) => {
    setCountryCode(value)
    const dialCode = countryCodes.find((c) => c.code === value)?.dial || ""
    const fullNumber = `${dialCode} ${phoneNumber}`
    onChange(fullNumber)
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPhoneNumber = e.target.value
    setPhoneNumber(newPhoneNumber)
    const dialCode = countryCodes.find((c) => c.code === countryCode)?.dial || ""
    const fullNumber = `${dialCode} ${newPhoneNumber}`
    onChange(fullNumber)
  }

  return (
    <div className="flex">
      <Select value={countryCode} onValueChange={handleCountryChange}>
        <SelectTrigger className="w-[100px] rounded-r-none border-r-0">
          <SelectValue placeholder="Code" />
        </SelectTrigger>
        <SelectContent className="max-h-[200px] overflow-y-auto">
          {countryCodes.map((country) => (
            <SelectItem key={country.code} value={country.code}>
              <div className="flex items-center">
                <span className="mr-2">{country.dial}</span>
                <span>{country.code}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        id={id}
        type="tel"
        value={phoneNumber}
        onChange={handlePhoneChange}
        className="rounded-l-none flex-1"
        placeholder="Phone number"
      />
    </div>
  )
}
