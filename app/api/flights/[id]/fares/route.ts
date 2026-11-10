import { fareOptions } from "@/lib/server/flights"
import { HttpError, route } from "@/lib/server/http"

export const dynamic = "force-dynamic"

export const GET = route<{ params: Promise<{ id: string }> }>(async (request, { params }) => {
  const flightId = Number((await params).id)
  const classIds = (new URL(request.url).searchParams.get("classIds") || "1,2,3,4,5")
    .split(",")
    .map(Number)
    .filter((id) => Number.isInteger(id) && id >= 1 && id <= 5)
  if (!Number.isInteger(flightId) || classIds.length === 0) throw new HttpError(400, "Invalid request")

  const result = await fareOptions(flightId, classIds)
  if (!result) throw new HttpError(404, "Flight not found")
  return result
})
