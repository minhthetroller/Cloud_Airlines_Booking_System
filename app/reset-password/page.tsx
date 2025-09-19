"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Eye, EyeOff, AlertCircle, CheckCircle } from "lucide-react"
import Image from "next/image"
import supabaseClient from "@/lib/supabase/supabaseClient"
import { sha256 } from "js-sha256"

function ResetPassword() {
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [validToken, setValidToken] = useState<boolean | null>(null)
  const [passwordStrength, setPasswordStrength] = useState<{
    score: number
    feedback: string[]
    isValid: boolean
  }>({ score: 0, feedback: [], isValid: false })

  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get("token")

  useEffect(() => {
    if (!token) {
      setError("Invalid reset link")
      setValidToken(false)
      return
    }

    // Verify token
    const verifyToken = async () => {
      try {
        const { data, error } = await supabaseClient
          .from("users")
          .select("userid, reset_token, reset_expires")
          .eq("reset_token", token)
          .gte("reset_expires", new Date().toISOString())
          .single()

        if (error || !data) {
          setError("Invalid or expired reset link")
          setValidToken(false)
        } else {
          setValidToken(true)
        }
      } catch (err) {
        setError("Failed to verify reset link")
        setValidToken(false)
      }
    }

    verifyToken()
  }, [token])

  const validatePassword = (password: string) => {
    const feedback = []
    let score = 0

    if (password.length >= 8) {
      score += 1
    } else {
      feedback.push("Password must be at least 8 characters long")
    }

    if (/[A-Z]/.test(password)) {
      score += 1
    } else {
      feedback.push("Add at least one uppercase letter")
    }

    if (/[a-z]/.test(password)) {
      score += 1
    } else {
      feedback.push("Add at least one lowercase letter")
    }

    if (/\d/.test(password)) {
      score += 1
    } else {
      feedback.push("Add at least one number")
    }

    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      score += 1
    } else {
      feedback.push("Add at least one special character")
    }

    const isValid = score >= 3 && password.length >= 8

    setPasswordStrength({ score, feedback, isValid })
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!password || !confirmPassword) {
      setError("Please fill in all fields")
      return
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long")
      return
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Get user by token
      const { data: userData, error: userError } = await supabaseClient
        .from("users")
        .select("userid")
        .eq("reset_token", token)
        .gte("reset_expires", new Date().toISOString())
        .single()

      if (userError || !userData) {
        throw new Error("Invalid or expired reset link")
      }

      // Hash the new password
      const hashedPassword = sha256(password)

      // Update user password and clear reset token
      const { error: updateError } = await supabaseClient
        .from("users")
        .update({
          passwordhash: hashedPassword,
          reset_token: null,
          reset_expires: null,
        })
        .eq("userid", userData.userid)

      if (updateError) {
        throw new Error("Failed to update password")
      }

      setSuccess(true)

      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push("/")
      }, 3000)
    } catch (err: any) {
      console.error("Reset password error:", err)
      setError(err.message || "Failed to reset password")
    } finally {
      setLoading(false)
    }
  }

  if (validToken === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f2d3c]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#9b6a4f] mx-auto"></div>
          <p className="mt-4 text-gray-600">Verifying reset link...</p>
        </div>
      </div>
    )
  }

  if (validToken === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f2d3c]">
        <div className="bg-[#0a1e29] p-8 rounded-lg shadow-md w-96 text-center">
          <Image src="/logo.png" alt="COSMILE Logo" width={180} height={60} className="h-12 w-auto mx-auto mb-6" />
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button onClick={() => router.push("/")} className="w-full mt-4 bg-[#9b6a4f] hover:bg-[#8a5a42]">
            Back to Home
          </Button>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f2d3c]">
        <div className="bg-[#0a1e29] p-8 rounded-lg shadow-md w-96 text-center">
          <Image src="/logo.png" alt="COSMILE Logo" width={180} height={60} className="h-12 w-auto mx-auto mb-6" />
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Password reset successfully! Redirecting to login...
            </AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f2d3c]">
      <div className="bg-[#0a1e29] p-8 rounded-lg shadow-md w-96">
        <div className="text-center mb-6">
          <Image src="/logo.png" alt="COSMILE Logo" width={180} height={60} className="h-12 w-auto mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white">Reset Password</h1>
          <p className="text-gray-400 mt-2">Enter your new password</p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleResetPassword} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password" className="text-white">
              New Password
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter new password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  validatePassword(e.target.value)
                }}
                className="border-gray-300 pr-10 bg-[#0f2d3c] border-[#1a3a4a] text-white"
              />
              <button
                type="button"
                className="absolute right-3 top-3 text-gray-500"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {password && (
              <div className="mt-2">
                <div className="flex space-x-1 mb-2">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <div
                      key={level}
                      className={`h-1 flex-1 rounded ${
                        passwordStrength.score >= level
                          ? passwordStrength.score <= 2
                            ? "bg-red-500"
                            : passwordStrength.score <= 3
                              ? "bg-yellow-500"
                              : "bg-green-500"
                          : "bg-gray-200"
                      }`}
                    />
                  ))}
                </div>
                <p
                  className={`text-xs ${
                    passwordStrength.score <= 2
                      ? "text-red-600"
                      : passwordStrength.score <= 3
                        ? "text-yellow-600"
                        : "text-green-600"
                  }`}
                >
                  {passwordStrength.score <= 2 ? "Weak" : passwordStrength.score <= 3 ? "Medium" : "Strong"} password
                </p>
                {passwordStrength.feedback.length > 0 && (
                  <ul className="text-xs text-gray-600 mt-1">
                    {passwordStrength.feedback.map((item, index) => (
                      <li key={index}>• {item}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-white">
              Confirm Password
            </Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="border-gray-300 pr-10 bg-[#0f2d3c] border-[#1a3a4a] text-white"
              />
              <button
                type="button"
                className="absolute right-3 top-3 text-gray-500"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full bg-[#9b6a4f] hover:bg-[#8a5a42] text-white"
            disabled={loading || !passwordStrength.isValid}
          >
            {loading ? "Resetting..." : "Reset Password"}
          </Button>
        </form>
      </div>
    </div>
  )
}

// Add this at the very end of the file, after the existing component
export default function Page() {
  return <ResetPassword />
}
