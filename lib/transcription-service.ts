import { MOCK_MODE } from "./config"
import { parseMeetingUrl } from "./utils"
import { 
  getWebSocketService, 
  convertWebSocketSegment,
  type TranscriptMutableEvent,
  type TranscriptFinalizedEvent,
  type MeetingStatusEvent 
} from "./websocket-service"

// Types for our transcription service
export interface TranscriptionSegment {
  id: string
  text: string
  timestamp: string
  speaker?: string
}

export interface TranscriptionData {
  meetingId: string
  language: string
  segments: TranscriptionSegment[]
  status: "active" | "stopped" | "error"
  lastUpdated: string
}

export interface Meeting {
  id: string
  platformId: string
  nativeMeetingId: string
  platform: string
  status: "active" | "stopped" | "error"
  startTime: string
  endTime?: string
  title?: string
}

// Mock data for meeting history
const mockMeetings: Meeting[] = [
  {
    id: "mock-meeting-1",
    platformId: "google_meet",
    nativeMeetingId: "abc-defg-hij",
    platform: "google_meet",
    status: "stopped",
    startTime: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    endTime: new Date(Date.now() - 83000000).toISOString(),
    title: "Product Team Standup"
  },
  {
    id: "mock-meeting-2",
    platformId: "google_meet",
    nativeMeetingId: "xyz-uvwt-rst",
    platform: "google_meet",
    status: "stopped",
    startTime: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
    endTime: new Date(Date.now() - 169200000).toISOString(),
    title: "Design Review"
  },
  {
    id: "mock-meeting-3",
    platformId: "google_meet",
    nativeMeetingId: "123-456-789",
    platform: "google_meet",
    status: "active",
    startTime: new Date().toISOString(),
    title: "Client Presentation"
  }
];

// Mock data for demonstration
const mockSegments: TranscriptionSegment[] = [
  {
    id: "segment-1",
    text: "Hello everyone, thanks for joining today's meeting.",
    timestamp: new Date(Date.now() - 60000).toISOString(),
    speaker: "John",
  },
  {
    id: "segment-2",
    text: "I wanted to discuss our progress on the new feature.",
    timestamp: new Date(Date.now() - 50000).toISOString(),
    speaker: "John",
  },
  {
    id: "segment-3",
    text: "The development team has completed the backend work.",
    timestamp: new Date(Date.now() - 40000).toISOString(),
    speaker: "Sarah",
  },
  {
    id: "segment-4",
    text: "We're still working on the frontend components.",
    timestamp: new Date(Date.now() - 30000).toISOString(),
    speaker: "Sarah",
  },
  {
    id: "segment-5",
    text: "When do you think we'll be ready for testing?",
    timestamp: new Date(Date.now() - 20000).toISOString(),
    speaker: "Michael",
  },
]

// Mock data storage
const mockTranscriptionData: Record<string, TranscriptionData> = {}

// Vexa API configuration - will be set dynamically based on user settings
let API_BASE_URL = "http://localhost:18056"

// Helper function to handle API responses
async function handleApiResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    
    // Specific handling for 409 conflict (existing bot)
    if (response.status === 409) {
      const error = new Error(`ExistingBotError: ${errorData.detail || "A bot is already running for this meeting"}`)
      error.name = "ExistingBotError"
      throw error
    }
    
    throw new Error(`API error: ${response.status} ${response.statusText} - ${errorData.detail || errorData.message || "Unknown error"}`)
  }
  return response.json()
}

// Function to get the API key - simplified approach
export function getApiKey(): string {
  try {
    // Only attempt to get from cookies on client side
    if (typeof window !== 'undefined') {
      // Direct approach to get a specific cookie
      const match = document.cookie.match(/(^|;)\s*vexa_api_key\s*=\s*([^;]+)/);
      const cookieValue = match ? decodeURIComponent(match[2]) : '';
      
      if (cookieValue) {
        console.log("Found API key in cookies");
        return cookieValue;
      }
    }
    
    // If we couldn't get from cookies, try environment variable
    const envKey = process.env.NEXT_PUBLIC_VEXA_API_KEY || '';
    return envKey;
  } catch (error) {
    console.error("Error getting API key:", error);
    return '';
  }
}

