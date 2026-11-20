/**
 * dashboardApi.js — Feature API: Dashboard & Analytics
 * ======================================================
 * Provides analytical endpoints for Dashboard views using the base nodeClient.
 */

import { nodeClient } from "./apiClient";
import { API_ENDPOINTS } from "../config/api";

/**
 * Fetch emotion and distress analytics for the authenticated user.
 *
 * @returns {Promise<{ success: boolean, data: object }>}
 */
export const getDashboardAnalytics = async () => {
  const res = await nodeClient.get(API_ENDPOINTS.PROFILE.EMOTION_ANALYTICS);
  return res.data;
};
