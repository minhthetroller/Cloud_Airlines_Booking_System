"use client"

import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react'

// Types and Interfaces
interface Airport {
  airportcode: string
  airportname: string
  city: string
  country: string
}

interface FlightDetails {
  flightId: number
  class: string
  fareType: string
  price: number
  flightNumber?: string
  departureTime?: string
  arrivalTime?: string
  departureAirport?: string
  arrivalAirport?: string
  duration?: string
  airplanetypeid?: number
}

interface SeatDetails {
  seatid: number
  seatnumber: string
  classid: number
  seattype?: string
  price?: number
  isAutoAssigned?: boolean
}

interface PassengerInfo {
  firstName: string
  lastName: string
  email?: string
  phone?: string
  passportNumber?: string
  identityCardNumber?: string
  isPrimary?: boolean
}

interface ContactInfo {
  firstName: string
  lastName: string
  email: string
  phone: string
}

interface PassengerCounts {
  adults: number
  children: number
  infants: number
}

interface AuthState {
  isLoggedIn: boolean
  userEmail: string | null
  // Removed userId and customerId - these are security risks when stored in localStorage
  // User IDs will be fetched from Supabase session when needed
}

interface BookingState {
  // Flight Selection
  selectedDepartureFlight: FlightDetails | null
  selectedReturnFlight: FlightDetails | null
  passengerDetails: {
    adults: number
    children: number
    infants: number
    travelClass: string
  } | null
  
  // Seat Selection
  selectedSeats: {
    departure: SeatDetails[]
    return: SeatDetails[]
  }
  allSeats: {
    departure: SeatDetails[]
    return: SeatDetails[]
  }
  totalPassengers: number
  passengerTypes: PassengerCounts | null
  
  // Passenger Information
  passengers: PassengerInfo[]
  guestInformation: PassengerInfo | null
  
  // Contact Information
  contactInformation: ContactInfo | null
  
  // Authentication
  auth: AuthState
  
  // Booking Details
  bookingId: string | null
  bookingReference: string | null
  totalPrice: number | null
  paymentId: string | null
  contactEmail: string | null
  
  // Customer Data
  customerIds: string[] | null
}

// Action Types
type BookingAction = 
  | { type: 'SET_DEPARTURE_FLIGHT'; payload: FlightDetails | null }
  | { type: 'SET_RETURN_FLIGHT'; payload: FlightDetails | null }
  | { type: 'SET_PASSENGER_DETAILS'; payload: BookingState['passengerDetails'] }
  | { type: 'SET_SELECTED_SEATS'; payload: { type: 'departure' | 'return'; seats: SeatDetails[] } }
  | { type: 'SET_ALL_SEATS'; payload: { type: 'departure' | 'return'; seats: SeatDetails[] } }
  | { type: 'SET_TOTAL_PASSENGERS'; payload: number }
  | { type: 'SET_PASSENGER_TYPES'; payload: PassengerCounts }
  | { type: 'SET_PASSENGERS'; payload: PassengerInfo[] }
  | { type: 'SET_GUEST_INFORMATION'; payload: PassengerInfo }
  | { type: 'SET_CONTACT_INFORMATION'; payload: ContactInfo }
  | { type: 'SET_AUTH'; payload: Partial<AuthState> }
  | { type: 'SET_BOOKING_ID'; payload: string }
  | { type: 'SET_BOOKING_REFERENCE'; payload: string }
  | { type: 'SET_TOTAL_PRICE'; payload: number }
  | { type: 'SET_PAYMENT_ID'; payload: string }
  | { type: 'SET_CONTACT_EMAIL'; payload: string }
  | { type: 'SET_CUSTOMER_IDS'; payload: string[] }
  | { type: 'CLEAR_BOOKING' }
  | { type: 'RESTORE_FROM_STORAGE'; payload: Partial<BookingState> }

