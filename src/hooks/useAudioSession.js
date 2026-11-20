/**
 * useAudioSession.js — Hook: Gemini Audio WebSocket session
 * ===========================================================
 * Orchestrates the full audio call lifecycle:
 *   1. Validates userProfile + conversationHistory before connecting
 *   2. Opens a WebSocket to the Gemini audio bridge
 *   3. Dispatches incoming frames (audio, transcription, turnComplete, error)
 *   4. On turnComplete: runs distress analysis and saves both transcripts
 *
 * Depends on:
 *   useAudioPlayer    – plays incoming audio chunks
 *   useAudioRecorder  – captures mic and sends PCM to the backend
 *   useEmotionDetection (passed in as emotionState) – live emotion label
 *   useAudioLogger    – addLog
 *
 * @param {object} opts
 * @param {object}   opts.userProfile
 * @param {object[]} opts.conversationHistory
 * @param {string}   opts.sessionId
 * @param {object}   opts.emotionState   - { current, aggregated } from useEmotionDetection
 * @param {boolean}  opts.emotionEnabled - Whether emotion detection is active
 * @param {boolean}  opts.isMuted        - Whether audio output is muted
 * @param {Function} opts.addLog
 * @param {Function} opts.queueAudio
 * @param {Function} opts.processAudioQueue
 * @param {Function} opts.clearAudioQueue
 * @param {Function} opts.analyzeDistress - (text) => Promise<number>
 */

import { useState, useRef, useCallback } from "react";
import { createWsClient } from "../services/wsClient";
import { buildAudioSetupFrame, saveAudioMessage, GEMINI_WS_AUDIO_URL } from "../services/audioSessionApi";

export const useAudioSession = ({
  userProfile,
  conversationHistory,
  sessionId,
  emotionState,
  emotionEnabled,
  isMuted,
  addLog,
  queueAudio,
  processAudioQueue,
  clearAudioQueue,
  analyzeDistress,
}) => {
  const [connectionStatus, setConnectionStatus] = useState("disconnected");
  const [isConnected, setIsConnected]           = useState(false);
  const [isCalling, setIsCalling]               = useState(false);
  const [log, setLog]                           = useState("");

  // Transcript accumulators (refs — no re-render per token)
  const inputTranscriptRef  = useRef("");
  const outputTranscriptRef = useRef("");
  const [inputTranscript, setInputTranscript]   = useState("");
  const [outputTranscript, setOutputTranscript] = useState("");

  const wsRef = useRef(null);

  // ── Incoming frame dispatcher ─────────────────────────────────────────────

  const handleFrame = useCallback(async (data) => {
    switch (data.type) {
      case "setup_complete":
        setLog("Audio session ready. You can now talk!");
        addLog?.("Setup complete", "success");
        break;

      case "audio":
        // Queue audio chunk for gapless playback; pass isMuted as ref snapshot
        if (data.audio_data) {
          queueAudio(data.audio_data, data.mime_type || "audio/pcm", data.emotion, isMuted);
        }
        break;

      case "input_transcription":
        // Accumulate word-by-word transcription of the user's voice
        inputTranscriptRef.current += data.text || "";
        break;

      case "output_transcription":
        // Accumulate word-by-word transcription of the AI's voice
        outputTranscriptRef.current += data.text || "";
        break;

      case "turnComplete":
        // Both sides have finished speaking — flush transcripts and persist
        processAudioQueue?.();
        const emotion = emotionEnabled ? emotionState?.aggregated || "" : "";

        if (inputTranscriptRef.current) {
          setInputTranscript(inputTranscriptRef.current);
          const score = await analyzeDistress?.(inputTranscriptRef.current) ?? 0;
          addLog?.(`Distress score: ${score}`, "info");

          const userMsg = {
            sender: "user", type: "user",
            text:   inputTranscriptRef.current,
            emotion,
            distressScore: score,
            timestamp: new Date().toISOString(),
          };
          await saveAudioMessage(sessionId, userMsg);
          if (Array.isArray(conversationHistory)) conversationHistory.push(userMsg);
          addLog?.("User message saved", "success");
          inputTranscriptRef.current = "";
        }

        if (outputTranscriptRef.current) {
          setOutputTranscript(outputTranscriptRef.current);
          const botMsg = {
            sender: "bot", type: "model",
            text: outputTranscriptRef.current,
            timestamp: new Date().toISOString(),
          };
          await saveAudioMessage(sessionId, botMsg);
          if (Array.isArray(conversationHistory)) conversationHistory.push(botMsg);
          addLog?.("Model message saved", "success");
          outputTranscriptRef.current = "";
        }

        addLog?.("Turn completed", "success");
        break;

      case "error":
        addLog?.(`Error: ${data.message}`, "error");
        break;

      default:
        break;
    }
  }, [
    addLog, queueAudio, processAudioQueue, analyzeDistress,
    emotionState, emotionEnabled, isMuted, sessionId, conversationHistory,
  ]);

  // ── Connect ───────────────────────────────────────────────────────────────

  const connect = useCallback(async () => {
    if (!userProfile || Object.keys(userProfile).length === 0) {
      setLog("User profile missing — cannot start audio call.");
      setConnectionStatus("error");
      return;
    }
    if (!conversationHistory) {
      setLog("Conversation history missing — cannot start audio call.");
      setConnectionStatus("error");
      return;
    }

    setIsCalling(true);
    setLog("");
    setConnectionStatus("connecting");

    wsRef.current = createWsClient(GEMINI_WS_AUDIO_URL, {
      onOpen: () => {
        setConnectionStatus("connected");
        setIsConnected(true);
        setLog("Connected — sending setup…");
        wsRef.current.send(buildAudioSetupFrame(userProfile, conversationHistory));
      },
      onMessage: handleFrame,
      onClose: (event) => {
        setIsConnected(false);
        setConnectionStatus("disconnected");
        addLog?.(`Disconnected: ${event?.reason || "Connection closed"}`, "warning");
        clearAudioQueue?.();
      },
      onError: () => {
        setConnectionStatus("error");
        addLog?.("WebSocket error", "error");
      },
    });
  }, [userProfile, conversationHistory, handleFrame, addLog, clearAudioQueue]);

  // ── Send audio ────────────────────────────────────────────────────────────

  /**
   * Send a captured PCM chunk to the Gemini backend.
   * @param {string} base64Data - Base64-encoded 16-bit PCM
   * @param {string} emotion    - Emotion label at time of recording
   */
  const sendAudio = useCallback((base64Data, emotion) => {
    wsRef.current?.send({
      type:           "audio_input",
      audio_data:     base64Data,
      emotion,
      format:         "pcm",
      sample_rate:    16000,
      channels:       1,
      bits_per_sample: 16,
    });
  }, []);

  // ── Disconnect ────────────────────────────────────────────────────────────

  const disconnect = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
    setIsConnected(false);
    setIsCalling(false);
    setConnectionStatus("disconnected");
  }, []);

  // ── Reset state (on modal reopen) ─────────────────────────────────────────

  const reset = useCallback(() => {
    setIsCalling(false);
    setIsConnected(false);
    setConnectionStatus("disconnected");
    setLog("");
    setInputTranscript("");
    setOutputTranscript("");
    inputTranscriptRef.current  = "";
    outputTranscriptRef.current = "";
  }, []);

  return {
    connectionStatus,
    isConnected,
    isCalling,
    log,
    inputTranscript,
    outputTranscript,
    connect,
    disconnect,
    sendAudio,
    reset,
    wsRef,
  };
};
