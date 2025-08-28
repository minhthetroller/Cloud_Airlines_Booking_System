"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import supabaseClient from "@/lib/supabase"
import { v4 as uuidv4 } from "uuid"

interface User {
  email: string
  customerId: string
  userId: number
}

interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const router = useRouter()

  // Check authentication status on initial load
  useEffect(() => {
    const checkAuth = async () => {
      try {
        setLoading(true)

        // Get session token from cookie
        const sessionToken = getCookie("session_token")

        if (!sessionToken) {
          setUser(null)
          setIsAuthenticated(false)
          setLoading(false)
          return
        }

        // Verify session token in Supabase
        const { data: sessionData, error: sessionError } = await supabaseClient
          .from("sessions")
          .select("userid, expires")
          .eq("token", sessionToken)
          .single()

        if (sessionError || !sessionData) {
          // Invalid or expired session
          deleteCookie("session_token")
          setUser(null)
          setIsAuthenticated(false)
          setLoading(false)
          return
        }

        // Check if session is expired
        if (new Date(sessionData.expires) < new Date()) {
          // Session expired, delete it
          await supabaseClient.from("sessions").delete().eq("token", sessionToken)

          deleteCookie("session_token")
          setUser(null)
          setIsAuthenticated(false)
          setLoading(false)
          return
        }

        // Session is valid, get user data
        const { data: userData, error: userError } = await supabaseClient
          .from("users")
          .select("username, customerid, userid")
          .eq("userid", sessionData.userid)
          .single()

        if (userError || !userData) {
          deleteCookie("session_token")
          setUser(null)
          setIsAuthenticated(false)
          setLoading(false)
          return
        }

        // Set user data
        setUser({
          email: userData.username,
          customerId: userData.customerid,
          userId: userData.userid,
        })
        setIsAuthenticated(true)
      } catch (error) {
        console.error("Auth check error:", error)
        // On error, clear auth state
        setUser(null)
        setIsAuthenticated(false)
      } finally {
        setLoading(false)
      }
    }

    // Check auth on initial load
    checkAuth()

    // Set up interval to periodically check auth (every 5 minutes)
    const interval = setInterval(checkAuth, 5 * 60 * 1000)

    // Clean up interval
    return () => clearInterval(interval)
  }, [])

  const signIn = async (email: string, password: string) => {
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

      // Check if the password matches
      if (userCheck.passwordhash !== password) {
        throw new Error("Invalid email or password")
      }

      // Generate a session token
      const token = uuidv4()

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
      setCookie("session_token", token, 30)

      // Update user state
      setUser({
        email: email,
        customerId: userCheck.customerid,
        userId: userCheck.userid,
      })
      setIsAuthenticated(true)

      router.push("/profile")
    } catch (error: any) {
      throw error
    }
  }

  const signOut = async () => {
    try {
      const sessionToken = getCookie("session_token")

      if (sessionToken) {
        // Delete session from database
        await supabaseClient.from("sessions").delete().eq("token", sessionToken)

        // Delete cookie
        deleteCookie("session_token")
      }

      setUser(null)
      setIsAuthenticated(false)
      router.push("/")
    } catch (error) {
      console.error("Sign out error:", error)
    }
  }

  // Cookie helper functions
  function setCookie(name: string, value: string, days: number) {
    const expires = new Date()
    expires.setDate(expires.getDate() + days)
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Strict`
  }

  function getCookie(name: string): string | null {
    const nameEQ = name + "="
    const ca = document.cookie.split(";")
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i]
      while (c.charAt(0) === " ") c = c.substring(1, c.length)
      if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length)
    }
    return null
  }

  function deleteCookie(name: string) {
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;SameSite=Strict`
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut, isAuthenticated }}>{children}</AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
