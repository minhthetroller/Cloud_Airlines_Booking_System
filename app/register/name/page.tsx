"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, ArrowLeft, Info } from "lucide-react"
import Link from "next/link"
import { useRegistration } from "@/lib/registration-context"

export default function NamePage() {
  const [title, setTitle] = useState("")
  const [lastName, setLastName] = useState("")
  const [firstName, setFirstName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const { registrationData, updateRegistrationData } = useRegistration()

  // Check if email exists in registration context
  useEffect(() => {
    if (!registrationData.email) {
      router.push("/register")
    }
  }, [registrationData.email, router])

  const handleNext = () => {
    // Validate inputs
    if (!title) {
      setError("Please select a title")
      return
    }

    if (!lastName || !firstName) {
      setError("Please enter your full name")
      return
    }

    // Store name information in registration context
    updateRegistrationData({
      title,
      lastName,
      firstName
    })

    // Navigate to the next step
    router.push("/register/details")
  }

  return (
    <div className="min-h-screen bg-[#0f2d3c]">
      {/* Progress bar */}
      <div className="bg-[#3a2d4c] text-white py-2 px-4">
        <div className="container mx-auto flex items-center">
          <div className="font-medium">01 ✓</div>
          <div className="ml-4 font-medium">02 input your name</div>
          <div className="ml-auto">03</div>
        </div>
      </div>

      {/* Main content */}
      <div className="container mx-auto px-4 py-8">
        <Link href="/register" className="inline-flex items-center text-white mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          <span>Back</span>
        </Link>

        <h1 className="text-3xl font-bold text-white mb-8">Please tell us your name</h1>

        <div className="max-w-2xl mx-auto bg-[#f8f5f2] rounded-lg p-8">
          <div className="bg-[#f8e8d8] p-4 rounded-md mb-6 flex items-start">
            <Info className="h-5 w-5 text-[#0f2d3c] mr-2 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-[#0f2d3c]">
              Please fill in the exact English name in your passport. Please refer to your passport if necessary.
            </p>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div>
              <Label htmlFor="title" className="text-[#0f2d3c] mb-2 block">
                * Title
              </Label>
              <Select value={title} onValueChange={setTitle}>
                <SelectTrigger id="title" className="border-gray-300">
                  <SelectValue placeholder="Select title" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Mr.">Mr.</SelectItem>
                  <SelectItem value="Mrs.">Mrs.</SelectItem>
                  <SelectItem value="Ms.">Ms.</SelectItem>
                  <SelectItem value="Dr.">Dr.</SelectItem>
                  <SelectItem value="Prof.">Prof.</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="lastName" className="text-[#0f2d3c] mb-2 block">
                * Last name/Surname
              </Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="border-gray-300"
              />
            </div>

            <div>
              <Label htmlFor="firstName" className="text-[#0f2d3c] mb-2 block">
                * First name/Given name
              </Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="border-gray-300"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleNext} className="bg-[#8a7a4e] hover:bg-[#8a7a4e]/90 text-white px-8">
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
