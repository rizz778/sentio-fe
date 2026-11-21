/**
 * useGeminiChat.js — Gemini Live WebSocket hook via API Gateway
 * ===============================================================
 * Connects to the Sentio API Gateway /ws/live endpoint with TEXT modality.
 * Dispatches streaming transcripts, distress updates, and session readiness.
 *
 * Note: Model type, therapist instructions, user profile context, and conversation
 * history are loaded on the backend from Redis/MongoDB. Message saving is handled
 * automatically by the FastAPI turn processor.
 */

import { useState, useRef, useCallback, useMemo } from "react";
import { message as antdMessage } from "antd";
import { getLiveWsUrl } from "../services/wsClient";
import { useWebSocket } from "./useWebSocket";

export const useGeminiChat = ({
  activeSession,
  addMessage,
  addSystemMessage,
  emotionRef,
  enabled = true,
}) => {
  const [hasActiveSession, setHasActiveSession] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [currentResponse, setCurrentResponse] = useState("");
  const [totalTokens, setTotalTokens] = useState(0);
  const [distressScore, setDistressScore] = useState(null);

  const currentResponseRef = useRef("");
  const typingWatchdogRef  = useRef(null);

  // Memoized Gateway WebSocket URL
  const wsUrl = useMemo(() => {
    if (!activeSession) return "";
    return getLiveWsUrl({ sessionId: activeSession, modalities: ["TEXT"] });
  }, [activeSession]);

  // ── Server event dispatcher ──────────────────────────────────────────────
  const handleMessage = useCallback(
    (data) => {
      if (!data) return;

      // ── Gateway session_ready ───────────────────────────────────────────
      if (data.type === "session_ready") {
        setHasActiveSession(true);
        antdMessage.success(data.message || "Connected to Sentio AI");
        return;
      }

      // ── Gateway streaming & final transcript ────────────────────────────
      if (data.type === "transcript") {
        if (data.speaker === "MODEL") {
          if (!data.isFinal) {
            setIsTyping(true);
            currentResponseRef.current = data.text;
            setCurrentResponse(data.text);

            // Inactivity watchdog: if no further chunks arrive for 2.5s, auto-finalize turn
            if (typingWatchdogRef.current) clearTimeout(typingWatchdogRef.current);
            typingWatchdogRef.current = setTimeout(() => {
              setIsTyping(false);
              const fallbackText = currentResponseRef.current || "";
              if (fallbackText.trim()) {
                addMessage("model", fallbackText);
              }
              setCurrentResponse("");
              currentResponseRef.current = "";
            }, 2500);
          } else {
            if (typingWatchdogRef.current) clearTimeout(typingWatchdogRef.current);
            setIsTyping(false);
            const finalText = data.text || currentResponseRef.current || "";
            if (finalText.trim()) {
              addMessage("model", finalText);
            }
            setCurrentResponse("");
            currentResponseRef.current = "";
          }
        }
        return;
      }

      // ── Gateway distress score update (computed server-side) ────────────
      if (data.type === "distress_update") {
        if (typeof data.score === "number" && data.score > 0) {
          setDistressScore(data.score);
        }
        return;
      }

      // ── Gateway barge-in interruption ───────────────────────────────────
      if (data.type === "stop_playback" || data.type === "interrupted") {
        setIsTyping(false);
        setCurrentResponse("");
        currentResponseRef.current = "";
        addSystemMessage("Generation interrupted");
        return;
      }

      // ── Gateway pong ────────────────────────────────────────────────────
      if (data.type === "pong") {
        return;
      }

      // ── Error handling ──────────────────────────────────────────────────
      if (data.type === "error" || data.error) {
        setIsTyping(false);
        setCurrentResponse("");
        currentResponseRef.current = "";
        const errMsg = data.message || data.error || "An error occurred";
        console.error("[useGeminiChat] Server error:", errMsg);
        antdMessage.error(`AI Service error: ${errMsg}`);
        return;
      }

      // ── Legacy streaming chunks fallback ────────────────────────────────
      if (data.type === "text_chunk") {
        if (typeof data.content === "string") {
          currentResponseRef.current += data.content;
          setCurrentResponse(currentResponseRef.current);
        }
        if (data.complete) {
          setIsTyping(false);
          if (currentResponseRef.current?.trim()) {
            addMessage("model", currentResponseRef.current);
          }
          setCurrentResponse("");
          currentResponseRef.current = "";
        } else {
          setIsTyping(true);
        }
        return;
      }

      if (data.type === "generation_complete") {
        setIsTyping(false);
        if (currentResponseRef.current?.trim()) {
          addMessage("model", currentResponseRef.current);
        }
        setCurrentResponse("");
        currentResponseRef.current = "";
        return;
      }
    },
    [addMessage, addSystemMessage]
  );

  // ── Base WebSocket hook ───────────────────────────────────────────────────
  const { send, isConnected } = useWebSocket(wsUrl, {
    enabled: Boolean(enabled && wsUrl),
    onOpen: () => {
      // Prompt session init
      send({ type: "ping" });
    },
    onMessage: handleMessage,
    onClose: () => {
      if (typingWatchdogRef.current) clearTimeout(typingWatchdogRef.current);
      setHasActiveSession(false);
      setIsTyping(false);
      setCurrentResponse("");
      currentResponseRef.current = "";
    },
  });

  // ── Public API ────────────────────────────────────────────────────────────

  /**
   * Send a user turn to Gemini via Gateway.
   * Accepts either an array of turn objects or a raw text string.
   */
  const sendTurn = useCallback(
    (turnsOrText, emotion) => {
      let textToSend = "";
      if (typeof turnsOrText === "string") {
        textToSend = turnsOrText;
      } else if (Array.isArray(turnsOrText)) {
        const lastUser = [...turnsOrText].reverse().find((t) => t.role === "user");
        textToSend = lastUser?.parts?.[0]?.text || "";
      } else if (turnsOrText?.text) {
        textToSend = turnsOrText.text;
      }

      if (!textToSend.trim()) return;

      send({
        type: "text",
        text: textToSend,
        emotion: emotion || emotionRef?.current || "",
      });
    },
    [send, emotionRef]
  );

  const refreshSession = useCallback(() => {
    send({ type: "ping" });
  }, [send]);

  return {
    isConnected,
    hasActiveSession,
    connectionStatus: isConnected ? "Connected" : "Disconnected",
    isTyping,
    currentResponse,
    totalTokens,
    distressScore,
    setDistressScore,
    sendTurn,
    refreshSession,
    send,
  };
};
