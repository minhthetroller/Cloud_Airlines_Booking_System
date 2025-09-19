import { NextRequest, NextResponse } from 'next/server'
import { getRedisClient, REDIS_KEYS } from '@/lib/redis'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, userId, sessionId, bookingReference, flightId, seatId } = body

    if (!userId || !sessionId) {
      return NextResponse.json(
        { error: 'Missing userId or sessionId' },
        { status: 400 }
      )
    }

    switch (action) {
      case 'releaseAllUserSeats':
        return await releaseAllUserSeats(userId, sessionId)
      case 'clearBookingSession':
        if (!bookingReference) {
          return NextResponse.json(
            { error: 'Missing bookingReference for clearBookingSession' },
            { status: 400 }
          )
        }
        return await clearBookingSession(bookingReference, sessionId)
      case 'immediateCleanup':
        return await immediateUserCleanup(userId, sessionId)
      case 'releaseSingleSeat':
        if (!flightId || !seatId) {
          return NextResponse.json(
            { error: 'Missing flightId or seatId for releaseSingleSeat' },
            { status: 400 }
          )
        }
        return await releaseSingleSeat(userId, sessionId, flightId, seatId)
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Error in cleanup API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function releaseAllUserSeats(userId: string, sessionId: string) {
  try {
    const redis = getRedisClient()
    
    // Get all user session keys
    const pattern = `user_seats:${userId}:*`
    const keys = await redis.keys(pattern)
    
    let releasedSeats = 0
    
    for (const key of keys) {
      const sessionData = await redis.get(key)
      if (sessionData) {
        const seatIds: number[] = JSON.parse(sessionData as string)
        const flightId = parseInt(key.split(':')[2])
        
        // Release each seat
        const pipeline = redis.multi()
        for (const seatId of seatIds) {
          const lockKey = REDIS_KEYS.seatLock(flightId, seatId)
          
          // Check if lock belongs to this user before releasing
          const existingLock = await redis.get(lockKey)
          if (existingLock) {
            const lock = JSON.parse(existingLock as string)
            if (lock.userId === userId && lock.sessionId === sessionId) {
              pipeline.del(lockKey)
              releasedSeats++
            }
          }
        }
        
        // Remove user session
        pipeline.del(key)
        await pipeline.exec()
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Released ${releasedSeats} seats for user ${userId}`
    })
  } catch (error) {
    console.error('Error releasing all user seats:', error)
    return NextResponse.json({
      success: false,
      message: 'Failed to release seats due to system error'
    })
  }
}

async function clearBookingSession(bookingReference: string, sessionId: string) {
  try {
    const redis = getRedisClient()
    const sessionKey = REDIS_KEYS.bookingSession(bookingReference)
    const sessionData = await redis.get(sessionKey)
    
    if (sessionData) {
      const session = JSON.parse(sessionData as string)
      
      // Release all seats for this booking by calling releaseAllUserSeats
      await releaseAllUserSeats(session.userId, sessionId)
      
      // Remove booking session
      await redis.del(sessionKey)
      
      return NextResponse.json({
        success: true,
        message: `Cleared booking session ${bookingReference}`
      })
    }
    
    return NextResponse.json({
      success: true,
      message: 'Booking session not found or already cleared'
    })
  } catch (error) {
    console.error('Error clearing booking session:', error)
    return NextResponse.json({
      success: false,
      message: 'Failed to clear booking session due to system error'
    })
  }
}

// Immediate cleanup for user abandonment scenarios
async function immediateUserCleanup(userId: string, sessionId: string) {
  try {
    const redis = getRedisClient()
    
    // Get all user session keys across all flights
    const userSessionPattern = `user_seats:${userId}:*`
    const userSessionKeys = await redis.keys(userSessionPattern)
    
    // Get all seat locks for this user
    const seatLockPattern = `seat_lock:*`
    const allSeatLockKeys = await redis.keys(seatLockPattern)
    
    let releasedSeats = 0
    const pipeline = redis.multi()
    
    // Check each seat lock to see if it belongs to this user
    for (const lockKey of allSeatLockKeys) {
      const lockData = await redis.get(lockKey)
      if (lockData) {
        const lock = JSON.parse(lockData as string)
        if (lock.userId === userId && lock.sessionId === sessionId) {
          pipeline.del(lockKey)
          releasedSeats++
        }
      }
    }
    
    // Remove all user session keys
    for (const sessionKey of userSessionKeys) {
      pipeline.del(sessionKey)
    }
    
    // Execute all deletions
    await pipeline.exec()
    
    console.log(`Immediate cleanup: Released ${releasedSeats} seats and ${userSessionKeys.length} sessions for user ${userId}`)
    
    return NextResponse.json({
      success: true,
      message: `Immediate cleanup completed: Released ${releasedSeats} seats`,
      details: {
        releasedSeats,
        clearedSessions: userSessionKeys.length
      }
    })
  } catch (error) {
    console.error('Error in immediate user cleanup:', error)
    return NextResponse.json({
      success: false,
      message: 'Failed to perform immediate cleanup due to system error'
    })
  }
}

// Release a single seat immediately (for deselection)
async function releaseSingleSeat(userId: string, sessionId: string, flightId: number, seatId: number) {
  try {
    const redis = getRedisClient()
    const lockKey = REDIS_KEYS.seatLock(flightId, seatId)
    const sessionKey = REDIS_KEYS.userSeatSession(userId, flightId)
    
    // Check if lock belongs to this user
    const existingLock = await redis.get(lockKey)
    if (existingLock) {
      const lock = JSON.parse(existingLock as string)
      if (lock.userId === userId && lock.sessionId === sessionId) {
        // Remove seat lock
        await redis.del(lockKey)
        
        // Remove seat from user session
        const sessionData = await redis.get(sessionKey)
        if (sessionData) {
          const currentSeats = JSON.parse(sessionData as string)
          const updatedSeats = currentSeats.filter((id: number) => id !== seatId)
          
          if (updatedSeats.length > 0) {
            await redis.set(sessionKey, JSON.stringify(updatedSeats))
          } else {
            await redis.del(sessionKey)
          }
        }
        
        console.log(`Released single seat: ${seatId} on flight ${flightId} for user ${userId}`)
        
        return NextResponse.json({
          success: true,
          message: `Released seat ${seatId} successfully`
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
    console.error('Error releasing single seat:', error)
    return NextResponse.json({
      success: false,
      message: 'Failed to release seat due to system error'
    })
  }
}