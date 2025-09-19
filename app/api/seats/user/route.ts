import { NextRequest, NextResponse } from 'next/server'
import { getRedisClient, REDIS_KEYS } from '@/lib/redis'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const flightId = searchParams.get('flightId')

    if (!userId || !flightId) {
      return NextResponse.json(
        { error: 'Missing userId or flightId' },
        { status: 400 }
      )
    }

    const redis = getRedisClient()
    const sessionKey = REDIS_KEYS.userSeatSession(userId, parseInt(flightId))
    const seatsData = await redis.get(sessionKey)
    
    const seats = seatsData ? JSON.parse(seatsData) : []
    
    return NextResponse.json({ seats })
  } catch (error) {
    console.error('Error getting user seats:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, flightId } = body

    if (!userId || !flightId) {
      return NextResponse.json(
        { error: 'Missing userId or flightId' },
        { status: 400 }
      )
    }

    const redis = getRedisClient()
    
    // Get all seats for this user and release them
    const sessionKey = REDIS_KEYS.userSeatSession(userId, flightId)
    const seatsData = await redis.get(sessionKey)
    const seats = seatsData ? JSON.parse(seatsData) : []
    
    // Release all seat locks
    const pipeline = redis.multi()
    for (const seatId of seats) {
      const lockKey = REDIS_KEYS.seatLock(flightId, seatId)
      pipeline.del(lockKey)
    }
    pipeline.del(sessionKey)
    await pipeline.exec()
    
    return NextResponse.json({
      success: true,
      message: `Released ${seats.length} seats`
    })
  } catch (error) {
    console.error('Error releasing user seats:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}