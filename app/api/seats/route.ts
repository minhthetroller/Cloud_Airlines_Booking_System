import { NextRequest, NextResponse } from 'next/server'
import { getRedisClient, REDIS_KEYS, SEAT_LOCK_TTL } from '@/lib/redis'
import supabaseClient from '@/lib/supabase/supabaseClient'

export interface SeatLock {
  userId: string
  flightId: number
  seatId: number
  expiresAt: number
  sessionId: string
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, userId, flightId, seatId, sessionId } = body

    if (!userId || !flightId || !seatId || !sessionId) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    switch (action) {
      case 'reserve':
        return await reserveSeat(userId, flightId, seatId, sessionId)
      case 'release':
        return await releaseSeat(userId, flightId, seatId, sessionId)
      case 'status':
        return await getSeatStatus(flightId, seatId)
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Error in seats API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function reserveSeat(
  userId: string,
  flightId: number,
  seatId: number,
  sessionId: string
) {
  try {
    const redis = getRedisClient()
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
      return NextResponse.json({
        success: false,
        message: 'Seat is permanently occupied'
      })
    }

    // Try to acquire lock using Redis SET with NX and EX
    const lockData: SeatLock = {
      userId,
      flightId,
      seatId,
      expiresAt,
      sessionId
    }

    const lockResult = await redis.set(
      lockKey,
      JSON.stringify(lockData),
      {
        NX: true,
        EX: SEAT_LOCK_TTL
      }
    )

    if (lockResult === 'OK') {
      // Successfully acquired lock
      await addToUserSession(redis, userId, flightId, seatId)
      
      return NextResponse.json({
        success: true,
        message: 'Seat reserved successfully',
        lockedUntil: expiresAt
      })
    } else {
      // Lock already exists, check if it belongs to this user
      const existingLock = await redis.get(lockKey)
      if (existingLock) {
        const lock: SeatLock = JSON.parse(existingLock as string)
        if (lock.userId === userId && lock.sessionId === sessionId) {
          // Extend the lock for the same user
          await redis.set(lockKey, JSON.stringify({
            ...lock,
            expiresAt
          }), { EX: SEAT_LOCK_TTL })

          return NextResponse.json({
            success: true,
            message: 'Seat reservation extended',
            lockedUntil: expiresAt
          })
        }
      }

      return NextResponse.json({
        success: false,
        message: 'Seat is currently being selected by another user'
      })
    }
  } catch (error) {
    console.error('Error reserving seat:', error)
    return NextResponse.json({
      success: false,
      message: 'Failed to reserve seat due to system error'
    })
  }
}

async function releaseSeat(
  userId: string,
  flightId: number,
  seatId: number,
  sessionId: string
) {
  try {
    const redis = getRedisClient()
    const lockKey = REDIS_KEYS.seatLock(flightId, seatId)
    
    // Check if lock belongs to this user
    const existingLock = await redis.get(lockKey)
    if (existingLock) {
      const lock: SeatLock = JSON.parse(existingLock as string)
      if (lock.userId === userId && lock.sessionId === sessionId) {
        await redis.del(lockKey)
        await removeFromUserSession(redis, userId, flightId, seatId)
        
        return NextResponse.json({
          success: true,
          message: 'Seat released successfully'
        })
      } else {
        return NextResponse.json({
          success: false,
          message: 'Cannot release seat locked by another user'
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Seat was not locked'
    })
  } catch (error) {
    console.error('Error releasing seat:', error)
    return NextResponse.json({
      success: false,
      message: 'Failed to release seat due to system error'
    })
  }
}

async function getSeatStatus(flightId: number, seatId: number) {
  try {
    const redis = getRedisClient()
    const lockKey = REDIS_KEYS.seatLock(flightId, seatId)
    const lockData = await redis.get(lockKey)
    
    if (lockData) {
      const lock: SeatLock = JSON.parse(lockData as string)
      return NextResponse.json({
        locked: true,
        lockedBy: lock.userId,
        expiresAt: lock.expiresAt
      })
    }
    
    return NextResponse.json({ locked: false })
  } catch (error) {
    console.error('Error checking seat status:', error)
    return NextResponse.json({ locked: false })
  }
}

// Helper functions
async function addToUserSession(
  redis: any,
  userId: string,
  flightId: number,
  seatId: number
) {
  const sessionKey = REDIS_KEYS.userSeatSession(userId, flightId)
  
  // Get current seats
  const currentSeatsData = await redis.get(sessionKey)
  const currentSeats = currentSeatsData ? JSON.parse(currentSeatsData) : []
  
  // Add new seat if not already present
  if (!currentSeats.includes(seatId)) {
    currentSeats.push(seatId)
    await redis.set(
      sessionKey,
      JSON.stringify(currentSeats),
      { EX: SEAT_LOCK_TTL }
    )
  }
}

async function removeFromUserSession(
  redis: any,
  userId: string,
  flightId: number,
  seatId: number
) {
  const sessionKey = REDIS_KEYS.userSeatSession(userId, flightId)
  
  // Get current seats
  const currentSeatsData = await redis.get(sessionKey)
  const currentSeats = currentSeatsData ? JSON.parse(currentSeatsData) : []
  
  // Remove seat
  const updatedSeats = currentSeats.filter((id: number) => id !== seatId)
  
  if (updatedSeats.length > 0) {
    await redis.set(
      sessionKey,
      JSON.stringify(updatedSeats),
      { EX: SEAT_LOCK_TTL }
    )
  } else {
    await redis.del(sessionKey)
  }
}