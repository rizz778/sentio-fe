
import { geminiClient } from "./apiClient";

/**
 * Analyse the distress level of a user's message.
 *
 * @param {string}   inputText           - The raw user message text
 * @param {object[]} conversationHistory - Sanitised history array
 * @returns {Promise<{ score: number }>} Score object from the backend
 */
export const analyzeDistressScore = async (inputText, conversationHistory = []) => {
  const res = await geminiClient.post("/api/distress-score", {
    text: inputText,
    conversationHistory,
  });
  return res.data;
};
