/**
 * useChatSessions.js — Hook: Chat Session & Message Management
 * =============================================================
 * Manages the full session lifecycle:
 *  - Loads sessions on mount, selects the last-used one from localStorage
 *  - Creates new sessions
 *  - Fetches & stores messages per session
 *  - Saves individual messages to the Node backend
 *  - Loads the user's profile once on mount
 *
 * Imports from chatSessionsApi + profileApi (feature APIs),
 * NOT from the monolithic chatApi barrel.
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { message as antdMessage } from "antd";
import {
  fetchSessions,
  createSession as createSessionApi,
  fetchSessionMessages,
  saveSessionMessage,
} from "../services/chatSessionsApi";
import { fetchUserProfile as fetchUserProfileApi } from "../services/profileApi";

export const useChatSessions = () => {
  const [chatSessions, setChatSessions]           = useState([]);
  const [activeSession, setActiveSession]         = useState(
    () => localStorage.getItem("activeSession") || null
  );
  const [messages, setMessages]                   = useState([]);
  const [audioConversationHistory, setAudioConversationHistory] = useState([]);
  const [userProfile, setUserProfile]             = useState({});
  const [profileLoading, setProfileLoading]       = useState(true);
  const [loading, setLoading]                     = useState(false);
  const messageIdRef = useRef(1);

  // ── Sessions ────────────────────────────────────────────────────────────────

  /** Load all sessions; restore last-used or create a default one */
  const loadSessions = useCallback(async () => {
    try {
      const sessions = await fetchSessions();
      setChatSessions(sessions || []);

      const saved   = localStorage.getItem("activeSession");
      const isValid = (sessions || []).find((s) => s._id === saved);

      if (isValid) {
        setActiveSession(saved);
      } else if (sessions?.length > 0) {
        setActiveSession(sessions[0]._id);
        localStorage.setItem("activeSession", sessions[0]._id);
      } else {
        // No sessions exist — create an initial one
        const newSession = await createSessionApi("Session 1");
        setChatSessions([newSession]);
        setActiveSession(newSession._id);
        localStorage.setItem("activeSession", newSession._id);
      }
    } catch (err) {
      console.error("[useChatSessions] loadSessions error:", err);
      antdMessage.error("Failed to load chat sessions.");
    }
  }, []);

  /** Create a new named session, then refresh the session list */
  const createSession = useCallback(async () => {
    try {
      setLoading(true);
      const name       = `Chat ${chatSessions.length + 1}`;
      const newSession = await createSessionApi(name);
      await loadSessions();
      setActiveSession(newSession._id);
      localStorage.setItem("activeSession", newSession._id);
      setMessages([]);
      setAudioConversationHistory([]);
      messageIdRef.current = 1;
      antdMessage.success("New chat created");
      return newSession;
    } catch (err) {
      console.error("[useChatSessions] createSession error:", err);
      antdMessage.error("Failed to create new session.");
    } finally {
      setLoading(false);
    }
  }, [chatSessions.length, loadSessions]);

  // ── Messages ─────────────────────────────────────────────────────────────────

  /** Fetch and store messages for a given session (sorted + normalised by API) */
  const fetchMessages = useCallback(async (sessionId) => {
    if (!sessionId) return;
    try {
      setLoading(true);
      const formatted = await fetchSessionMessages(sessionId);
      setMessages(formatted);
      setAudioConversationHistory(formatted);
      messageIdRef.current = formatted.length + 1;
    } catch (err) {
      console.error("[useChatSessions] fetchMessages error:", err);
      setMessages([]);
      setAudioConversationHistory([]);
      messageIdRef.current = 1;
    } finally {
      setLoading(false);
    }
  }, []);

  /** Persist a single message to the Node backend (fire-and-forget for the UI) */
  const saveMessage = useCallback(async (sessionId, messageData) => {
    if (!sessionId || !messageData) return;
    try {
      await saveSessionMessage(sessionId, messageData);
    } catch (err) {
      console.error("[useChatSessions] saveMessage error:", err);
    }
  }, []);

  // ── User Profile ──────────────────────────────────────────────────────────

  /** Load the authenticated user's profile once on mount */
  const loadUserProfile = useCallback(async () => {
    setProfileLoading(true);
    try {
      const profile = await fetchUserProfileApi();
      setUserProfile(profile || {});
    } catch (err) {
      console.error("[useChatSessions] loadUserProfile error:", err);
    } finally {
      setProfileLoading(false);
    }
  }, []);

  // ── Effects ───────────────────────────────────────────────────────────────

  // Initial load: sessions + profile in parallel
  useEffect(() => {
    loadSessions();
    loadUserProfile();
  }, [loadSessions, loadUserProfile]);

  // Whenever the active session changes, persist it and fetch its messages
  useEffect(() => {
    if (activeSession) {
      localStorage.setItem("activeSession", activeSession);
      fetchMessages(activeSession);
    }
  }, [activeSession, fetchMessages]);

  return {
    chatSessions,
    activeSession,
    setActiveSession,
    messages,
    setMessages,
    audioConversationHistory,
    setAudioConversationHistory,
    userProfile,
    profileLoading,
    loading,
    loadSessions,
    createSession,
    fetchMessages,
    saveMessage,
    loadUserProfile,
    messageIdRef,
  };
};
