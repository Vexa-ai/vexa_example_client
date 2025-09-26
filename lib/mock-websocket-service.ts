// Simple unique ID generator
const generateId = () => Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
import { convertWebSocketSegment } from './websocket-service';
import { TranscriptMutableEvent, TranscriptFinalizedEvent, MeetingStatusEvent } from './websocket-service';

export class MockWebSocketService {
  private intervalId: NodeJS.Timeout | null = null;
  private onTranscriptMutable?: (event: TranscriptMutableEvent) => void;
  private onTranscriptFinalized?: (event: TranscriptFinalizedEvent) => void;
  private onMeetingStatus?: (event: MeetingStatusEvent) => void;
  private onError?: (error: any) => void;
  private onConnected?: () => void;
  private onDisconnected?: () => void;
  private isConnected = false;
  private meetingId: number | null = null;

  // Mock data for transcription
  private mockSegments = [
    "Hello, welcome to our meeting.",
    "Today we'll discuss the project updates.",
    "The development is progressing well.",
    "We've completed the authentication flow.",
    "Next, we'll work on the dashboard.",
    "Any questions so far?"
  ];

  setOnTranscriptMutable(handler: (event: TranscriptMutableEvent) => void) {
    this.onTranscriptMutable = handler;
  }

  setOnTranscriptFinalized(handler: (event: TranscriptFinalizedEvent) => void) {
    this.onTranscriptFinalized = handler;
  }

  setOnMeetingStatus(handler: (event: MeetingStatusEvent) => void) {
    this.onMeetingStatus = handler;
  }

  setOnError(handler: (error: any) => void) {
    this.onError = handler;
  }

  setOnConnected(handler: () => void) {
    this.onConnected = handler;
  }

  setOnDisconnected(handler: () => void) {
    this.onDisconnected = handler;
  }

  async connect(): Promise<void> {
    if (this.isConnected) return;
    
    // Simulate connection delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    this.isConnected = true;
    this.onConnected?.();
    this.onMeetingStatus?.({
      type: 'meeting.status',
      meeting: { id: this.meetingId || 0 },
      payload: { status: 'connected' },
      ts: new Date().toISOString()
    });
  }

  disconnect(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isConnected = false;
    this.onDisconnected?.();
  }

  async subscribeToMeeting(meetingId: number): Promise<void> {
    this.meetingId = meetingId;
    
    if (!this.isConnected) {
      await this.connect();
    }

    // Start sending mock transcription updates
    let segmentIndex = 0;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

    this.intervalId = setInterval(() => {
      if (segmentIndex >= this.mockSegments.length) {
        if (this.intervalId) {
          clearInterval(this.intervalId);
          this.intervalId = null;
        }
        return;
      }

      const text = this.mockSegments[segmentIndex];
      const now = new Date();
      
      // Create a mutable transcript event
      const mutableEvent: TranscriptMutableEvent = {
        type: 'transcript.mutable',
        meeting: { id: meetingId },
        payload: {
          segments: [{
            start: 0,
            end_time: segmentIndex + 1,
            text: text,
            language: 'en',
            speaker: `speaker-${(segmentIndex % 2) + 1}`,
            session_uid: generateId(),
            speaker_mapping_status: 'mapped',
            updated_at: now.toISOString()
          }]
        },
        ts: now.toISOString()
      };

      // Create a finalized transcript event (slightly delayed)
      const finalizedEvent: TranscriptFinalizedEvent = {
        type: 'transcript.finalized',
        meeting: { id: meetingId },
        payload: {
          segments: [{
            start: 0,
            end: segmentIndex + 1,
            text: text,
            language: 'en',
            speaker: `speaker-${(segmentIndex % 2) + 1}`,
            session_uid: generateId()
          }]
        },
        ts: now.toISOString()
      };

      // Emit events
      this.onTranscriptMutable?.(mutableEvent);
      
      // Finalize the segment after a short delay
      setTimeout(() => {
        this.onTranscriptFinalized?.(finalizedEvent);
      }, 500);

      segmentIndex++;
    }, 3000); // Send a new segment every 3 seconds
  }

  async unsubscribeFromMeeting(meetingId: number): Promise<void> {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  isConnectedToMeeting(meetingId: number): boolean {
    return this.isConnected && this.meetingId === meetingId;
  }

  getSubscribedMeetings(): number[] {
    return this.meetingId ? [this.meetingId] : [];
  }
}

// Singleton instance
let mockWsServiceInstance: MockWebSocketService | null = null;

export const getMockWebSocketService = (): MockWebSocketService => {
  if (!mockWsServiceInstance) {
    mockWsServiceInstance = new MockWebSocketService();
  }
  return mockWsServiceInstance;
};
