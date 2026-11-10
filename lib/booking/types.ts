// Shapes shared by the Redux store, the Redis booking draft and the booking API

export interface PassengerDetails {
  adults: number
  children: number
  infants: number
  travelClass: string
}

export interface SelectedFlightDetails {
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

export interface Seat {
  seatid: number
  airplanetypeid: number
  seatnumber: string
  classid: number
  seattype: string
  isoccupied?: boolean
  isAutoAssigned?: boolean
}

export interface GuestInformation {
  firstName: string
  lastName: string
  email: string
  phone: string
  dateOfBirth: string
  nationality: string
  passportNumber: string
  passportExpiry: string
  identityCardNumber: string
  pronoun: string
  passengerType?: string
  customerId?: string | number
  isPrimary?: boolean
}

export interface ContactInformation {
  contactName: string
  contactEmail: string
  contactPhone: string
  address: string
  city: string
  country: string
  sameAsPassenger: boolean
}

export interface BookingProgress {
  bookingId: number | null
  bookingReference: string | null
  totalPrice: number | null
  paymentId: number | null
}

export interface RegistrationCustomerData {
  firstName: string
  lastName: string
  pronoun: string
  dateOfBirth: string
  gender: string
  nationality: string
  identityCardNumber: string
  phoneNumber: string
  address: string
  city: string
  country: string
  passportNumber: string
  passportExpiry: string
}

export interface RegistrationState {
  email: string | null
  title: string | null
  firstName: string | null
  lastName: string | null
  customerData: RegistrationCustomerData | null
  token: string | null
}

/** Everything about an in-progress booking that has to survive a refresh or the Stripe redirect. */
export interface BookingDraft {
  search: PassengerDetails | null
  flights: {
    departure: SelectedFlightDetails | null
    return: SelectedFlightDetails | null
  }
  seats: {
    departure: Seat[]
    return: Seat[]
  }
  passengers: GuestInformation[]
  contact: ContactInformation | null
  booking: BookingProgress
  registration: RegistrationState
}

export const emptyBookingProgress: BookingProgress = {
  bookingId: null,
  bookingReference: null,
  totalPrice: null,
  paymentId: null,
}

export const emptyRegistration: RegistrationState = {
  email: null,
  title: null,
  firstName: null,
  lastName: null,
  customerData: null,
  token: null,
}

export const emptyDraft: BookingDraft = {
  search: null,
  flights: { departure: null, return: null },
  seats: { departure: [], return: [] },
  passengers: [],
  contact: null,
  booking: emptyBookingProgress,
  registration: emptyRegistration,
}

export const FARE_CLASS_IDS: Record<string, number> = {
  "Economy Saver": 1,
  "Economy Flex": 2,
  "Premium Economy": 3,
  Business: 4,
  "First Class": 5,
}
