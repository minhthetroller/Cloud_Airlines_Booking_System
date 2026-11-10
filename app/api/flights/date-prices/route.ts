import { z } from "zod"
import { datePrices } from "@/lib/server/flights"
import { route } from "@/lib/server/http"

const query = z.object({
  from: z.string().length(3),
  to: z.string().length(3),
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  days: z.coerce.number().int().min(1).max(31).default(7),
  classId: z.coerce.number().int().min(1).max(5).default(1),
})

export const dynamic = "force-dynamic"

export const GET = route(async (request) => {
  const { from, to, start, days, classId } = query.parse(Object.fromEntries(new URL(request.url).searchParams))
  return { dates: await datePrices(from, to, start, days, classId) }
})
