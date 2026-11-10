import { createAction, createSlice, type PayloadAction } from "@reduxjs/toolkit"
import {
  type BookingDraft,
  type BookingProgress,
  type ContactInformation,
  emptyBookingProgress,
  type GuestInformation,
  type PassengerDetails,
  type Seat,
  type SelectedFlightDetails,
} from "@/lib/booking/types"

/** Replaces the whole in-progress booking with the draft loaded from the server. */
export const hydrateDraft = createAction<BookingDraft>("booking/hydrateDraft")
/** Forgets the in-progress booking (finished, cancelled or a new search). */
export const resetBooking = createAction("booking/reset")

type FlightLeg = "departure" | "return"

// Passenger counts and cabin chosen in the search form
const searchSlice = createSlice({
  name: "search",
  initialState: null as PassengerDetails | null,
  reducers: {
    setPassengerDetails: (_state, action: PayloadAction<PassengerDetails>) => action.payload,
  },
  extraReducers: (builder) => {
    builder.addCase(hydrateDraft, (_state, action) => action.payload.search)
  },
})

// Flights and fares picked on the results page
const flightsSlice = createSlice({
  name: "flights",
  initialState: { departure: null, return: null } as BookingDraft["flights"],
  reducers: {
    setSelectedFlights: (_state, action: PayloadAction<BookingDraft["flights"]>) => action.payload,
    setFlight: (state, action: PayloadAction<{ leg: FlightLeg; flight: SelectedFlightDetails | null }>) => {
      state[action.payload.leg] = action.payload.flight
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(hydrateDraft, (_state, action) => action.payload.flights)
      .addCase(resetBooking, () => ({ departure: null, return: null }))
  },
})

// One seat per passenger for each leg, in passenger order
const seatsSlice = createSlice({
  name: "seats",
  initialState: { departure: [], return: [] } as BookingDraft["seats"],
  reducers: {
    setSeats: (state, action: PayloadAction<{ leg: FlightLeg; seats: Seat[] }>) => {
      state[action.payload.leg] = action.payload.seats
    },
    clearSeats: () => ({ departure: [], return: [] }),
  },
  extraReducers: (builder) => {
    builder
      .addCase(hydrateDraft, (_state, action) => action.payload.seats)
      .addCase(resetBooking, () => ({ departure: [], return: [] }))
  },
})

const passengersSlice = createSlice({
  name: "passengers",
  initialState: [] as GuestInformation[],
  reducers: {
    setPassengers: (_state, action: PayloadAction<GuestInformation[]>) => action.payload,
  },
  extraReducers: (builder) => {
    builder.addCase(hydrateDraft, (_state, action) => action.payload.passengers).addCase(resetBooking, () => [])
  },
})

const contactSlice = createSlice({
  name: "contact",
  initialState: null as ContactInformation | null,
  reducers: {
    setContactInformation: (_state, action: PayloadAction<ContactInformation | null>) => action.payload,
  },
  extraReducers: (builder) => {
    builder.addCase(hydrateDraft, (_state, action) => action.payload.contact).addCase(resetBooking, () => null)
  },
})

// Identifiers of the booking once it exists, plus the reference and total shown along the way
const bookingSlice = createSlice({
  name: "booking",
  initialState: emptyBookingProgress as BookingProgress,
  reducers: {
    setBookingProgress: (state, action: PayloadAction<Partial<BookingProgress>>) => ({ ...state, ...action.payload }),
  },
  extraReducers: (builder) => {
    builder
      .addCase(hydrateDraft, (_state, action) => action.payload.booking)
      .addCase(resetBooking, () => emptyBookingProgress)
  },
})

export const { setPassengerDetails } = searchSlice.actions
export const { setSelectedFlights, setFlight } = flightsSlice.actions
export const { setSeats, clearSeats } = seatsSlice.actions
export const { setPassengers } = passengersSlice.actions
export const { setContactInformation } = contactSlice.actions
export const { setBookingProgress } = bookingSlice.actions

export const bookingReducers = {
  search: searchSlice.reducer,
  flights: flightsSlice.reducer,
  seats: seatsSlice.reducer,
  passengers: passengersSlice.reducer,
  contact: contactSlice.reducer,
  booking: bookingSlice.reducer,
}
