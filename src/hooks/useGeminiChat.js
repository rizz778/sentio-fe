/**
 * useGeminiChat.js — Gemini Live WebSocket hook
 * ===============================================
 * Wraps useWebSocket with Gemini-specific logic:
 *  - Sends the setup frame on connection open
 *  - Dispatches every incoming server frame to the right state updater
 *  - Exposes sendTurn(), refreshSession(), and all relevant state
 *
 * ChatPage should use this hook instead of calling wsUtils functions directly.
 *
 * @example
 *   const { sendTurn, refreshSession, isConnected, hasActiveSession, ... } =
 *     useGeminiChat({ activeSession, messages, userProfile, ... });
 */

import { useState, useRef, useCallback } from "react";
import { message as antdMessage } from "antd";
import { GEMINI_WS_TEXT_URL } from "../services/wsClient";
import { GEMINI_MODEL } from "../constants/chatConfig";
import { useWebSocket } from "./useWebSocket";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Serialise messages to the flat history shape the backend expects */
const toHistoryShape = (messages) =>
  (messages || []).map((msg) => ({
    sender:    msg.sender,
    type:      msg.type,
    text:      msg.text || msg.content || "",
    timestamp: msg.timestamp,
    emotion:   msg.emotion,
    distress:  msg.distress,
  }));

/** Build the Gemini `{ setup: … }` frame */
const buildSetup = ({ systemInstruction, toolsEnabled, userProfile, messages, resumeHandle }) => ({
  setup: {
    model:            GEMINI_MODEL,
    generationConfig: { responseModalities: ["TEXT"] },
    systemInstruction: systemInstruction?.trim() || undefined,
    tools:            toolsEnabled ? [{}] : undefined,
    systemContext: {
      user_profile:         userProfile,
      conversation_history: toHistoryShape(messages),
    },
    ...(resumeHandle ? { sessionResumption: { handle: resumeHandle } } : {}),
  },
});

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * @param {object}   opts
 * @param {string}   opts.systemInstruction
 * @param {boolean}  opts.toolsEnabled
 * @param {object}   opts.userProfile
 * @param {object[]} opts.messages
 * @param {string}   opts.activeSession    - Current session ID (used in saveMessage)
 * @param {Function} opts.addMessage       - Push a UI message (type, content)
 * @param {Function} opts.addSystemMessage - Push a system notice
 * @param {Function} opts.saveMessage      - Persist a message to the Node backend
 * @param {object}   opts.emotionRef       - Ref: latest detected emotion string
 * @param {boolean}  [opts.enabled]        - Connect only when true
 */
