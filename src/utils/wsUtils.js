
import { GEMINI_WS_TEXT_URL } from "../services/chatApi";
import { GEMINI_MODEL } from "../constants/chatConfig";

// ---------------------------------------------------------------------------
// Low-level transport helper
// ---------------------------------------------------------------------------

/**
 * Serialise `payload` to JSON and send it over the WebSocket.
 * Silently drops the call when the socket is not open.
 *
 * @param {WebSocket} ws      - Live WebSocket instance
 * @param {object}    payload - Any JSON-serialisable value
 */
export const sendToServer = (ws, payload) => {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
};


/**
 * Build the `{ setup: … }` frame that initialises a Gemini Live session.
 *
 * @param {object}      opts
 * @param {string}      opts.systemInstruction  - Therapist persona prompt
 * @param {boolean}     opts.toolsEnabled       - Whether to pass empty tools array
 * @param {object}      opts.userProfile        - Loaded user profile for context injection
 * @param {object[]}    opts.messages           - Current message list (for history context)
 * @param {string|null} opts.resumeHandle       - Opaque handle returned by session_warning
 * @returns {object} Full setup payload ready for JSON.stringify
 */
export const buildSetupMessage = ({
  systemInstruction,
  toolsEnabled,
  userProfile,
  messages,
  resumeHandle,
}) => {
  const conversation_history = (messages || []).map((msg) => ({
    sender: msg.sender,
    type: msg.type,
    text: msg.text || msg.content || "",
    timestamp: msg.timestamp,
    emotion: msg.emotion,
    distress: msg.distress,
  }));

  return {
    setup: {
      model: GEMINI_MODEL,
      generationConfig: { responseModalities: ["TEXT"] },
      systemInstruction: systemInstruction?.trim() || undefined,
      tools: toolsEnabled ? [{}] : undefined,
      systemContext: { user_profile: userProfile, conversation_history },
      ...(resumeHandle ? { sessionResumption: { handle: resumeHandle } } : {}),
    },
  };
};


/**
 * Route an incoming server frame to the correct state updaters.
 *
 * The Gemini backend sends typed JSON frames. This function acts as a
 * central dispatcher so ChatPage doesn't need a giant inline switch block.
 *
 * @param {object}   data                      - Parsed JSON from the WS message event
 * @param {object}   handlers                  - Bag of callbacks / state setters from ChatPage
 * @param {Function} handlers.addMessage        - Push a new ui message (type, content)
 * @param {Function} handlers.addSystemMessage  - Push a system notice
 * @param {Function} handlers.showSuccess       - antd success toast
 * @param {Function} handlers.setIsTyping       - Toggle the typing indicator
 * @param {Function} handlers.setCurrentResponse- Update the streaming preview text
 * @param {Function} handlers.setHasActiveSession
 * @param {Function} handlers.setResumeHandle
 * @param {Function} handlers.setShouldReconnect
 * @param {Function} handlers.setTotalTokens
 * @param {Function} handlers.saveMessage       - Persist message to Node backend
 * @param {string}   handlers.activeSession     - Current session ID
 * @param {object}   handlers.messages          - Current message array
 * @param {object}   handlers.emotion           - Ref holding latest detected emotion
 * @param {number}   handlers.distressScore     - Latest distress score value
 * @param {React.MutableRefObject} handlers.currentResponseRef - Accumulates streaming chunks
 */
