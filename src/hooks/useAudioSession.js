/**
 * useAudioSession.js — Hook: Gemini Audio Session via Sentio API Gateway
 * =======================================================================
 * Orchestrates real-time bi-directional audio calling with Gemini Live via Gateway:
 *   1. Connects to Gateway /ws/live?sessionId=...&modalities=AUDIO
 *   2. Receives audio_chunk frames (24kHz PCM) and queues them for playback
 *   3. Receives live transcripts for both USER and MODEL
 *   4. Receives stop_playback for barge-in interruptions
 *   5. Receives distress_update computed automatically by the backend
 *   6. Streams user microphone audio (16kHz PCM binary) to Gateway
 *
 * Note: Voice name, model, user profile context, and conversation history are
 * managed server-side. Messages are saved automatically by the backend.
 */

import { useState, useRef, useCallback } from "react";
import { createWsClient, getLiveWsUrl } from "../services/wsClient";

export const useAudioSession = ({
  sessionId,
  emotionState,
  isMuted,
  addLog,
  queueAudio,
  processAudioQueue,
  clearAudioQueue,
}) => {
  const [connectionStatus, setConnectionStatus] = useState("disconnected");
  const [isConnected, setIsConnected] = useState(false);
  const [isCalling, setIsCalling] = useState(false);
  const [log, setLog] = useState("");
  const [distressScore, setDistressScore] = useState(null);

  const inputTranscriptRef = useRef("");
  const outputTranscriptRef = useRef("");
  const [inputTranscript, setInputTranscript] = useState("");
  const [outputTranscript, setOutputTranscript] = useState("");

  const wsRef = useRef(null);

  // ── Incoming frame dispatcher ─────────────────────────────────────────────
  const handleFrame = useCallback(
    async (data) => {
      if (!data) return;

      // Handle raw binary payload
      if (data instanceof ArrayBuffer) {
        const uint8 = new Uint8Array(data);
        let binary = "";
        for (let i = 0; i < uint8.length; i++) {
          binary += String.fromCharCode(uint8[i]);
        }
        const b64 = btoa(binary);
        queueAudio(b64, "audio/pcm;rate=24000", null, isMuted);
        return;
      }

      switch (data.type) {
        case "session_ready":
          setLog("Audio session ready. You can speak now!");
          addLog?.("Session ready — voice active", "success");
          break;

        case "audio_chunk":
        case "audio":
          if (data.data || data.audio_data) {
            queueAudio(
              data.data || data.audio_data,
              data.mimeType || data.mime_type || "audio/pcm;rate=24000",
              data.emotion || emotionState?.aggregated,
              isMuted
            );
          }
          break;

        case "transcript":
          if (data.speaker === "USER") {
            inputTranscriptRef.current = data.text || "";
            setInputTranscript(data.text || "");
          } else if (data.speaker === "MODEL") {
            outputTranscriptRef.current = data.text || "";
            setOutputTranscript(data.text || "");
          }
          break;

        case "input_transcription":
          inputTranscriptRef.current += data.text || "";
          setInputTranscript(inputTranscriptRef.current);
          break;

        case "output_transcription":
          outputTranscriptRef.current += data.text || "";
          setOutputTranscript(outputTranscriptRef.current);
          break;

        case "stop_playback":
          // User barge-in: stop playing queued AI audio immediately
          clearAudioQueue?.();
          addLog?.("Playback stopped (barge-in)", "info");
          break;

        case "distress_update":
          if (typeof data.score === "number") {
            setDistressScore(data.score);
            addLog?.(`Distress score update: ${data.score}`, "info");
          }
          break;

        case "turnComplete":
          processAudioQueue?.();
          addLog?.("Turn completed", "success");
          break;

        case "error":
          addLog?.(`Error: ${data.message}`, "error");
          setLog(`Error: ${data.message}`);
          break;

        default:
          break;
      }
    },
    [addLog, queueAudio, processAudioQueue, clearAudioQueue, emotionState, isMuted]
  );

  // ── Connect ───────────────────────────────────────────────────────────────
  const connect = useCallback(async () => {
    if (!sessionId) {
      setLog("No active session ID — cannot start audio call.");
      setConnectionStatus("error");
      return;
    }

    setIsCalling(true);
    setLog("Connecting to voice bridge...");
    setConnectionStatus("connecting");

    const wsUrl = getLiveWsUrl({ sessionId, modalities: ["AUDIO"] });

    wsRef.current = createWsClient(wsUrl, {
      onOpen: () => {
        setConnectionStatus("connected");
        setIsConnected(true);
        setLog("Connected. Voice bridge active.");
        addLog?.("WebSocket connected to Gateway /ws/live", "success");
        wsRef.current?.send({ type: "ping" });
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
        addLog?.("WebSocket connection error", "error");
      },
    });
  }, [sessionId, handleFrame, addLog, clearAudioQueue]);

  // ── Send audio ────────────────────────────────────────────────────────────
  /**
   * Send captured PCM audio to Gateway.
   * Supports raw binary (Uint8Array/ArrayBuffer) or base64 data.
   */
  const sendAudio = useCallback((pcmData, emotion) => {
    if (!wsRef.current?.isOpen) return;

    if (pcmData instanceof ArrayBuffer || pcmData instanceof Uint8Array) {
      wsRef.current.send(pcmData);
    } else if (typeof pcmData === "string") {
      try {
        const binaryString = atob(pcmData);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        wsRef.current.send(bytes.buffer);
      } catch (_) {
        wsRef.current.send({
          type: "audio",
          data: pcmData,
          emotion: emotion || "",
        });
      }
    }
  }, []);

  // ── Disconnect ────────────────────────────────────────────────────────────
  const disconnect = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
    setIsConnected(false);
    setIsCalling(false);
    setConnectionStatus("disconnected");
  }, []);

  // ── Reset ─────────────────────────────────────────────────────────────────
  const reset = useCallback(() => {
    setIsCalling(false);
    setIsConnected(false);
    setConnectionStatus("disconnected");
    setLog("");
    setInputTranscript("");
    setOutputTranscript("");
    inputTranscriptRef.current = "";
    outputTranscriptRef.current = "";
  }, []);

  return {
    connectionStatus,
    isConnected,
    isCalling,
    log,
    inputTranscript,
    outputTranscript,
    distressScore,
    connect,
    disconnect,
    sendAudio,
    reset,
    wsRef,
  };
};
