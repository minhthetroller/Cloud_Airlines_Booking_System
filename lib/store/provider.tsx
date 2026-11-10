"use client"

import type React from "react"
import { useEffect, useRef } from "react"
import { Provider } from "react-redux"
import { flushDraft } from "./draftSync"
import { hydrateStore } from "./session"
import { type AppStore, makeStore } from "./store"

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const storeRef = useRef<AppStore | null>(null)
  if (!storeRef.current) storeRef.current = makeStore()

  useEffect(() => {
    const store = storeRef.current as AppStore
    store.dispatch(hydrateStore())

    // Push unsaved changes when the tab is hidden or the page is left
    const flush = () => {
      if (document.visibilityState === "hidden") store.dispatch(flushDraft(true))
    }
    document.addEventListener("visibilitychange", flush)
    return () => document.removeEventListener("visibilitychange", flush)
  }, [])

  return <Provider store={storeRef.current}>{children}</Provider>
}
