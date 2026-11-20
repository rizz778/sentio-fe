/**
 * audioSessionApi.js — Feature API: Gemini Audio Session
 * ========================================================
 * HTTP + WebSocket calls specific to the audio session flow.
 * Uses nodeClient from apiClient.js for message saving.
 * The WS connection itself is managed by useAudioSession hook.
 */

import { nodeClient } from "./apiClient";
import { GEMINI_WS_AUDIO_URL, GEMINI_AUDIO_MODEL, GEMINI_AUDIO_VOICE } from "../constants/audioConfig";

/**
 * Persist a single audio-session message (user or bot) to the Node backend.
 * Re-uses the same sessions/:id/messages endpoint as the text chat.
 *
 * @param {string} sessionId
 * @param {object} message  - { sender, type, text, emotion?, distressScore?, timestamp }
 * @returns {Promise<boolean>} true on success, false on failure
 */
export const saveAudioMessage = async (sessionId, message) => {
  try {
    await nodeClient.post(`/api/chat/sessions/${sessionId}/messages`, message);
    return true;
  } catch (err) {
    console.error("[audioSessionApi] saveAudioMessage error:", err);
    return false;
  }
};

/**
 * Build the JSON setup frame that initialises a Gemini audio session.
 *
 * @param {object} userProfile          - Loaded user profile for context injection
 * @param {object[]} conversationHistory - Prior text/audio turns
 * @returns {object} Setup frame ready for JSON.stringify
 */
export const buildAudioSetupFrame = (userProfile, conversationHistory) => ({
  type: "setup",
  config: {
    model:               GEMINI_AUDIO_MODEL,
    response_modalities: ["AUDIO"],
    voice_name:          GEMINI_AUDIO_VOICE,
    systemContext: {
      user_profile:         userProfile,
      conversation_history: conversationHistory,
    },
  },
});

/** WebSocket URL for the Gemini audio bridge (re-exported for hook use) */
export { GEMINI_WS_AUDIO_URL };