// Function to set the API key in cookies - simplified
export function setApiKey(key: string): void {
  try {
    if (typeof window !== 'undefined') {
      // Set a cookie that expires in 30 days
      const days = 30;
      const date = new Date();
      date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
      
      // Simplified cookie setting with no spaces
      document.cookie = `vexa_api_key=${encodeURIComponent(key)};expires=${date.toUTCString()};path=/`;
      
      // Immediately verify the cookie was set
      setTimeout(() => {
        const isSet = document.cookie.includes('vexa_api_key=');
        console.log(`API key cookie set: ${isSet}`);
      }, 10);
    }
  } catch (error) {
    console.error("Error setting API key:", error);
  }
}

// Function to clear the API key from cookies
export function clearApiKey(): void {
  try {
    if (typeof window !== 'undefined') {
      document.cookie = 'vexa_api_key=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
      console.log("API key cookie cleared");
    }
  } catch (error) {
    console.error("Error clearing API key:", error);
  }
}

// Function to set the API base URL in cookies
export function setApiBaseUrl(url: string): void {
  try {
    if (typeof window !== 'undefined') {
      const days = 30;
      const date = new Date();
      date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
      
      document.cookie = `vexa_api_base_url=${encodeURIComponent(url)};expires=${date.toUTCString()};path=/`;
      console.log("API base URL cookie set");
    }
  } catch (error) {
    console.error("Error setting API base URL:", error);
  }
}

// Function to get the API base URL from cookies
export function getApiBaseUrl(): string {
  try {
    if (typeof window !== 'undefined') {
      const match = document.cookie.match(/(^|;)\s*vexa_api_base_url\s*=\s*([^;]+)/);
      const cookieValue = match ? decodeURIComponent(match[2]) : '';
      
      if (cookieValue) {
        console.log("Found API base URL in cookies");
        return cookieValue;
      }
    }
    
    // If we couldn't get from cookies, try environment variable or use default
    const envUrl = process.env.NEXT_PUBLIC_VEXA_API_URL || 'http://localhost:18056';
    return envUrl;
  } catch (error) {
    console.error("Error getting API base URL:", error);
    return 'http://localhost:18056';
  }
}

// Function to set the WebSocket URL in cookies
export function setWebSocketUrl(url: string): void {
  try {
    if (typeof window !== 'undefined') {
      const days = 30;
      const date = new Date();
      date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
      
      document.cookie = `vexa_ws_url=${encodeURIComponent(url)};expires=${date.toUTCString()};path=/`;
      console.log("WebSocket URL cookie set");
    }
  } catch (error) {
    console.error("Error setting WebSocket URL:", error);
  }
}

// Function to get the WebSocket URL from cookies
export function getWebSocketUrl(): string {
  try {
    if (typeof window !== 'undefined') {
      const match = document.cookie.match(/(^|;)\s*vexa_ws_url\s*=\s*([^;]+)/);
      const cookieValue = match ? decodeURIComponent(match[2]) : '';
      
      if (cookieValue) {
        console.log("Found WebSocket URL in cookies");
        return cookieValue;
      }
    }
    
    // If we couldn't get from cookies, try environment variable or use default
    const envUrl = process.env.NEXT_PUBLIC_VEXA_WS_URL || 'ws://localhost:18056/ws';
    return envUrl;
  } catch (error) {
    console.error("Error getting WebSocket URL:", error);
    return 'ws://localhost:18056/ws';
  }
}

// Function to get headers with Vexa API key - with extra logging
function getHeaders() {
  // Get the API key and base URL
  const apiKey = getApiKey();
  const baseUrl = getApiBaseUrl();
  
  // Update the global API_BASE_URL
  API_BASE_URL = baseUrl;
  
  // Add extensive logging
  console.log("Building API headers");
  console.log("Has API key:", !!apiKey);
  console.log("API Base URL:", baseUrl);
  if (apiKey) {
    // Only log part of the key for security
    console.log("API key starts with:", apiKey.substring(0, 4));
  }
  
  // Create headers with mandatory fields
  const headers = {
    "Content-Type": "application/json",
    "X-API-Key": apiKey
  };
  
  // Log what's being sent
  console.log("Headers being sent:", JSON.stringify(headers));
  
  return headers;
}

/**
 * Start a new transcription session by adding a bot to a meeting
 * @param meetingUrl The URL of the meeting to transcribe
 * @param language The language code (e.g., 'en', 'es'), or 'auto' for auto-detection
 * @param botName Optional name for the bot that will appear in the meeting
 */
