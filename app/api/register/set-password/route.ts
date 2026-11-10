import { z } from "zod"
import { setInitialPassword } from "@/lib/server/accounts"
import { readJson, route } from "@/lib/server/http"

const body = z.object({
  email: z.string().min(1),
  token: z.string().min(1),
  password: z.string().min(8),
})

export const POST = route(async (request) => {
  const { email, token, password } = body.parse(await readJson(request))
  await setInitialPassword(email, token, password)
  return { success: true }
})
