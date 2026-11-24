/**
 * api.js — Central Gateway & Service Configuration
 * ==================================================
 * Single source of truth for backend endpoints, avoiding hardcoded URLs
 * across components, pages, hooks, and feature APIs.
 */

// Determine base Gateway REST URL (auto-upgrade http -> https on remote/HTTPS pages)
const getRawGatewayUrl = () => {
  return (
    import.meta.env.VITE_GATEWAY_URL ||
    import.meta.env.VITE_API_BASE_URL ||
    "http://localhost:4000"
  ).trim().replace(/\/+$/, "");
};

const resolveGatewayUrl = () => {
  let url = getRawGatewayUrl();
  const isHttpsPage = typeof window !== "undefined" && window.location.protocol === "https:";
  const isRemote = !url.includes("localhost") && !url.includes("127.0.0.1");
  if ((isHttpsPage || isRemote) && url.startsWith("http://")) {
    url = url.replace("http://", "https://");
  }
  return url;
};

// Determine Gateway WebSocket URL (auto-upgrade ws -> wss on remote/HTTPS pages)
const resolveWsUrl = () => {
  let url = (
    import.meta.env.VITE_WS_URL ||
    import.meta.env.VITE_GEMINI_WS_AUDIO_URL ||
    ""
  ).trim().replace(/\/+$/, "");

  if (!url) {
    const gw = resolveGatewayUrl();
    url = gw.replace(/^https?:/, gw.startsWith("https") ? "wss:" : "ws:");
  }

  // Normalize protocol
  if (url.startsWith("http://")) url = url.replace("http://", "ws://");
  if (url.startsWith("https://")) url = url.replace("https://", "wss://");

  const isHttpsPage = typeof window !== "undefined" && window.location.protocol === "https:";
  const isRemote = !url.includes("localhost") && !url.includes("127.0.0.1");

  if ((isHttpsPage || isRemote) && url.startsWith("ws://")) {
    url = url.replace("ws://", "wss://");
  }

  return url;
};

// Determine base Node Backend REST URL for direct health warming
const getRawNodeBackendUrl = () => {
  return (
    import.meta.env.      ||
    (typeof window !== "undefined" && !window.location.hostname.includes("localhost")
      ? "https://sentio-node-backend.onrender.com"
      : "http://localhost:5000")
  ).trim().replace(/\/+$/, "");
};

const resolveNodeBackendUrl = () => {
  let url = getRawNodeBackendUrl();
  const isHttpsPage = typeof window !== "undefined" && window.location.protocol === "https:";
  const isRemote = !url.includes("localhost") && !url.includes("127.0.0.1");
  if ((isHttpsPage || isRemote) && url.startsWith("http://")) {
    url = url.replace("http://", "https://");
  }
  return url;
};

export const GATEWAY_URL = resolveGatewayUrl();
export const WS_GATEWAY_URL = resolveWsUrl();
export const NODE_BACKEND_URL = resolveNodeBackendUrl();

export const API_ENDPOINTS = {
  AUTH: {
    GOOGLE: "/auth/google",
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
