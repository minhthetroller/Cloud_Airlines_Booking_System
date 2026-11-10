import { configureStore } from "@reduxjs/toolkit"
import { draftSyncMiddleware } from "./draftSync"
import authReducer from "./slices/authSlice"
import { bookingReducers } from "./slices/bookingSlices"
import languageReducer from "./slices/languageSlice"
import metaReducer from "./slices/metaSlice"
import registrationReducer from "./slices/registrationSlice"

export const makeStore = () =>
  configureStore({
    reducer: {
      ...bookingReducers,
      registration: registrationReducer,
      auth: authReducer,
      language: languageReducer,
      meta: metaReducer,
    },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().prepend(draftSyncMiddleware.middleware),
  })

export type AppStore = ReturnType<typeof makeStore>
export type RootState = ReturnType<AppStore["getState"]>
export type AppDispatch = AppStore["dispatch"]