export const handleServerMessage = (data, handlers) => {
  const {
    addMessage,
    addSystemMessage,
    showSuccess,
    setIsTyping,
    setCurrentResponse,
    setHasActiveSession,
    setResumeHandle,
    setShouldReconnect,
    setTotalTokens,
    saveMessage,
    activeSession,
    messages,
    emotion,
    distressScore,
    currentResponseRef,
  } = handlers;


  if (data.type === "session_warning" && data.resume_handle) {
    setResumeHandle(data.resume_handle);
    setShouldReconnect(true);
    addSystemMessage("Session expiring, reconnecting to resume...");
  }

  // ── Hard errors ──────────────────────────────────────────────────────────
  if (data.error) {
    console.error("[Client] Server error:", data.error);
    return;
  }

  // ── Drop empty / unrecognised frames ─────────────────────────────────────
  if (!data.type && !data.serverContent && !data.text_chunk && !data.generation_complete) {
    return;
  }

  switch (data.type) {
    // Initial handshake – the WS bridge is up
    case "connection_established":
      showSuccess(data.message || "Connected to Live AI Bridge");
      break;

    // Gemini confirmed the session was created server-side
    case "session_started":
      setHasActiveSession(true);
      showSuccess("Session started successfully");
      break;

    // Gemini acknowledged our setup frame; we're ready to send turns
    case "setup_complete":
      setHasActiveSession(true);
      break;

    // Server ended the session (e.g. idle timeout)
    case "session_ended":
      setHasActiveSession(false);
      addSystemMessage("Session ended");
      break;

    // ── Streaming text chunks ──────────────────────────────────────────────
    // Gemini streams the reply word-by-word. We accumulate into the ref so
    // React doesn't re-render on every character (only on `setCurrentResponse`).
    case "text_chunk":
      if (typeof data.content === "string") {
        currentResponseRef.current += data.content;
        setCurrentResponse(currentResponseRef.current);
      }

      if (data.complete) {
        // Chunk stream finished: commit the full text as a permanent message
        setIsTyping(false);
        if (currentResponseRef.current?.trim()) {
          addMessage("model", currentResponseRef.current);
          if (activeSession) {
            saveMessage(activeSession, {
              sender: "bot",
              type: "model",
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

    // ── Generation fully complete ──────────────────────────────────────────
    // Fallback commit: some backends send generation_complete instead of
    // text_chunk { complete: true }. Flush whatever is buffered.
    case "generation_complete":
      setIsTyping(false);
      if (currentResponseRef.current) {
        // Also persist the last user message with its emotion & distress context
        if (activeSession && messages.length > 0) {
          const lastUserMsg = messages[messages.length - 1];
          if (lastUserMsg.type === "user") {
            saveMessage(activeSession, {
              sender: "user",
              type: "user",
              text: lastUserMsg.content,
              emotion: emotion?.current,
              distress: distressScore,
              timestamp: lastUserMsg.timestamp,
            });
          }
        }
        addMessage("model", currentResponseRef.current);
        if (activeSession) {
          saveMessage(activeSession, {
            type: "model",
            text: currentResponseRef.current,
            timestamp: new Date().toISOString(),
          });
        }
      }
      setCurrentResponse("");
      currentResponseRef.current = "";
      break;

    // Token usage telemetry – stored for potential future display
    case "usage_update":
      if (data.total_tokens) setTotalTokens(data.total_tokens);
      break;

    // Server interrupted an in-progress generation (e.g. user sent a new message)
    case "interrupted":
      setIsTyping(false);
      setCurrentResponse("");
      currentResponseRef.current = "";
      addSystemMessage("Generation interrupted");
      break;

    // Gemini-side error (model overload, bad request, etc.)
    case "error":
      setIsTyping(false);
      setCurrentResponse("");
      currentResponseRef.current = "";
      console.error("[Gemini] Error:", data.message || "An error occurred");
      break;

    default:
      break;
  }
};


/**
 * Open a new WebSocket to the Gemini Live bridge, wire up all handlers,
 * and immediately send the setup frame on `onopen`.
 *
 * @param {object}   opts
 * @param {object}   opts.setupPayload   - Pre-built setup message from buildSetupMessage()
 * @param {object}   opts.handlers       - Same handler bag passed to handleServerMessage
 * @param {Function} opts.setIsConnected
 * @param {Function} opts.setConnectionStatus
 * @returns {WebSocket} The newly opened socket (caller stores it in wsRef.current)
 */
export const connectWebSocket = ({ setupPayload, handlers, setIsConnected, setConnectionStatus }) => {
  const ws = new WebSocket(GEMINI_WS_TEXT_URL);

  ws.onopen = () => {
    setIsConnected(true);
    setConnectionStatus("Connected");
    ws.send(JSON.stringify(setupPayload));
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      handleServerMessage(data, handlers);
    } catch (err) {
      console.error("[Client] Error parsing server message:", err);
    }
  };

  ws.onclose = () => {
    setIsConnected(false);
    handlers.setHasActiveSession(false);
    setConnectionStatus("Disconnected");
    handlers.setIsTyping(false);
    handlers.setCurrentResponse("");
    handlers.currentResponseRef.current = "";
  };

  ws.onerror = (err) => {
    console.error("[Client] WebSocket error:", err);
  };

  return ws;
};


/**
 * Re-send a lightweight setup frame on an already-open socket.
 * Called whenever the user switches to a different chat session so the
 * Gemini model receives fresh system context (user profile + history).
 *
 * @param {WebSocket} ws
 * @param {object}    opts
 * @param {string}    opts.systemInstruction
 * @param {boolean}   opts.toolsEnabled
 * @param {object}    opts.userProfile
 * @param {object[]}  opts.messages  - Filtered to user/model turns only
 */
export const refreshGeminiSession = (ws, { systemInstruction, toolsEnabled, userProfile, messages }) => {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;

  const conversation_history = (messages || [])
    .filter((msg) => msg.type === "user" || msg.type === "model")
    .map((msg) => ({
      sender: msg.sender,
      type: msg.type,
      text: msg.text || msg.content || "",
      timestamp: msg.timestamp,
      emotion: msg.emotion,
      distress: msg.distress,
    }));

  ws.send(
    JSON.stringify({
      setup: {
        model: GEMINI_MODEL,
        systemContext: { user_profile: userProfile, conversation_history },
        systemInstruction: systemInstruction?.trim() || undefined,
        tools: toolsEnabled ? [{}] : undefined,
      },
    })
  );
};
