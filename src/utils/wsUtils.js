import { GEMINI_WS_TEXT_URL, getLiveWsUrl } from "../services/wsClient";

// ---------------------------------------------------------------------------
// Low-level transport helper
// ---------------------------------------------------------------------------

/**
 * Serialise `payload` to JSON or send binary over the WebSocket.
 *
 * @param {WebSocket|object} ws      - Live WebSocket or WSClient instance
 * @param {object|string|ArrayBuffer} payload
 */
export const sendToServer = (ws, payload) => {
  if (!ws) return;
  if (typeof ws.send === "function") {
    if (ws.readyState === undefined || ws.readyState === WebSocket.OPEN || ws.isOpen) {
      if (
        payload instanceof ArrayBuffer ||
        payload instanceof Uint8Array ||
        typeof payload === "string"
      ) {
        ws.send(payload);
      } else {
        ws.send(JSON.stringify(payload));
      }
    }
  }
};

/**
 * Route an incoming server frame to state updaters.
 * Message persistence is handled server-side by FastAPI's turn processor.
 */
export const handleServerMessage = (data, handlers) => {
  if (!data) return;

  const {
    addMessage,
    addSystemMessage,
    showSuccess,
    setIsTyping,
    setCurrentResponse,
    setHasActiveSession,
    currentResponseRef,
  } = handlers;

  // ── Gateway session_ready ────────────────────────────────────────────────
  if (data.type === "session_ready") {
    setHasActiveSession?.(true);
    showSuccess?.(data.message || "Connected to Sentio AI");
    return;
  }

  // ── Gateway streaming & final transcript ─────────────────────────────────
  if (data.type === "transcript") {
    if (data.speaker === "MODEL") {
      if (!data.isFinal) {
        setIsTyping?.(true);
        if (currentResponseRef) {
          currentResponseRef.current = data.text;
        }
        setCurrentResponse?.(data.text);
      } else {
        setIsTyping?.(false);
        const finalContent = data.text || currentResponseRef?.current || "";
        if (finalContent.trim()) {
          addMessage?.("model", finalContent);
        }
        setCurrentResponse?.("");
        if (currentResponseRef) currentResponseRef.current = "";
      }
    }
    return;
  }

  // ── Gateway distress & emotion updates (computed server-side) ────────────
  if (data.type === "distress_update") {
    if (handlers.setDistressScore && typeof data.score === "number") {
      handlers.setDistressScore(data.score);
    }
    if (handlers.setEmotion && data.emotion) {
      handlers.setEmotion((prev) => ({
        ...prev,
        current: data.emotion,
        aggregated: data.emotion,
      }));
    }
    return;
  }

  // ── Gateway barge-in stop_playback ───────────────────────────────────────
  if (data.type === "stop_playback" || data.type === "interrupted") {
    setIsTyping?.(false);
    setCurrentResponse?.("");
    if (currentResponseRef) currentResponseRef.current = "";
    addSystemMessage?.("Playback stopped");
    return;
  }

  // ── Legacy streaming chunks fallback ─────────────────────────────────────
  if (data.type === "text_chunk") {
    if (typeof data.content === "string" && currentResponseRef) {
      currentResponseRef.current += data.content;
      setCurrentResponse?.(currentResponseRef.current);
    }

    if (data.complete) {
      setIsTyping?.(false);
      const text = currentResponseRef?.current || "";
      if (text.trim()) {
        addMessage?.("model", text);
      }
      setCurrentResponse?.("");
      if (currentResponseRef) currentResponseRef.current = "";
    } else {
      setIsTyping?.(true);
    }
    return;
  }

  if (data.type === "generation_complete") {
    setIsTyping?.(false);
    const text = currentResponseRef?.current || "";
    if (text.trim()) {
      addMessage?.("model", text);
    }
    setCurrentResponse?.("");
    if (currentResponseRef) currentResponseRef.current = "";
    return;
  }

  // ── Error handling ───────────────────────────────────────────────────────
  if (data.type === "error" || data.error) {
    setIsTyping?.(false);
    setCurrentResponse?.("");
    if (currentResponseRef) currentResponseRef.current = "";
    console.error("[wsUtils] Server error:", data.message || data.error);
  }
};

/**
 * Open a new WebSocket connection to Gateway.
 */
export const connectWebSocket = ({
  sessionId,
  handlers,
  setIsConnected,
  setConnectionStatus,
}) => {
  const url = getLiveWsUrl({ sessionId, modalities: "TEXT" });
  const ws = new WebSocket(url);

  ws.onopen = () => {
    setIsConnected?.(true);
    setConnectionStatus?.("Connected");
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      handleServerMessage(data, handlers);
    } catch (err) {
      console.error("[wsUtils] Error parsing server message:", err);
    }
  };

  ws.onclose = () => {
    setIsConnected?.(false);
    handlers?.setHasActiveSession?.(false);
    setConnectionStatus?.("Disconnected");
    handlers?.setIsTyping?.(false);
    handlers?.setCurrentResponse?.("");
    if (handlers?.currentResponseRef) handlers.currentResponseRef.current = "";
  };

  ws.onerror = (err) => {
    console.error("[wsUtils] WebSocket error:", err);
  };

  return ws;
};

export const refreshGeminiSession = (ws, { sessionId }) => {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify({ type: "ping", sessionId }));
};
