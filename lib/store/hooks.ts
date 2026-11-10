import { useDispatch, useSelector, useStore } from "react-redux"
import type { AppDispatch, AppStore, RootState } from "./store"

export const useAppDispatch = useDispatch.withTypes<AppDispatch>()
export const useAppSelector = useSelector.withTypes<RootState>()
export const useAppStore = useStore.withTypes<AppStore>()

/** True once the session and the booking draft have been loaded from the server. */
export const useHydrated = () => useAppSelector((state) => state.meta.hydrated)
