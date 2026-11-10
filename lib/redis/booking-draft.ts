import "server-only"

import { randomUUID } from "crypto"
import { cookies } from "next/headers"
import { type BookingDraft, emptyDraft } from "@/lib/booking/types"
import { cookieOptions } from "@/lib/server/http"
import { redis } from "./client"
import { extendSeatHolds, releaseAllSeatHolds } from "./seat-holds"

export const DRAFT_COOKIE = "booking_draft"
export const DRAFT_TTL_SECONDS = 60 * 60

const draftKey = (draftId: string) => `draft:${draftId}`

export async function getDraftId(): Promise<string | null> {
  return (await cookies()).get(DRAFT_COOKIE)?.value ?? null
}

/** Returns the draft id from the cookie, creating the cookie on first use. */
export async function ensureDraftId(): Promise<string> {
  const store = await cookies()
  const existing = store.get(DRAFT_COOKIE)?.value
  if (existing) return existing
  const draftId = randomUUID()
  store.set(DRAFT_COOKIE, draftId, cookieOptions(DRAFT_TTL_SECONDS))
  return draftId
}

export async function loadDraft(draftId: string): Promise<BookingDraft | null> {
  const raw = await redis.get(draftKey(draftId))
  if (!raw) return null
  return { ...emptyDraft, ...(JSON.parse(raw) as Partial<BookingDraft>) }
}

/** Saves the draft and keeps its seat holds alive for as long as the user is active. */
export async function saveDraft(draftId: string, draft: BookingDraft): Promise<void> {
  await redis.set(draftKey(draftId), JSON.stringify(draft), "EX", DRAFT_TTL_SECONDS)
  await extendSeatHolds(draftId)
  ;(await cookies()).set(DRAFT_COOKIE, draftId, cookieOptions(DRAFT_TTL_SECONDS))
}

export async function patchDraft(draftId: string, patch: Partial<BookingDraft>): Promise<BookingDraft> {
  const next = { ...((await loadDraft(draftId)) ?? emptyDraft), ...patch }
  await redis.set(draftKey(draftId), JSON.stringify(next), "EX", DRAFT_TTL_SECONDS)
  return next
}

export async function deleteDraft(draftId: string): Promise<void> {
  await releaseAllSeatHolds(draftId)
  await redis.del(draftKey(draftId))
  ;(await cookies()).delete(DRAFT_COOKIE)
}
