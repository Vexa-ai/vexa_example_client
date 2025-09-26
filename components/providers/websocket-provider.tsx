'use client';

import { useEffect } from 'react';
import { getWebSocketService } from '@/lib/websocket-service';

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Initialize WebSocket connection when the component mounts
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

  return <>{children}</>;
}