// Initial State
const initialState: BookingState = {
  selectedDepartureFlight: null,
  selectedReturnFlight: null,
  passengerDetails: null,
  selectedSeats: {
    departure: [],
    return: []
  },
  allSeats: {
    departure: [],
    return: []
  },
  totalPassengers: 0,
  passengerTypes: null,
  passengers: [],
  guestInformation: null,
  contactInformation: null,
  auth: {
    isLoggedIn: false,
    userEmail: null,
    // Removed userId and customerId - these are security risks when stored in localStorage
    // User IDs will be fetched from Supabase session when needed
  },
  bookingId: null,
  bookingReference: null,
  totalPrice: null,
  paymentId: null,
  contactEmail: null,
  customerIds: null
}

// Reducer
function bookingReducer(state: BookingState, action: BookingAction): BookingState {
  switch (action.type) {
    case 'SET_DEPARTURE_FLIGHT':
      return { ...state, selectedDepartureFlight: action.payload }
    
    case 'SET_RETURN_FLIGHT':
      return { ...state, selectedReturnFlight: action.payload }
    
    case 'SET_PASSENGER_DETAILS':
      return { ...state, passengerDetails: action.payload }
    
    case 'SET_SELECTED_SEATS':
      return {
        ...state,
        selectedSeats: {
          ...state.selectedSeats,
          [action.payload.type]: action.payload.seats
        }
      }
    
    case 'SET_ALL_SEATS':
      return {
        ...state,
        allSeats: {
          ...state.allSeats,
          [action.payload.type]: action.payload.seats
        }
      }
    
    case 'SET_TOTAL_PASSENGERS':
      return { ...state, totalPassengers: action.payload }
    
    case 'SET_PASSENGER_TYPES':
      return { ...state, passengerTypes: action.payload }
    
    case 'SET_PASSENGERS':
      return { ...state, passengers: action.payload }
    
    case 'SET_GUEST_INFORMATION':
      return { ...state, guestInformation: action.payload }
    
    case 'SET_CONTACT_INFORMATION':
      return { ...state, contactInformation: action.payload }
    
    case 'SET_AUTH':
      return { ...state, auth: { ...state.auth, ...action.payload } }
    
    case 'SET_BOOKING_ID':
      return { ...state, bookingId: action.payload }
    
    case 'SET_BOOKING_REFERENCE':
      return { ...state, bookingReference: action.payload }
    
    case 'SET_TOTAL_PRICE':
      return { ...state, totalPrice: action.payload }
    
    case 'SET_PAYMENT_ID':
      return { ...state, paymentId: action.payload }
    
    case 'SET_CONTACT_EMAIL':
      return { ...state, contactEmail: action.payload }
    
    case 'SET_CUSTOMER_IDS':
      return { ...state, customerIds: action.payload }
    
    case 'CLEAR_BOOKING':
      return initialState
    
    case 'RESTORE_FROM_STORAGE':
      return { ...state, ...action.payload }
    
    default:
      return state
  }
}

// Context
interface BookingContextType {
  state: BookingState
  dispatch: React.Dispatch<BookingAction>
  // Helper functions
  setDepartureFlight: (flight: FlightDetails | null) => void
  setReturnFlight: (flight: FlightDetails | null) => void
  setPassengerDetails: (details: BookingState['passengerDetails']) => void
  setSelectedSeats: (type: 'departure' | 'return', seats: SeatDetails[]) => void
  setAllSeats: (type: 'departure' | 'return', seats: SeatDetails[]) => void
  setPassengers: (passengers: PassengerInfo[]) => void
  setContactInformation: (contact: ContactInfo) => void
  setAuth: (auth: Partial<AuthState>) => void
  setBookingDetails: (details: { bookingId?: string; bookingReference?: string; totalPrice?: number; paymentId?: string }) => void
  clearBooking: () => void
  saveToLocalStorage: () => void
  loadFromLocalStorage: () => void
}

const BookingContext = createContext<BookingContextType | undefined>(undefined)

// Provider Component
interface BookingProviderProps {
  children: ReactNode
}

