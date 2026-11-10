import "server-only"

import Redis from "ioredis"

// Reuse one connection across hot reloads in development
const globalForRedis = globalThis as unknown as { redis?: Redis }

export const redis =
  globalForRedis.redis ??
  new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
    maxRetriesPerRequest: 2,
  })

if (process.env.NODE_ENV !== "production") globalForRedis.redis = redis
