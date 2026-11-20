/**
 * useAudioRecorder.js — Hook: Microphone capture
 * ================================================
 * Captures audio from the user's microphone via getUserMedia, buffers the
 * raw Float32 samples in a ScriptProcessor, and on stopRecording() converts
 * them to 16-bit PCM and returns the base64-encoded result for WS dispatch.
 *
 * @param {Function} addLog - Logger from useAudioLogger
 * @returns {{ isRecording, startRecording, stopRecording }}
 */

import { useState, useRef, useCallback } from "react";
import { MIC_CONFIG } from "../constants/audioConfig";
import { convertTo16BitPCM, convertPCMToBase64 } from "../utils/audioUtils";

export const useAudioRecorder = (addLog) => {
  const [isRecording, setIsRecording] = useState(false);

  const streamRef           = useRef(null);  // MediaStream from getUserMedia
  const audioProcessorRef   = useRef(null);  // { context, source, processor }
  const audioChunksRef      = useRef([]);    // Accumulated Float32Array chunks
  const recordingTimeoutRef = useRef(null);  // Auto-stop timer handle
  const recordingEmotionRef = useRef("");    // Snapshot of emotion at start-of-record

  // ── Start ─────────────────────────────────────────────────────────────────

  /**
   * Start capturing microphone audio.
   * Resets transcript accumulators via the provided callbacks.
   *
   * @param {string} currentEmotion - Emotion label to tag the recording with
   * @param {Function} onAutoStop   - Called when the 5-second auto-stop fires
   */
  const startRecording = useCallback(async (currentEmotion = "", onAutoStop) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(MIC_CONFIG);
      streamRef.current = stream;
      recordingEmotionRef.current = currentEmotion;

      // Use a 16kHz input AudioContext — different from the 24kHz playback context
      const inputCtx = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate:  16000,
        latencyHint: "interactive",
      });

      const source    = inputCtx.createMediaStreamSource(stream);
      // ScriptProcessor is deprecated but still the most compatible option for
      // raw Float32 access — replace with AudioWorklet when broader support lands
      const processor = inputCtx.createScriptProcessor(2048, 1, 1);

      audioChunksRef.current = [];

      processor.onaudioprocess = (event) => {
        const channelData = event.inputBuffer.getChannelData(0);
        audioChunksRef.current.push(new Float32Array(channelData));
      };

      source.connect(processor);
      processor.connect(inputCtx.destination);

      audioProcessorRef.current = { context: inputCtx, source, processor };
      setIsRecording(true);
      addLog?.("Recording started (16kHz, low latency)", "success");

      // Auto-stop after 5 seconds to prevent runaway recordings
      recordingTimeoutRef.current = setTimeout(() => {
        onAutoStop?.();
      }, 5000);
    } catch (err) {
      addLog?.(`Recording error: ${err.message}`, "error");
    }
  }, [addLog]);

  // ── Stop ──────────────────────────────────────────────────────────────────

  /**
   * Stop recording, combine buffered chunks, and return the encoded PCM.
   *
   * @returns {Promise<{ base64Data: string, emotion: string } | null>}
   *   null if no audio was captured
   */
  const stopRecording = useCallback(async () => {
    // Clear auto-stop timer
    if (recordingTimeoutRef.current) {
      clearTimeout(recordingTimeoutRef.current);
      recordingTimeoutRef.current = null;
    }

    // Teardown ScriptProcessor and input AudioContext
    if (audioProcessorRef.current) {
      try {
        audioProcessorRef.current.processor.disconnect();
        audioProcessorRef.current.source.disconnect();
        audioProcessorRef.current.context.close();
      } catch (_) {}
      audioProcessorRef.current = null;
    }

    // Stop camera tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    setIsRecording(false);

    // No audio captured — nothing to return
    if (audioChunksRef.current.length === 0) return null;

    // Combine all Float32Array chunks into one contiguous buffer
    let totalSamples = 0;
    audioChunksRef.current.forEach((c) => { totalSamples += c.length; });
    const combined = new Float32Array(totalSamples);
    let offset = 0;
    audioChunksRef.current.forEach((c) => { combined.set(c, offset); offset += c.length; });
    audioChunksRef.current = [];

    const pcm16    = convertTo16BitPCM(combined);
    const base64Data = convertPCMToBase64(pcm16);
    const emotion  = recordingEmotionRef.current;

    addLog?.(
      `Audio captured (${(pcm16.length / 16000).toFixed(2)}s)${emotion ? ` emotion: ${emotion}` : ""}`,
      "user-input"
    );

    return { base64Data, pcmData: pcm16.buffer, emotion };
  }, [addLog]);

  // ── Cleanup ───────────────────────────────────────────────────────────────

  const cleanup = useCallback(() => {
    if (recordingTimeoutRef.current) clearTimeout(recordingTimeoutRef.current);
    if (audioProcessorRef.current) {
      try {
        audioProcessorRef.current.processor.disconnect();
        audioProcessorRef.current.source.disconnect();
        audioProcessorRef.current.context.close();
      } catch (_) {}
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setIsRecording(false);
  }, []);

  return { isRecording, startRecording, stopRecording, cleanup, recordingEmotionRef };
};
