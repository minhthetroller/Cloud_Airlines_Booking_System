import { type BookingDraft, emptyDraft } from "@/lib/booking/types"
import { deleteDraft, ensureDraftId, getDraftId, loadDraft, saveDraft } from "@/lib/redis/booking-draft"
import { HttpError, readJson, route } from "@/lib/server/http"

export const dynamic = "force-dynamic"

const MAX_DRAFT_BYTES = 64 * 1024

export const GET = route(async () => {
  const draftId = await getDraftId()
  return { draft: draftId ? await loadDraft(draftId) : null }
})

export const PUT = route(async (request) => {
  const body = await readJson<{ draft: Partial<BookingDraft> }>(request)
  if (!body?.draft || typeof body.draft !== "object") throw new HttpError(400, "Draft is required")
  if (JSON.stringify(body.draft).length > MAX_DRAFT_BYTES) throw new HttpError(413, "Draft is too large")

  const draftId = await ensureDraftId()
  const current = await loadDraft(draftId)

  // Booking and payment ids are only ever set by the server
  const draft: BookingDraft = {
    ...emptyDraft,
    ...body.draft,
    booking: {
      bookingId: current?.booking.bookingId ?? null,
      paymentId: current?.booking.paymentId ?? null,
      bookingReference: current?.booking.bookingId
        ? current.booking.bookingReference
        : (body.draft.booking?.bookingReference ?? null),
      totalPrice: current?.booking.bookingId ? current.booking.totalPrice : (body.draft.booking?.totalPrice ?? null),
    },
  }
  await saveDraft(draftId, draft)
  return { success: true }
})

export const DELETE = route(async () => {
  const draftId = await getDraftId()
  if (draftId) await deleteDraft(draftId)
  return { success: true }
})
