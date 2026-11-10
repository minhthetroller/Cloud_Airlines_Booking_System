"use client"

import type React from "react"
import { useCallback, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useAppDispatch, useAppSelector, useHydrated } from "@/lib/store/hooks"
import { login, logout, refreshSession } from "@/lib/store/session"

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

// Auth state lives in the Redux store; this provider only keeps it fresh
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch()

  useEffect(() => {
    // Periodically re-check the session (every 5 minutes)
    const interval = setInterval(() => dispatch(refreshSession()), 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [dispatch])

  return <>{children}</>
}

export function useAuth(): AuthContextType {
  const dispatch = useAppDispatch()
  const router = useRouter()
  const authUser = useAppSelector((state) => state.auth.user)
  const hydrated = useHydrated()

  const user = useMemo<User | null>(
    () =>
      authUser ? { email: authUser.email, customerId: String(authUser.customerId), userId: authUser.userId } : null,
    [authUser],
  )

  const signIn = useCallback(
    async (email: string, password: string) => {
      await dispatch(login(email, password))
      router.push("/profile")
    },
    [dispatch, router],
  )

  const signOut = useCallback(async () => {
    try {
      await dispatch(logout())
      router.push("/")
    } catch (error) {
      console.error("Sign out error:", error)
    }
  }, [dispatch, router])

  return { user, loading: !hydrated, signIn, signOut, isAuthenticated: !!user }
}
