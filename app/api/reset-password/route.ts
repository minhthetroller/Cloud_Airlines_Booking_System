import { z } from "zod"
import { isResetTokenValid, resetPassword } from "@/lib/server/accounts"
import { readJson, route } from "@/lib/server/http"

export const dynamic = "force-dynamic"

export const GET = route(async (request) => {
  const token = new URL(request.url).searchParams.get("token")
  return { valid: token ? await isResetTokenValid(token) : false }
})

const body = z.object({ token: z.string().min(1), password: z.string().min(8) })

export const POST = route(async (request) => {
  const { token, password } = body.parse(await readJson(request))
  await resetPassword(token, password)
  return { success: true }
})
