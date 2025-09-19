"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import supabaseClient from "@/lib/supabase/supabaseClient"
import { User as SupabaseUser } from "@supabase/supabase-js"

interface User {
  email: string
  id: string
  // Remove customerId and userId - these will be fetched from database when needed
  // Security: Never store sensitive IDs in localStorage or sessionStorage
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
    const getSession = async () => {
      try {
        setLoading(true)
        
        // Get current session from Supabase
        const { data: { session }, error } = await supabaseClient.auth.getSession()
        
        if (error) {
          console.error("Session error:", error)
          setUser(null)
          setIsAuthenticated(false)
          return
        }

        if (session?.user) {
          // User authenticated with Supabase - use session token securely
          // Database IDs will be fetched when needed via authenticated API calls
          setUser({
            id: session.user.id,
            email: session.user.email || "",
          })
          setIsAuthenticated(true)
        } else {
          setUser(null)
          setIsAuthenticated(false)
        }
      } catch (error) {
        console.error("Auth check error:", error)
        setUser(null)
        setIsAuthenticated(false)
      } finally {
        setLoading(false)
      }
    }

    getSession()

    // Listen for auth state changes
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          // User authenticated with Supabase - use session token securely
          // Database IDs will be fetched when needed via authenticated API calls
          setUser({
            id: session.user.id,
            email: session.user.email || "",
          })
          setIsAuthenticated(true)
        } else {
          setUser(null)
          setIsAuthenticated(false)
        }
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: email,
        password: password,
      })

      if (error) {
        throw new Error(error.message)
      }

      if (!data.user) {
        throw new Error("Login failed")
      }

      // Auth state will be updated automatically by the onAuthStateChange listener
      router.push("/profile")
    } catch (error: any) {
      throw error
    }
  }

  const signOut = async () => {
    try {
      const { error } = await supabaseClient.auth.signOut()
      
      if (error) {
        console.error("Sign out error:", error)
      }

      // Auth state will be updated automatically by the onAuthStateChange listener
      router.push("/")
    } catch (error) {
      console.error("Sign out error:", error)
    }
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
