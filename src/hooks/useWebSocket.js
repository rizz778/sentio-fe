/**
 * useWebSocket.js — Generic WebSocket lifecycle hook
 * ====================================================
 * Encapsulates the full open → send → receive → close lifecycle of a
 * WebSocket connection so any component or feature hook can use a WS
 * without duplicating setup/teardown boilerplate.
 *
 * The hook:
 *  1. Opens a WSClient on mount (or when `url` / `enabled` changes)
 *  2. Calls `onMessage` for each parsed JSON frame
 *  3. Closes the socket cleanly on unmount or when `enabled` goes false
 *  4. Exposes `send()`, `close()`, and `isConnected` to the caller
 *
 * @example
 *   const { send, isConnected } = useWebSocket(GEMINI_WS_TEXT_URL, {
 *     enabled: !!activeSession,
 *     onOpen:    () => send(setupPayload),
 *     onMessage: (data) => dispatch(data),
 *   });
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { createWsClient } from "../services/wsClient";

/**
 * @param {string}  url                - WebSocket endpoint
 * @param {object}  opts
 * @param {boolean} [opts.enabled]     - Connect only when true (default true)
 * @param {Function} [opts.onOpen]     - Called when socket opens
 * @param {Function} [opts.onMessage]  - Called with the parsed JSON frame
 * @param {Function} [opts.onClose]    - Called when socket closes
 * @param {Function} [opts.onError]    - Called on socket error
 * @returns {{ send, close, isConnected, connectionStatus }}
 */
export const useWebSocket = (url, { enabled = true, onOpen, onMessage, onClose, onError } = {}) => {
  const [isConnected, setIsConnected]         = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("Disconnected");
  const wsRef = useRef(null); // Holds the WSClient instance

  const send = useCallback((payload) => {
    wsRef.current?.send(payload);
  }, []);

  const close = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
  }, []);

  useEffect(() => {
    if (!enabled || !url) return;

    // Open a new WSClient connection
    wsRef.current = createWsClient(url, {
      onOpen: () => {
        setIsConnected(true);
        setConnectionStatus("Connected");
        onOpen?.();
      },
      onMessage: (data) => {
        onMessage?.(data);
      },
      onClose: (event) => {
        setIsConnected(false);
        setConnectionStatus("Disconnected");
        onClose?.(event);
      },
      onError: (err) => {
        onError?.(err);
      },
    });

    // Cleanup: close the socket when the component unmounts or deps change
    return () => {
      wsRef.current?.close();
      wsRef.current = null;
    };
    // Re-connect only when url or enabled changes.
    // Callers pass stable callbacks (wrapped in useCallback) to avoid churn.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, enabled]);

  return { send, close, isConnected, connectionStatus };
};
