/**
 * audioConfig.js — Audio session constants
 * ==========================================
 * All magic numbers and model names for the Gemini audio session
 * in one place so they are easy to tune without hunting through component code.
 */

import { WS_GATEWAY_URL } from "../config/api";

// WebSocket endpoint for the Sentio live audio bridge via Gateway
export const GEMINI_WS_AUDIO_URL =
  import.meta.env.VITE_GEMINI_WS_AUDIO_URL ||
  `${WS_GATEWAY_URL}/ws/live?modalities=AUDIO`;

// Gemini model used for native audio (voice) sessions
export const GEMINI_AUDIO_MODEL =
  "models/gemini-2.5-flash-native-audio-preview-12-2025";

// Default TTS voice
export const GEMINI_AUDIO_VOICE = "Puck";

/**
 * Web Audio playback configuration.
 * Tuned for minimum latency streaming (start playing after the first chunk).
 */
export const AUDIO_CONFIG = {
  sampleRate:        24000, // Output sample rate (Gemini returns 24kHz PCM)
  bufferSize:        12288,
  minBufferChunks:   1,     // Start playback immediately on first chunk
  maxBufferChunks:   20,
  crossfadeDuration: 0.01,
  lookAheadTime:     0.02,
  targetLatency:     0.02,
  underrunPause:     30,
  fadeInDuration:    0.005,
  fadeOutDuration:   0.005,
  chunkTimeout:      3000,
};

/**
 * Microphone capture configuration.
 * 16kHz mono is what the Gemini audio bridge expects.
 */
export const MIC_CONFIG = {
  audio: {
    sampleRate:       16000,
    channelCount:     1,
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl:  true,
    latency:          0.01,
  },
};
