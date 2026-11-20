import { nodeClient } from "./apiClient";
import { formatMessagesForUi } from "../utils/chatUtils";

// we will create a config file to have this 

const BASE = "/api/chat/sessions";

// ── Sessions ─────────────────────────────────────────────────────────────────

/**
 * Fetch all chat sessions belonging to the authenticated user.
 * @returns {Promise<object[]>} Array of session objects
 */


export const fetchSessions = async () => {
  const res = await nodeClient.get(BASE);
  return res.data;
};

/**
 * Create a new named chat session.
 * @param {string} sessionName - Display name for the session
 * @returns {Promise<object>}  Newly created session
 */
export const createSession = async (sessionName) => {
  const res = await nodeClient.post(BASE, { sessionName });
  return res.data;
};

// ── Messages ──────────────────────────────────────────────────────────────────

/**
 * Fetch all messages for a session, normalised and sorted chronologically.
 * @param {string} sessionId
 * @returns {Promise<object[]>} Formatted UI-ready message array
 */
export const fetchSessionMessages = async (sessionId) => {
  const res = await nodeClient.get(`${BASE}/${sessionId}`);
  const raw = res.data?.messages || [];
  return formatMessagesForUi(raw);
};

/**
 * Persist a single message to a session.
 * @param {string} sessionId
 * @param {object} messageData - { sender, type, text, timestamp, emotion?, distress? }
 * @returns {Promise<object>}  Saved message
 */
export const saveSessionMessage = async (sessionId, messageData) => {
  const res = await nodeClient.post(`${BASE}/${sessionId}/messages`, messageData);
  return res.data;
};
