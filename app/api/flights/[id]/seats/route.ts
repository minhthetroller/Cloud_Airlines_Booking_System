import { HttpError, route } from "@/lib/server/http"
import { getSeatMap } from "@/lib/server/seats"

export const dynamic = "force-dynamic"

export const GET = route<{ params: Promise<{ id: string }> }>(async (_request, { params }) => {
  const flightId = Number((await params).id)
  if (!Number.isInteger(flightId)) throw new HttpError(400, "Invalid flight")
  return getSeatMap(flightId)
})
