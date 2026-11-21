import axios from "axios";
import { GATEWAY_URL } from "../config/api";

const authHeader = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

/**
 * Creates an axios client configured to route through the Sentio API Gateway.
 *
 * @param {string|null} serviceName - Downstream service target ('node-backend' | 'fastapi-backend' | null)
 */
const createGatewayClient = (serviceName) => {
  const client = axios.create({ baseURL: GATEWAY_URL });

  client.interceptors.request.use(
    (config) => {
      config.headers = {
        ...config.headers,
        ...authHeader(),
        ...(serviceName ? { "x-sentio-service": serviceName } : {}),
      };
      return config;
    },
    (error) => Promise.reject(error)
  );

  client.interceptors.response.use(
    (response) => response,
    (error) => {
      // If the gateway returns 401 the stored token is expired/invalid.
      // Clear local auth state and redirect to login so the user gets a fresh token.
      if (error.response?.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("activeSession");
        // Only redirect if we're not already on an auth page
        if (!window.location.pathname.startsWith("/login") &&
            !window.location.pathname.startsWith("/signup")) {
          window.location.href = "/login";
        }
      }
      // If node-backend returns USER_NOT_SYNCED it means the Google sign-in
      // completed but the POST /auth/google sync to MongoDB hasn't happened yet.
      // Treat it the same as 401 — force a fresh login.
      if (error.response?.status === 404 &&
          error.response?.data?.code === "USER_NOT_SYNCED") {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("activeSession");
        if (!window.location.pathname.startsWith("/login") &&
            !window.location.pathname.startsWith("/signup")) {
          window.location.href = "/login";
        }
      }
      const message =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.response?.statusText ||
        error.message ||
        "Unknown API error";
      return Promise.reject(new Error(message));
    }
  );

  return client;
};

// Proxied clients through API Gateway
export const nodeClient = createGatewayClient("node-backend");
export const geminiClient = createGatewayClient("fastapi-backend");
export const gatewayClient = createGatewayClient(null); // Direct gateway endpoints (/auth/google, etc.)
