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
import { DEFAULT_SYSTEM_INSTRUCTION } from "../constants/chatConfig";
import { formatText, buildConversationTurns, createMessageObject } from "../utils/chatUtils";

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
    saveMessage,
    messageIdRef,
  } = useChatSessions();

  // ── Webcam emotion detection ──────────────────────────────────────────────
  const {
    emotion,
    emotionDetectionEnabled,
    setEmotionDetectionEnabled,
    videoRef,
    canvasRef,
  } = useEmotionDetection();

  // ── UI state ──────────────────────────────────────────────────────────────
  const [toolsEnabled]    = useState(false);
  const [collapsed, setCollapsed]                     = useState(false);
  const [isAudioModalVisible, setIsAudioModalVisible] = useState(false);
  const [input, setInput]                             = useState("");
  const [listening, setListening]                     = useState(false);
  const [audioUrl, setAudioUrl]                       = useState("");
  const [systemInstruction]                           = useState(DEFAULT_SYSTEM_INSTRUCTION);

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

  // ── Distress notification hook ────────────────────────────────────────────
  // Calls the distress API and shows an antd warning when score >= 7
  const { checkDistress } = useDistressNotification(messages);

  // ── Gemini Live WebSocket hook ────────────────────────────────────────────
  // Only connects once userProfile is loaded and a session is selected
  const geminiReady = !profileLoading && !!activeSession && Object.keys(userProfile).length > 0;

  const {
    isConnected,
    hasActiveSession,
    isTyping,
    currentResponse,
    sendTurn,
    refreshSession,
  } = useGeminiChat({
    systemInstruction,
    toolsEnabled,
    userProfile,
    messages,
    activeSession,
    addMessage,
    addSystemMessage,
    saveMessage,
    emotionRef: emotion,
    enabled: geminiReady,
  });

  // ── Auto-scroll ───────────────────────────────────────────────────────────
  const messagesEndRef = useRef(null);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, currentResponse]);

  // ── Refresh Gemini context when session switches ───────────────────────────
  useEffect(() => {
    if (!geminiReady) return;
    const t = setTimeout(refreshSession, 500);
    return () => clearTimeout(t);
  }, [activeSession, geminiReady, refreshSession]);

  // ── Send message ──────────────────────────────────────────────────────────
  const handleSendMessage = async () => {
    const text = input.trim();
    if (!text || isTyping) return;

    if (!isConnected) {
      antdMessage.warning("Connecting to server, please try again.");
      return;
    }

    const turns = buildConversationTurns(messages, text);
    sendTurn(turns, emotion.current);
    addMessage("user", text);
    checkDistress(text); // async, non-blocking
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

      <Layout style={{ height: "100vh" }}>
        {/* Sidebar: session list + action buttons */}
        <Sider
          width={260} collapsible collapsed={collapsed} collapsedWidth={60}
          onCollapse={(val) => setCollapsed(val)}
          style={{ height: "100vh", background: "#f9a8d4", overflow: "hidden", boxShadow: "2px 0 8px rgba(0,0,0,0.05)" }}
        >
          <div style={{ padding: "18px 16px", textAlign: "center" }}>
            <h3 style={{ color: "#fff", margin: 0, fontWeight: "bold" }}>
              {!collapsed ? "Chat Sessions" : "💬"}
            </h3>
          </div>

          {/* Session list – click to switch & load messages */}
          <Menu
            theme="light" mode="inline"
            selectedKeys={[activeSession]}
            onClick={({ key }) => { setActiveSession(key); fetchMessages(key); }}
            style={{ background: "transparent", border: "none" }}
            items={chatSessions.map((s) => ({
              key: s._id, icon: <MessageOutlined />,
              label: !collapsed ? s.sessionName : "",
            }))}
          />

          <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
            {/* New Chat */}
            <Button type="primary" icon={<PlusOutlined />} onClick={createSession}
              style={{ backgroundColor: "#ff4caf", borderColor: "#d9363e", color: "white", fontWeight: "bold", borderRadius: "8px", height: "40px" }}>
              {!collapsed && <span>New Chat</span>}
            </Button>

            {/* Switch to Audio modal */}
            <Button type="primary" icon={<PhoneOutlined />} onClick={() => setIsAudioModalVisible(true)}
              style={{ backgroundColor: "#007AFF", borderColor: "#0056b3", color: "white", fontWeight: "bold", borderRadius: "8px", height: "40px" }}>
              {!collapsed && <span>Switch to Audio</span>}
            </Button>

            {/* Emotion detection toggle: green=off, red=on */}
            <Button type="primary" icon={<CameraOutlined />}
              onClick={() => setEmotionDetectionEnabled((p) => !p)}
              style={{
                backgroundColor: emotionDetectionEnabled ? "#d32f2f" : "#4CAF50",
                borderColor:     emotionDetectionEnabled ? "#b71c1c" : "#388E3C",
                color: "white", fontWeight: "bold", borderRadius: "8px", height: "40px",
              }}>
              {!collapsed && <span>{emotionDetectionEnabled ? "Stop Emotion Capture" : "Capture Emotion"}</span>}
            </Button>
          </div>
        </Sider>

        {/* Main chat content */}
        <Layout>
          <Content style={{ padding: "20px", display: "flex", flexDirection: "column", height: "100vh", background: "#fff" }}>

            {/* Messages scroll area */}
            <motion.div style={{
              flex: 1, overflowY: "auto", marginBottom: "20px", padding: "16px",
              border: "1px solid #f0f0f0", borderRadius: "12px", background: "#fafafa",
            }}>
              {messages.map((msg, i) => (
                <motion.div
                  key={msg.id || i}
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  style={{
                    marginBottom: "15px", padding: "12px 16px", borderRadius: "12px",
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
                  {currentResponse || "Thinking..."}
                  <Spin size="small" style={{ marginLeft: "10px" }} />
                </motion.div>
              )}

              {/* Full-screen spinner while messages are loading from backend */}
              {loading && (
                <div style={{ display: "flex", justifyContent: "center", padding: "20px" }}>
                  <Spin size="default" />
                </div>
              )}

              <div ref={messagesEndRef} />
            </motion.div>

            {/* Input bar: [text] [🎤 voice] [➤ send] */}
            <div style={{
              display: "flex", gap: "10px", alignItems: "center", padding: "12px",
              background: "#fafafa", border: "1px solid #f0f0f0", borderRadius: "12px",
            }}>
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
              <Button onClick={handlePlayAudio} style={{ marginTop: "10px", alignSelf: "center" }}>
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
