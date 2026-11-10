import { getSessionUser } from "@/lib/server/auth"
import { route } from "@/lib/server/http"

export const dynamic = "force-dynamic"

export const GET = route(async () => {
  return { user: await getSessionUser() }
})
