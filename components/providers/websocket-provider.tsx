'use client';

import { useEffect } from 'react';
import { getWebSocketService } from '@/lib/websocket-service';

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Add a small delay before initializing WebSocket connection
    const connectTimer = setTimeout(() => {
      const wsService = getWebSocketService();
      
      // Connect to WebSocket
      wsService.connect().catch(error => {
        console.error('Failed to connect to WebSocket:', error);
      });
    }, 2000); // 2 seconds delay

    // Cleanup function to disconnect when the component unmounts
    return () => {
      clearTimeout(connectTimer);
      const wsService = getWebSocketService();
      wsService.disconnect();
    };
  }, []);

  return <>{children}</>;
}
