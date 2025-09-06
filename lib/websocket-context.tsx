"use client"

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { getWebSocketService, type MeetingStatusEvent } from './websocket-service'

interface WebSocketContextType {
  isConnected: boolean
  subscribedMeetings: number[]
  subscribeToMeeting: (meetingId: number) => Promise<void>
  unsubscribeFromMeeting: (meetingId: number) => Promise<void>
  onMeetingStatusChange: (callback: (meetingId: number, status: string) => void) => void
  offMeetingStatusChange: (callback: (meetingId: number, status: string) => void) => void
}

const WebSocketContext = createContext<WebSocketContextType | null>(null)

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const [isConnected, setIsConnected] = useState(false)
  const [subscribedMeetings, setSubscribedMeetings] = useState<number[]>([])
  const [statusCallbacks, setStatusCallbacks] = useState<Set<(meetingId: number, status: string) => void>>(new Set())

  const wsService = getWebSocketService()

  // Set up WebSocket event handlers
  useEffect(() => {
    wsService.setOnConnected(() => {
      setIsConnected(true)
    })

    wsService.setOnDisconnected(() => {
      setIsConnected(false)
      setSubscribedMeetings([])
    })

    wsService.setOnMeetingStatus((event: MeetingStatusEvent) => {
      const meetingId = event.meeting.id
      const status = event.payload.status
      
      console.log(`WebSocket meeting status update: ${meetingId} -> ${status}`)
      
      // Notify all registered callbacks
      statusCallbacks.forEach(callback => {
        try {
          callback(meetingId, status)
        } catch (error) {
          console.error('Error in meeting status callback:', error)
        }
      })
    })

    // Connect to WebSocket on mount
    wsService.connect().catch(console.error)

    // Cleanup on unmount
    return () => {
      wsService.disconnect()
    }
  }, [statusCallbacks])

  const subscribeToMeeting = useCallback(async (meetingId: number) => {
    try {
      await wsService.subscribeToMeeting(meetingId)
      setSubscribedMeetings(prev => {
        if (!prev.includes(meetingId)) {
          return [...prev, meetingId]
        }
        return prev
      })
    } catch (error) {
      console.error('Failed to subscribe to meeting:', error)
    }
  }, [])

  const unsubscribeFromMeeting = useCallback(async (meetingId: number) => {
    try {
      await wsService.unsubscribeFromMeeting(meetingId)
      setSubscribedMeetings(prev => prev.filter(id => id !== meetingId))
    } catch (error) {
      console.error('Failed to unsubscribe from meeting:', error)
    }
  }, [])

  const onMeetingStatusChange = useCallback((callback: (meetingId: number, status: string) => void) => {
    setStatusCallbacks(prev => new Set([...prev, callback]))
  }, [])

  const offMeetingStatusChange = useCallback((callback: (meetingId: number, status: string) => void) => {
    setStatusCallbacks(prev => {
      const newSet = new Set(prev)
      newSet.delete(callback)
      return newSet
    })
  }, [])

  const value: WebSocketContextType = {
    isConnected,
    subscribedMeetings,
    subscribeToMeeting,
    unsubscribeFromMeeting,
    onMeetingStatusChange,
    offMeetingStatusChange,
  }

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  )
}

export function useWebSocket() {
  const context = useContext(WebSocketContext)
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider')
  }
  return context
}
