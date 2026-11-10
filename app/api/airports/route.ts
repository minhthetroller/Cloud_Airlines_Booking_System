import { listAirports } from "@/lib/server/flights"
import { route } from "@/lib/server/http"

export const GET = route(async (request) => {
  const exclude = new URL(request.url).searchParams.get("exclude")
  return { airports: await listAirports(exclude) }
})
