/**
 * chatSessionsApi.js — Feature API: Chat Sessions & History
 * ==========================================================
 * Manages chat sessions and fetches message history through the Sentio API Gateway.
 * Note: Message persistence is handled automatically by the backend turn processor.
 */

import { nodeClient } from "./apiClient";
import { API_ENDPOINTS } from "../config/api";
import { formatMessagesForUi } from "../utils/chatUtils";

/**
 * Fetch all chat sessions belonging to the authenticated user.
 *
 * @returns {Promise<object[]>} Array of session objects
 */
export const fetchSessions = async () => {
  const res = await nodeClient.get(API_ENDPOINTS.SESSIONS.BASE);
  return res.data || [];
};

/**
 * Create a new named chat session.
 *
 * @param {string} sessionName - Display name for the session
 * @returns {Promise<object>} Newly created session
 */
export const createSession = async (sessionName) => {
  const res = await nodeClient.post(API_ENDPOINTS.SESSIONS.BASE, { sessionName });
  return res.data;
};

/**
 * Fetch all messages for a session, normalised and sorted chronologically.
 *
 * @param {string} sessionId
 * @returns {Promise<object[]>} Formatted UI-ready message array
 */
export const fetchSessionMessages = async (sessionId) => {
  const res = await nodeClient.get(API_ENDPOINTS.SESSIONS.BY_ID(sessionId));
  const raw = res.data?.messages || [];
  return formatMessagesForUi(raw);
};
