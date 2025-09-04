"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import Image from "next/image"

export default function ManualVerificationPage() {
  const [token, setToken] = useState("")
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleVerify = () => {
    if (!token) {
      setError("Please enter your verification token")
      return
    }

    if (!email) {
      setError("Please enter your email address")
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Store token and email in session storage
      sessionStorage.setItem("registrationToken", token)
      sessionStorage.setItem("registrationEmail", email)

      // Redirect to password creation page with both token and email
      router.push(`/register/set-password?token=${token}&email=${encodeURIComponent(email)}`)
    } catch (err: any) {
      console.error("Error during verification:", err)
      setError(err.message || "Failed to verify token. Please try again.")
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0f2d3c] flex flex-col items-center justify-center py-12 px-4">
      <div className="max-w-md w-full bg-[#0f2d3c] rounded-lg p-8 text-center">
        <div className="mb-8 flex justify-center">
          <div className="rounded-full bg-[#f8f5f2] p-6">
            <Image src="/logo.png" alt="STARLUX Logo" width={60} height={60} className="h-12 w-12" />
          </div>
        </div>

        <h1 className="text-3xl font-bold text-[#f8f5f2] mb-6">Manual Verification</h1>

        <div className="bg-[#1a3a4a] rounded-lg p-8 mb-8">
          <p className="text-[#f8f5f2] mb-6">
            If you haven't received the verification email, you can manually enter your verification token below.
          </p>

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <div>
              <Label htmlFor="email" className="text-[#f8f5f2] mb-2 block text-left">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-[#0f2d3c] border-[#2a4a5a]"
                placeholder="Enter your email address"
              />
            </div>

            <div>
              <Label htmlFor="token" className="text-[#f8f5f2] mb-2 block text-left">
                Verification Token
              </Label>
              <Input
                id="token"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="bg-[#0f2d3c] border-[#2a4a5a]"
                placeholder="Enter your verification token"
              />
            </div>

            <Button
              onClick={handleVerify}
              disabled={loading}
              className="w-full bg-[#8a7a4e] hover:bg-[#8a7a4e]/90 text-white"
            >
              {loading ? "Verifying..." : "Verify Token"}
            </Button>
          </div>
        </div>

        <Button onClick={() => router.push("/")} className="bg-[#8a7a4e] hover:bg-[#8a7a4e]/90 text-white px-8 w-full">
          Return to Home
        </Button>
      </div>
    </div>
  )
}
