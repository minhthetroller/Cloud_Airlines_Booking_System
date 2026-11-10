import { z } from "zod"
import { listUsers, setAccountStatus, setPassword } from "@/lib/server/accounts"
import { requireAdmin } from "@/lib/server/auth"
import { readJson, route } from "@/lib/server/http"

export const dynamic = "force-dynamic"

export const GET = route(async () => {
  await requireAdmin()
  return { users: await listUsers() }
})

const body = z.object({
  userId: z.number().int().positive(),
  accountstatus: z.string().min(1).optional(),
  newPassword: z.string().min(1).optional(),
})

export const PATCH = route(async (request) => {
  await requireAdmin()
  const { userId, accountstatus, newPassword } = body.parse(await readJson(request))
  if (newPassword) await setPassword(userId, newPassword)
  if (accountstatus) await setAccountStatus(userId, accountstatus)
  return { success: true }
})
