import { seatAPI } from '../api/seat-api'
import { BookingService } from './booking-service'

/**
 * Utility service for handling cleanup operations when users
 * quit the booking process or when sessions expire
 */
export class BookingCleanupService {
  /**
   * Clean up all resources when user quits booking process
   */
  static async handleUserQuit(
    userId: string,
    sessionId: string,
    bookingReference?: string
  ): Promise<void> {
    try {
      console.log(`Cleaning up booking session for user ${userId}`)

      // Use immediate cleanup for faster response
      await seatAPI.immediateUserCleanup(userId, sessionId)

      // Clear booking session if exists
      if (bookingReference) {
        await seatAPI.clearBookingSession(bookingReference, sessionId)
      }

      console.log(`Cleanup completed for user ${userId}`)
    } catch (error) {
      console.error('Error during booking cleanup:', error)
    }
  }

  /**
   * Handle browser/tab close events
   */
  static setupBrowserCleanup(
    userId: string,
    sessionId: string,
    bookingReference?: string
  ): void {
    // Handle page unload (browser close, tab close, navigation away)
    const handleUnload = () => {
      // Use sendBeacon for reliable cleanup during page unload
      if (navigator.sendBeacon) {
        const cleanupData = JSON.stringify({
          userId,
          sessionId,
          bookingReference,
          action: 'cleanup'
        })
        
        navigator.sendBeacon('/api/cleanup-booking', cleanupData)
      }
    }

    // Handle visibility change (tab switching, minimizing)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Don't cleanup immediately when tab becomes hidden
        // as user might come back
        console.log('Tab hidden - booking session preserved')
      } else {
        console.log('Tab visible - booking session active')
      }
    }

    // Add event listeners
    window.addEventListener('beforeunload', handleUnload)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Store cleanup function for later removal
    ;(window as any).__bookingCleanup = {
      handleUnload,
      handleVisibilityChange,
      cleanup: () => {
        window.removeEventListener('beforeunload', handleUnload)
        document.removeEventListener('visibilitychange', handleVisibilityChange)
      }
    }
  }

  /**
   * Remove browser cleanup listeners
   */
  static removeBrowserCleanup(): void {
    const cleanup = (window as any).__bookingCleanup
    if (cleanup) {
      cleanup.cleanup()
      delete (window as any).__bookingCleanup
    }
  }

  /**
   * Handle timeout-based cleanup for inactive sessions
   */
  static startInactivityTimer(
    userId: string,
    sessionId: string,
    bookingReference: string,
    timeoutMinutes: number = 15
  ): NodeJS.Timeout {
    const timeoutMs = timeoutMinutes * 60 * 1000

    const timeoutId = setTimeout(async () => {
      console.log(`Session timeout for user ${userId} - cleaning up`)
      await this.handleUserQuit(userId, sessionId, bookingReference)
    }, timeoutMs)

    return timeoutId
  }

  /**
   * Reset inactivity timer
   */
  static resetInactivityTimer(
    currentTimeoutId: NodeJS.Timeout,
    userId: string,
    sessionId: string,
    bookingReference: string,
    timeoutMinutes: number = 15
  ): NodeJS.Timeout {
    // Clear existing timeout
    clearTimeout(currentTimeoutId)
    
    // Start new timeout
    return this.startInactivityTimer(userId, sessionId, bookingReference, timeoutMinutes)
  }

  /**
   * Check for expired Redis keys and clean them up
   * This should be called periodically by a background job
   */
  static async cleanupExpiredSessions(): Promise<void> {
    try {
      // This would typically be handled by Redis TTL automatically
      // but we can add additional cleanup logic here if needed
      console.log('Cleanup job for expired sessions completed')
    } catch (error) {
      console.error('Error during expired session cleanup:', error)
    }
  }

  /**
   * Handle payment failure cleanup
   */
  static async handlePaymentFailure(
    userId: string,
    sessionId: string,
    bookingReference: string,
    bookingId?: number
  ): Promise<void> {
    try {
      console.log(`Handling payment failure for booking ${bookingReference}`)

      // Cancel the booking if it was created
      if (bookingId) {
        await BookingService.cancelBooking({
          bookingId,
          cancelReason: 'Payment failed'
        })
      }

      // Clean up seat reservations and session
      await this.handleUserQuit(userId, sessionId, bookingReference)

      console.log(`Payment failure cleanup completed for ${bookingReference}`)
    } catch (error) {
      console.error('Error during payment failure cleanup:', error)
    }
  }

  /**
   * Handle successful booking completion
   */
  static async handleBookingSuccess(
    userId: string,
    sessionId: string,
    bookingReference: string
  ): Promise<void> {
    try {
      console.log(`Handling successful booking completion for ${bookingReference}`)

      // Clear Redis session data (seats should now be permanently booked)
      await seatAPI.clearBookingSession(bookingReference, sessionId)
      
      // Remove browser cleanup listeners
      this.removeBrowserCleanup()

      console.log(`Booking success cleanup completed for ${bookingReference}`)
    } catch (error) {
      console.error('Error during booking success cleanup:', error)
    }
  }

  /**
   * Immediate cleanup when user quits or abandons booking
   */
  static async immediateCleanup(
    userId: string,
    sessionId: string
  ): Promise<void> {
    try {
      console.log(`Performing immediate cleanup for user ${userId}`)
      await seatAPI.immediateUserCleanup(userId, sessionId)
      console.log(`Immediate cleanup completed for user ${userId}`)
    } catch (error) {
      console.error('Error during immediate cleanup:', error)
    }
  }

  /**
   * Release a single seat when user deselects it
   */
  static async releaseSingleSeat(
    userId: string,
    sessionId: string,
    flightId: number,
    seatId: number
  ): Promise<boolean> {
    try {
      console.log(`Releasing seat ${seatId} on flight ${flightId} for user ${userId}`)
      const result = await seatAPI.releaseSingleSeat(userId, sessionId, flightId, seatId)
      return result.success
    } catch (error) {
      console.error('Error releasing single seat:', error)
      return false
    }
  }

  /**
   * Enhanced browser cleanup with immediate Redis cleanup
   */
  static setupEnhancedBrowserCleanup(
    userId: string,
    sessionId: string,
    bookingReference?: string
  ): void {
    // Enhanced unload handler with immediate cleanup
    const handleUnload = () => {
      // Use sendBeacon for reliable cleanup during page unload
      if (navigator.sendBeacon) {
        const cleanupData = JSON.stringify({
          action: 'immediateCleanup',
          userId,
          sessionId,
          bookingReference
        })
        
        navigator.sendBeacon('/api/cleanup-booking', cleanupData)
      }
    }

    // Handle visibility change with timeout for abandonment detection
    let abandonmentTimeout: NodeJS.Timeout | null = null
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Set abandonment timeout (30 seconds)
        abandonmentTimeout = setTimeout(async () => {
          console.log('User appears to have abandoned the session - performing cleanup')
          await this.immediateCleanup(userId, sessionId)
        }, 30000) // 30 seconds
      } else {
        // User returned, cancel abandonment timeout
        if (abandonmentTimeout) {
          clearTimeout(abandonmentTimeout)
          abandonmentTimeout = null
          console.log('User returned - cancelling abandonment cleanup')
        }
      }
    }

    // Add enhanced event listeners
    window.addEventListener('beforeunload', handleUnload)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    // Handle page navigation
    const handlePageShow = () => {
      if (abandonmentTimeout) {
        clearTimeout(abandonmentTimeout)
        abandonmentTimeout = null
      }
    }
    
    window.addEventListener('pageshow', handlePageShow)

    // Store cleanup function for later removal
    ;(window as any).__bookingCleanup = {
      handleUnload,
      handleVisibilityChange,
      handlePageShow,
      cleanup: () => {
        if (abandonmentTimeout) {
          clearTimeout(abandonmentTimeout)
        }
        window.removeEventListener('beforeunload', handleUnload)
        document.removeEventListener('visibilitychange', handleVisibilityChange)
        window.removeEventListener('pageshow', handlePageShow)
      }
    }
  }
}