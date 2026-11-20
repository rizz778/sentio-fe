/**
 * authApi.js — Feature API: Authentication
 * ==========================================
 * Handles Google OAuth authentication through the Sentio API Gateway.
 */

import { gatewayClient } from "./apiClient";
import { API_ENDPOINTS } from "../config/api";

/**
 * Authenticate with Google credential ID token.
 * Syncs user to MongoDB via Gateway and returns token and user object.
 *
 * @param {string} credential - Google OAuth credential / ID token
 * @returns {Promise<{ token: string, user: object }>}
 */
export const loginWithGoogle = async (credential) => {
  const res = await gatewayClient.post(API_ENDPOINTS.AUTH.GOOGLE, { credential });
  return res.data;
};

/**
 * Fetch current authenticated user info from Gateway.
 *
 * @returns {Promise<object>}
 */
export const fetchCurrentUser = async () => {
  const res = await gatewayClient.get(API_ENDPOINTS.AUTH.ME);
  return res.data?.user;
};
