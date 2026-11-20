/**
 * authApi.js — Feature API: Authentication
 * ==========================================
 * Handles all authentication calls through the Sentio API Gateway.
 */

import { gatewayClient, nodeClient } from "./apiClient";
import { API_ENDPOINTS } from "../config/api";

/**
 * Authenticate with Google credential token.
 * Syncs user to MongoDB and returns user object and session info.
 *
 * @param {string} credential - Google OAuth credential / ID token
 * @returns {Promise<{ token: string, user: object }>}
 */
export const loginWithGoogle = async (credential) => {
  const res = await gatewayClient.post(API_ENDPOINTS.AUTH.GOOGLE, { credential });
  return res.data;
};

/**
 * Email/password login (routed to node-backend via gateway).
 *
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{ token: string, user: object }>}
 */
export const loginWithEmail = async (email, password) => {
  const res = await nodeClient.post(API_ENDPOINTS.AUTH.LOGIN, { email, password });
  return res.data;
};

/**
 * Email/password signup (routed to node-backend via gateway).
 *
 * @param {string} username
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{ token: string, user: object }>}
 */
export const signupWithEmail = async (username, email, password) => {
  const res = await nodeClient.post(API_ENDPOINTS.AUTH.SIGNUP, { username, email, password });
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