export async function startTranscription(
  meetingUrl: string,
  language = "auto",
  botName = "Vexa",
): Promise<{ success: boolean; meetingId: string }> {
  // Use mock implementation if in mock mode
  if (MOCK_MODE) {
    await new Promise((resolve) => setTimeout(resolve, 1000)) // Simulate API delay

    const meetingId = `mock-meeting-${Date.now()}`

    // Initialize mock transcription data
    mockTranscriptionData[meetingId] = {
      meetingId,
      language: language === "auto" ? "auto-detected" : language,
      segments: [...mockSegments], // Copy initial mock segments
      status: "active",
      lastUpdated: new Date().toISOString(),
    }

    return {
      success: true,
      meetingId,
    }
  }

  // Real API implementation using Vexa API
  try {
    // Parse the meeting URL to get platform and native meeting ID
    const { platform, nativeMeetingId } = parseMeetingUrl(meetingUrl)
    
    // Build request payload for /bots endpoint
    const requestPayload: {
      platform: string;
      native_meeting_id: string;
      language?: string;
      bot_name: string;
    } = {
      platform,
      native_meeting_id: nativeMeetingId,
      bot_name: botName
    }
    
    // Only include language if it's not set to auto (to enable auto-detection)
    if (language !== "auto") {
      requestPayload.language = language;
    }

    const response = await fetch(`${API_BASE_URL}/bots`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(requestPayload),
    })

    await handleApiResponse<any>(response)

    return {
      success: true,
      meetingId: `${platform}/${nativeMeetingId}`, // We're storing the full ID that we need for future calls
    }
  } catch (error) {
    console.error("Error starting transcription:", error)
    throw error
  }
}

/**
 * Stop an active transcription session
 * @param meetingId The ID of the meeting to stop transcribing
 */
export async function stopTranscription(meetingId: string): Promise<{ success: boolean }> {
  // Use mock implementation if in mock mode
  if (MOCK_MODE) {
    await new Promise((resolve) => setTimeout(resolve, 1000)) // Simulate API delay

    // Update mock data status
    if (mockTranscriptionData[meetingId]) {
      mockTranscriptionData[meetingId].status = "stopped"
    }

    return {
      success: true,
    }
  }

  // Real API implementation using Vexa API
  try {
    // The meetingId should be in the format "platform/nativeMeetingId"
    const parts = meetingId.split('/');
    if (parts.length < 2) {
      throw new Error("Invalid meeting ID format")
    }
    
    const platform = parts[0];
    const nativeMeetingId = parts[1];

    const response = await fetch(`${API_BASE_URL}/bots/${platform}/${nativeMeetingId}`, {
      method: "DELETE",
      headers: getHeaders(),
    })

    await handleApiResponse<any>(response)

    return {
      success: true,
    }
  } catch (error) {
    console.error("Error stopping transcription:", error)
    throw error
  }
}

/**
 * Update the language configuration for an ongoing transcription session
 * @param meetingId The ID of the meeting to update
 * @param language The new language code (e.g., 'en', 'es', 'fr', 'de', etc.)
 */
export async function updateTranscriptionLanguage(meetingId: string, language: string): Promise<{ success: boolean }> {
  // Use mock implementation if in mock mode
  if (MOCK_MODE) {
    await new Promise((resolve) => setTimeout(resolve, 1000)) // Simulate API delay

    // Update mock data language
    if (mockTranscriptionData[meetingId]) {
      mockTranscriptionData[meetingId].language = language;
    }

    return {
      success: true,
    }
  }

  // Real API implementation using Vexa API
  try {
    // The meetingId should be in the format "platform/nativeMeetingId"
    const parts = meetingId.split('/');
    if (parts.length < 2) {
      throw new Error("Invalid meeting ID format")
    }
    
    const platform = parts[0];
    const nativeMeetingId = parts[1];

    const updateConfigUrl = `${API_BASE_URL}/bots/${platform}/${nativeMeetingId}/config`;
    const updatePayload = {
      language: language
    };

    const response = await fetch(updateConfigUrl, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify(updatePayload),
    });

    await handleApiResponse<any>(response);

    return {
      success: true,
    }
  } catch (error) {
    console.error("Error updating transcription language:", error)
    throw error
  }
}

