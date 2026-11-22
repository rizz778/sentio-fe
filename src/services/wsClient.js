/**
 * wsClient.js — Gateway WebSocket Client
 * ========================================
 * Provides unified WebSocket connectivity to Sentio API Gateway (/ws/live).
 */

import { WS_GATEWAY_URL, API_ENDPOINTS } from "../config/api";

/**
 * Builds the full WebSocket URL for Sentio API Gateway /ws/live.
 *
 * @param {object} opts
 * @param {string} opts.sessionId
 * @param {string|string[]} [opts.modalities] - 'TEXT', 'AUDIO', or ['TEXT', 'AUDIO']
 * @param {string} [opts.token] - Optional Google auth token
 * @returns {string} ws://localhost:4000/ws/live?...
 */
export const getLiveWsUrl = ({ sessionId, modalities = "TEXT", token } = {}) => {
  const mods = Array.isArray(modalities) ? modalities.join(",") : modalities;
  const t = token || localStorage.getItem("token") || "";
  const params = new URLSearchParams();
  if (sessionId) params.append("sessionId", sessionId);
  if (mods) params.append("modalities", mods);
  if (t) params.append("token", t);
  return `${WS_GATEWAY_URL}${API_ENDPOINTS.WS_LIVE}?${params.toString()}`;
};

export const GEMINI_WS_TEXT_URL = `${WS_GATEWAY_URL}${API_ENDPOINTS.WS_LIVE}?modalities=TEXT`;
export const GEMINI_WS_FRAME_URL = `${WS_GATEWAY_URL}${API_ENDPOINTS.WS_LIVE}?modalities=TEXT`;
export const GEMINI_WS_AUDIO_URL = `${WS_GATEWAY_URL}${API_ENDPOINTS.WS_LIVE}?modalities=AUDIO`;

export class WSClient {
  constructor(url, { onOpen, onMessage, onClose, onError } = {}) {
    let targetUrl = url;
    if (
      typeof window !== "undefined" &&
      window.location.protocol === "https:" &&
      targetUrl.startsWith("ws://") &&
      !targetUrl.includes("localhost") &&
      !targetUrl.includes("127.0.0.1")
    ) {
      targetUrl = targetUrl.replace("ws://", "wss://");
    }
    this._ws = new WebSocket(targetUrl);
    this._ws.binaryType = "arraybuffer";

    this._ws.onopen = () => {
      onOpen?.();
    };

    this._ws.onmessage = (event) => {
      if (typeof event.data === "string") {
        try {
          const data = JSON.parse(event.data);
          onMessage?.(data);
        } catch (err) {
          console.error("[WSClient] Failed to parse message:", err, event.data);
        }
      } else {
        // Binary payload (e.g. PCM audio chunk from gateway)
        onMessage?.(event.data);
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

  get readyState() {
    return this._ws.readyState;
  }

  get isOpen() {
    return this._ws.readyState === WebSocket.OPEN;
  }

  send(payload) {
    if (!this.isOpen) return;

    if (
      payload instanceof ArrayBuffer ||
      payload instanceof Uint8Array ||
      payload instanceof Blob
    ) {
      this._ws.send(payload);
    } else if (typeof payload === "string") {
      this._ws.send(payload);
    } else {
      this._ws.send(JSON.stringify(payload));
    }
  }

  close() {
    try {
      this._ws.close();
    } catch (_) {}
  }
}

export const createWsClient = (url, callbacks) => new WSClient(url, callbacks);
