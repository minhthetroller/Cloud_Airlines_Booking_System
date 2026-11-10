import { createSlice, type PayloadAction } from "@reduxjs/toolkit"
import { emptyRegistration, type RegistrationState } from "@/lib/booking/types"
import { hydrateDraft } from "./bookingSlices"

// Answers collected across the sign-up steps
const registrationSlice = createSlice({
  name: "registration",
  initialState: emptyRegistration as RegistrationState,
  reducers: {
    setRegistration: (state, action: PayloadAction<Partial<RegistrationState>>) => ({ ...state, ...action.payload }),
    clearRegistration: () => emptyRegistration,
  },
  extraReducers: (builder) => {
    builder.addCase(hydrateDraft, (_state, action) => action.payload.registration ?? emptyRegistration)
  },
})

export const { setRegistration, clearRegistration } = registrationSlice.actions
export default registrationSlice.reducer
