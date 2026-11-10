import { createSlice, type PayloadAction } from "@reduxjs/toolkit"

export interface AuthUser {
  userId: number
  customerId: number
  email: string
  role?: string
}

interface AuthState {
  user: AuthUser | null
  justLoggedIn: boolean
}

// Who is signed in. The session itself lives in an httpOnly cookie.
const authSlice = createSlice({
  name: "auth",
  initialState: { user: null, justLoggedIn: false } as AuthState,
  reducers: {
    setUser: (state, action: PayloadAction<AuthUser | null>) => {
      state.user = action.payload
      if (!action.payload) state.justLoggedIn = false
    },
    setJustLoggedIn: (state, action: PayloadAction<boolean>) => {
      state.justLoggedIn = action.payload
    },
  },
})

export const { setUser, setJustLoggedIn } = authSlice.actions
export default authSlice.reducer
