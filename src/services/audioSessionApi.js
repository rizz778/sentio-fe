/**
 * audioSessionApi.js — Feature API: Audio Session Configuration
 * ===============================================================
 * Provides WebSocket endpoint helpers for live audio sessions through Gateway.
 * Note: Voice parameters, model configuration, user profile context, conversation
 * history, and turn persistence are owned and orchestrated by the backend.
 */

import { getLiveWsUrl, GEMINI_WS_AUDIO_URL } from "./wsClient";

export { getLiveWsUrl, GEMINI_WS_AUDIO_URL };
