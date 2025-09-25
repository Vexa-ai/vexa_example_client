import { getApiKey, getWebSocketUrl } from "./transcription-service"

// WebSocket event types
export interface WebSocketEvent {
  type: string
  meeting: { id: number }
  payload: any
  ts: string
}

export interface TranscriptMutableEvent extends WebSocketEvent {
  type: "transcript.mutable"
  payload: {
    segments: Array<{
      start: number
      text: string
      end_time: number
      language: string
      speaker?: string
      session_uid: string
      speaker_mapping_status: string
      updated_at: string
    }>
  }
}

export interface TranscriptFinalizedEvent extends WebSocketEvent {
  type: "transcript.finalized"
  payload: {
    segments: Array<{
      start: number
      end: number
      text: string
      language: string
      speaker?: string
      session_uid: string
    }>
  }
}

export interface MeetingStatusEvent extends WebSocketEvent {
  type: "meeting.status"
  payload: {
    status: string
  }
}

export interface SubscribedEvent extends WebSocketEvent {
  type: "subscribed"
  payload: {
    meetings: number[]
  }
}

export interface PongEvent extends WebSocketEvent {
  type: "pong"
  payload: {}
}

export interface ErrorEvent extends WebSocketEvent {
  type: "error"
  payload: {
    error: string
    code?: string | number
    reason?: string
  }
}

export type AnyWebSocketEvent = 
  | TranscriptMutableEvent 
  | TranscriptFinalizedEvent 
  | MeetingStatusEvent 
  | SubscribedEvent 
  | PongEvent 
  | ErrorEvent

// WebSocket service class
export class TranscriptionWebSocketService {
  private ws: WebSocket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 10 // Increased max attempts
  private reconnectDelay = 1000
  private maxReconnectDelay = 30000 // 30 seconds max delay
  private pingInterval: NodeJS.Timeout | null = null
  private isConnecting = false
  private connectionTimeout: NodeJS.Timeout | null = null
  private connectionTimeoutMs = 10000 // 10 seconds connection timeout
  private subscribedMeetings = new Set<number>()
  
  // Event handlers
  private onTranscriptMutable?: (event: TranscriptMutableEvent) => void
  private onTranscriptFinalized?: (event: TranscriptFinalizedEvent) => void
  private onMeetingStatus?: (event: MeetingStatusEvent) => void
  private onError?: (event: ErrorEvent) => void
  private onConnected?: () => void
  private onDisconnected?: () => void

  constructor() {
    // Bind methods to preserve context
    this.handleMessage = this.handleMessage.bind(this)
    this.handleOpen = this.handleOpen.bind(this)
    this.handleClose = this.handleClose.bind(this)
    this.handleError = this.handleError.bind(this)
  }

  // Set event handlers
  setOnTranscriptMutable(handler: (event: TranscriptMutableEvent) => void) {
    this.onTranscriptMutable = handler
  }

  setOnTranscriptFinalized(handler: (event: TranscriptFinalizedEvent) => void) {
    this.onTranscriptFinalized = handler
  }

  setOnMeetingStatus(handler: (event: MeetingStatusEvent) => void) {
    this.onMeetingStatus = handler
  }

  setOnError(handler: (event: ErrorEvent) => void) {
    this.onError = handler
  }

  setOnConnected(handler: () => void) {
    this.onConnected = handler
  }

  setOnDisconnected(handler: () => void) {
    this.onDisconnected = handler
  }

  // Connect to WebSocket
  async connect(): Promise<void> {
    // If already connected or connecting, return
    if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) {
      console.log('WebSocket already connected or connecting')
      return
    }

    // Clean up any existing connection
    this.cleanup()
    this.isConnecting = true

    try {
      const apiKey = getApiKey()
      if (!apiKey) {
        throw new Error("No API key available")
      }

      // Get WebSocket URL from user settings
      let wsUrl = getWebSocketUrl()
      
      // Ensure URL has proper protocol
      if (!wsUrl.startsWith('ws://') && !wsUrl.startsWith('wss://')) {
        wsUrl = window.location.protocol === 'https:' ? `wss://${wsUrl}` : `ws://${wsUrl}`
      }
      
      // Add API key to URL
      const url = new URL(wsUrl)
      url.searchParams.set('api_key', apiKey)
      
      console.log("Connecting to WebSocket:", `${url.protocol}//${url.host}${url.pathname}?api_key=***`)

      // Set connection timeout
      this.connectionTimeout = setTimeout(() => {
        if (this.ws?.readyState === WebSocket.CONNECTING) {
          console.error('WebSocket connection timed out')
          this.ws.close(4000, 'Connection timeout')
        }
      }, this.connectionTimeoutMs)

      this.ws = new WebSocket(url.toString())
      this.ws.onopen = this.handleOpen.bind(this)
      this.ws.onmessage = this.handleMessage.bind(this)
      this.ws.onclose = this.handleClose.bind(this)
      this.ws.onerror = this.handleError.bind(this)
      
      // Add a timeout to detect connection failures
      const connectionTimeout = setTimeout(() => {
        if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
          console.error("WebSocket connection timeout")
          this.ws.close()
          this.isConnecting = false
        }
      }, 10000) // 10 second timeout
      
