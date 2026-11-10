import { createListenerMiddleware } from "@reduxjs/toolkit"
import { api } from "@/lib/api/client"
import type { BookingDraft } from "@/lib/booking/types"
import { hydrateDraft } from "./slices/bookingSlices"
import type { AppDispatch, RootState } from "./store"

const SAVE_DELAY_MS = 400

export const selectDraft = (state: RootState): BookingDraft => ({
  search: state.search,
  flights: state.flights,
  seats: state.seats,
  passengers: state.passengers,
  contact: state.contact,
  booking: state.booking,
  registration: state.registration,
})

const draftChanged = (a: RootState, b: RootState) =>
  a.search !== b.search ||
  a.flights !== b.flights ||
  a.seats !== b.seats ||
  a.passengers !== b.passengers ||
  a.contact !== b.contact ||
  a.booking !== b.booking ||
  a.registration !== b.registration

let pendingTimer: ReturnType<typeof setTimeout> | null = null
let dirty = false
let inFlight: Promise<unknown> = Promise.resolve()

function save(getState: () => RootState, keepalive = false) {
  if (pendingTimer) clearTimeout(pendingTimer)
  pendingTimer = null
  if (!dirty) return inFlight
  dirty = false
  const draft = selectDraft(getState())
  // Saves are chained so an older draft can never overwrite a newer one
  inFlight = inFlight
    .then(() => api.put("/api/booking/draft", { draft }, { keepalive }))
    .catch((err) => console.error("Error saving booking draft:", err))
  return inFlight
}

/**
 * Mirrors the in-progress booking to the server (Redis) shortly after it changes, so a refresh
 * or the redirect to Stripe does not lose it. Nothing is kept in browser storage.
 */
export const draftSyncMiddleware = createListenerMiddleware()

draftSyncMiddleware.startListening({
  predicate: (action, currentState, previousState) =>
    !hydrateDraft.match(action) &&
    (currentState as RootState).meta.hydrated &&
    draftChanged(currentState as RootState, previousState as RootState),
  effect: (_action, listenerApi) => {
    dirty = true
    if (pendingTimer) clearTimeout(pendingTimer)
    pendingTimer = setTimeout(() => save(listenerApi.getState as () => RootState), SAVE_DELAY_MS)
  },
})

/** Saves any unsaved changes now. Await it before a request that reads the draft on the server. */
export const flushDraft =
  (keepalive = false) =>
  (_dispatch: AppDispatch, getState: () => RootState) =>
    save(getState, keepalive)
