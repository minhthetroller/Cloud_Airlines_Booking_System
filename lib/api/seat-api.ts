import axios from 'axios'

export interface SeatOperationResponse {
  success: boolean
  message: string
  lockedUntil?: number
}

export interface SeatStatusResponse {
  locked: boolean
  lockedBy?: string
  expiresAt?: number
}

export interface UserSeatsResponse {
  seats: number[]
}

class SeatAPI {
  private baseUrl = '/api/seats'

  async reserveSeat(
    userId: string,
    flightId: number,
    seatId: number,
    sessionId: string
  ): Promise<SeatOperationResponse> {
    try {
      const response = await axios.post(this.baseUrl, {
        action: 'reserve',
        userId,
        flightId,
        seatId,
        sessionId
      })
      return response.data
    } catch (error: any) {
      console.error('Error reserving seat:', error)
      return {
        success: false,
        message: error?.response?.data?.error || 'Failed to reserve seat'
      }
    }
  }

  async releaseSeat(
    userId: string,
    flightId: number,
    seatId: number,
    sessionId: string
  ): Promise<SeatOperationResponse> {
    try {
      const response = await axios.post(this.baseUrl, {
        action: 'release',
        userId,
        flightId,
        seatId,
        sessionId
      })
      return response.data
    } catch (error: any) {
      console.error('Error releasing seat:', error)
      return {
        success: false,
        message: error?.response?.data?.error || 'Failed to release seat'
      }
    }
  }

  async getSeatStatus(
    flightId: number,
    seatId: number
  ): Promise<SeatStatusResponse> {
    try {
      const response = await axios.post(this.baseUrl, {
        action: 'status',
        flightId,
        seatId,
        userId: 'system', // Not used for status check
        sessionId: 'system' // Not used for status check
      })
      return response.data
    } catch (error: any) {
      console.error('Error getting seat status:', error)
      return { locked: false }
    }
  }

  async getUserSeats(
    userId: string,
    flightId: number
  ): Promise<UserSeatsResponse> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/user?userId=${userId}&flightId=${flightId}`
      )
      return response.data
    } catch (error: any) {
      console.error('Error getting user seats:', error)
      return { seats: [] }
    }
  }

  async releaseAllUserSeats(
    userId: string,
    flightId: number
  ): Promise<SeatOperationResponse> {
    try {
      const response = await axios.delete(`${this.baseUrl}/user`, {
        data: { userId, flightId }
      })
      return response.data
    } catch (error: any) {
      console.error('Error releasing all user seats:', error)
      return {
        success: false,
        message: error?.response?.data?.error || 'Failed to release seats'
      }
    }
  }

  async getMultipleSeatStatuses(
    flightId: number,
    seatIds: number[]
  ): Promise<Record<number, SeatStatusResponse>> {
    try {
      const promises = seatIds.map(seatId => 
        this.getSeatStatus(flightId, seatId).then(status => ({
          seatId,
          status
        }))
      )
      
      const results = await Promise.all(promises)
      return results.reduce((acc, { seatId, status }) => {
        acc[seatId] = status
        return acc
      }, {} as Record<number, SeatStatusResponse>)
    } catch (error) {
      console.error('Error getting multiple seat statuses:', error)
      return {}
    }
  }

  async releaseAllUserSeatsWithSession(
    userId: string,
    sessionId: string
  ): Promise<SeatOperationResponse> {
    try {
      const response = await axios.post('/api/seats/cleanup', {
        action: 'releaseAllUserSeats',
        userId,
        sessionId
      })
      return response.data
    } catch (error: any) {
      console.error('Error releasing all user seats:', error)
      return {
        success: false,
        message: error?.response?.data?.error || 'Failed to release all seats'
      }
    }
  }

  async clearBookingSession(
    bookingReference: string,
    sessionId: string
  ): Promise<SeatOperationResponse> {
    try {
      const response = await axios.post('/api/seats/cleanup', {
        action: 'clearBookingSession',
        bookingReference,
        sessionId
      })
      return response.data
    } catch (error: any) {
      console.error('Error clearing booking session:', error)
      return {
        success: false,
        message: error?.response?.data?.error || 'Failed to clear booking session'
      }
    }
  }

  async immediateUserCleanup(
    userId: string,
    sessionId: string
  ): Promise<SeatOperationResponse> {
    try {
      const response = await axios.post('/api/seats/cleanup', {
        action: 'immediateCleanup',
        userId,
        sessionId
      })
      return response.data
    } catch (error: any) {
      console.error('Error in immediate user cleanup:', error)
      return {
        success: false,
        message: error?.response?.data?.error || 'Failed to perform immediate cleanup'
      }
    }
  }

  async releaseSingleSeat(
    userId: string,
    sessionId: string,
    flightId: number,
    seatId: number
  ): Promise<SeatOperationResponse> {
    try {
      const response = await axios.post('/api/seats/cleanup', {
        action: 'releaseSingleSeat',
        userId,
        sessionId,
        flightId,
        seatId
      })
      return response.data
    } catch (error: any) {
      console.error('Error releasing single seat:', error)
      return {
        success: false,
        message: error?.response?.data?.error || 'Failed to release seat'
      }
    }
  }
}

export const seatAPI = new SeatAPI()