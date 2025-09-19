"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react"

interface RegistrationData {
  email: string
  title: string
  firstName: string
  lastName: string
  dateOfBirth: Date | null
  gender: string
  nationality: string
  identityCardNumber: string
  phoneNumber: string
  addressLine: string
  city: string
  country: string
  passportNumber: string
  passportExpiry: string
  token?: string
}

interface RegistrationContextType {
  registrationData: RegistrationData
  updateRegistrationData: (data: Partial<RegistrationData>) => void
  clearRegistrationData: () => void
  isCompleted: boolean
  isLoaded: boolean
}

const defaultRegistrationData: RegistrationData = {
  email: "",
  title: "",
  firstName: "",
  lastName: "",
  dateOfBirth: null,
  gender: "",
  nationality: "",
  identityCardNumber: "",
  phoneNumber: "",
  addressLine: "",
  city: "",
  country: "",
  passportNumber: "",
  passportExpiry: "",
}

const STORAGE_KEY = "cabs_registration_data"

const RegistrationContext = createContext<RegistrationContextType | undefined>(undefined)

export function RegistrationProvider({ children }: { children: ReactNode }) {
  const [registrationData, setRegistrationData] = useState<RegistrationData>(defaultRegistrationData)
  const [isLoaded, setIsLoaded] = useState(false)

  // Load data from localStorage on component mount
  useEffect(() => {
    const loadFromStorage = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored) {
          const parsedData = JSON.parse(stored)
          // Convert dateOfBirth string back to Date object
          if (parsedData.dateOfBirth) {
            parsedData.dateOfBirth = new Date(parsedData.dateOfBirth)
          }
          setRegistrationData({ ...defaultRegistrationData, ...parsedData })
        }
      } catch (error) {
        console.error("Error loading registration data from localStorage:", error)
        // If there's an error, clear the corrupted data
        localStorage.removeItem(STORAGE_KEY)
      } finally {
        setIsLoaded(true)
      }
    }

    loadFromStorage()
  }, [])

  // Save data to localStorage whenever registrationData changes
  useEffect(() => {
    if (isLoaded) {
      try {
        const dataToStore = {
          ...registrationData,
          // Convert Date to string for JSON serialization
          dateOfBirth: registrationData.dateOfBirth ? registrationData.dateOfBirth.toISOString() : null
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToStore))
      } catch (error) {
        console.error("Error saving registration data to localStorage:", error)
      }
    }
  }, [registrationData, isLoaded])

  const updateRegistrationData = (data: Partial<RegistrationData>) => {
    setRegistrationData(prev => ({ ...prev, ...data }))
  }

  const clearRegistrationData = () => {
    setRegistrationData(defaultRegistrationData)
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch (error) {
      console.error("Error clearing registration data from localStorage:", error)
    }
  }

  const isCompleted = !!(
    registrationData.email &&
    registrationData.firstName &&
    registrationData.lastName &&
    registrationData.title &&
    registrationData.dateOfBirth &&
    registrationData.gender &&
    registrationData.nationality &&
    registrationData.identityCardNumber &&
    registrationData.phoneNumber &&
    registrationData.addressLine &&
    registrationData.city &&
    registrationData.country &&
    registrationData.passportNumber &&
    registrationData.passportExpiry
  )

  return (
    <RegistrationContext.Provider value={{
      registrationData,
      updateRegistrationData,
      clearRegistrationData,
      isCompleted,
      isLoaded
    }}>
      {children}
    </RegistrationContext.Provider>
  )
}

export function useRegistration() {
  const context = useContext(RegistrationContext)
  if (context === undefined) {
    throw new Error("useRegistration must be used within a RegistrationProvider")
  }
  return context
}