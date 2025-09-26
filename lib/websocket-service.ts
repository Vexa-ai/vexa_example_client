// Added import for getWebSocketService for onSelectMeeting function
import { getApiKey, getWebSocketUrl } from "./transcription-service"
import { getWebSocketService } from "./websocket-service"

// WebSocket event types
export interface WebSocketEvent {
  type: string
  meeting_id: string
  payload?: any
  ts?: string
}

export interface SessionStartEvent extends WebSocketEvent {
  type: "session_start"
  token: string
  platform: string
  meeting_id: string
  uid: string
  start_timestamp: string
}

export interface TranscriptionSegment {
  start: number
  end: number
  text: string
  completed: boolean
  language: string
  speaker?: string
}

export interface TranscriptionEvent extends WebSocketEvent {
  type: "transcription"
  token: string
  platform: string
  meeting_id: string
  segments: TranscriptionSegment[]
  uid: string
}

export interface MeetingStatusEvent extends WebSocketEvent {
  type: "meeting_status"
  meeting: {
    id: string
  }
  payload: {
    status: string
  }
}

export type AnyWebSocketEvent = SessionStartEvent | TranscriptionEvent | MeetingStatusEvent

export function convertWebSocketSegment(segment: any, meetingId: string) {
  return {
    id: `${meetingId}-${segment.start}-${segment.end}`,
    text: segment.text || "",
    timestamp: new Date((segment.start || 0) * 1000).toISOString(),
    speaker: segment.speaker || "Unknown",
    completed: segment.completed || false,
    language: segment.language || "unknown",
  }
}

export class TranscriptionWebSocketService {
  private ws: WebSocket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private pingInterval: NodeJS.Timeout | null = null
  private isConnecting = false

  private currentMeetingId: string | null = null

  private onSessionStart?: (event: SessionStartEvent) => void
  private onTranscription?: (event: TranscriptionEvent) => void
  private onError?: (error: Event | Error) => void
  private onConnected?: () => void
  private onDisconnected?: () => void
  private onMeetingStatus?: (event: MeetingStatusEvent) => void

  constructor() {
    this.handleMessage = this.handleMessage.bind(this)
    this.handleOpen = this.handleOpen.bind(this)
    this.handleClose = this.handleClose.bind(this)
    this.handleError = this.handleError.bind(this)

    this.connect().catch(console.error)
  }

  setCurrentMeetingId(meetingId: string | null) {
    const prev = this.currentMeetingId
    this.currentMeetingId = meetingId
    console.log(
      `[WS] setCurrentMeetingId: ${prev ?? 'null'} -> ${meetingId ?? 'null'}`
    )
  }

  setOnSessionStart(handler: (event: SessionStartEvent) => void) {
    this.onSessionStart = handler
  }

  setOnTranscription(handler: (event: TranscriptionEvent) => void) {
    this.onTranscription = handler
  }

  setOnMeetingStatus(handler: (event: MeetingStatusEvent) => void) {
    this.onMeetingStatus = handler
  }

  setOnError(handler: (error: Event | Error) => void) {
    this.onError = handler
  }

  setOnConnected(handler: () => void) {
    this.onConnected = handler
  }

  setOnDisconnected(handler: () => void) {
    this.onDisconnected = handler
  }

  async connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) {
      return
    }

    this.isConnecting = true

    try {
      const apiKey = getApiKey()
      if (!apiKey) {
        throw new Error("No API key available")
      }

      const wsUrl = getWebSocketUrl()
      const url = `${wsUrl}?api_key=${encodeURIComponent(apiKey)}`

      console.log("Connecting to WebSocket:", url.replace(apiKey, "***"))

      this.ws = new WebSocket(url)
      this.ws.onopen = this.handleOpen
      this.ws.onmessage = this.handleMessage
      this.ws.onclose = this.handleClose
      this.ws.onerror = this.handleError

      const connectionTimeout = setTimeout(() => {
        if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
          console.error("WebSocket connection timeout")
          this.ws.close()
          this.isConnecting = false
        }
      }, 10000)

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

  disconnect(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval)
      this.pingInterval = null
    }

    if (this.ws) {
      this.ws.close()
      this.ws = null
    }

    this.reconnectAttempts = 0
    this.isConnecting = false
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }

  private handleOpen(): void {
    console.log("WebSocket connected")
    this.isConnecting = false
    this.reconnectAttempts = 0

    this.pingInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ action: "ping" }))
      }
    }, 25000)

    this.onConnected?.()
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data) as AnyWebSocketEvent
      console.log("WebSocket message received:", data.type, data)

      switch (data.type) {
        case "session_start":
          this.onSessionStart?.(data as SessionStartEvent)
          break
        case "transcription": {
          const transcriptionEvent = data as TranscriptionEvent
          console.log(
            `[WS] handle transcription: incoming meeting_id=${transcriptionEvent.meeting_id}, currentMeetingId=${this.currentMeetingId}`
          )
          if (this.currentMeetingId !== transcriptionEvent.meeting_id) {
            console.log(`Ignoring transcription for meeting_id ${transcriptionEvent.meeting_id} because currentMeetingId is ${this.currentMeetingId}`)
            break
          }
          transcriptionEvent.segments = transcriptionEvent.segments.map(segment => ({
            ...segment,
            start: typeof segment.start === "string" ? parseFloat(segment.start) : segment.start,
            end: typeof segment.end === "string" ? parseFloat(segment.end) : segment.end,
          }))
          this.onTranscription?.(transcriptionEvent)
          break
        }
        case "meeting_status":
          this.onMeetingStatus?.(data as MeetingStatusEvent)
          break
        default:
          console.warn("Ignoring unsupported WebSocket event type:", data.type)
          break
      }
    } catch (error) {
      console.error("Failed to parse WebSocket message:", error)
      this.onError?.(error as Error)
    }
  }

  private handleClose(event: CloseEvent): void {
    console.log("WebSocket disconnected:", event.code, event.reason)
    this.isConnecting = false

    if (this.pingInterval) {
      clearInterval(this.pingInterval)
      this.pingInterval = null
    }

    this.onDisconnected?.()

    if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
      this.attemptReconnect()
    }
  }

  private handleError(error: Event): void {
    console.error("WebSocket error:", error)
    this.isConnecting = false
    this.onError?.(error)
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

let wsServiceInstance: TranscriptionWebSocketService | null = null

export function getWebSocketService(): TranscriptionWebSocketService {
  if (process.env.NEXT_PUBLIC_MOCK_MODE === 'true') {
    console.log('Using mock WebSocket service')
    // @ts-ignore
    return new (require('./mock-websocket-service').MockWebSocketService)()
  }

  if (!wsServiceInstance) {
    wsServiceInstance = new TranscriptionWebSocketService()
  }
  return wsServiceInstance
}

// Function to handle selection of a meeting and update WebSocket service
export function onSelectMeeting(meeting: { native_meeting_id: string; /* другие поля */ }) {
  const wsService = getWebSocketService()
  wsService.setCurrentMeetingId(meeting.native_meeting_id)
  // ... остальная логика выбора митинга ...
}
