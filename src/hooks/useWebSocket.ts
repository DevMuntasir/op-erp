import { useEffect, useRef, useCallback } from 'react';
import { getAuth } from 'firebase/auth';

interface WebSocketEvent {
  type: 'message:new' | 'message:read' | 'presence:online' | 'presence:offline' | 'typing:start' | 'typing:stop';
  [key: string]: any;
}

interface UseWebSocketOptions {
  onMessageNew?: (event: any) => void;
  onMessageRead?: (event: any) => void;
  onPresenceChange?: (event: any) => void;
  onTyping?: (event: any) => void;
  onError?: (error: Error) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

// Vite env vars: VITE_WS_ENABLED, VITE_WS_URL
const WS_ENABLED = import.meta.env.VITE_WS_ENABLED !== 'false';
const WS_BASE_URL = import.meta.env.VITE_WS_URL || 'wss://op-media-backend.vercel.app';

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const isIntentionallyClosedRef = useRef(false);
  const isConnectingRef = useRef(false);
  const callbacksRef = useRef(options);

  // Update callbacks ref on every render so they're always current
  useEffect(() => {
    callbacksRef.current = options;
  }, [options]);

  const connect = useCallback(async () => {
    if (!WS_ENABLED) {
      console.log('[WebSocket] Disabled via REACT_APP_WS_ENABLED=false');
      return;
    }

    if (isConnectingRef.current) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    if (isIntentionallyClosedRef.current) return;

    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;

      if (!currentUser) {
        // Silently wait for auth, don't log spam
        setTimeout(() => connect(), 3000);
        return;
      }

      try {
        const token = await currentUser.getIdToken();

        if (!token) {
          console.warn('[WebSocket] No Firebase token available');
          return;
        }

        isConnectingRef.current = true;
        const wsUrl = `${WS_BASE_URL}/ws?token=${encodeURIComponent(token)}`;
        const ws = new WebSocket(wsUrl);

        const connectTimeout = setTimeout(() => {
          if (ws.readyState === WebSocket.CONNECTING) {
            console.warn('[WebSocket] Connection timeout');
            ws.close();
            isConnectingRef.current = false;
          }
        }, 5000);

        ws.onopen = () => {
          clearTimeout(connectTimeout);
          console.log('[WebSocket] Connected');
          isConnectingRef.current = false;
          reconnectAttemptsRef.current = 0;
          callbacksRef.current.onConnect?.();
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data) as WebSocketEvent;
            console.log('[WebSocket] Received event:', data.type, data);

            switch (data.type) {
              case 'message:new':
                console.log('[WebSocket] Dispatching onMessageNew');
                callbacksRef.current.onMessageNew?.(data);
                break;
              case 'message:read':
                callbacksRef.current.onMessageRead?.(data);
                break;
              case 'presence:online':
              case 'presence:offline':
                callbacksRef.current.onPresenceChange?.(data);
                break;
              case 'typing:start':
              case 'typing:stop':
                callbacksRef.current.onTyping?.(data);
                break;
            }
          } catch (error) {
            console.error('[WebSocket] Parse error:', error);
          }
        };

        ws.onerror = (event) => {
          clearTimeout(connectTimeout);
          isConnectingRef.current = false;
          console.warn('[WebSocket] Connection failed (using REST API fallback)');
          const error = event instanceof Event ? new Error('WebSocket unavailable') : (event as any);
          callbacksRef.current.onError?.(error);
        };

        ws.onclose = () => {
          clearTimeout(connectTimeout);
          isConnectingRef.current = false;
          console.log('[WebSocket] Closed');
          callbacksRef.current.onDisconnect?.();

          // Stop retrying if WebSocket is explicitly not available
          if (!isIntentionallyClosedRef.current && reconnectAttemptsRef.current < 2) {
            const delay = 5000 + (reconnectAttemptsRef.current * 5000);
            reconnectTimeoutRef.current = setTimeout(() => {
              reconnectAttemptsRef.current += 1;
              connect();
            }, delay);
          }
        };

        wsRef.current = ws;
      } catch (tokenError) {
        isConnectingRef.current = false;
        console.warn('[WebSocket] Failed to get token:', tokenError);
      }
    } catch (error) {
      isConnectingRef.current = false;
      console.error('[WebSocket] Connection error:', error);
    }
  }, []); // Empty deps: connect is now stable, uses callbacksRef for callbacks

  const disconnect = useCallback(() => {
    isIntentionallyClosedRef.current = true;
    isConnectingRef.current = false;
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const send = useCallback((event: Record<string, any>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(event));
    } else {
      console.debug('[WebSocket] Not connected, message not sent');
    }
  }, []);

  const sendTyping = useCallback((conversationId: string, isTyping: boolean) => {
    send({ type: 'typing', conversationId, isTyping });
  }, [send]);

  useEffect(() => {
    isIntentionallyClosedRef.current = false;
    // Start connection attempt but don't wait - allow component to render
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected: wsRef.current?.readyState === WebSocket.OPEN,
    send,
    sendTyping,
    disconnect,
  };
}
