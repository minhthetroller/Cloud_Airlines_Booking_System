import { api } from "@/lib/api/client"
import type { BookingDraft } from "@/lib/booking/types"
import { type AuthUser, setUser } from "./slices/authSlice"
import { hydrateDraft, resetBooking } from "./slices/bookingSlices"
import { setHydrated } from "./slices/metaSlice"
import type { AppDispatch } from "./store"

export const refreshSession = () => async (dispatch: AppDispatch) => {
  try {
    const { user } = await api.get<{ user: AuthUser | null }>("/api/auth/session")
    dispatch(setUser(user))
    return user
  } catch (err) {
    console.error("Auth check error:", err)
    dispatch(setUser(null))
    return null
  }
}

/** Loads who is signed in and any in-progress booking, then marks the store as ready. */
export const hydrateStore = () => async (dispatch: AppDispatch) => {
  const [, draft] = await Promise.all([
    dispatch(refreshSession()),
    api
      .get<{ draft: BookingDraft | null }>("/api/booking/draft")
      .then((r) => r.draft)
      .catch((err) => {
        console.error("Error loading booking draft:", err)
        return null
      }),
  ])
  if (draft) dispatch(hydrateDraft(draft))
  dispatch(setHydrated())
}

export const login =
  (email: string, password: string, rememberMe = true) =>
  async (dispatch: AppDispatch) => {
    const { user } = await api.post<{ user: AuthUser }>("/api/auth/login", { email, password, rememberMe })
    dispatch(setUser(user))
    return user
  }

export const logout = () => async (dispatch: AppDispatch) => {
  await api.post("/api/auth/logout")
  dispatch(setUser(null))
}

/** Drops the in-progress booking everywhere: store, server draft and seat locks. */
export const discardBooking = () => async (dispatch: AppDispatch) => {
  dispatch(resetBooking())
  await api.delete("/api/booking/draft").catch((err) => console.error("Error clearing booking draft:", err))
}