export function BookingProvider({ children }: BookingProviderProps) {
  const [state, dispatch] = useReducer(bookingReducer, initialState)
  
  // Load from localStorage on mount
  useEffect(() => {
    loadFromLocalStorage()
  }, [])
  
  // Save to localStorage whenever state changes
  useEffect(() => {
    saveToLocalStorage()
  }, [state])
  
  // Helper functions
  const setDepartureFlight = (flight: FlightDetails | null) => {
    dispatch({ type: 'SET_DEPARTURE_FLIGHT', payload: flight })
  }
  
  const setReturnFlight = (flight: FlightDetails | null) => {
    dispatch({ type: 'SET_RETURN_FLIGHT', payload: flight })
  }
  
  const setPassengerDetails = (details: BookingState['passengerDetails']) => {
    dispatch({ type: 'SET_PASSENGER_DETAILS', payload: details })
  }
  
  const setSelectedSeats = (type: 'departure' | 'return', seats: SeatDetails[]) => {
    dispatch({ type: 'SET_SELECTED_SEATS', payload: { type, seats } })
  }
  
  const setAllSeats = (type: 'departure' | 'return', seats: SeatDetails[]) => {
    dispatch({ type: 'SET_ALL_SEATS', payload: { type, seats } })
  }
  
  const setPassengers = (passengers: PassengerInfo[]) => {
    dispatch({ type: 'SET_PASSENGERS', payload: passengers })
  }
  
  const setContactInformation = (contact: ContactInfo) => {
    dispatch({ type: 'SET_CONTACT_INFORMATION', payload: contact })
  }
  
  const setAuth = (auth: Partial<AuthState>) => {
    dispatch({ type: 'SET_AUTH', payload: auth })
  }
  
  const setBookingDetails = (details: { bookingId?: string; bookingReference?: string; totalPrice?: number; paymentId?: string }) => {
    if (details.bookingId) dispatch({ type: 'SET_BOOKING_ID', payload: details.bookingId })
    if (details.bookingReference) dispatch({ type: 'SET_BOOKING_REFERENCE', payload: details.bookingReference })
    if (details.totalPrice) dispatch({ type: 'SET_TOTAL_PRICE', payload: details.totalPrice })
    if (details.paymentId) dispatch({ type: 'SET_PAYMENT_ID', payload: details.paymentId })
  }
  
  const clearBooking = () => {
    dispatch({ type: 'CLEAR_BOOKING' })
    localStorage.removeItem('booking-state')
  }
  
  const saveToLocalStorage = () => {
    try {
      // Only save if we have meaningful data to prevent saving empty initial state
      if (state.selectedDepartureFlight || state.passengers.length > 0 || state.bookingId) {
        localStorage.setItem('booking-state', JSON.stringify(state))
      }
    } catch (error) {
      console.error('Failed to save booking state to localStorage:', error)
    }
  }
  
  const loadFromLocalStorage = () => {
    try {
      const saved = localStorage.getItem('booking-state')
      if (saved) {
        const parsedState = JSON.parse(saved)
        dispatch({ type: 'RESTORE_FROM_STORAGE', payload: parsedState })
      }
    } catch (error) {
      console.error('Failed to load booking state from localStorage:', error)
    }
  }
  
  const value: BookingContextType = {
    state,
    dispatch,
    setDepartureFlight,
    setReturnFlight,
    setPassengerDetails,
    setSelectedSeats,
    setAllSeats,
    setPassengers,
    setContactInformation,
    setAuth,
    setBookingDetails,
    clearBooking,
    saveToLocalStorage,
    loadFromLocalStorage
  }
  
  return (
    <BookingContext.Provider value={value}>
      {children}
    </BookingContext.Provider>
  )
}

// Hook to use the booking context
export function useBooking() {
  const context = useContext(BookingContext)
  if (context === undefined) {
    throw new Error('useBooking must be used within a BookingProvider')
  }
  return context
}

export type { BookingState, FlightDetails, SeatDetails, PassengerInfo, ContactInfo, PassengerCounts, AuthState }