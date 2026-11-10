import { z } from "zod"
import { login } from "@/lib/server/auth"
import { readJson, route } from "@/lib/server/http"

const body = z.object({
  email: z.string().min(1),
  password: z.string().min(1),
  rememberMe: z.boolean().optional(),
})

export const POST = route(async (request) => {
  const { email, password, rememberMe } = body.parse(await readJson(request))
  const user = await login(email.trim(), password, rememberMe === false ? 1 : 30)
  return { user }
})
