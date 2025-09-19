import { createClient } from 'redis'

// Only create Redis client on server side
let redis: ReturnType<typeof createClient> | null = null

if (typeof window === 'undefined') {
  // Parse Redis URL for TCP connection
  if (!process.env.REDIS_URL) {
    throw new Error('REDIS_URL environment variable is required')
  }

  // Create Redis client using REDIS_URL
  redis = createClient({
    url: process.env.REDIS_URL
  })

  // Error handling
  redis.on('error', (err) => {
    console.error('Redis Client Error:', err)
  })

  redis.on('connect', () => {
    console.log('Connected to Redis server')
  })

  redis.on('ready', () => {
    console.log('Redis client ready')
  })

  redis.on('end', () => {
    console.log('Redis connection ended')
  })

  // Connect to Redis
  if (!redis.isOpen) {
    redis.connect().catch((err) => {
      console.error('Failed to connect to Redis:', err)
    })
  }
}

// TTL configurations (in seconds)
export const SEAT_LOCK_TTL = 900 // 15 minutes
export const BOOKING_SESSION_TTL = 1800 // 30 minutes
export const USER_SESSION_TTL = 3600 // 1 hour

// Redis key patterns
export const REDIS_KEYS = {
  seatLock: (flightId: number, seatId: number) => `seat_lock:${flightId}:${seatId}`,
  userSeatSession: (userId: string, flightId: number) => `user_seats:${userId}:${flightId}`,
  bookingSession: (bookingReference: string) => `booking_session:${bookingReference}`,
  userSession: (userId: string) => `user_session:${userId}`,
}

export { redis }
export default redis

// Helper function to get Redis client with proper error handling
export function getRedisClient() {
  if (!redis) {
    throw new Error('Redis client not available - server-side only')
  }
  return redis
}