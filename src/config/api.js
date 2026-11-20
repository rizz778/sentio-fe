/**
 * api.js — Central Gateway & Service Configuration
 * ==================================================
 * Single source of truth for backend endpoints, avoiding hardcoded URLs
 * across components, pages, hooks, and feature APIs.
 */

export const GATEWAY_URL =
  import.meta.env.VITE_GATEWAY_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:4000";

export const WS_GATEWAY_URL =
  import.meta.env.VITE_WS_URL ||
  "ws://localhost:4000";

export const API_ENDPOINTS = {
  AUTH: {
    GOOGLE: "/auth/google",
    LOGIN: "/api/auth/login",
    SIGNUP: "/api/auth/signup",
    ME: "/auth/me",
  },
  SESSIONS: {
    BASE: "/api/chat/sessions",
    BY_ID: (id) => `/api/chat/sessions/${id}`,
    MESSAGES: (id) => `/api/chat/sessions/${id}/messages`,
  },
  PROFILE: {
    BASE: "/api/profile",
    BY_ID: (userId) => `/api/profile/${userId}`,
    UPLOAD_PICTURE: "/api/profile/upload-picture",
    DELETE_PICTURE: "/api/profile/delete-picture",
    EMOTION_ANALYTICS: "/api/profile/emotion/user",
  },
  WS_LIVE: "/ws/live",
};
