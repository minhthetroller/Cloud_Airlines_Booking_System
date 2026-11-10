import "server-only"

import { NextResponse } from "next/server"
import { ZodError } from "zod"

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public extra: Record<string, unknown> = {},
  ) {
    super(message)
  }
}

type Handler<C> = (request: Request, context: C) => Promise<unknown>

/** Wraps a route handler: returned values become JSON, thrown HttpErrors become error responses. */
export function route<C = unknown>(handler: Handler<C>) {
  return async (request: Request, context: C) => {
    try {
      const result = await handler(request, context)
      if (result instanceof Response) return result
      return NextResponse.json(result ?? { success: true })
    } catch (err) {
      if (err instanceof HttpError) {
        return NextResponse.json({ error: err.message, ...err.extra }, { status: err.status })
      }
      if (err instanceof ZodError) {
        return NextResponse.json({ error: "Invalid request", issues: err.issues }, { status: 400 })
      }
      console.error(`${request.method} ${new URL(request.url).pathname} failed:`, err)
      return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
  }
}

export async function readJson<T = any>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T
  } catch {
    throw new HttpError(400, "Invalid JSON body")
  }
}

export const cookieOptions = (maxAgeSeconds: number) => ({
  httpOnly: true,
  // Lax so the cookies survive the top-level redirect back from Stripe Checkout
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: maxAgeSeconds,
})

/** Postgres unique_violation, optionally on a specific constraint. */
export function isUniqueViolation(err: unknown, constraint?: string): boolean {
  const e = (err as any)?.cause ?? err
  return (e as any)?.code === "23505" && (!constraint || (e as any)?.constraint === constraint)
}
