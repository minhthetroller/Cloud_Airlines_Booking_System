import "server-only"

import { randomUUID } from "crypto"
import bcrypt from "bcryptjs"
import { and, eq, gt, lt } from "drizzle-orm"
import { cookies } from "next/headers"
import { db } from "@/lib/db"
import { sessions, users } from "@/lib/db/schema"
import { cookieOptions, HttpError } from "./http"

export const SESSION_COOKIE = "session_token"

export interface SessionUser {
  userId: number
  customerId: number
  email: string
  role: string
}

export const hashPassword = (password: string) => bcrypt.hash(password, 10)

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (!hash) return false
  return bcrypt.compare(password, hash)
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  if (!token) return null

  const [row] = await db
    .select({
      userId: users.userid,
      customerId: users.customerid,
      email: users.username,
      role: users.role,
    })
    .from(sessions)
    .innerJoin(users, eq(users.userid, sessions.userid))
    .where(and(eq(sessions.token, token), gt(sessions.expires, new Date())))
    .limit(1)

  return row ?? null
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser()
  if (!user) throw new HttpError(401, "Not authenticated")
  return user
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser()
  if (user.role !== "admin") throw new HttpError(403, "Forbidden")
  return user
}

export async function login(email: string, password: string, days = 30): Promise<SessionUser> {
  const [user] = await db.select().from(users).where(eq(users.username, email)).limit(1)

  if (!user) throw new HttpError(401, "Invalid email or password")
  if (user.accountstatus !== "verified") throw new HttpError(403, "Please verify your account before logging in")
  if (!(await verifyPassword(password, user.passwordhash))) throw new HttpError(401, "Invalid email or password")

  const token = randomUUID()
  const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000)

  await db.transaction(async (tx) => {
    await tx.delete(sessions).where(and(eq(sessions.userid, user.userid), lt(sessions.expires, new Date())))
    await tx.insert(sessions).values({ userid: user.userid, token, expires })
  })

  ;(await cookies()).set(SESSION_COOKIE, token, cookieOptions(days * 24 * 60 * 60))

  return { userId: user.userid, customerId: user.customerid, email: user.username, role: user.role }
}

export async function logout(): Promise<void> {
  const store = await cookies()
  const token = store.get(SESSION_COOKIE)?.value
  if (token) await db.delete(sessions).where(eq(sessions.token, token))
  store.delete(SESSION_COOKIE)
}
