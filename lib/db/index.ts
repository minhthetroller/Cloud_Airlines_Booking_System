import "server-only"

import { drizzle } from "drizzle-orm/node-postgres"
import { Pool } from "pg"
import * as schema from "./schema"

// Reuse one pool across hot reloads in development
const globalForDb = globalThis as unknown as { pgPool?: Pool }

const pool =
  globalForDb.pgPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
  })

if (process.env.NODE_ENV !== "production") globalForDb.pgPool = pool

export const db = drizzle(pool, { schema })
export type Db = typeof db
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0]
export { pool, schema }
