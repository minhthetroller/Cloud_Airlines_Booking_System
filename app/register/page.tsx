"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function RegisterPage() {
  const [email, setEmail] = useState("")
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [ageVerified, setAgeVerified] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const [isCheckingEmail, setIsCheckingEmail] = useState(false)

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return re.test(email)
  }

  const handleNext = async () => {
    setError(null)

    // Validate email format
    if (!email || !validateEmail(email)) {
      setError("Please enter a valid email address")
      return
    }

    // Check email uniqueness
    setIsCheckingEmail(true)
    try {
      const response = await fetch("/api/check-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: email.toLowerCase() }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error("API Error:", errorData)
        setError("Unable to verify email. Please check your connection and try again.")
        setIsCheckingEmail(false)
        return
      }

      const result = await response.json()

      if (result.error) {
        console.error("Server Error:", result.error)
        setError("Unable to verify email. Please try again later.")
        setIsCheckingEmail(false)
        return
      }

      if (result.exists) {
        setError("This email is already registered. Please use a different email or try logging in.")
        setIsCheckingEmail(false)
        return
      }
    } catch (error) {
      console.error("Network Error:", error)
      setError("Network error occurred. Please check your internet connection and try again.")
      setIsCheckingEmail(false)
      return
    }
    setIsCheckingEmail(false)

    // Validate terms and age
    if (!termsAccepted || !ageVerified) {
      setError("Please accept the terms and conditions and confirm your age")
      return
    }

    // Store email in session storage for the next steps
    sessionStorage.setItem("registrationEmail", email)

    // Navigate to the next step
    router.push("/register/name")
  }

  return (
    <div className="min-h-screen bg-[#0f2d3c]">
      {/* Progress bar */}
      <div className="bg-[#3a2d4c] text-white py-2 px-4">
        <div className="container mx-auto flex items-center">
          <div className="font-medium">01 E-mail</div>
          <div className="ml-auto">02</div>
          <div className="ml-4">03</div>
        </div>
      </div>

      {/* Main content */}
      <div className="container mx-auto px-4 py-8">
        <Link href="/" className="inline-flex items-center text-white mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          <span>Back</span>
        </Link>

        <h1 className="text-3xl font-bold text-white mb-8">Join COSMILE</h1>

        <div className="max-w-2xl mx-auto bg-[#f8f5f2] rounded-lg p-8">
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[#0f2d3c]">
                * E-mail
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                className="border-gray-300"
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="terms"
                  checked={termsAccepted}
                  onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
                  className="mt-1"
                />
                <Label htmlFor="terms" className="text-sm text-[#0f2d3c]">
                  I have read and agree to the COSMILE Terms and conditions and Cloud Airlines Privacy Policy.
                </Label>
              </div>

              <div className="flex items-start space-x-2">
                <Checkbox
                  id="age"
                  checked={ageVerified}
                  onCheckedChange={(checked) => setAgeVerified(checked as boolean)}
                  className="mt-1"
                />
                <Label htmlFor="age" className="text-sm text-[#0f2d3c]">
                  I am 18 years of age or above.
                </Label>
              </div>
            </div>

            <div className="flex items-center space-x-4 text-sm text-[#0f2d3c]">
              <Link href="/terms" className="flex items-center hover:underline">
                COSMILE Terms and conditions
                <svg
                  className="ml-1 h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </Link>

              <Link href="/privacy" className="flex items-center hover:underline">
                Cloud Airlines Privacy Policy
                <svg
                  className="ml-1 h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </Link>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={handleNext}
                disabled={isCheckingEmail}
                className="bg-[#8a7a4e] hover:bg-[#8a7a4e]/90 text-white px-8"
              >
                {isCheckingEmail ? "Checking..." : "Next"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
