import { redis, REDIS_KEYS, SEAT_LOCK_TTL, BOOKING_SESSION_TTL, getRedisClient } from './index'
import supabaseClient from '@/lib/supabase/supabaseClient'

export interface SeatLock {
  userId: string
  flightId: number
  seatId: number
  expiresAt: number
  sessionId: string
}

export interface BookingSession {
  userId: string
  bookingReference: string
  departureFlightId: number
  returnFlightId?: number
  selectedSeats: {
    departure: number[]
    return?: number[]
  }
  expiresAt: number
}

export class SeatReservationService {
  /**
   * Check if Redis is available (server-side only)
   */
  private static checkRedisAvailable(): boolean {
    try {
      getRedisClient()
      return true
    } catch {
      console.error('Redis client not available - this operation must run on server side')
      return false
    }
  }

  /**
   * Reserve a seat with Redis-based locking to prevent race conditions
   */
  static async reserveSeat(
    userId: string,
    flightId: number,
    seatId: number,
    sessionId: string
  ): Promise<{ success: boolean; message: string; lockedUntil?: number }> {
    if (!this.checkRedisAvailable()) {
      return {
        success: false,
        message: 'Redis service unavailable'
      }
    }

    try {
      const lockKey = REDIS_KEYS.seatLock(flightId, seatId)
      const now = Date.now()
      const expiresAt = now + (SEAT_LOCK_TTL * 1000)

      // Check if seat is available in database first
      const { data: seatOccupancy } = await supabaseClient
        .from('flightseatoccupancy')
        .select('isoccupied')
        .eq('flightid', flightId)
        .eq('seatid', seatId)
        .single()

      if (seatOccupancy?.isoccupied) {
        return {
          success: false,
          message: 'Seat is permanently occupied'
        }
      }

      // Try to acquire lock using Redis SET with NX (only if key doesn't exist) and EX (expiration)
      const lockData: SeatLock = {
        userId,
        flightId,
        seatId,
        expiresAt,
        sessionId
      }

      const lockResult = await getRedisClient().set(
        lockKey,
        JSON.stringify(lockData),
        {
          NX: true, // Only set if key doesn't exist
          EX: SEAT_LOCK_TTL // Expiration in seconds
        }
      )

      if (lockResult === 'OK') {
        // Successfully acquired lock
        await this.addToUserSession(userId, flightId, seatId, sessionId)
        
        return {
          success: true,
          message: 'Seat reserved successfully',
          lockedUntil: expiresAt
        }
      } else {
        // Lock already exists, check if it belongs to this user
        const existingLock = await getRedisClient().get(lockKey)
        if (existingLock) {
          const lock: SeatLock = JSON.parse(existingLock as string)
          if (lock.userId === userId && lock.sessionId === sessionId) {
            // Extend the lock for the same user
            await getRedisClient().set(lockKey, JSON.stringify({
              ...lock,
              expiresAt
            }), { EX: SEAT_LOCK_TTL })

            return {
              success: true,
              message: 'Seat reservation extended',
              lockedUntil: expiresAt
            }
          }
        }

        return {
          success: false,
          message: 'Seat is currently being selected by another user'
        }
      }
    } catch (error) {
      console.error('Error reserving seat:', error)
      return {
        success: false,
        message: 'Failed to reserve seat due to system error'
      }
    }
  }

  /**
   * Release a specific seat reservation
   */
  static async releaseSeat(
    userId: string,
    flightId: number,
    seatId: number,
    sessionId: string
  ): Promise<{ success: boolean; message: string }> {
    if (!this.checkRedisAvailable()) {
      return {
        success: false,
        message: 'Redis service unavailable'
      }
    }

    try {
      const lockKey = REDIS_KEYS.seatLock(flightId, seatId)
      
      // Check if lock belongs to this user
      const existingLock = await getRedisClient().get(lockKey)
      if (existingLock) {
        const lock: SeatLock = JSON.parse(existingLock as string)
        if (lock.userId === userId && lock.sessionId === sessionId) {
          await getRedisClient().del(lockKey)
          await this.removeFromUserSession(userId, flightId, seatId)
          
          return {
            success: true,
            message: 'Seat released successfully'
          }
        } else {
          return {
            success: false,
            message: 'Cannot release seat locked by another user'
          }
        }
      }

      return {
        success: true,
        message: 'Seat was not locked'
      }
    } catch (error) {
      console.error('Error releasing seat:', error)
      return {
        success: false,
        message: 'Failed to release seat due to system error'
      }
    }
  }

