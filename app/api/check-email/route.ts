import { emailExists } from "@/lib/server/accounts"
import { HttpError, readJson, route } from "@/lib/server/http"

export const POST = route(async (request) => {
  const { email } = await readJson(request)
  if (!email) throw new HttpError(400, "Email is required")
  return { exists: await emailExists(String(email)) }
})
