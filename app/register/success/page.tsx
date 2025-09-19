"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import { CheckCircle } from "lucide-react"
import { useRegistration } from "@/lib/contexts/registration-context"

export default function SuccessPage() {
  const router = useRouter()
  const { clearRegistrationData } = useRegistration()

  // Clear registration data and redirect to home after 5 seconds
  useEffect(() => {
    // Clear the registration data since registration is complete
    clearRegistrationData()

    const timer = setTimeout(() => {
      router.push("/")
    }, 5000)

    return () => clearTimeout(timer)
  }, [router, clearRegistrationData])

  return (
    <div className="min-h-screen bg-[#0f2d3c] flex flex-col items-center justify-center py-12 px-4">
      <div className="max-w-md w-full bg-[#0f2d3c] rounded-lg p-8 text-center">
        <div className="mb-8 flex justify-center">
          <Image src="/logo.png" alt="Cloud Airline Logo" width={180} height={60} />
        </div>

        <div className="bg-[#1a3a4a] rounded-lg p-8 mb-8">
          <div className="flex justify-center mb-6">
            <CheckCircle className="h-20 w-20 text-green-500" />
          </div>

          <h1 className="text-3xl font-bold text-[#f8f5f2] mb-6">Registration Complete!</h1>

          <p className="text-[#f8f5f2] mb-8">
            Thank you for joining Cloud Airline's COSMILE program. Your account has been successfully created and you
            can now enjoy all the benefits of our premium frequent flyer program.
          </p>

          <div className="space-y-4">
            <p className="text-[#9b6a4f]">You will be redirected to the homepage in a few seconds...</p>

            <Button onClick={() => router.push("/")} className="w-full bg-[#8a7a4e] hover:bg-[#8a7a4e]/90 text-white">
              Go to Homepage
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
