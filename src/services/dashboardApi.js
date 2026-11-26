/**
 * dashboardApi.js — Feature API: Dashboard & Analytics
 * ======================================================
 * Provides analytical endpoints for Dashboard views using the base nodeClient.
 */

import { nodeClient } from "./apiClient";
import { API_ENDPOINTS } from "../config/api";

/**
 * Fetch emotion and distress analytics for the authenticated user.
 * Gracefully provides empty analytics data if no historical sessions exist or if 404 is encountered.
 *
 * @returns {Promise<{ success: boolean, data: object, analytics: object }>}
 */
export const getDashboardAnalytics = async () => {
  try {
    const res = await nodeClient.get(API_ENDPOINTS.PROFILE.EMOTION_ANALYTICS);
    return res.data;
  } catch (err) {
    console.warn("[dashboardApi] Analytics fetch error:", err.message);
    const emptyFallback = {
      totalSessions: 0,
      totalUserMessages: 0,
      averageDistressScore: 0,
      dominantEmotion: "neutral",
      emotionCounts: { happy: 0, sad: 0, angry: 0, fear: 0, surprise: 0, disgust: 0, neutral: 0, unknown: 0 },
      emotionDistribution: { happy: 0, sad: 0, angry: 0, fear: 0, surprise: 0, disgust: 0, neutral: 0, unknown: 0 },
      emotionPercentages: { happy: 0, sad: 0, angry: 0, fear: 0, surprise: 0, disgust: 0, neutral: 0, unknown: 0 },
      sessionsByDistress: { high: [], medium: [], low: [] },
      sessionAnalytics: [],
      distressTrend: [],
      emotionTrend: [],
    };
    return {
      success: true,
      data: emptyFallback,
      analytics: emptyFallback,
    };
  }
};
