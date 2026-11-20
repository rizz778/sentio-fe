/**
 * useAuth.js — Hook: Authentication Management
 * ==============================================
 * Centralises user session, authentication actions, and tokens.
 */

import { useState, useCallback, useEffect } from "react";
import {
  loginWithGoogle,
  loginWithEmail,
  signupWithEmail,
  fetchCurrentUser,
} from "../services/authApi";
import { getToken, getUser, logout as clearAuthStorage } from "../utils/auth";

export const useAuth = () => {
  const [token, setToken] = useState(() => getToken());
  const [user, setUser] = useState(() => getUser());
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

  const signInWithEmail = useCallback(
    async (email, password) => {
      setLoading(true);
      setError(null);
      try {
        const data = await loginWithEmail(email, password);
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

  const signUp = useCallback(
    async (username, email, password) => {
      setLoading(true);
      setError(null);
      try {
        const data = await signupWithEmail(username, email, password);
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
    signInWithEmail,
    signUp,
    signOut,
    refreshUser,
  };
};
