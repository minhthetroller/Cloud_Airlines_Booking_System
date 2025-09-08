"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertCircle, Eye, EyeOff } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import supabaseClient from "@/lib/supabase-client"
import { sha256 } from "js-sha256"

interface LoginOrGuestDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onLoginSuccess: () => void
  onGuestContinue: () => void
}

export default function LoginOrGuestDialog({
  open,
  onOpenChange,
  onLoginSuccess,
  onGuestContinue,
}: LoginOrGuestDialogProps) {
  const [showLoginForm, setShowLoginForm] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Check if the user exists and is verified in our database
      const { data: userCheck, error: userCheckError } = await supabaseClient
        .from("users")
        .select("accountstatus, passwordhash, customerid, userid")
        .eq("username", email)
        .single()

      if (userCheckError) {
        throw new Error("Invalid email or password")
      }

      // Check if the account is verified
      if (userCheck.accountstatus !== "verified") {
        throw new Error("Please verify your account before logging in")
      }

      // Hash the input password using sha256
      const hashedPassword = sha256(password)

      // Check if the hashed password matches the stored passwordhash
      if (userCheck.passwordhash !== hashedPassword) {
        throw new Error("Invalid email or password")
      }

      // Generate a session token
      const token = crypto.randomUUID()

      // Set expiration date (30 days from now)
      const expires = new Date()
      expires.setDate(expires.getDate() + 30)

      // Create a new session in the database
      const { error: sessionError } = await supabaseClient.from("sessions").insert({
        userid: userCheck.userid,
        token: token,
        expires: expires.toISOString(),
      })

      if (sessionError) {
        throw new Error("Failed to create session")
      }

      // Store session token in cookie
      document.cookie = `session_token=${token};expires=${expires.toUTCString()};path=/;SameSite=Strict`

      // Store user info in session storage for client-side auth
      sessionStorage.setItem("isLoggedIn", "true")
      sessionStorage.setItem("userEmail", email)
      sessionStorage.setItem("userId", userCheck.userid.toString())
      sessionStorage.setItem("customerId", userCheck.customerid)

      // Proceed with login success
      onLoginSuccess()
    } catch (err: any) {
      console.error("Login error:", err)
      setError(err.message || "Failed to log in. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{showLoginForm ? "Login" : "Continue Booking"}</DialogTitle>
          <DialogDescription>
            {showLoginForm
              ? "Please enter your credentials to continue."
              : "Would you like to login or continue as a guest?"}
          </DialogDescription>
        </DialogHeader>

        {showLoginForm ? (
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="your.email@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div className="flex justify-between">
              <Button type="button" variant="outline" onClick={() => setShowLoginForm(false)}>
                Back
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Logging in..." : "Login"}
              </Button>
            </div>
          </form>
        ) : (
          <div className="flex flex-col space-y-4">
            <Button onClick={() => setShowLoginForm(true)}>Login</Button>
            <Button variant="outline" onClick={onGuestContinue}>
              Continue as Guest
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
