"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Eye, EyeOff, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Link from "next/link"
import Image from "next/image"
import supabaseClient from "@/lib/supabase/supabaseClient"
import { useRouter } from "next/navigation"
import { v4 as uuidv4 } from "uuid"
import { sha256 } from "js-sha256"
import axios from "axios"

interface LoginModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("")
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false)
  const [forgotPasswordMessage, setForgotPasswordMessage] = useState<string | null>(null)
  const router = useRouter()

  const [failedAttempts, setFailedAttempts] = useState(0)
  const [isLocked, setIsLocked] = useState(false)
  const [lockoutTime, setLockoutTime] = useState<Date | null>(null)

  // Cookie helper functions
  function setCookie(name: string, value: string, days: number) {
    const expires = new Date()
    expires.setDate(expires.getDate() + days)
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Strict`
  }

  const checkLockout = () => {
    if (lockoutTime && new Date() < lockoutTime) {
      const remainingTime = Math.ceil((lockoutTime.getTime() - new Date().getTime()) / 1000 / 60)
      setError(`Account temporarily locked. Try again in ${remainingTime} minutes.`)
      return true
    }
    if (lockoutTime && new Date() >= lockoutTime) {
      setIsLocked(false)
      setLockoutTime(null)
      setFailedAttempts(0)
    }
    return false
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    if (checkLockout()) {
      return
    }

    if (!email || !password) {
      setError("Please enter both email and password")
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Hash the password for comparison
      const hashedPassword = sha256(password)

      // Check if the user exists and password matches
      const { data: userCheck, error: userCheckError } = await supabaseClient
        .from("users")
        .select("*")
        .eq("username", email)
        .single()

      if (userCheckError) {
        console.error("User check error:", userCheckError)
        throw new Error("Invalid email or password")
      }

      // Check if the account is verified
      if (userCheck.accountstatus !== "verified") {
        throw new Error("Please verify your account before logging in")
      }

      // Compare hashed passwords
      if (userCheck.passwordhash !== hashedPassword) {
        throw new Error("Invalid email or password")
      }

      // Generate a session token
      const token = uuidv4()

      // Set expiration date (30 days from now or 1 day if not remember me)
      const expires = new Date()
      expires.setDate(expires.getDate() + (rememberMe ? 30 : 1))

      // Delete any existing sessions for this user
      await supabaseClient.from("sessions").delete().eq("userid", userCheck.userid)

      // Create a new session in the database
      const { error: sessionError } = await supabaseClient.from("sessions").insert({
        userid: userCheck.userid,
        token: token,
        expires: expires.toISOString(),
      })

      if (sessionError) {
        console.error("Session creation error:", sessionError)
        throw new Error("Failed to create session")
      }

      // Store session token in cookie
      setCookie("session_token", token, rememberMe ? 30 : 1)

      // Successfully logged in
      onClose()

      sessionStorage.setItem("isLoggedIn", "true")
      sessionStorage.setItem("userEmail", email)
      sessionStorage.setItem("justLoggedIn", "true")

      // Force a refresh of the page to ensure auth state is updated
      window.location.href = "/profile"

      setFailedAttempts(0)
      setIsLocked(false)
      setLockoutTime(null)
    } catch (err: any) {
      console.error("Login error:", err)

      const newFailedAttempts = failedAttempts + 1
      setFailedAttempts(newFailedAttempts)

      if (newFailedAttempts >= 5) {
        const lockTime = new Date()
        lockTime.setMinutes(lockTime.getMinutes() + 15) // 15 minute lockout
        setLockoutTime(lockTime)
        setIsLocked(true)
        setError("Too many failed attempts. Account locked for 15 minutes.")
      } else {
        setError(
          `${err.message || "Failed to sign in. Please check your credentials."} (${5 - newFailedAttempts} attempts remaining)`,
        )
      }
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!forgotPasswordEmail) {
      setError("Please enter your email address")
      return
    }

    setForgotPasswordLoading(true)
    setError(null)
    setForgotPasswordMessage(null)

    try {
      // Check if user exists
      const { data: userCheck, error: userCheckError } = await supabaseClient
        .from("users")
        .select("userid, username")
        .eq("username", forgotPasswordEmail)
        .single()

      if (userCheckError) {
        throw new Error("Email address not found")
      }

      // Generate reset token
      // const resetToken = uuidv4()
      // const expires = new Date()
      // expires.setHours(expires.getHours() + 1) // Token expires in 1 hour

      // Store reset token in database
      // const { error: tokenError } = await supabaseClient.from("password_resets").insert({
      //   userid: userCheck.userid,
      //   token: resetToken,
      //   expires: expires.toISOString(),
      //   used: false,
      // })

      // if (tokenError) {
      //   console.error("Token creation error:", tokenError)
      //   throw new Error("Failed to create reset token")
      // }

      // Send reset email
      const response = await axios.post("/api/send-password-reset", {
        email: forgotPasswordEmail,
      });

      setForgotPasswordMessage("Password reset email sent! Please check your inbox.")
      setForgotPasswordEmail("")
    } catch (err: any) {
      console.error("Forgot password error:", err)
      setError(err.message || "Failed to send password reset email")
    } finally {
      setForgotPasswordLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-3xl p-0 overflow-hidden">
        <div className="flex flex-col md:flex-row">
          {/* Left side with logo and text */}
          <div className="bg-[#f8f5f2] p-8 flex flex-col items-center justify-center text-center md:w-2/5">
            <div className="mb-6">
              <Image src="/logo.png" alt="COSMILE Logo" width={180} height={60} className="h-12 w-auto" />
            </div>
            <p className="text-sm text-[#0f2d3c]">We invite you to experience</p>
            <p className="text-sm text-[#0f2d3c]">The premium frequent flyer program of Cloud Airlines</p>
          </div>

          {/* Right side with login form */}
          <div className="p-6 md:p-8 md:w-3/5">
            <h2 className="text-2xl font-bold text-center mb-6 text-[#0f2d3c]">Login</h2>

            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Input
                  type="text"
                  placeholder="COSMILE ID or e-mail"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="border-gray-300"
                />
              </div>

              <div className="space-y-2 relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="border-gray-300 pr-10"
                />
                <button
                  type="button"
                  className="absolute right-3 top-3 text-gray-500"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="remember-me"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                  />
                  <Label htmlFor="remember-me" className="text-sm text-gray-600">
                    Remember me for 30 days
                  </Label>
                </div>
              </div>

              <div className="text-right">
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-sm text-[#0f2d3c] hover:underline"
                >
                  Forgot password
                </button>
              </div>

              <Button type="submit" className="w-full bg-[#8a7a4e] hover:bg-[#8a7a4e]/90 text-white" disabled={loading}>
                {loading ? "Signing in..." : "Login"}
              </Button>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">OR</span>
                </div>
              </div>

              <div className="text-center">
                <p className="text-sm text-gray-600">
                  Not a COSMILE member yet?{" "}
                  <Link href="/register" className="text-[#0f2d3c] font-medium hover:underline">
                    Join COSMILE
                  </Link>
                </p>
              </div>
            </form>
            {showForgotPassword && (
              <div className="absolute inset-0 bg-white z-10 p-6 md:p-8">
                <div className="flex items-center mb-6">
                  <button
                    onClick={() => {
                      setShowForgotPassword(false)
                      setError(null)
                      setForgotPasswordMessage(null)
                      setForgotPasswordEmail("")
                    }}
                    className="text-gray-500 hover:text-gray-700 mr-4"
                  >
                    ← Back
                  </button>
                  <h2 className="text-2xl font-bold text-[#0f2d3c]">Reset Password</h2>
                </div>

                {error && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {forgotPasswordMessage && (
                  <Alert className="mb-4 border-green-200 bg-green-50">
                    <AlertCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">{forgotPasswordMessage}</AlertDescription>
                  </Alert>
                )}

                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reset-email">Email Address</Label>
                    <Input
                      id="reset-email"
                      type="email"
                      placeholder="Enter your email address"
                      value={forgotPasswordEmail}
                      onChange={(e) => setForgotPasswordEmail(e.target.value)}
                      className="border-gray-300"
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-[#8a7a4e] hover:bg-[#8a7a4e]/90 text-white"
                    disabled={forgotPasswordLoading}
                  >
                    {forgotPasswordLoading ? "Sending..." : "Send Reset Email"}
                  </Button>
                </form>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