/**
 * Get the current transcription data for a meeting
 * @param meetingId The ID of the meeting
 */
export async function getTranscription(meetingId: string): Promise<TranscriptionData> {
  // Use mock implementation if in mock mode
  if (MOCK_MODE) {
    await new Promise((resolve) => setTimeout(resolve, 500)) // Simulate API delay

    // If this meeting doesn't exist in our mock data, create it
    if (!mockTranscriptionData[meetingId]) {
      mockTranscriptionData[meetingId] = {
        meetingId,
        language: "en",
        segments: [...mockSegments], // Copy initial mock segments
        status: "active",
        lastUpdated: new Date().toISOString(),
      }
    }

    // Add a new segment occasionally to simulate real-time updates
    if (Math.random() > 0.5 && mockTranscriptionData[meetingId].status === "active") {
      const newSegment = {
        id: `segment-${Date.now()}`,
        text: `This is a new transcription segment generated at ${new Date().toLocaleTimeString()}.`,
        timestamp: new Date().toISOString(),
        speaker: Math.random() > 0.5 ? "John" : Math.random() > 0.5 ? "Sarah" : "Michael",
      }

      mockTranscriptionData[meetingId].segments.push(newSegment)
      mockTranscriptionData[meetingId].lastUpdated = new Date().toISOString()
    }

    return { ...mockTranscriptionData[meetingId] }
  }

  // Real API implementation using Vexa API
  try {
    console.log("getTranscription called with meetingId:", meetingId);
    
    // The meetingId can be in format "platform/nativeMeetingId" or "platform/nativeMeetingId/id"
    const parts = meetingId.split('/');
    if (parts.length < 2) {
      throw new Error("Invalid meeting ID format")
    }
    
    const platform = parts[0];
    const nativeMeetingId = parts[1];
    
    console.log(`Fetching transcript for platform=${platform}, nativeMeetingId=${nativeMeetingId}`);

    const response = await fetch(`${API_BASE_URL}/transcripts/${platform}/${nativeMeetingId}`, {
      method: "GET",
      headers: getHeaders(),
    })

    console.log("Transcript API response status:", response.status);
    
    const data = await handleApiResponse<any>(response)
    console.log("Transcript API data received:", JSON.stringify(data).substring(0, 200) + "...");
    
    // Check if data contains segments directly
    if (!data.segments && !data.transcript) {
      console.error("API response missing segments data:", data);
      throw new Error("API response missing segments data");
    }

    // Get segments from the correct location in the response
    const segments = data.segments || (data.transcript ? data.transcript.segments : []) || [];
    console.log(`Found ${segments.length} segments in API response`);

    // Transform the Vexa API response into our TranscriptionData format
    return {
      meetingId,
      language: data.language || "en",
      segments: segments.map((segment: any) => {
        // Create a deterministic ID based on the text and timestamp
        // This ensures we can properly detect duplicates
        const segmentText = segment.text || "";
        const timestamp = segment.absolute_start_time || segment.timestamp || new Date().toISOString();
        const stableId = `${timestamp}-${segmentText.slice(0, 20).replace(/\s+/g, '-')}`;
        
        return {
          id: stableId,
          text: segmentText,
          timestamp: timestamp,
          speaker: segment.speaker || "Unknown",
        };
      }),
      status: data.status || "active",
      lastUpdated: new Date().toISOString(),
    }
  } catch (error) {
    console.error("Error getting transcription:", error)
    throw error
  }
}

/**
 * Get the full transcript for a meeting (all segments combined)
 * @param meetingId The ID of the meeting
 */
export async function getFullTranscript(
  meetingId: string,
): Promise<{ text: string; segments: TranscriptionSegment[] }> {
  // Use mock implementation if in mock mode
  if (MOCK_MODE) {
    await new Promise((resolve) => setTimeout(resolve, 800)) // Simulate API delay

    // If this meeting doesn't exist in our mock data, return empty
    if (!mockTranscriptionData[meetingId]) {
      return {
        text: "",
        segments: [],
      }
    }

    // Combine all segment texts
    const text = mockTranscriptionData[meetingId].segments.map((segment) => segment.text).join(" ")

    return {
      text,
      segments: [...mockTranscriptionData[meetingId].segments],
    }
  }

  // Real API implementation using Vexa API
  try {
    // The meetingId should be in the format "platform/nativeMeetingId/id"
    const parts = meetingId.split('/');
    if (parts.length < 2) {
      throw new Error("Invalid meeting ID format")
    }
    
    const platform = parts[0];
    const nativeMeetingId = parts[1];

    // Get the latest transcript data
    const transcriptionData = await getTranscription(meetingId)
    
    // Combine all segment texts
    const text = transcriptionData.segments.map(segment => segment.text).join(" ")

    return {
      text,
      segments: transcriptionData.segments,
    }
  } catch (error) {
    console.error("Error getting full transcript:", error)
    throw error
  }
}

