/**
 * useAuth.js — Hook: Authentication Management (Google Auth)
 * ============================================================
 * Centralises user session, Google OAuth authentication, and token management.
 */

import { useState, useCallback } from "react";
import { loginWithGoogle, fetchCurrentUser } from "../services/authApi";
import { getToken, getUser, logout as clearAuthStorage } from "../utils/auth";

/**
 * Decodes a Google ID token (JWT) and checks if it is expired.
 * Google ID tokens are plain JWTs — no library needed, just base64-decode the payload.
 * @param {string} token
 * @returns {boolean} true if the token is expired or unreadable
 */
function isTokenExpired(token) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    // `exp` is seconds since epoch; Date.now() is ms
    return payload.exp * 1000 < Date.now();
  } catch {
    return true; // treat unreadable token as expired
  }
}

/**
 * Returns stored token only if it is still valid.
 * Clears localStorage if the stored token is already expired.
 */
function getValidToken() {
  const stored = getToken();
  if (!stored) return null;
  if (isTokenExpired(stored)) {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("activeSession");
    return null;
  }
  return stored;
}

export const useAuth = () => {
  const [token, setToken] = useState(() => getValidToken());
  const [user, setUser] = useState(() => (getValidToken() ? getUser() : null));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const saveAuthSession = useCallback((authData) => {
    if (authData?.token) {
      localStorage.setItem("token", authData.token);
      setToken(authData.token);
    }
    if (authData?.user) {
      localStorage.setItem("user", JSON.stringify(authData.user));
      setUser(authData.user);
      if (authData.user.initialSessionId) {
        localStorage.setItem("activeSession", authData.user.initialSessionId);
      }
    }
  }, []);

  const signInWithGoogle = useCallback(
    async (credential) => {
      setLoading(true);
      setError(null);
      try {
        const data = await loginWithGoogle(credential);
        saveAuthSession(data);
        return data;
      } catch (err) {
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [saveAuthSession]
  );

  const signOut = useCallback(() => {
    clearAuthStorage();
    setToken(null);
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    if (!getToken()) return null;
    try {
      const currentUser = await fetchCurrentUser();
      if (currentUser) {
        setUser(currentUser);
        localStorage.setItem("user", JSON.stringify(currentUser));
      }
      return currentUser;
    } catch (_) {
      return null;
    }
  }, []);

  return {
    user,
    token,
    isAuthenticated: Boolean(token),
    loading,
    error,
    signInWithGoogle,
    signOut,
    refreshUser,
  };
};
