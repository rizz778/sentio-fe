/**
 * audioUtils.js — Pure audio-processing helpers
 * ===============================================
 * Stateless functions for PCM format detection and conversion.
 * No React, no side-effects — safe to unit-test in isolation.
 */

/**
 * Returns true if the given MIME type represents raw PCM audio.
 * @param {string} mimeType
 */
export const isPCMFormat = (mimeType) =>
  Boolean(mimeType && (mimeType.startsWith("audio/pcm") || mimeType.includes("pcm")));

/**
 * Convert a Float32Array of audio samples (range -1 to 1) to Int16Array (PCM-16).
 * @param {Float32Array} float32Array
 * @returns {Int16Array}
 */
export const convertTo16BitPCM = (float32Array) => {
  const int16Array = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    const clamped = Math.max(-1, Math.min(1, float32Array[i]));
    int16Array[i] = clamped * 32767;
  }
  return int16Array;
};

/**
 * Encode an Int16Array (PCM-16) as a base64 string for WS transport.
 * @param {Int16Array} pcmData
 * @returns {string} base64-encoded PCM bytes
 */
export const convertPCMToBase64 = (pcmData) => {
  const uint8 = new Uint8Array(pcmData.buffer);
  let binary = "";
  for (let i = 0; i < uint8.length; i++) {
    binary += String.fromCharCode(uint8[i]);
  }
  return btoa(binary);
};

/**
 * Decode a base64 PCM string into a Web Audio AudioBuffer.
 * Handles both raw PCM (audio/pcm) and other encoded formats (via decodeAudioData).
 *
 * @param {string}       audioData   - Base64-encoded audio bytes
 * @param {string}       mimeType    - MIME type of the audio chunk
 * @param {AudioContext} audioCtx    - Live AudioContext instance
 * @param {number}       sampleRate  - Expected sample rate for PCM decoding
 * @returns {Promise<AudioBuffer|null>}
 */
export const decodeAudioChunk = async (audioData, mimeType, audioCtx, sampleRate) => {
  if (!audioCtx) return null;
  try {
    const binaryString = atob(audioData);
    const uint8 = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      uint8[i] = binaryString.charCodeAt(i);
    }

    if (isPCMFormat(mimeType)) {
      // Validate byte alignment (Int16 = 2 bytes per sample)
      if (uint8.length % 2 !== 0) return null;
      const int16 = new Int16Array(uint8.buffer, uint8.byteOffset, uint8.length / 2);
      const buffer = audioCtx.createBuffer(1, int16.length, sampleRate);
      const channel = buffer.getChannelData(0);
      for (let i = 0; i < int16.length; i++) {
        channel[i] = int16[i] / 32768.0;
      }
      return buffer;
    }

    // For non-PCM formats, let the browser decode (MP3, AAC, etc.)
    return await audioCtx.decodeAudioData(uint8.buffer);
  } catch (err) {
    console.error("[audioUtils] decodeAudioChunk error:", err);
    return null;
  }
};