/**
 * Get a list of all meetings
 */
export async function getMeetingHistory(): Promise<Meeting[]> {
  // Use mock implementation if in mock mode
  if (MOCK_MODE) {
    await new Promise((resolve) => setTimeout(resolve, 800)) // Simulate API delay
    return [...mockMeetings]
  }

  // Real API implementation using Vexa API
  try {
    const response = await fetch(`${API_BASE_URL}/meetings`, {
      method: "GET",
      headers: getHeaders(),
    })

    const data = await handleApiResponse<any>(response)

    // Transform the API response to our Meeting interface
    return data.meetings.map((meeting: any) => ({
      id: `${meeting.platform}/${meeting.native_meeting_id}/${meeting.id}`,
      platformId: meeting.platform,
      nativeMeetingId: meeting.native_meeting_id,
      platform: meeting.platform,
      status: meeting.status || "stopped",
      startTime: meeting.start_time || new Date().toISOString(),
      endTime: meeting.end_time,
      title: `Meeting ${meeting.native_meeting_id}`
    }));
  } catch (error) {
    console.error("Error getting meeting history:", error)
    throw error
  }
}

/**
 * Start WebSocket connection for real-time transcription updates
 * @param meetingId The internal meeting ID (number) to subscribe to
 * @param onTranscriptMutable Callback for mutable transcript updates
 * @param onTranscriptFinalized Callback for finalized transcript updates
 * @param onMeetingStatus Callback for meeting status changes
 * @param onError Callback for errors
 * @param onConnected Callback when WebSocket connects
 * @param onDisconnected Callback when WebSocket disconnects
 */
export async function startWebSocketTranscription(
  meetingId: number,
  onTranscriptMutable: (segments: TranscriptionSegment[]) => void,
  onTranscriptFinalized: (segments: TranscriptionSegment[]) => void,
  onMeetingStatus: (status: string) => void,
  onError: (error: string) => void,
  onConnected: () => void,
  onDisconnected: () => void
): Promise<void> {
  const wsService = getWebSocketService()

  // Set up event handlers
  wsService.setOnTranscriptMutable((event: TranscriptMutableEvent) => {
    const segments = event.payload.segments.map(segment => 
      convertWebSocketSegment(segment, meetingId.toString())
    )
    onTranscriptMutable(segments)
  })

  wsService.setOnTranscriptFinalized((event: TranscriptFinalizedEvent) => {
    const segments = event.payload.segments.map(segment => 
      convertWebSocketSegment(segment, meetingId.toString())
    )
    onTranscriptFinalized(segments)
  })

  wsService.setOnMeetingStatus((event: MeetingStatusEvent) => {
    onMeetingStatus(event.payload.status)
  })

  wsService.setOnError((event) => {
    onError(event.payload.error)
  })

  wsService.setOnConnected(onConnected)
  wsService.setOnDisconnected(onDisconnected)

  // Connect and subscribe
  await wsService.connect()
  await wsService.subscribeToMeeting(meetingId)
}

/**
 * Stop WebSocket connection for a meeting
 * @param meetingId The internal meeting ID to unsubscribe from
 */
export async function stopWebSocketTranscription(meetingId: number): Promise<void> {
  const wsService = getWebSocketService()
  
  if (wsService.isConnected()) {
    await wsService.unsubscribeFromMeeting(meetingId)
  }
  
  // If no more meetings are subscribed, disconnect
  const subscribedMeetings = wsService.getSubscribedMeetings()
  if (subscribedMeetings.length === 0) {
    wsService.disconnect()
  }
}

/**
 * Get WebSocket connection status
 */
export function getWebSocketStatus(): { connected: boolean; subscribedMeetings: number[] } {
  const wsService = getWebSocketService()
  return {
    connected: wsService.isConnected(),
    subscribedMeetings: wsService.getSubscribedMeetings()
  }
}