export const useGeminiChat = ({
  systemInstruction,
  toolsEnabled,
  userProfile,
  messages,
  activeSession,
  addMessage,
  addSystemMessage,
  saveMessage,
  emotionRef,
  enabled = true,
}) => {
  const [hasActiveSession, setHasActiveSession] = useState(false);
  const [isTyping, setIsTyping]                 = useState(false);
  const [currentResponse, setCurrentResponse]   = useState("");
  const [resumeHandle, setResumeHandle]         = useState(null);
  const [shouldReconnect, setShouldReconnect]   = useState(false);
  const [totalTokens, setTotalTokens]           = useState(0);
  const [distressScore, setDistressScore]       = useState(null);

  // Accumulates streaming text chunks without triggering a render per character
  const currentResponseRef = useRef("");

  // We need stable refs to the latest messages/activeSession inside callbacks
  const messagesRef      = useRef(messages);
  const activeSessionRef = useRef(activeSession);
  messagesRef.current      = messages;
  activeSessionRef.current = activeSession;

  // ── Server event dispatcher ──────────────────────────────────────────────
  const handleMessage = useCallback((data) => {
    const session  = activeSessionRef.current;
    const msgs     = messagesRef.current;

    // ── Session resumption warning ─────────────────────────────────────────
    if (data.type === "session_warning" && data.resume_handle) {
      setResumeHandle(data.resume_handle);
      setShouldReconnect(true);
      addSystemMessage("Session expiring, reconnecting to resume...");
    }

    if (data.error) {
      console.error("[Gemini] Server error:", data.error);
      return;
    }

    // Drop empty / unrecognised frames
    if (!data.type && !data.serverContent && !data.text_chunk && !data.generation_complete) return;

    switch (data.type) {
      // Connection handshake confirmed
      case "connection_established":
        antdMessage.success(data.message || "Connected to Live AI Bridge");
        break;

      // Gemini session created server-side
      case "session_started":
        setHasActiveSession(true);
        antdMessage.success("Session started successfully");
        break;

      // Setup frame acknowledged — ready to receive turns
      case "setup_complete":
        setHasActiveSession(true);
        break;

      // Server ended the session (idle timeout, etc.)
      case "session_ended":
        setHasActiveSession(false);
        addSystemMessage("Session ended");
        break;

      // ── Streaming chunks ───────────────────────────────────────────────
      // We accumulate into a ref to avoid one re-render per token,
      // then commit the full text as a permanent message when complete.
      case "text_chunk":
        if (typeof data.content === "string") {
          currentResponseRef.current += data.content;
          setCurrentResponse(currentResponseRef.current);
        }
        if (data.complete) {
          setIsTyping(false);
          if (currentResponseRef.current?.trim()) {
            addMessage("model", currentResponseRef.current);
            if (session) {
              saveMessage(session, {
                sender: "bot", type: "model",
                text: currentResponseRef.current,
                timestamp: new Date().toISOString(),
              });
            }
          }
          setCurrentResponse("");
          currentResponseRef.current = "";
        } else {
          setIsTyping(true);
        }
        break;

      // Fallback commit path (some backends skip text_chunk.complete)
      case "generation_complete":
        setIsTyping(false);
        if (currentResponseRef.current) {
          if (session && msgs.length > 0) {
            const lastUser = msgs[msgs.length - 1];
            if (lastUser.type === "user") {
              saveMessage(session, {
                sender: "user", type: "user",
                text:   lastUser.content,
                emotion: emotionRef?.current,
                distress: distressScore,
                timestamp: lastUser.timestamp,
              });
            }
          }
          addMessage("model", currentResponseRef.current);
          if (session) {
            saveMessage(session, {
              type: "model",
              text: currentResponseRef.current,
              timestamp: new Date().toISOString(),
            });
          }
        }
        setCurrentResponse("");
        currentResponseRef.current = "";
        break;

      // Token telemetry
      case "usage_update":
        if (data.total_tokens) setTotalTokens(data.total_tokens);
        break;

      // User sent a new message mid-stream — backend aborted generation
      case "interrupted":
        setIsTyping(false);
        setCurrentResponse("");
        currentResponseRef.current = "";
        addSystemMessage("Generation interrupted");
        break;

      // Model-side error (overload, bad request, etc.)
      case "error":
        setIsTyping(false);
        setCurrentResponse("");
        currentResponseRef.current = "";
        console.error("[Gemini] Error:", data.message || "An error occurred");
        break;

      default:
        break;
    }
  }, [addMessage, addSystemMessage, saveMessage, emotionRef, distressScore]);

  // ── Setup payload (memoised) ─────────────────────────────────────────────
  const getSetupPayload = useCallback(() =>
    buildSetup({ systemInstruction, toolsEnabled, userProfile, messages, resumeHandle }),
    [systemInstruction, toolsEnabled, userProfile, messages, resumeHandle]
  );

  // ── Base WebSocket hook ───────────────────────────────────────────────────
  const { send, isConnected } = useWebSocket(GEMINI_WS_TEXT_URL, {
    enabled,
    onOpen:    () => send(getSetupPayload()),
    onMessage: handleMessage,
    onClose:   () => {
      setHasActiveSession(false);
      setIsTyping(false);
      setCurrentResponse("");
      currentResponseRef.current = "";
    },
  });

  // ── Public API ────────────────────────────────────────────────────────────

  /**
   * Send a user turn to Gemini.
   * @param {object[]} turns   - Gemini-format turn array
   * @param {string}   emotion - Latest detected emotion label
   */
  const sendTurn = useCallback((turns, emotion) => {
    send({ clientContent: { turns, turnComplete: true, emotion } });
  }, [send]);

  /**
   * Re-send a setup frame with fresh context after a session switch.
   * Filtered to user/model turns only (strips system notices).
   */
  const refreshSession = useCallback(() => {
    const filtered = (messages || []).filter(
      (m) => m.type === "user" || m.type === "model"
    );
    send(buildSetup({
      systemInstruction,
      toolsEnabled,
      userProfile,
      messages: filtered,
      resumeHandle: null,
    }));
  }, [send, systemInstruction, toolsEnabled, userProfile, messages]);

  return {
    // Connection
    isConnected,
    hasActiveSession,
    connectionStatus: isConnected ? "Connected" : "Disconnected",
    // Streaming state
    isTyping,
    currentResponse,
    totalTokens,
    distressScore,
    setDistressScore,
    // Resume state (exposed for reconnect effect in ChatPage if needed)
    resumeHandle,
    shouldReconnect,
    setShouldReconnect,
    // Actions
    sendTurn,
    refreshSession,
    send,
  };
};
