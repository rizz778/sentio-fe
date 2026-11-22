/**
 * Format newlines to HTML line breaks
 */
export const formatText = (text) => {
  return text?.replace(/\n/g, "<br/>") || "";
};

// ---------------------------------------------------------------------------
// Message factory helpers (moved from ChatPage)
// ---------------------------------------------------------------------------

/**
 * Build a standard message object for the UI message list.
 *
 * @param {"user"|"model"|"system"} type   - Originator of the message
 * @param {string}                  content - Text body of the message
 * @param {React.MutableRefObject}  idRef   - Ref whose `.current` is auto-incremented
 * @returns {object} Normalised message object ready to push into state
 */
export const createMessageObject = (type, content, idRef) => {
  if (type !== "user" && type !== "model" && type !== "system") return null;
  return {
    id: idRef ? idRef.current++ : Date.now(),
    type,
    content,
    sender: type === "user" ? "user" : type === "model" ? "bot" : "system",
    text: content,
    timestamp: new Date().toISOString(),
  };
};

/**
 * Build conversation turns for Gemini Live API format
 */
export const buildConversationTurns = (messages, newUserMessage = null) => {
  const conversationMessages = (messages || []).filter(
    (m) => m.type === "user" || m.type === "model"
  );

  const turns = [];
  conversationMessages.forEach((msg) => {
    const textContent = (msg.content || msg.text || "").trim();
    if (!textContent) return;

    if (msg.type === "user") {
      turns.push({ role: "user", parts: [{ text: textContent }] });
    } else if (msg.type === "model") {
      turns.push({ role: "model", parts: [{ text: textContent }] });
    }
  });

  if (newUserMessage && newUserMessage.trim()) {
    turns.push({ role: "user", parts: [{ text: newUserMessage.trim() }] });
  }

  // Deduplicate consecutive identical roles to prevent Gemini turn errors
  let lastRole = null;
  const filteredTurns = [];
  for (const turn of turns) {
    if (turn.role !== lastRole) {
      filteredTurns.push(turn);
      lastRole = turn.role;
    }
  }

  return filteredTurns;
};

/**
 * Format backend message items into standard UI message structure
 */
export const formatMessagesForUi = (rawMessages = []) => {
  return (rawMessages || [])
    .filter((msg) => {
      // Drop messages with no usable text
      const text =
        typeof msg.text === "string" && msg.text.trim() !== ""
          ? msg.text
          : typeof msg.content === "string" && msg.content.trim() !== ""
          ? msg.content
          : "";
      return text.length > 0;
    })
    .map((msg, idx) => {
      // Normalise sender: backend stores "user", "bot", "model", "assistant"
      const rawSender = (msg.sender || msg.type || "").toString().toLowerCase().trim();
      let sender = "system";
      if (rawSender === "user") {
        sender = "user";
      } else if (
        rawSender === "bot" ||
        rawSender === "model" ||
        rawSender === "assistant" ||
        rawSender === "sentio" ||
        rawSender === "sentio ai" ||
        rawSender === "ai"
      ) {
        sender = "bot";
      }

      const text =
        typeof msg.text === "string" && msg.text.trim() !== ""
          ? msg.text
          : typeof msg.content === "string"
          ? msg.content
          : "";

      return {
        ...msg,
        id: idx + 1,
        sender,
        text,
        content: text,
      };
    });
};
