import { z } from "zod"
import { registerAccount } from "@/lib/server/accounts"
import { readJson, route } from "@/lib/server/http"

const body = z.object({
  email: z.string().email(),
  token: z.string().min(16),
  customerData: z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    pronoun: z.string().optional().default(""),
    dateOfBirth: z.string().min(1),
    gender: z.string(),
    nationality: z.string(),
    identityCardNumber: z.string(),
    phoneNumber: z.string(),
    address: z.string(),
    city: z.string(),
    country: z.string(),
    passportNumber: z.string().optional().default(""),
    passportExpiry: z.string().optional().default(""),
  }),
})

// Creates the customer and the unverified user account in one transaction
export const POST = route(async (request) => {
  const { email, token, customerData } = body.parse(await readJson(request))
  await registerAccount(email, token, customerData)
  return { success: true }
})
