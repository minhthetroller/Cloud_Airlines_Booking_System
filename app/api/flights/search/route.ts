import { z } from "zod"
import { searchFlights } from "@/lib/server/flights"
import { route } from "@/lib/server/http"

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const query = z.object({
  from: z.string().length(3),
  to: z.string().length(3),
  departDate: day,
  returnDate: day.optional(),
})

export const dynamic = "force-dynamic"

export const GET = route(async (request) => {
  const params = Object.fromEntries(new URL(request.url).searchParams)
  const { from, to, departDate, returnDate } = query.parse({ ...params, returnDate: params.returnDate || undefined })

  const [departure, returning] = await Promise.all([
    searchFlights(from, to, departDate),
    returnDate ? searchFlights(to, from, returnDate) : Promise.resolve([]),
  ])
  return { departure, return: returning }
})