      this.ws.addEventListener('open', () => {
        clearTimeout(connectionTimeout)
      })
      
      this.ws.addEventListener('error', () => {
        clearTimeout(connectionTimeout)
      })

    } catch (error) {
      console.error("Failed to connect to WebSocket:", error)
      this.isConnecting = false
      throw error
    }
  }

  // Disconnect from WebSocket
  disconnect(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval)
      this.pingInterval = null
    }

    if (this.ws) {
      this.ws.close()
      this.ws = null
    }

    this.subscribedMeetings.clear()
    this.reconnectAttempts = 0
    this.isConnecting = false
  }

  // Subscribe to meeting events
  async subscribeToMeeting(meetingId: number): Promise<void> {
    // If already subscribed, no need to subscribe again
    if (this.subscribedMeetings.has(meetingId)) {
      console.log(`Already subscribed to meeting: ${meetingId}`)
      return
    }

    // If WebSocket is not connected or connecting, establish a new connection
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      if (this.isConnecting) {
        // Wait for the connection to be established
        await new Promise<void>((resolve) => {
          const checkConnection = () => {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
              resolve()
            } else if (this.ws && this.ws.readyState === WebSocket.CLOSED) {
              resolve()
            } else {
              setTimeout(checkConnection, 100)
            }
          }
          checkConnection()
        })
      } else {
        // Not connected and not connecting, so connect now
        await this.connect()
      }
    }

    // If still not connected after attempting to connect, throw an error
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error("Failed to establish WebSocket connection")
    }

    try {
      const subscribeMessage = {
        action: "subscribe",
        meetings: [{ id: meetingId }]
      }

      this.ws.send(JSON.stringify(subscribeMessage))
      this.subscribedMeetings.add(meetingId)
      
      console.log("Successfully subscribed to meeting:", meetingId)
    } catch (error) {
      console.error("Error subscribing to meeting:", error)
      throw new Error(`Failed to subscribe to meeting ${meetingId}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  // Unsubscribe from meeting events
  async unsubscribeFromMeeting(meetingId: number): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return
    }

    const unsubscribeMessage = {
      action: "unsubscribe",
      meetings: [{ id: meetingId }]
    }

    this.ws.send(JSON.stringify(unsubscribeMessage))
    this.subscribedMeetings.delete(meetingId)
    
    console.log("Unsubscribed from meeting:", meetingId)
  }

  // Check if connected
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }

  // Get subscribed meetings
  getSubscribedMeetings(): number[] {
    return Array.from(this.subscribedMeetings)
  }

  // Private methods
  private handleOpen(): void {
    console.log("WebSocket connected")
    this.isConnecting = false
    this.reconnectAttempts = 0
    
    // Start ping interval
    this.pingInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ action: "ping" }))
      }
    }, 25000) // Ping every 25 seconds

    this.onConnected?.()
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const data: AnyWebSocketEvent = JSON.parse(event.data)
      console.log("WebSocket message received:", data.type, data)

      switch (data.type) {
        case "transcript.mutable": {
          const eventData = data as TranscriptMutableEvent
          // Ensure we have segments in the payload
          if (eventData.payload?.segments?.length) {
            // Process each segment
            const processedSegments = eventData.payload.segments.map(segment => ({
              ...segment,
              meetingId: eventData.meeting.id,
              timestamp: new Date().toISOString()
            }))
            
            // Call the handler with properly typed data
            this.onTranscriptMutable?.({
              ...eventData,
              payload: {
                segments: processedSegments
              }
            })
          }
          break
        }
        case "transcript.finalized": {
          const eventData = data as TranscriptFinalizedEvent
          // Process finalized segments if needed
          if (eventData.payload?.segments?.length) {
            this.onTranscriptFinalized?.({
              ...eventData,
              payload: {
                segments: eventData.payload.segments.map(segment => ({
                  ...segment,
                  meetingId: eventData.meeting.id,
                  timestamp: new Date().toISOString()
                }))
              }
            })
          }
          break
        }
        case "meeting.status":
          this.onMeetingStatus?.(data as MeetingStatusEvent)
          break
        case "subscribed":
          console.log("Subscribed to meetings:", (data as SubscribedEvent).payload.meetings)
          break
        case "pong":
          // Connection is alive
          break
        case "error":
          this.onError?.(data as ErrorEvent)
          break
        default: {
          // Use a type assertion to handle unknown event types
          const unknownEvent = data as { type?: string }
          console.warn("Unknown WebSocket event type:", unknownEvent.type || 'unknown')
          break
        }
      }
    } catch (error) {
      console.error("Failed to parse WebSocket message:", error)
    }
  }

  private handleClose(event: CloseEvent): void {
    console.log("WebSocket disconnected:", {
      code: event.code,
      reason: event.reason,
      wasClean: event.wasClean,
      reconnectAttempt: `${this.reconnectAttempts}/${this.maxReconnectAttempts}`
    })

    // Clear any existing intervals/timeouts
    if (this.pingInterval) {
      clearInterval(this.pingInterval)
      this.pingInterval = null
    }
    
    this.isConnecting = false
    this.onDisconnected?.()

    // Don't attempt to reconnect if this was a normal closure or we've exceeded max attempts
    if (event.code === 1000) {
      console.log('WebSocket closed normally, not reconnecting')
      return
    }

    // If this wasn't a clean close, attempt to reconnect
    if (!event.wasClean && this.reconnectAttempts < this.maxReconnectAttempts) {
      console.log('Attempting to reconnect due to unclean closure...')
      this.attemptReconnect()
    } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.warn('Max reconnection attempts reached, giving up')
      this.onError?.({
        type: 'error',
        meeting: { id: 0 },
        payload: {
          error: 'Connection lost',
          code: 'CONNECTION_LOST',
          reason: `WebSocket closed ${event.wasClean ? 'cleanly' : 'unexpectedly'} (Code: ${event.code}${event.reason ? `, Reason: ${event.reason}` : ''})`
        },
        ts: new Date().toISOString()
      })
    }
  }

  private cleanup(): void {
    // Clear any existing timeouts/intervals
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout)
      this.connectionTimeout = null
    }
    
    if (this.pingInterval) {
      clearInterval(this.pingInterval)
      this.pingInterval = null
    }
    
    // Close WebSocket if it exists
    if (this.ws) {
      this.ws.onopen = null
      this.ws.onclose = null
      this.ws.onmessage = null
      this.ws.onerror = null
      
      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.close(1000, 'Client closed connection')
      }
      
      this.ws = null
    }
    
    this.isConnecting = false
  }

  private handleError(error: Event): void {
    const target = error.target as WebSocket | null;
    const readyState = target?.readyState ?? -1;
    const isClosing = readyState === WebSocket.CLOSING;
    const isClosed = readyState === WebSocket.CLOSED;
    // wasClean is a property of CloseEvent, not ErrorEvent
    const wasClean = false;
    
    // Skip logging for normal closing/clean disconnects
    if (isClosing || (isClosed && wasClean)) {
      return;
    }

    const errorInfo = {
      type: error.type,
      readyState: this.getReadyStateName(readyState),
      url: this.ws?.url ? new URL(this.ws.url).origin : 'unknown',
      wasClean,
      code: (error as any).code || 'N/A',
      reason: (error as any).reason || 'No reason provided',
      timestamp: new Date().toISOString()
    };
    
    console.warn('WebSocket connection issue:', errorInfo);
    
    this.isConnecting = false;
    
    // Trigger onError with detailed error information
    this.onError?.({
      type: 'error',
      meeting: { id: 0 },
      payload: { 
        error: 'WebSocket connection error',
        ...errorInfo
      },
      ts: errorInfo.timestamp
    });
    
    // If we're not already trying to reconnect and the connection is in a closed state
    if (readyState === WebSocket.CLOSED) {
      this.attemptReconnect();
    }
  }
  
  private getReadyStateName(state: number): string {
    switch (state) {
      case WebSocket.CONNECTING: return 'CONNECTING';
      case WebSocket.OPEN: return 'OPEN';
      case WebSocket.CLOSING: return 'CLOSING';
      case WebSocket.CLOSED: return 'CLOSED';
      default: return `UNKNOWN (${state})`;
    }
  }

  private attemptReconnect(): void {
    this.reconnectAttempts++
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)
    
    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`)
    
    setTimeout(() => {
      if (this.reconnectAttempts <= this.maxReconnectAttempts) {
        this.connect().catch(console.error)
      }
    }, delay)
  }
}

// Singleton instance
let wsServiceInstance: TranscriptionWebSocketService | null = null

export function getWebSocketService(): TranscriptionWebSocketService {
  if (process.env.NEXT_PUBLIC_MOCK_MODE === 'true') {
    console.log('Using mock WebSocket service')
    // @ts-ignore - Mock service has a compatible interface
    return new (require('./mock-websocket-service').MockWebSocketService)()
  }
  
  if (!wsServiceInstance) {
    wsServiceInstance = new TranscriptionWebSocketService()
  }
  return wsServiceInstance
}

// Helper function to convert WebSocket segments to our format
export function convertWebSocketSegment(segment: any, meetingId: string): {
  id: string
  text: string
  timestamp: string
  speaker?: string
} {
  // Create a stable ID based on start time and text
  const stableId = `${segment.start}-${segment.text.slice(0, 20).replace(/\s+/g, '-')}`
  
  // Convert start time to ISO timestamp (assuming it's relative to meeting start)
  const timestamp = new Date(Date.now() - (Date.now() - segment.start * 1000)).toISOString()
  
  return {
    id: stableId,
    text: segment.text || "",
    timestamp: timestamp,
    speaker: segment.speaker || "Unknown",
  }
}
