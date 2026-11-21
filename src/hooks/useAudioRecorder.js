/**
 * useAudioRecorder.js — Hook: Microphone capture via AudioWorklet
 * ================================================================
 * Captures microphone audio using a dedicated AudioWorklet thread off the
 * main UI thread for glitch-free, ultra-low-latency 16kHz audio capture.
 * Automatically falls back to ScriptProcessor if AudioWorklet is unavailable.
 *
 * @param {Function} addLog - Logger from useAudioLogger
 * @returns {{ isRecording, startRecording, stopRecording, cleanup, recordingEmotionRef }}
 */

import { useState, useRef, useCallback } from "react";
import { MIC_CONFIG } from "../constants/audioConfig";
import { convertTo16BitPCM, convertPCMToBase64 } from "../utils/audioUtils";

/**
 * Inlined AudioWorkletProcessor code executed on the Web Audio rendering thread.
 * Forwards raw Float32 audio samples via MessagePort without main thread blocking.
 */
const RECORDER_WORKLET_CODE = `
class RecorderWorkletProcessor extends AudioWorkletProcessor {
  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (input && input.length > 0) {
      const channelData = input[0];
      if (channelData && channelData.length > 0) {
        // Post Float32 chunk to main thread
        this.port.postMessage(channelData);
      }
    }
    return true; // Keep processor alive
  }
}
registerProcessor('recorder-worklet-processor', RecorderWorkletProcessor);
`;

let workletUrlCache = null;
const getWorkletUrl = () => {
  if (!workletUrlCache) {
    const blob = new Blob([RECORDER_WORKLET_CODE], { type: "application/javascript" });
    workletUrlCache = URL.createObjectURL(blob);
  }
  return workletUrlCache;
};

export const useAudioRecorder = (addLog) => {
  const [isRecording, setIsRecording] = useState(false);

  const streamRef           = useRef(null);  // MediaStream from getUserMedia
  const audioProcessorRef   = useRef(null);  // { context, source, processor }
  const audioChunksRef      = useRef([]);    // Accumulated Float32Array chunks
  const recordingTimeoutRef = useRef(null);  // Auto-stop timer handle
  const recordingEmotionRef = useRef("");    // Snapshot of emotion at start-of-record

  // ── Start ─────────────────────────────────────────────────────────────────

  /**
   * Start capturing microphone audio via AudioWorklet (with ScriptProcessor fallback).
   *
   * @param {string} currentEmotion - Emotion label to tag the recording with
   * @param {Function} onAutoStop   - Called when the 5-second auto-stop fires
   */
  const startRecording = useCallback(async (currentEmotion = "", onAutoStop) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(MIC_CONFIG);
      streamRef.current = stream;
      recordingEmotionRef.current = currentEmotion;
      audioChunksRef.current = [];

      // Use a 16kHz input AudioContext for speech recognition / Gemini Live
      const inputCtx = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: 16000,
        latencyHint: "interactive",
      });

      const source = inputCtx.createMediaStreamSource(stream);

      // Check if AudioWorklet is supported
      if (inputCtx.audioWorklet) {
        await inputCtx.audioWorklet.addModule(getWorkletUrl());
        const workletNode = new AudioWorkletNode(inputCtx, "recorder-worklet-processor");

        workletNode.port.onmessage = (event) => {
          if (event.data) {
            audioChunksRef.current.push(new Float32Array(event.data));
          }
        };

        source.connect(workletNode);
        audioProcessorRef.current = { context: inputCtx, source, processor: workletNode };
        addLog?.("Recording started (AudioWorklet, 16kHz, real-time thread)", "success");
      } else {
        // Fallback for legacy environments
        const processor = inputCtx.createScriptProcessor(2048, 1, 1);
        processor.onaudioprocess = (event) => {
          const channelData = event.inputBuffer.getChannelData(0);
          audioChunksRef.current.push(new Float32Array(channelData));
        };
        source.connect(processor);
        processor.connect(inputCtx.destination);
        audioProcessorRef.current = { context: inputCtx, source, processor };
        addLog?.("Recording started (ScriptProcessor fallback, 16kHz)", "success");
      }

      setIsRecording(true);

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
   * @returns {Promise<{ base64Data: string, pcmData: ArrayBuffer, emotion: string } | null>}
   *   null if no audio was captured
   */
  const stopRecording = useCallback(async () => {
    // Clear auto-stop timer
    if (recordingTimeoutRef.current) {
      clearTimeout(recordingTimeoutRef.current);
      recordingTimeoutRef.current = null;
    }

    // Teardown processor and input AudioContext
    if (audioProcessorRef.current) {
      try {
        if (audioProcessorRef.current.processor.port) {
          audioProcessorRef.current.processor.port.close();
        }
        audioProcessorRef.current.processor.disconnect();
        audioProcessorRef.current.source.disconnect();
        audioProcessorRef.current.context.close();
      } catch (_) {}
      audioProcessorRef.current = null;
    }

    // Stop mic stream tracks
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

    const pcm16      = convertTo16BitPCM(combined);
    const base64Data = convertPCMToBase64(pcm16);
    const emotion    = recordingEmotionRef.current;

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
        if (audioProcessorRef.current.processor.port) {
          audioProcessorRef.current.processor.port.close();
        }
        audioProcessorRef.current.processor.disconnect();
        audioProcessorRef.current.source.disconnect();
        audioProcessorRef.current.context.close();
      } catch (_) {}
      audioProcessorRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setIsRecording(false);
  }, []);

  return { isRecording, startRecording, stopRecording, cleanup, recordingEmotionRef };
};
