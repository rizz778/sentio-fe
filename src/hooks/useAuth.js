/**
 * useAuth.js — Authentication Context & Management (Google Auth)
 * ==============================================================
 * Centralises user session, Google OAuth authentication, and token management
 * via a single shared React Context (AuthProvider) so all components
 * (Navbar, Login, App routes) stay in sync automatically.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { loginWithGoogle, fetchCurrentUser } from "../services/authApi";
import { getToken, getUser, logout as clearAuthStorage } from "../utils/auth";

/**
 * Decodes a Google ID token (JWT) payload and checks if it is expired.
 * Safely handles Base64URL encoding (RFC 7515 / RFC 4648) with padding.
 * @param {string} token
 * @returns {boolean} true if the token is expired or unreadable
 */
function isTokenExpired(token) {
  if (!token || typeof token !== "string") return true;
  try {
    const parts = token.split(".");
    if (parts.length < 2) return true;
    const base64Url = parts[1];
    let base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4 !== 0) {
      base64 += "=";
    }
    const binaryStr = atob(base64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    const decoded = new TextDecoder().decode(bytes);
    const payload = JSON.parse(decoded);

    if (payload && typeof payload.exp === "number") {
      // `exp` is seconds since epoch; Date.now() is ms
      return payload.exp * 1000 < Date.now();
    }
    return false;
  } catch {
    // If decoding fails, only treat as expired if token is clearly malformed
    return false;
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

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => getValidToken());
  const [user, setUser] = useState(() => (getValidToken() ? getUser() : null));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Synchronise state across browser tabs and on direct storage changes
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === "token" || e.key === "user") {
        const currentToken = getValidToken();
        setToken(currentToken);
        setUser(currentToken ? getUser() : null);
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

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
    // Clear all Sentio session data so the next user starts clean
    localStorage.removeItem("activeSession");
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

  const value = {
    token,
    user,
    isAuthenticated: Boolean(token),
    loading,
    error,
    signInWithGoogle,
    signOut,
    refreshUser,
  };

  return React.createElement(AuthContext.Provider, { value }, children);
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    // Safe fallback if called outside AuthProvider
    const token = getValidToken();
    return {
      token,
      user: token ? getUser() : null,
      isAuthenticated: Boolean(token),
      loading: false,
      error: null,
      signInWithGoogle: async () => {},
      signOut: () => {},
      refreshUser: async () => {},
    };
  }
  return context;
};
