import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Layout, Menu, Button, Input, Spin, message as antdMessage,
} from "antd";
import {
  SendOutlined, PlusOutlined, AudioOutlined,
  PhoneOutlined, MessageOutlined,
  MenuUnfoldOutlined, MenuFoldOutlined,
} from "@ant-design/icons";
import { motion } from "framer-motion";

import GeminiAudioChatModal from "../components/audio-test2";
import { formatText, createMessageObject } from "../utils/chatUtils";

import { useChatSessions } from "../hooks/useChatSessions";
import { useGeminiChat } from "../hooks/useGeminiChat";
import { useDistressNotification } from "../hooks/useDistressNotification";

const { Sider, Content } = Layout;

const ChatPage = () => {
  // ── Session & messages (Node backend) ────────────────────────────────────
  const {
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
    createSession,
    fetchMessages,
    messageIdRef,
  } = useChatSessions();

  // ── UI state ──────────────────────────────────────────────────────────────
  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.innerWidth < 768);
  const [collapsed, setCollapsed] = useState(() => typeof window !== "undefined" && window.innerWidth < 768);
  const [isAudioModalVisible, setIsAudioModalVisible] = useState(false);
  const [input, setInput] = useState("");
  const [listening, setListening] = useState(false);
  const [audioUrl, setAudioUrl] = useState("");

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) setCollapsed(true);
    };
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // ── Message helpers ───────────────────────────────────────────────────────
  // Appends to both the visible list and the audio modal history mirror
  const addMessage = useCallback((type, content) => {
    const msg = createMessageObject(type, content, messageIdRef);
    if (!msg) return;
    setMessages((prev) => [...prev, msg]);
    setAudioConversationHistory((prev) => [...prev, msg]);
  }, [messageIdRef, setMessages, setAudioConversationHistory]);

  const addSystemMessage = useCallback(
    (content) => addMessage("system", content),
    [addMessage]
  );

  // ── Gemini Live WebSocket hook via Gateway ───────────────────────────────
  const {
    isConnected,
    hasActiveSession,
    isTyping,
    currentResponse,
    distressScore,
    sendTurn,
    refreshSession,
    send: sendWsMessage,
  } = useGeminiChat({
    activeSession,
    addMessage,
    addSystemMessage,
    enabled: Boolean(activeSession),
  });

  // ── Distress notification (reactive to server distress_update events) ──────
  useDistressNotification(distressScore);

  // ── Auto-scroll ───────────────────────────────────────────────────────────
  const messagesEndRef = useRef(null);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, currentResponse]);

  // ── Refresh Gemini context when session switches ───────────────────────────
  useEffect(() => {
    if (!activeSession) return;
    const t = setTimeout(refreshSession, 500);
    return () => clearTimeout(t);
  }, [activeSession, refreshSession]);

  // ── Send message ──────────────────────────────────────────────────────────
  const handleSendMessage = async () => {
    const text = input.trim();
    if (!text || isTyping) return;

    if (!isConnected) {
      antdMessage.warning("Connecting to server, please try again.");
      return;
    }

    sendTurn(text);
    addMessage("user", text);
    setInput("");
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // ── Audio modal close ─────────────────────────────────────────────────────
  const handleAudioChatClose = async (sessionId) => {
    if (!sessionId) return;
    await fetchMessages(sessionId);
    refreshSession();
  };

  // ── TTS playback ──────────────────────────────────────────────────────────
  const handlePlayAudio = () => {
    if (audioUrl) {
      new Audio(audioUrl).play().catch((e) => console.error("Audio playback:", e));
    }
  };

  // ==========================================================================
  // Render
  // ==========================================================================
  return (
    <>
      <Layout style={{ height: "calc(100dvh - 80px)", minHeight: "calc(100vh - 80px)", overflow: "hidden", position: "relative" }}>
        {/* Mobile backdrop when sidebar is open */}
        {isMobile && !collapsed && (
          <div
            onClick={() => setCollapsed(true)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0, 0, 0, 0.45)",
              zIndex: 99,
              backdropFilter: "blur(2px)",
            }}
          />
        )}

        {/* Sidebar: session list + action buttons */}
        <Sider
          width={isMobile ? 260 : 260}
          collapsible
          collapsed={collapsed}
          collapsedWidth={isMobile ? 0 : 65}
          onCollapse={(val) => setCollapsed(val)}
          style={{
            height: "calc(100dvh - 80px)",
            background: "#f9a8d4",
            overflow: "hidden",
            boxShadow: isMobile && !collapsed ? "4px 0 20px rgba(0,0,0,0.25)" : "2px 0 8px rgba(0,0,0,0.05)",
            position: isMobile ? "absolute" : "relative",
            zIndex: isMobile ? 100 : 1,
            left: 0,
            top: 0,
            transition: "all 0.25s ease-in-out",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              height: "100%",
              overflow: "hidden",
            }}
          >
            {/* Header: fixed at top */}
            <div style={{ padding: "16px 12px", textAlign: "center", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h3 style={{ color: "#fff", margin: 0, fontWeight: "bold", fontSize: collapsed ? "18px" : "16px", flex: 1 }}>
                {!collapsed ? "Chat Sessions" : "💬"}
              </h3>
              {isMobile && !collapsed && (
                <Button
                  type="text"
                  size="small"
                  onClick={() => setCollapsed(true)}
                  style={{ color: "#fff", fontWeight: "bold" }}
                >
                  ✕
                </Button>
              )}
            </div>

            {/* Session list – independently scrollable */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                overflowX: "hidden",
                minHeight: 0,
                padding: collapsed ? "0 4px" : "0 8px",
              }}
            >
              <Menu
                theme="light"
                mode="inline"
                selectedKeys={[activeSession]}
                onClick={({ key }) => {
                  setActiveSession(key);
                  fetchMessages(key);
                  if (isMobile) setCollapsed(true);
                }}
                style={{ background: "transparent", border: "none" }}
                items={chatSessions.map((s, idx) => {
                  const displayName = s.sessionName || `Chat ${chatSessions.length - idx}`;
                  return {
                    key: s._id || s.sessionId,
                    icon: <MessageOutlined style={{ fontSize: "16px" }} />,
                    label: !collapsed ? displayName : "",
                    title: displayName,
                  };
                })}
              />
            </div>

            {/* Pinned action buttons at bottom of sidebar */}
            <div
              style={{
                flexShrink: 0,
                marginTop: "auto",
                padding: collapsed ? "10px 6px" : "14px 12px",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                borderTop: "1px solid rgba(255, 255, 255, 0.3)",
                background: "#f9a8d4",
              }}
            >
              {/* New Chat */}
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => {
                  createSession();
                  if (isMobile) setCollapsed(true);
                }}
                title="New Chat"
                style={{
                  backgroundColor: "#ff4caf",
                  borderColor: "#d9363e",
                  color: "white",
                  fontWeight: "bold",
                  borderRadius: "8px",
                  height: "40px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {!collapsed && <span>New Chat</span>}
              </Button>

              {/* Switch to Audio modal */}
              <Button
                type="primary"
                icon={<PhoneOutlined />}
                onClick={() => {
                  setIsAudioModalVisible(true);
                  if (isMobile) setCollapsed(true);
                }}
                title="Switch to Audio"
                style={{
                  backgroundColor: "#007AFF",
                  borderColor: "#0056b3",
                  color: "white",
                  fontWeight: "bold",
                  borderRadius: "8px",
                  height: "40px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {!collapsed && <span>Switch to Audio</span>}
              </Button>
            </div>
          </div>
        </Sider>

        {/* Main chat content */}
        <Layout style={{ height: "calc(100dvh - 80px)", background: "#fff", overflow: "hidden" }}>
          <Content
            style={{
              padding: isMobile ? "8px 10px" : "16px 20px",
              display: "flex",
              flexDirection: "column",
              height: "100%",
              background: "#fff",
              overflow: "hidden",
            }}
          >
            {/* Mobile Top Header */}
            {isMobile && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "6px 8px",
                  background: "#fff0f6",
                  border: "1px solid #ffd6e7",
                  borderRadius: 10,
                  marginBottom: 8,
                  flexShrink: 0,
                }}
              >
                <Button
                  icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                  onClick={() => setCollapsed(!collapsed)}
                  size="middle"
                  style={{ border: "none", background: "transparent", fontSize: 16 }}
                />
                <span
                  style={{
                    fontWeight: 600,
                    fontSize: 14,
                    color: "#9e1068",
                    maxWidth: "50%",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {chatSessions.find((s) => (s._id || s.sessionId) === activeSession)?.sessionName || "Sentio Chat"}
                </span>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <Button
                    type="primary"
                    icon={<PhoneOutlined />}
                    onClick={() => setIsAudioModalVisible(true)}
                    style={{
                      background: "linear-gradient(135deg, #007AFF 0%, #0056b3 100%)",
                      borderColor: "#007AFF",
                      fontWeight: 600,
                      borderRadius: "20px",
                      fontSize: "12px",
                      height: "32px",
                      padding: "0 10px",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      boxShadow: "0 2px 8px rgba(0, 122, 255, 0.35)",
                    }}
                    title="Live Voice Call"
                  >
                    <span>Voice Call</span>
                  </Button>
                  <Button
                    shape="circle"
                    size="middle"
                    icon={<PlusOutlined />}
                    onClick={() => createSession()}
                    title="New Chat"
                  />
                </div>
              </div>
            )}

            {/* Messages scroll area */}
            <motion.div
              style={{
                flex: 1,
                overflowY: "auto",
                marginBottom: isMobile ? "8px" : "12px",
                padding: isMobile ? "10px 8px" : "16px",
                border: "1px solid #f0f0f0",
                borderRadius: "12px",
                background: "#fafafa",
                minHeight: 0,
              }}
            >
              {messages.map((msg, i) => (
                <motion.div
                  key={msg.id || i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    marginBottom: isMobile ? "10px" : "15px",
                    padding: isMobile ? "10px 12px" : "12px 16px",
                    borderRadius: "12px",
                    backgroundColor: msg.sender === "user" ? "#e6f7ff" : msg.sender === "bot" ? "#fff" : "#f0f0f0",
                    border: msg.sender === "bot" ? "1px solid #ffe4ed" : "none",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                    marginLeft: msg.sender === "user" ? "auto" : "0",
                    marginRight: msg.sender === "user" ? "0" : "auto",
                    maxWidth: isMobile ? "92%" : "80%",
                    fontSize: isMobile ? "13.5px" : "14px",
                    lineHeight: 1.5,
                  }}
                >
                  <div style={{ marginBottom: "4px" }}>
                    <strong style={{ color: msg.sender === "user" ? "#0958d9" : "#e83e8c" }}>
                      {msg.sender === "user" ? "You" : msg.sender === "bot" ? "Sentio AI" : "System"}:
                    </strong>
                  </div>
                  {msg.jsx
                    ? msg.jsx
                    : <div dangerouslySetInnerHTML={{ __html: formatText(msg.text || msg.content || "") }} />
                  }
                </motion.div>
              ))}

              {/* Streaming typing bubble – shows partial response as it arrives */}
              {isTyping && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  style={{ padding: "12px 16px", backgroundColor: "#fff", borderRadius: "12px", marginBottom: "10px", border: "1px solid #ffe4ed", maxWidth: "80%" }}>
                  <strong style={{ color: "#e83e8c" }}>Sentio AI:</strong>{" "}
                  {currentResponse ? (
                    <span dangerouslySetInnerHTML={{ __html: formatText(currentResponse) }} />
                  ) : (
                    <>
                      <span style={{ color: "#8c8c8c" }}>Thinking...</span>
                      <Spin size="small" style={{ marginLeft: "10px" }} />
                    </>
                  )}
                </motion.div>
              )}

              {/* Spinner while messages are loading from backend for an empty chat */}
              {loading && messages.length === 0 && (
                <div style={{ display: "flex", justifyContent: "center", padding: "20px" }}>
                  <Spin size="default" />
                </div>
              )}

              <div ref={messagesEndRef} />
            </motion.div>

            {/* Prominent Live Voice Call CTA Banner on Mobile */}
            {isMobile && (
              <div
                onClick={() => setIsAudioModalVisible(true)}
                role="button"
                tabIndex={0}
                style={{
                  flexShrink: 0,
                  margin: "0 0 8px 0",
                  padding: "9px 12px",
                  background: "linear-gradient(135deg, #007AFF 0%, #7928CA 60%, #f64a8a 100%)",
                  borderRadius: "14px",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  boxShadow: "0 3px 12px rgba(0, 122, 255, 0.28)",
                  cursor: "pointer",
                  userSelect: "none",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "50%",
                      backgroundColor: "rgba(255, 255, 255, 0.25)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "16px",
                      backdropFilter: "blur(4px)",
                    }}
                  >
                    🎙️
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "13px", lineHeight: 1.2 }}>
                      Start Live Voice Call
                    </div>
                    <div style={{ fontSize: "10.5px", opacity: 0.9, marginTop: "1px" }}>
                      Talk naturally with Gemini AI in real-time
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                    backgroundColor: "rgba(255, 255, 255, 0.2)",
                    padding: "4px 9px",
                    borderRadius: "20px",
                    fontSize: "11px",
                    fontWeight: 600,
                  }}
                >
                  <span style={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: "#4ade80", display: "inline-block" }} />
                  <span>Tap to Call</span>
                </div>
              </div>
            )}

            {/* Input bar: sticky/fixed to bottom */}
            <div
              style={{
                flexShrink: 0,
                display: "flex",
                gap: isMobile ? "6px" : "10px",
                alignItems: "center",
                padding: isMobile ? "8px 10px" : "12px 16px",
                background: "#fafafa",
                border: "1px solid #f0f0f0",
                borderRadius: "12px",
              }}
            >
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder={isMobile ? "Type a message..." : "Share what's on your mind..."}
                style={{
                  flex: 1,
                  borderRadius: "8px",
                  padding: isMobile ? "6px 10px" : "8px 12px",
                  fontSize: isMobile ? "13.5px" : "14px",
                }}
              />

              {/* Quick live voice call button on mobile */}
              {isMobile && (
                <Button
                  icon={<PhoneOutlined style={{ fontSize: "16px", color: "#fff" }} />}
                  onClick={() => setIsAudioModalVisible(true)}
                  shape="circle"
                  size="middle"
                  style={{
                    background: "linear-gradient(135deg, #007AFF 0%, #0056b3 100%)",
                    borderColor: "#007AFF",
                    boxShadow: "0 2px 8px rgba(0, 122, 255, 0.35)",
                    flexShrink: 0,
                  }}
                  title="Live Voice Call"
                />
              )}

              {/* Send – disabled while Gemini is streaming */}
              <Button
                icon={<SendOutlined />}
                onClick={handleSendMessage}
                type="primary"
                disabled={isTyping}
                shape="circle"
                size={isMobile ? "middle" : "large"}
                style={{ backgroundColor: "#f64a8a", borderColor: "#f64a8a" }}
              />
            </div>

            {/* Optional TTS playback (shown only when backend returns an audio URL) */}
            {audioUrl && (
              <Button onClick={handlePlayAudio} style={{ marginTop: "10px", alignSelf: "center", flexShrink: 0 }}>
                🔊 Play Audio Response
              </Button>
            )}
          </Content>
        </Layout>
      </Layout>

      {/* Audio chat modal – refreshes messages + Gemini context on close */}
      <GeminiAudioChatModal
        visible={isAudioModalVisible}
        onClose={() => setIsAudioModalVisible(false)}
        userProfile={userProfile}
        conversationHistory={audioConversationHistory}
        sessionId={activeSession}
        onAudioChatClose={handleAudioChatClose}
      />
    </>
  );
};

export default ChatPage;
