/**
 * useAudioPlayer.js — Hook: Web Audio streaming playback
 * ========================================================
 * Manages an AudioContext, a chunk queue, and seamless gapless playback
 * of streaming PCM/encoded audio chunks from the Gemini audio backend.
 *
 * Key design decisions:
 *  - Uses Web Audio API clock scheduling (source.start(time)) for gapless output
 *  - Accumulates chunks in a ref array to avoid state churn per chunk
 *  - `isPlaying` is exposed as React state for the UI; internal guards use refs
 *
 * @param {Function} addLog - Logger from useAudioLogger
 * @returns {{ queueAudio, stopCurrentAudio, clearAudioQueue, isPlaying, audioQueueLength, initAudioContext }}
 */

import { useState, useRef, useCallback } from "react";
import { AUDIO_CONFIG } from "../constants/audioConfig";
import { decodeAudioChunk } from "../utils/audioUtils";

export const useAudioPlayer = (addLog) => {
  const [isPlaying, setIsPlaying]           = useState(false);
  const [audioQueueLength, setAudioQueueLength] = useState(0);

  // Web Audio refs — not state so changes don't cause re-renders
  const audioContextRef      = useRef(null);
  const audioContextReadyRef = useRef(false);
  const masterGainRef        = useRef(null);
  const audioBufferRef       = useRef([]);       // Pending chunk queue
  const isPlayingRef         = useRef(false);
  const scheduledSourcesRef  = useRef([]);       // Currently scheduled AudioBufferSourceNodes
  const playbackStartTimeRef = useRef(0);        // End time of last scheduled chunk
  const lastEmotionRef       = useRef("");

  // ── Context initialisation ────────────────────────────────────────────────

  const initAudioContext = useCallback(async () => {
    if (audioContextReadyRef.current && audioContextRef.current?.state !== "closed") return;
    try {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate:  AUDIO_CONFIG.sampleRate,
        latencyHint: "interactive",
      });

      masterGainRef.current = audioContextRef.current.createGain();
      masterGainRef.current.connect(audioContextRef.current.destination);

      if (audioContextRef.current.state === "suspended") {
        await audioContextRef.current.resume();
      }

      audioContextReadyRef.current = true;
      addLog?.(`Audio context ready (${audioContextRef.current.sampleRate}Hz)`, "success");
    } catch (err) {
      addLog?.(`Audio context error: ${err.message}`, "error");
    }
  }, [addLog]);

  // ── Resume on user interaction (browser autoplay policy) ─────────────────

  const resumeIfSuspended = useCallback(async () => {
    if (audioContextRef.current?.state === "suspended") {
      await audioContextRef.current.resume();
    }
  }, []);

  // ── Drain the chunk queue using scheduled playback times ─────────────────

  const processAudioQueue = useCallback(async () => {
    if (!audioContextRef.current || audioBufferRef.current.length === 0) return;

    try {
      await resumeIfSuspended();

      while (audioBufferRef.current.length > 0) {
        const chunk = audioBufferRef.current.shift();
        setAudioQueueLength(audioBufferRef.current.length);

        const audioBuffer = await decodeAudioChunk(
          chunk.data,
          chunk.mimeType,
          audioContextRef.current,
          AUDIO_CONFIG.sampleRate
        );
        if (!audioBuffer) continue;

        const source = audioContextRef.current.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(masterGainRef.current || audioContextRef.current.destination);

        // Schedule seamlessly after the previous chunk
        const now       = audioContextRef.current.currentTime;
        const startTime = Math.max(now, playbackStartTimeRef.current);
        source.start(startTime);
        playbackStartTimeRef.current = startTime + audioBuffer.duration;

        isPlayingRef.current = true;
        setIsPlaying(true);
        scheduledSourcesRef.current.push(source);

        source.onended = () => {
          scheduledSourcesRef.current = scheduledSourcesRef.current.filter((s) => s !== source);
          if (scheduledSourcesRef.current.length === 0 && audioBufferRef.current.length === 0) {
            isPlayingRef.current = false;
            setIsPlaying(false);
            playbackStartTimeRef.current = 0;
          }
        };
      }
    } catch (err) {
      addLog?.("Audio playback error: " + err.message, "error");
    }
  }, [addLog, resumeIfSuspended]);

  // ── Public API ────────────────────────────────────────────────────────────

  /**
   * Push a new audio chunk onto the queue and trigger playback.
   * @param {string} audioData   - Base64-encoded audio bytes
   * @param {string} mimeType    - MIME type (default "audio/pcm")
   * @param {string} emotionTag  - Optional emotion label from the backend
   * @param {boolean} isMuted    - If true, chunk is silently dropped
   */
  const queueAudio = useCallback((audioData, mimeType, emotionTag, isMuted) => {
    if (!audioData || isMuted) return;

    if (emotionTag && emotionTag !== lastEmotionRef.current) {
      lastEmotionRef.current = emotionTag;
      addLog?.(`Emotion in audio: ${emotionTag}`, "ai-response");
    }

    audioBufferRef.current.push({
      data:      audioData,
      mimeType:  mimeType || "audio/pcm",
      timestamp: Date.now(),
      emotion:   emotionTag || lastEmotionRef.current,
    });
    setAudioQueueLength(audioBufferRef.current.length);
    processAudioQueue();
  }, [addLog, processAudioQueue]);

  /** Stop all currently scheduled audio sources immediately */
  const stopCurrentAudio = useCallback(() => {
    scheduledSourcesRef.current.forEach((src) => {
      try { src.stop(); } catch (_) {}
    });
    scheduledSourcesRef.current = [];
    playbackStartTimeRef.current = 0;
    isPlayingRef.current = false;
    setIsPlaying(false);
  }, []);

  /** Stop playback and drain the pending chunk queue */
  const clearAudioQueue = useCallback(() => {
    audioBufferRef.current = [];
    stopCurrentAudio();
    setAudioQueueLength(0);
    addLog?.("Audio queue cleared", "info");
  }, [addLog, stopCurrentAudio]);

  /** Close and reset the AudioContext (called on modal close) */
  const destroyAudioContext = useCallback(() => {
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
      audioContextReadyRef.current = false;
    }
  }, []);

  return {
    initAudioContext,
    resumeIfSuspended,
    processAudioQueue,
    queueAudio,
    stopCurrentAudio,
    clearAudioQueue,
    destroyAudioContext,
    isPlaying,
    audioQueueLength,
  };
};
