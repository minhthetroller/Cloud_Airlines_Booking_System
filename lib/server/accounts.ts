import "server-only"

import { randomUUID } from "crypto"
import { and, desc, eq, gte } from "drizzle-orm"
import type { RegistrationCustomerData } from "@/lib/booking/types"
import { db } from "@/lib/db"
import { customers, users } from "@/lib/db/schema"
import { hashPassword } from "./auth"
import { HttpError } from "./http"

export const tierForPoints = (points: number) => (points > 10000 ? "Cirrus" : points > 5000 ? "Altostratus" : "Stratus")

export async function emailExists(email: string): Promise<boolean> {
  const [row] = await db
    .select({ userid: users.userid })
    .from(users)
    .where(eq(users.username, email.toLowerCase()))
    .limit(1)
  return !!row
}

const dateOnly = (value?: string | null) => (value ? value.slice(0, 10) : null)

/**
 * Creates the customer and the unverified user in one transaction. Calling it again for an
 * account that is still unverified only replaces the verification token.
 */
export async function registerAccount(email: string, token: string, data: RegistrationCustomerData) {
  const [existing] = await db.select().from(users).where(eq(users.username, email)).limit(1)
  if (existing) {
    if (existing.accountstatus !== "unverified") throw new HttpError(409, "This email is already registered")
    await db.update(users).set({ verification_token: token }).where(eq(users.userid, existing.userid))
    return
  }

  await db.transaction(async (tx) => {
    const [customer] = await tx
      .insert(customers)
      .values({
        firstname: data.firstName,
        lastname: data.lastName,
        email,
        dateofbirth: dateOnly(data.dateOfBirth),
        gender: data.gender,
        nationality: data.nationality,
        identitycardnumber: data.identityCardNumber || null,
        passportnumber: data.passportNumber || null,
        passportexpiry: dateOnly(data.passportExpiry),
        phonenumber: data.phoneNumber,
        country: data.country,
        city: data.city,
        addressline: data.address,
        pronoun: data.pronoun || "Prefer not to say",
        contactname: `${data.firstName} ${data.lastName}`,
      })
      .returning({ customerid: customers.customerid })

    await tx.insert(users).values({
      customerid: customer.customerid,
      username: email,
      passwordhash: "",
      pointsavailable: 0,
      accountstatus: "unverified",
      verification_token: token,
    })
  })
}

export async function isVerificationToken(email: string, token: string): Promise<boolean> {
  const [row] = await db
    .select({ userid: users.userid })
    .from(users)
    .where(and(eq(users.username, email), eq(users.verification_token, token)))
    .limit(1)
  return !!row
}

/** Sets the first password of a newly registered account. The emailed token is required. */
export async function setInitialPassword(email: string, token: string, password: string) {
  const [user] = await db
    .select({ userid: users.userid, verification_token: users.verification_token })
    .from(users)
    .where(eq(users.username, email))
    .limit(1)

  if (!user) throw new HttpError(404, "Could not find user with the provided email. Please try again or contact support.")
  if (!user.verification_token || user.verification_token !== token) {
    throw new HttpError(403, "Invalid or expired verification link")
  }

  await db
    .update(users)
    .set({ passwordhash: await hashPassword(password), accountstatus: "verified", verification_token: null })
    .where(eq(users.userid, user.userid))
}

export async function createPasswordReset(email: string): Promise<string> {
  const [user] = await db.select({ userid: users.userid }).from(users).where(eq(users.username, email)).limit(1)
  if (!user) throw new HttpError(404, "Email address not found")

  const resetToken = randomUUID()
  await db
    .update(users)
    .set({ reset_token: resetToken, reset_expires: new Date(Date.now() + 60 * 60 * 1000) })
    .where(eq(users.userid, user.userid))
  return resetToken
}

async function userForResetToken(token: string) {
  const [user] = await db
    .select({ userid: users.userid })
    .from(users)
    .where(and(eq(users.reset_token, token), gte(users.reset_expires, new Date())))
    .limit(1)
  return user ?? null
}

export async function isResetTokenValid(token: string): Promise<boolean> {
  return !!(await userForResetToken(token))
}

export async function resetPassword(token: string, password: string) {
  const user = await userForResetToken(token)
  if (!user) throw new HttpError(400, "Invalid or expired reset link")
  await setPassword(user.userid, password)
}

export async function setPassword(userId: number, password: string) {
  await db
    .update(users)
    .set({ passwordhash: await hashPassword(password), reset_token: null, reset_expires: null })
    .where(eq(users.userid, userId))
}

export async function listUsers() {
  const rows = await db
    .select({
      userid: users.userid,
      username: users.username,
      accountstatus: users.accountstatus,
      points: users.pointsavailable,
      createdat: users.dateregistered,
      reset_expires: users.reset_expires,
    })
    .from(users)
    .orderBy(desc(users.dateregistered))
  return rows.map((u) => ({ ...u, tier: tierForPoints(u.points), reset_token: null }))
}

export async function setAccountStatus(userId: number, accountstatus: string) {
  await db.update(users).set({ accountstatus }).where(eq(users.userid, userId))
}

export async function getProfile(userId: number) {
  const [row] = await db
    .select({ user: users, customer: customers })
    .from(users)
    .innerJoin(customers, eq(customers.customerid, users.customerid))
    .where(eq(users.userid, userId))
    .limit(1)
  return row ?? null
}

// Profile fields a user may change about themselves
const EDITABLE_CUSTOMER_FIELDS = [
  "firstname",
  "lastname",
  "phonenumber",
  "dateofbirth",
  "gender",
  "nationality",
  "passportnumber",
  "passportexpiry",
  "identitycardnumber",
  "pronoun",
  "country",
  "city",
  "addressline",
  "contactname",
  "contactemail",
  "contactphone",
] as const

export async function updateCustomerDetails(customerId: number, details: Record<string, unknown>) {
  const changes: Record<string, unknown> = {}
  for (const field of EDITABLE_CUSTOMER_FIELDS) {
    if (field in details) changes[field] = details[field] === "" ? null : details[field]
  }
  if (Object.keys(changes).length === 0) return []
  return db.update(customers).set(changes).where(eq(customers.customerid, customerId)).returning()
}