  /**
   * Release all seats for a user's session (when user quits booking process)
   */
  static async releaseAllUserSeats(userId: string, sessionId: string): Promise<void> {
    if (!this.checkRedisAvailable()) {
      console.error('Cannot release user seats - Redis unavailable')
      return
    }

    try {
      // Get all user session keys
      const pattern = `user_seats:${userId}:*`
      const keys = await getRedisClient().keys(pattern)
      
      for (const key of keys) {
        const sessionData = await getRedisClient().get(key)
        if (sessionData) {
          const seatIds: number[] = JSON.parse(sessionData as string)
          const flightId = parseInt(key.split(':')[2])
          
          // Release each seat
          for (const seatId of seatIds) {
            await this.releaseSeat(userId, flightId, seatId, sessionId)
          }
          
          // Remove user session
          await getRedisClient().del(key)
        }
      }
    } catch (error) {
      console.error('Error releasing all user seats:', error)
    }
  }

  /**
   * Get seats currently locked by a user for a flight
   */
  static async getUserSeats(userId: string, flightId: number): Promise<number[]> {
    try {
      const sessionKey = REDIS_KEYS.userSeatSession(userId, flightId)
      const sessionData = await getRedisClient().get(sessionKey)
      
      if (sessionData) {
        return JSON.parse(sessionData as string)
      }
      
      return []
    } catch (error) {
      console.error('Error getting user seats:', error)
      return []
    }
  }

  /**
   * Check if a seat is currently locked
   */
  static async isSeatLocked(flightId: number, seatId: number): Promise<{
    locked: boolean
    lockedBy?: string
    expiresAt?: number
  }> {
    try {
      const lockKey = REDIS_KEYS.seatLock(flightId, seatId)
      const lockData = await getRedisClient().get(lockKey)
      
      if (lockData) {
        const lock: SeatLock = JSON.parse(lockData as string)
        return {
          locked: true,
          lockedBy: lock.userId,
          expiresAt: lock.expiresAt
        }
      }
      
      return { locked: false }
    } catch (error) {
      console.error('Error checking seat lock:', error)
      return { locked: false }
    }
  }

  /**
   * Private method to add seat to user session
   */
  private static async addToUserSession(
    userId: string,
    flightId: number,
    seatId: number,
    sessionId: string
  ): Promise<void> {
    const sessionKey = REDIS_KEYS.userSeatSession(userId, flightId)
    
    // Get current seats
    const currentSeats = await this.getUserSeats(userId, flightId)
    
    // Add new seat if not already present
    if (!currentSeats.includes(seatId)) {
      currentSeats.push(seatId)
      await getRedisClient().set(
        sessionKey,
        JSON.stringify(currentSeats),
        { EX: BOOKING_SESSION_TTL }
      )
    }
  }

  /**
   * Private method to remove seat from user session
   */
  private static async removeFromUserSession(
    userId: string,
    flightId: number,
    seatId: number
  ): Promise<void> {
    const sessionKey = REDIS_KEYS.userSeatSession(userId, flightId)
    
    // Get current seats
    const currentSeats = await this.getUserSeats(userId, flightId)
    
    // Remove seat
    const updatedSeats = currentSeats.filter(id => id !== seatId)
    
    if (updatedSeats.length > 0) {
      await getRedisClient().set(
        sessionKey,
        JSON.stringify(updatedSeats),
        { EX: BOOKING_SESSION_TTL }
      )
    } else {
      await getRedisClient().del(sessionKey)
    }
  }

  /**
   * Create a booking session that tracks the entire booking process
   */
  static async createBookingSession(
    userId: string,
    bookingReference: string,
    departureFlightId: number,
    returnFlightId?: number
  ): Promise<void> {
    try {
      const sessionKey = REDIS_KEYS.bookingSession(bookingReference)
      const session: BookingSession = {
        userId,
        bookingReference,
        departureFlightId,
        returnFlightId,
        selectedSeats: {
          departure: [],
          return: returnFlightId ? [] : undefined
        },
        expiresAt: Date.now() + (BOOKING_SESSION_TTL * 1000)
      }

      await getRedisClient().set(
        sessionKey,
        JSON.stringify(session),
        { EX: BOOKING_SESSION_TTL }
      )
    } catch (error) {
      console.error('Error creating booking session:', error)
    }
  }

  /**
   * Clear booking session and release all associated seats
   */
  static async clearBookingSession(
    bookingReference: string,
    sessionId: string
  ): Promise<void> {
    try {
      const sessionKey = REDIS_KEYS.bookingSession(bookingReference)
      const sessionData = await getRedisClient().get(sessionKey)
      
      if (sessionData) {
        const session: BookingSession = JSON.parse(sessionData as string)
        
        // Release all seats for this booking
        await this.releaseAllUserSeats(session.userId, sessionId)
        
        // Remove booking session
        await getRedisClient().del(sessionKey)
      }
    } catch (error) {
      console.error('Error clearing booking session:', error)
    }
  }
}