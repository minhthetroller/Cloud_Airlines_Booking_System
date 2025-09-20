"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import Image from "next/image"
import supabaseClient from "@/lib/supabase/supabaseClient"
import axios from "axios"

export default function ConfirmationPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updateSuccess, setUpdateSuccess] = useState(false)
  const router = useRouter()

  const [contactEmail, setContactEmail] = useState("")
  const [contactPhone, setContactPhone] = useState("")

  useEffect(() => {
    // Get email from session storage
    const storedEmail = sessionStorage.getItem("registrationEmail")
    if (!storedEmail) {
      router.push("/register")
      return
    }

    // Check if customer data exists
    const customerDataStr = sessionStorage.getItem("customerData")
    if (!customerDataStr) {
      router.push("/register/details")
      return
    }

    setEmail(storedEmail)

    // Store customer data and send verification email
    const storeDataAndSendEmail = async () => {
      try {
        setSending(true)

        // Generate a token for verification
        const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
        sessionStorage.setItem("registrationToken", token)

        // Parse customer data
        const customerData = JSON.parse(customerDataStr)

        // Create customer record
        const { data: customerResult, error: customerError } = await supabaseClient
          .from("customers")
          .insert([
            {
              firstname: customerData.firstName,
              lastname: customerData.lastName,
              email: storedEmail,
              dateofbirth: customerData.dateOfBirth,
              gender: customerData.gender,
              nationality: customerData.nationality,
              identitycardnumber: customerData.identityCardNumber,
              phonenumber: customerData.phoneNumber,
              country: customerData.country,
              city: customerData.city,
              addressline: customerData.address,
              pronoun: customerData.pronoun || "Prefer not to say",
              contactname: `${customerData.firstName} ${customerData.lastName}`,
            },
          ])
          .select("customerid")
          .single()

        if (customerError) {
          throw new Error(`Error creating customer: ${customerError.message}`)
        }

        // Get the customer ID
        const customerId = customerResult.customerid

        // Create user record with unverified status
        const { error: userError } = await supabaseClient.from("users").insert([
          {
            customerid: customerId,
            username: storedEmail,
            passwordhash: "", // Will be updated when user sets password
            pointsavailable: 0,
            accountstatus: "unverified",
            dateregistered: new Date().toISOString(),
          },
        ])

        if (userError) {
          throw new Error(`Error creating user: ${userError.message}`)
        }

        // Send the verification email
        const response = await axios.post("/api/send-email", {
          email: storedEmail,
          token,
        });

        // Email sent successfully
      } catch (err: any) {
        console.error("Error in registration process:", err)
        setError(err.message || "Failed to complete registration. Please try again.")
      } finally {
        setSending(false)
      }
    }

    storeDataAndSendEmail()
  }, [router])

  const handleResend = async () => {
    setLoading(true)
    setError(null)

    try {
      const token = sessionStorage.getItem("registrationToken")
      if (!token) {
        throw new Error("Verification token not found")
      }

      // Send the verification email
      const response = await axios.post("/api/send-email", {
        email,
        token
      });

      // Show success message
      setUpdateSuccess(true)

      // Hide success message after 3 seconds
      setTimeout(() => {
        setUpdateSuccess(false)
      }, 3000)
    } catch (err: any) {
      console.error("Error resending verification email:", err)
      setError(err.message || "Failed to resend verification email. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  // Function to handle manual verification
  const handleManualVerification = () => {
    const token = sessionStorage.getItem("registrationToken")
    if (token) {
      router.push(`/register/manual-verification?token=${token}&email=${encodeURIComponent(email)}`)
    } else {
      setError("Verification token not found. Please try again.")
    }
  }

  return (
    <div className="min-h-screen bg-[#0f2d3c] flex flex-col items-center justify-center py-12 px-4">
      <div className="max-w-md w-full bg-[#0f2d3c] rounded-lg p-8 text-center">
        <div className="mb-8 flex justify-center">
          <div className="rounded-full bg-[#f8f5f2] p-6">
            <Image src="/logo.png" alt="Email Icon" width={60} height={60} className="h-12 w-12" />
          </div>
        </div>

        <h1 className="text-3xl font-bold text-[#f8f5f2] mb-6">Please Check your e-mail</h1>

        <div className="bg-[#1a3a4a] rounded-lg p-8 mb-8">
          <p className="text-[#f8f5f2] mb-4">Sent to your e-mail</p>
          <p className="text-[#9b6a4f] font-medium mb-8">{email}</p>

          <div className="border-t border-[#2a4a5a] pt-6">
            <p className="text-[#f8f5f2] text-sm mb-6 text-left">
              The confirmation letter will be sent to your email address within five minutes. Please click the link
              attached as soon as possible to complete the password setting. If you have any questions. Please contact
              the Cloud Airline Customer Service Center.
            </p>

            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {updateSuccess && (
              <div className="bg-green-500/10 text-green-500 border border-green-500 rounded-md p-4 mb-4">
                <p className="flex items-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 mr-2"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Verification email has been resent successfully!
                </p>
              </div>
            )}

            <div className="text-center">
              <p className="text-[#f8f5f2] mb-2">Haven't received an e-mail?</p>
              <Button
                onClick={handleResend}
                disabled={loading}
                className="bg-[#8a7a4e] hover:bg-[#8a7a4e]/90 text-white mb-4"
              >
                {loading ? "Sending..." : "Resend"}
              </Button>
              <div className="mt-2">
                <Button
                  onClick={handleManualVerification}
                  variant="link"
                  className="text-[#9b6a4f] hover:underline text-sm"
                >
                  Skip email verification (for testing)
                </Button>
              </div>
            </div>
          </div>
        </div>

        <Button onClick={() => router.push("/")} className="bg-[#8a7a4e] hover:bg-[#8a7a4e]/90 text-white px-8 w-full">
          Confirm
        </Button>
      </div>
    </div>
  )
}
