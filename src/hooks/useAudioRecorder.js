/**
 * useAudioRecorder.js — Hook: Continuous Microphone Streaming via AudioWorklet
 * ============================================================================
 * Captures microphone audio using a dedicated AudioWorklet thread off the
 * main UI thread for glitch-free, ultra-low-latency 16kHz audio capture.
 * Continuously streams 16-bit PCM chunks (~128ms) via onChunk callback for true
 * real-time bidirectional Gemini Live conversations.
 *
 * Automatically falls back to ScriptProcessor if AudioWorklet is unavailable.
 *
 * @param {Function} addLog - Logger from useAudioLogger
 * @returns {{ isRecording, startRecording, stopRecording, cleanup, recordingEmotionRef }}
 */

import { useState, useRef, useCallback } from "react";
import { MIC_CONFIG } from "../constants/audioConfig";
import { convertTo16BitPCM } from "../utils/audioUtils";

/**
 * Inlined AudioWorkletProcessor code executed on the Web Audio rendering thread.
 * Batches incoming Float32 samples into ~2048-sample frames (~128ms at 16kHz)
 * and posts them to the main thread without blocking UI.
 */
const RECORDER_WORKLET_CODE = `
class RecorderWorkletProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufferSize = 2048; // ~128ms at 16kHz
    this.buffer = new Float32Array(this.bufferSize);
    this.bufferIndex = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (input && input.length > 0) {
      const channelData = input[0];
      for (let i = 0; i < channelData.length; i++) {
        this.buffer[this.bufferIndex++] = channelData[i];
        if (this.bufferIndex >= this.bufferSize) {
          // Post chunk to main thread
          this.port.postMessage(this.buffer);
          this.buffer = new Float32Array(this.bufferSize);
          this.bufferIndex = 0;
        }
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
  const onChunkCallbackRef  = useRef(null);  // Callback for streaming PCM chunks
  const recordingEmotionRef = useRef("");    // Snapshot of emotion

  // ── Start Continuous Recording ──────────────────────────────────────────

  /**
   * Start capturing microphone audio and stream PCM-16 chunks in real-time.
   *
   * @param {Function} onChunk      - Called on each 16-bit PCM chunk (ArrayBuffer)
   * @param {string}   currentEmotion - Emotion label to tag the session with
   */
  const startRecording = useCallback(async (onChunk, currentEmotion = "") => {
    try {
      onChunkCallbackRef.current = onChunk;
      recordingEmotionRef.current = currentEmotion;

      const stream = await navigator.mediaDevices.getUserMedia(MIC_CONFIG);
      streamRef.current = stream;

      // 16kHz input AudioContext for Gemini Live
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
          if (event.data && onChunkCallbackRef.current) {
            const pcm16 = convertTo16BitPCM(event.data);
            onChunkCallbackRef.current(pcm16.buffer);
          }
        };

        source.connect(workletNode);
        audioProcessorRef.current = { context: inputCtx, source, processor: workletNode };
        addLog?.("Live voice streaming started (AudioWorklet, 16kHz continuous)", "success");
      } else {
        // Fallback for environments without AudioWorklet
        const processor = inputCtx.createScriptProcessor(2048, 1, 1);
        processor.onaudioprocess = (event) => {
          if (onChunkCallbackRef.current) {
            const channelData = event.inputBuffer.getChannelData(0);
            const pcm16 = convertTo16BitPCM(channelData);
            onChunkCallbackRef.current(pcm16.buffer);
          }
        };
        source.connect(processor);
        processor.connect(inputCtx.destination);
        audioProcessorRef.current = { context: inputCtx, source, processor };
        addLog?.("Live voice streaming started (ScriptProcessor fallback, 16kHz continuous)", "success");
      }

      setIsRecording(true);
    } catch (err) {
      addLog?.(`Microphone access error: ${err.message}`, "error");
    }
  }, [addLog]);

  // ── Stop Recording ────────────────────────────────────────────────────────

  /**
   * Stop recording and teardown mic stream.
   */
  const stopRecording = useCallback(async () => {
    onChunkCallbackRef.current = null;

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
    addLog?.("Microphone stopped", "info");
  }, [addLog]);

  // ── Cleanup ───────────────────────────────────────────────────────────────

  const cleanup = useCallback(() => {
    onChunkCallbackRef.current = null;
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