/**
 * Get a specific meeting's transcript without polling (for history view)
 * @param meetingId The ID of the meeting to get the transcript for
 */
export async function getMeetingTranscript(meetingId: string): Promise<TranscriptionData> {
  // This is similar to getTranscription but without adding new simulated segments in mock mode
  
  // Use mock implementation if in mock mode
  if (MOCK_MODE) {
    await new Promise((resolve) => setTimeout(resolve, 800)) // Simulate API delay

    // If this meeting doesn't exist in our mock data, create it with mock segments
    if (!mockTranscriptionData[meetingId]) {
      // Find the mock meeting by ID
      const mockMeeting = mockMeetings.find(m => m.id === meetingId);
      
      if (mockMeeting) {
        // Create mock transcript for this meeting
        mockTranscriptionData[meetingId] = {
          meetingId,
          language: "en",
          segments: [...mockSegments], // Use the mock segments
          status: mockMeeting.status,
          lastUpdated: mockMeeting.endTime || new Date().toISOString(),
        }
      } else {
        // Create a generic mock transcript if meeting not found
        mockTranscriptionData[meetingId] = {
          meetingId,
          language: "en",
          segments: [...mockSegments],
          status: "stopped",
          lastUpdated: new Date().toISOString(),
        }
      }
    }

    return { ...mockTranscriptionData[meetingId] }
  }

  // Real API implementation using Vexa API
  try {
    console.log("getMeetingTranscript called with meetingId:", meetingId);
    
    // Check if the meetingId is already in the format "platform/nativeMeetingId" or "platform/nativeMeetingId/id"
    let platform, nativeMeetingId;
    
    const parts = meetingId.split('/');
    if (parts.length >= 2) {
      platform = parts[0];
      nativeMeetingId = parts[1];
      console.log(`Using platform=${platform}, nativeMeetingId=${nativeMeetingId} from meetingId`);
    } else {
      // Try to fetch meeting details to get platform and nativeMeetingId
      console.log("Invalid meeting ID format, trying to fetch meeting details");
      const meetings = await getMeetingHistory();
      const meeting = meetings.find(m => m.id === meetingId);
      
      if (meeting) {
        platform = meeting.platform;
        nativeMeetingId = meeting.nativeMeetingId;
        console.log(`Found meeting in history, using platform=${platform}, nativeMeetingId=${nativeMeetingId}`);
      } else {
        throw new Error("Meeting not found")
      }
    }
    
    if (!platform || !nativeMeetingId) {
      throw new Error("Invalid meeting ID format")
    }

    console.log(`Fetching transcript for platform=${platform}, nativeMeetingId=${nativeMeetingId}`);
    const response = await fetch(`${API_BASE_URL}/transcripts/${platform}/${nativeMeetingId}`, {
      method: "GET",
      headers: getHeaders(),
    })

    console.log("Transcript API response status:", response.status);
    const data = await handleApiResponse<any>(response)
    console.log("Transcript API data received:", JSON.stringify(data).substring(0, 200) + "...");

    // Check if data contains segments directly
    if (!data.segments && !data.transcript) {
      console.error("API response missing segments data:", data);
      throw new Error("API response missing segments data");
    }

    // Get segments from the correct location in the response
    const segments = data.segments || (data.transcript ? data.transcript.segments : []) || [];
    console.log(`Found ${segments.length} segments in API response`);

    // Transform the Vexa API response into our TranscriptionData format
    return {
      meetingId,
      language: data.language || "en",
      segments: segments.map((segment: any) => {
        // Create a deterministic ID based on the text and timestamp
        // This ensures we can properly detect duplicates
        const segmentText = segment.text || "";
        const timestamp = segment.absolute_start_time || segment.timestamp || new Date().toISOString();
        const stableId = `${timestamp}-${segmentText.slice(0, 20).replace(/\s+/g, '-')}`;
        
        return {
          id: stableId,
          text: segmentText,
          timestamp: timestamp,
          speaker: segment.speaker || "Unknown",
        };
      }) || [],
      status: "stopped", // Historical view always shows as stopped
      lastUpdated: new Date().toISOString(),
    }
  } catch (error) {
    console.error("Error getting meeting transcript:", error)
    throw error
  }
}
