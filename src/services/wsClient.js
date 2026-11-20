

// ── WebSocket URL constants ───────────────────────────────────────────────────
export const GEMINI_WS_TEXT_URL =
  import.meta.env.VITE_GEMINI_WS_TEXT_URL || "ws://localhost:8000/text";

export const GEMINI_WS_FRAME_URL =
  import.meta.env.VITE_GEMINI_WS_FRAME_URL || "ws://localhost:8000/frame";

// ── WSClient class ────────────────────────────────────────────────────────────
export class WSClient {
  /**
   * @param {string} url        - Full WebSocket endpoint (ws:// or wss://)
   * @param {object} callbacks
   * @param {Function} [callbacks.onOpen]    - Called when the connection opens
   * @param {Function} [callbacks.onMessage] - Called with the parsed JSON payload
   * @param {Function} [callbacks.onClose]   - Called when the socket closes
   * @param {Function} [callbacks.onError]   - Called on socket error
   */
  constructor(url, { onOpen, onMessage, onClose, onError } = {}) {
    this._ws = new WebSocket(url);

    this._ws.onopen = () => {
      onOpen?.();
    };

    this._ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage?.(data);
      } catch (err) {
        console.error("[WSClient] Failed to parse message:", err);
      }
    };

    this._ws.onclose = (event) => {
      onClose?.(event);
    };

    this._ws.onerror = (err) => {
      console.error("[WSClient] Error:", err);
      onError?.(err);
    };
  }

  /** Current readyState of the underlying socket */
  get readyState() {
    return this._ws.readyState;
  }

  /** True when the socket is fully open and ready to send */
  get isOpen() {
    return this._ws.readyState === WebSocket.OPEN;
  }

  /**
   * Serialise payload as JSON and send it.
   * Silently drops the call if the socket is not open.
   * @param {object} payload
   */
  send(payload) {
    if (this.isOpen) {
      this._ws.send(JSON.stringify(payload));
    }
  }

  /** Close the socket cleanly */
  close() {
    this._ws.close();
  }
}

/**
 * Convenience factory — returns a WSClient instance.
 * Equivalent to `new WSClient(url, callbacks)`.
 */
export const createWsClient = (url, callbacks) => new WSClient(url, callbacks);
