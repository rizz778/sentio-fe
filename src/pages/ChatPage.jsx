import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Layout, Menu, Button, Input, Spin, message as antdMessage,
} from "antd";
import {
  SendOutlined, PlusOutlined, AudioOutlined,
  CameraOutlined, PhoneOutlined, MessageOutlined,
} from "@ant-design/icons";
import { motion } from "framer-motion";

import GeminiAudioChatModal from "../components/audio-test2";
import { formatText, createMessageObject } from "../utils/chatUtils";

import { useChatSessions }         from "../hooks/useChatSessions";
import { useEmotionDetection }     from "../hooks/useEmotionDetection";
import { useGeminiChat }           from "../hooks/useGeminiChat";
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

  // ── Webcam emotion detection ──────────────────────────────────────────────
  const {
    emotion,
    emotionDetectionEnabled,
    setEmotionDetectionEnabled,
    videoRef,
    canvasRef,
  } = useEmotionDetection(activeSession, {
    onFrame: (frameMsg) => {
      // Send camera frames through the existing Gemini WS connection (not a separate one)
      if (sendWsMessage && isConnected) {
        sendWsMessage(frameMsg);
      }
    },
  });

  // ── UI state ──────────────────────────────────────────────────────────────
  const [collapsed, setCollapsed]                     = useState(false);
  const [isAudioModalVisible, setIsAudioModalVisible] = useState(false);
  const [input, setInput]                             = useState("");
  const [listening, setListening]                     = useState(false);
  const [audioUrl, setAudioUrl]                       = useState("");

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
    emotionRef: emotion,
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

    sendTurn(text, emotion.current);
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
      {/* Hidden elements for emotion detection (off-screen webcam capture) */}
      <video ref={videoRef} style={{ display: "none" }} autoPlay muted width="640" height="480" />
      <canvas ref={canvasRef} style={{ display: "none" }} width="640" height="480" />

      <Layout style={{ height: "calc(100dvh - 80px)", minHeight: "calc(100vh - 80px)", overflow: "hidden" }}>
        {/* Sidebar: session list + action buttons */}
        <Sider
          width={260}
          collapsible
          collapsed={collapsed}
          collapsedWidth={65}
          onCollapse={(val) => setCollapsed(val)}
          style={{
            height: "calc(100dvh - 80px)",
            background: "#f9a8d4",
            overflow: "hidden",
            boxShadow: "2px 0 8px rgba(0,0,0,0.05)",
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
            <div style={{ padding: "16px 12px", textAlign: "center", flexShrink: 0 }}>
              <h3 style={{ color: "#fff", margin: 0, fontWeight: "bold", fontSize: collapsed ? "18px" : "16px" }}>
                {!collapsed ? "Chat Sessions" : "💬"}
              </h3>
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
                onClick={() => createSession()}
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
                onClick={() => setIsAudioModalVisible(true)}
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

              {/* Emotion detection toggle: green=off, red=on */}
              <Button
                type="primary"
                icon={<CameraOutlined />}
                onClick={() => setEmotionDetectionEnabled((p) => !p)}
                title={emotionDetectionEnabled ? "Stop Emotion Capture" : "Capture Emotion"}
                style={{
                  backgroundColor: emotionDetectionEnabled ? "#d32f2f" : "#4CAF50",
                  borderColor: emotionDetectionEnabled ? "#b71c1c" : "#388E3C",
                  color: "white",
                  fontWeight: "bold",
                  borderRadius: "8px",
                  height: "40px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {!collapsed && <span>{emotionDetectionEnabled ? "Stop Emotion Capture" : "Capture Emotion"}</span>}
              </Button>
            </div>
          </div>
        </Sider>

        {/* Main chat content */}
        <Layout style={{ height: "calc(100dvh - 80px)", background: "#fff", overflow: "hidden" }}>
          <Content
            style={{
              padding: "16px 20px",
              display: "flex",
              flexDirection: "column",
              height: "100%",
              background: "#fff",
              overflow: "hidden",
            }}
          >

            {/* Messages scroll area */}
            <motion.div
              style={{
                flex: 1,
                overflowY: "auto",
                marginBottom: "12px",
                padding: "16px",
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
                    marginBottom: "15px",
                    padding: "12px 16px",
                    borderRadius: "12px",
                    backgroundColor: msg.sender === "user" ? "#e6f7ff" : msg.sender === "bot" ? "#fff" : "#f0f0f0",
                    border: msg.sender === "bot" ? "1px solid #ffe4ed" : "none",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                    marginLeft: msg.sender === "user" ? "auto" : "0",
                    marginRight: msg.sender === "user" ? "0" : "auto",
                    maxWidth: "80%",
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

            {/* Input bar: sticky/fixed to bottom */}
            <div
              style={{
                flexShrink: 0,
                display: "flex",
                gap: "10px",
                alignItems: "center",
                padding: "12px 16px",
                background: "#fafafa",
                border: "1px solid #f0f0f0",
                borderRadius: "12px",
              }}
            >
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Share what's on your mind..."
                style={{ flex: 1, borderRadius: "8px", padding: "8px 12px" }}
              />

              {/* Voice toggle (UI only – wire SpeechRecognition here when ready) */}
              <Button icon={<AudioOutlined />}
                onClick={() => { setListening(!listening); antdMessage.info(listening ? "Voice input paused" : "Voice input ready"); }}
                type={listening ? "primary" : "default"} danger={listening}
                shape="circle" size="large"
              />

              {/* Send – disabled while Gemini is streaming */}
              <Button icon={<SendOutlined />} onClick={handleSendMessage}
                type="primary" disabled={isTyping} shape="circle" size="large"
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
