import { NextRequest, NextResponse } from 'next/server'
import { BookingCleanupService } from '@/lib/services/booking-cleanup'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, sessionId, bookingReference, action } = body

    if (action !== 'cleanup' && action !== 'immediateCleanup') {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      )
    }

    if (!userId || !sessionId) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    console.log(`Browser cleanup triggered for user ${userId}, session ${sessionId}`)

    // Perform immediate cleanup for browser events
    if (action === 'immediateCleanup') {
      await BookingCleanupService.immediateCleanup(userId, sessionId)
    } else {
      // Regular cleanup
      await BookingCleanupService.handleUserQuit(userId, sessionId, bookingReference)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in cleanup endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}