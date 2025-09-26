import { useEffect, useCallback } from 'react';
import { getWebSocketService } from '../lib/websocket-service';

export function useWebSocket() {
  // Initialize WebSocket connection when the component mounts
  useEffect(() => {
    const wsService = getWebSocketService();
    
    // Connect to WebSocket
    wsService.connect().catch(error => {
      console.error('Failed to connect to WebSocket:', error);
    });

    // Cleanup function to disconnect when the component unmounts
    return () => {
      wsService.disconnect();
    };
  }, []);

  // Helper function to subscribe to meeting updates
  const subscribeToMeeting = useCallback(async (meetingId: number) => {
    const wsService = getWebSocketService();
    try {
      await wsService.subscribeToMeeting(meetingId);
      return true;
    } catch (error) {
      console.error('Failed to subscribe to meeting:', error);
      return false;
    }
  }, []);

  // Helper function to unsubscribe from meeting updates
  const unsubscribeFromMeeting = useCallback(async (meetingId: number) => {
    const wsService = getWebSocketService();
    try {
      await wsService.unsubscribeFromMeeting(meetingId);
      return true;
    } catch (error) {
      console.error('Failed to unsubscribe from meeting:', error);
      return false;
    }
  }, []);

  return {
    subscribeToMeeting,
    unsubscribeFromMeeting,
  };
}
