"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { EnhancedDatePicker } from "@/components/ui/enhanced-date-picker"
import { PhoneInput } from "@/components/ui/phone-input"
import { useRegistration } from "@/lib/registration-context"

export default function DetailsPage() {
  const [dateOfBirth, setDateOfBirth] = useState<Date | undefined>()
  const [gender, setGender] = useState("")
  const [nationality, setNationality] = useState("")
  const [idNumber, setIdNumber] = useState("")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [addressLine, setAddressLine] = useState("")
  const [city, setCity] = useState("")
  const [country, setCountry] = useState("")
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const { registrationData, updateRegistrationData } = useRegistration()

  const [passportNumber, setPassportNumber] = useState("")
  const [passportExpiry, setPassportExpiry] = useState("")

  // Check if previous steps are completed
  useEffect(() => {
    if (!registrationData.email || !registrationData.firstName || !registrationData.lastName || !registrationData.title) {
      router.push("/register")
    }
  }, [registrationData, router])

  const handleSubmit = async () => {
    // Validate inputs
    if (!dateOfBirth) {
      setError("Please select your date of birth")
      return
    }

    if (!gender) {
      setError("Please select your gender")
      return
    }

    if (!nationality) {
      setError("Please select your nationality")
      return
    }

    if (!idNumber) {
      setError("Please enter your identity card number")
      return
    }

    if (!phoneNumber) {
      setError("Please enter your phone number")
      return
    }

    if (!addressLine || !city || !country) {
      setError("Please enter your complete address")
      return
    }

    if (!passportNumber) {
      setError("Please enter your passport number")
      return
    }

    if (!passportExpiry) {
      setError("Please enter your passport expiry date")
      return
    }

    try {
      // Store all registration data in context
      updateRegistrationData({
        dateOfBirth,
        gender,
        nationality,
        identityCardNumber: idNumber,
        phoneNumber,
        addressLine,
        city,
        country,
        passportNumber,
        passportExpiry,
      })

      // Navigate to the confirmation page
      router.push("/register/confirmation")
    } catch (err: any) {
      console.error("Error saving details:", err)
      setError(err.message || "Failed to save details. Please try again.")
    }
  }

  return (
    <div className="min-h-screen bg-[#0f2d3c]">
      {/* Progress bar */}
      <div className="bg-[#3a2d4c] text-white py-2 px-4">
        <div className="container mx-auto flex items-center">
          <div className="font-medium">01 ✓</div>
          <div className="ml-4 font-medium">02 ✓</div>
          <div className="ml-4 font-medium">03 Additional Information</div>
        </div>
      </div>

      {/* Main content */}
      <div className="container mx-auto px-4 py-8">
        <Link href="/register/name" className="inline-flex items-center text-white mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          <span>Back</span>
        </Link>

        <h1 className="text-3xl font-bold text-white mb-8">Additional Information</h1>

        <div className="max-w-2xl mx-auto bg-[#f8f5f2] rounded-lg p-8">
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="dateOfBirth" className="text-[#0f2d3c] mb-2 block">
                  * Date of Birth
                </Label>
                <EnhancedDatePicker
                  selected={dateOfBirth}
                  onSelect={setDateOfBirth}
                  disabled={(date) => date > new Date()}
                />
              </div>

              <div>
                <Label htmlFor="gender" className="text-[#0f2d3c] mb-2 block">
                  * Gender
                </Label>
                <Select value={gender} onValueChange={setGender}>
                  <SelectTrigger id="gender" className="border-gray-300">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                    <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="nationality" className="text-[#0f2d3c] mb-2 block">
                  * Nationality
                </Label>
                <Select value={nationality} onValueChange={setNationality}>
                  <SelectTrigger id="nationality" className="border-gray-300">
                    <SelectValue placeholder="Select nationality" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[200px] overflow-y-auto">
                    <SelectItem value="VN">Vietnam</SelectItem>
                    <SelectItem value="US">United States</SelectItem>
                    <SelectItem value="UK">United Kingdom</SelectItem>
                    <SelectItem value="CA">Canada</SelectItem>
                    <SelectItem value="AU">Australia</SelectItem>
                    <SelectItem value="JP">Japan</SelectItem>
                    <SelectItem value="TW">Taiwan</SelectItem>
                    <SelectItem value="CN">China</SelectItem>
                    <SelectItem value="HK">Hong Kong</SelectItem>
                    <SelectItem value="SG">Singapore</SelectItem>
                    <SelectItem value="MY">Malaysia</SelectItem>
                    <SelectItem value="TH">Thailand</SelectItem>
                    <SelectItem value="ID">Indonesia</SelectItem>
                    <SelectItem value="PH">Philippines</SelectItem>
                    <SelectItem value="KR">South Korea</SelectItem>
                    <SelectItem value="IN">India</SelectItem>
                    <SelectItem value="FR">France</SelectItem>
                    <SelectItem value="DE">Germany</SelectItem>
                    <SelectItem value="IT">Italy</SelectItem>
                    <SelectItem value="ES">Spain</SelectItem>
                    <SelectItem value="NL">Netherlands</SelectItem>
                    <SelectItem value="RU">Russia</SelectItem>
                    <SelectItem value="BR">Brazil</SelectItem>
                    <SelectItem value="MX">Mexico</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="idNumber" className="text-[#0f2d3c] mb-2 block">
                  * Identity Card Number
                </Label>
                <Input
                  id="idNumber"
                  value={idNumber}
                  onChange={(e) => setIdNumber(e.target.value)}
                  className="border-gray-300"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="phoneNumber" className="text-[#0f2d3c] mb-2 block">
                * Phone Number
              </Label>
              <PhoneInput id="phoneNumber" value={phoneNumber} onChange={setPhoneNumber} defaultCountry="VN" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="passportNumber" className="text-[#0f2d3c] mb-2 block">
                  * Passport Number
                </Label>
                <Input
                  id="passportNumber"
                  value={passportNumber}
                  onChange={(e) => setPassportNumber(e.target.value)}
                  className="border-gray-300"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="passportExpiry" className="text-[#0f2d3c] block">
                  * Passport Expiry
                </Label>
                <EnhancedDatePicker
                  id="passportExpiry"
                  selected={passportExpiry ? new Date(passportExpiry) : undefined}
                  onSelect={(date) => setPassportExpiry(date ? date.toISOString().split('T')[0] : '')}
                  disabled={(date) => date < new Date()}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="addressLine" className="text-[#0f2d3c] mb-2 block">
                * Address
              </Label>
              <Input
                id="addressLine"
                value={addressLine}
                onChange={(e) => setAddressLine(e.target.value)}
                className="border-gray-300 mb-2"
                placeholder="Street address"
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                <Input
                  id="city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="border-gray-300"
                  placeholder="City"
                />

                <Select value={country} onValueChange={setCountry}>
                  <SelectTrigger id="country" className="border-gray-300">
                    <SelectValue placeholder="Country" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[200px] overflow-y-auto">
                    <SelectItem value="VN">Vietnam</SelectItem>
                    <SelectItem value="US">United States</SelectItem>
                    <SelectItem value="UK">United Kingdom</SelectItem>
                    <SelectItem value="CA">Canada</SelectItem>
                    <SelectItem value="AU">Australia</SelectItem>
                    <SelectItem value="JP">Japan</SelectItem>
                    <SelectItem value="TW">Taiwan</SelectItem>
                    <SelectItem value="CN">China</SelectItem>
                    <SelectItem value="HK">Hong Kong</SelectItem>
                    <SelectItem value="SG">Singapore</SelectItem>
                    <SelectItem value="MY">Malaysia</SelectItem>
                    <SelectItem value="TH">Thailand</SelectItem>
                    <SelectItem value="ID">Indonesia</SelectItem>
                    <SelectItem value="PH">Philippines</SelectItem>
                    <SelectItem value="KR">South Korea</SelectItem>
                    <SelectItem value="IN">India</SelectItem>
                    <SelectItem value="FR">France</SelectItem>
                    <SelectItem value="DE">Germany</SelectItem>
                    <SelectItem value="IT">Italy</SelectItem>
                    <SelectItem value="ES">Spain</SelectItem>
                    <SelectItem value="NL">Netherlands</SelectItem>
                    <SelectItem value="RU">Russia</SelectItem>
                    <SelectItem value="BR">Brazil</SelectItem>
                    <SelectItem value="MX">Mexico</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleSubmit} className="bg-[#8a7a4e] hover:bg-[#8a7a4e]/90 text-white px-8">
                Submit
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
