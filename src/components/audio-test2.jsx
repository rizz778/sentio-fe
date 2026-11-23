/**
 * audio-test2.jsx — GeminiAudioChatModal
 * ========================================
 * Thin shell component for the Gemini audio call UI.
 * All logic lives in hooks — this file is pure orchestration + render.
 *
 * Hook responsibilities
 * ---------------------
 *  useAudioLogger      – timestamped activity log (addLog, logs)
 *  useAudioPlayer      – Web Audio gapless streaming playback
 *  useAudioRecorder    – Mic capture → 16-bit PCM → base64
 *  useEmotionDetection – Webcam → WS frames → emotion label
 *  useDistressNotification – Distress score API + antd warning (utility-as-hook)
 *  useAudioSession     – Gemini audio WS (connect, frames, saveMessage)
 */

import React, { useState, useEffect, useCallback } from "react";
import { Mic, MicOff } from "lucide-react";
import { Modal, Button, Alert } from "antd";

import { useAudioLogger }         from "../hooks/useAudioLogger";
import { useAudioPlayer }         from "../hooks/useAudioPlayer";
import { useAudioRecorder }       from "../hooks/useAudioRecorder";
import { useEmotionDetection }    from "../hooks/useEmotionDetection";
import { useDistressNotification } from "../hooks/useDistressNotification";
import { useAudioSession }        from "../hooks/useAudioSession";

const GeminiAudioChatModal = ({
  visible,
  onClose,
  userProfile,
  conversationHistory,
  sessionId,
  onAudioChatClose,
}) => {
  // ── Shared logger ─────────────────────────────────────────────────────────
  const { logs, addLog, clearLogs } = useAudioLogger();

  // ── Audio playback ────────────────────────────────────────────────────────
  const {
    initAudioContext,
    resumeIfSuspended,
    processAudioQueue,
    queueAudio,
    clearAudioQueue,
    destroyAudioContext,
    isPlaying,
    audioQueueLength,
  } = useAudioPlayer(addLog);

  // ── Emotion detection ─────────────────────────────────────────────────────
  const {
    emotion,
    emotionDetectionEnabled,
    setEmotionDetectionEnabled,
    videoRef,
    canvasRef,
  } = useEmotionDetection(sessionId);

  // ── UI state ──────────────────────────────────────────────────────────────
  const [isMuted, setIsMuted] = useState(false);

  // ── Mic recorder ─────────────────────────────────────────────────────────
  const { isRecording, startRecording, stopRecording, cleanup: cleanupRecorder } =
    useAudioRecorder(addLog);

  // ── Audio WS session ──────────────────────────────────────────────────────
  const {
    connectionStatus,
    isConnected,
    isCalling,
    log,
    inputTranscript,
    outputTranscript,
    distressScore,
    connect,
    disconnect,
    sendAudio,
    interrupt,
    reset: resetSession,
  } = useAudioSession({
    sessionId,
    emotionState: emotion,
    isMuted,
    addLog,
    queueAudio,
    processAudioQueue,
    clearAudioQueue,
  });

  // ── Distress notification (triggers when backend distressScore >= 7) ──────
  useDistressNotification(distressScore);

  // ── Lifecycle: initialise audio context, wire user-interaction resume ─────
  useEffect(() => {
    initAudioContext();

    const resume = () => resumeIfSuspended();
    document.addEventListener("click",   resume);
    document.addEventListener("keydown", resume);

    return () => {
      document.removeEventListener("click",   resume);
      document.removeEventListener("keydown", resume);
      cleanupRecorder();
      disconnect();
      clearAudioQueue();
      destroyAudioContext();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Reset & auto-connect when modal opens ────────────────────────────────
  useEffect(() => {
    if (!visible) return;
    resetSession();
    clearLogs();
    // Note: distressScore is managed entirely by the backend via WS events.
    // No local distress state to reset here.
    initAudioContext();
    connect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // ── Recording handlers ────────────────────────────────────────────────────

  const handleStartRecording = useCallback(async () => {
    const currentEmotion = emotionDetectionEnabled ? emotion.aggregated || "" : "";
    await startRecording((pcmChunk) => {
      if (!isMuted) {
        sendAudio(pcmChunk);
      }
    }, currentEmotion);
  }, [emotionDetectionEnabled, emotion, startRecording, isMuted, sendAudio]);

  const handleStopRecording = useCallback(async () => {
    await stopRecording();
  }, [stopRecording]);

  // ── Modal close ───────────────────────────────────────────────────────────

  const handleClose = useCallback(() => {
    if (isRecording) stopRecording();
    disconnect();
    clearAudioQueue();
    destroyAudioContext();
    onClose?.();
    onAudioChatClose?.(sessionId);
  }, [isRecording, stopRecording, disconnect, clearAudioQueue, destroyAudioContext, onClose, onAudioChatClose, sessionId]);

  // ── Mobile viewport detection ─────────────────────────────────────────────
  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.innerWidth < 640);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // ==========================================================================
  // Render
  // ==========================================================================
  return (
    <Modal
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: isMobile ? 15 : 17 }}>
          <span style={{ fontSize: 18 }}>🎙️</span>
          <span>Gemini Live Voice Call</span>
          {isRecording && (
            <span
              style={{
                fontSize: 11,
                background: "#e6f7ff",
                color: "#007AFF",
                border: "1px solid #91caff",
                borderRadius: 12,
                padding: "2px 8px",
                fontWeight: "normal",
              }}
            >
              ● LIVE
            </span>
          )}
        </div>
      }
      open={visible}
      onCancel={handleClose}
      width="min(95vw, 540px)"
      style={{ top: isMobile ? 12 : 40, maxWidth: "96vw" }}
      footer={[
        <Button
          key="emotion"
          onClick={() => setEmotionDetectionEnabled((v) => !v)}
          type={emotionDetectionEnabled ? "primary" : "default"}
          size={isMobile ? "small" : "middle"}
        >
          {emotionDetectionEnabled
            ? (isMobile ? "Emotion: ON" : "Disable Emotion")
            : (isMobile ? "Emotion: OFF" : "Enable Emotion")}
        </Button>,
        <Button
          key="close"
          onClick={handleClose}
          disabled={isCalling || isRecording}
          size={isMobile ? "small" : "middle"}
        >
          Close
        </Button>,
      ]}
    >
      <div style={{ textAlign: "center", padding: isMobile ? "8px 4px" : "16px 12px" }}>
        <p style={{ margin: "0 0 10px 0", color: "#666", fontSize: isMobile ? 13 : 14 }}>
          {isRecording
            ? "Live bidirectional audio active. Speak naturally; Gemini responds in real-time."
            : "Tap below to connect your microphone and speak in real-time."}
        </p>

        {/* Connection / error status bar */}
        {log && (
          <Alert
            message={log}
            type={connectionStatus === "error" ? "error" : "info"}
            showIcon
            style={{ marginTop: 8, marginBottom: 8, fontSize: isMobile ? 12 : 13, textAlign: "left" }}
          />
        )}

        {/* Mic toggle & action buttons */}
        <div
          style={{
            margin: "14px 0",
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: isMobile ? 8 : 12,
          }}
        >
          <Button
            type={isRecording ? "primary" : "default"}
            danger={isRecording}
            icon={isRecording ? <MicOff size={16} /> : <Mic size={16} />}
            onClick={isRecording ? handleStopRecording : handleStartRecording}
            disabled={connectionStatus !== "connected"}
            size={isMobile ? "middle" : "large"}
            style={{
              borderRadius: 8,
              minWidth: isMobile ? 140 : 180,
              height: isMobile ? 38 : 42,
              fontWeight: 600,
            }}
          >
            {isRecording ? "Mute Microphone" : "Start Live Voice Call"}
          </Button>

          {isRecording && (
            <Button
              onClick={interrupt}
              size={isMobile ? "middle" : "large"}
              style={{
                borderRadius: 8,
                height: isMobile ? 38 : 42,
              }}
            >
              Interrupt AI
            </Button>
          )}
        </div>

        {/* Transcript display */}
        {(inputTranscript || outputTranscript) && (
          <div
            style={{
              margin: "14px 0",
              textAlign: "left",
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: 10,
              padding: isMobile ? "10px 12px" : "14px 16px",
              maxHeight: isMobile ? "30vh" : "38vh",
              overflowY: "auto",
              fontSize: isMobile ? 13 : 14,
              lineHeight: 1.5,
              wordBreak: "break-word",
            }}
          >
            {inputTranscript && (
              <div style={{ marginBottom: 8 }}>
                <b style={{ color: "#007AFF" }}>You:</b>{" "}
                <span style={{ color: "#1e293b" }}>{inputTranscript}</span>
              </div>
            )}
            {outputTranscript && (
              <div>
                <b style={{ color: "#f64a8a" }}>Gemini:</b>{" "}
                <span style={{ color: "#334155" }}>{outputTranscript}</span>
              </div>
            )}
          </div>
        )}

        {/* Emotion detection panel */}
        {emotionDetectionEnabled && (
          <div
            style={{
              marginTop: 12,
              textAlign: "left",
              background: "#fdf2f8",
              border: "1px solid #fbcfe8",
              borderRadius: 8,
              padding: isMobile ? "8px 10px" : "10px 14px",
              fontSize: isMobile ? 12 : 13,
            }}
          >
            <b>Detected Emotion:</b>{" "}
            <span style={{ color: "#db2777", fontWeight: 600 }}>
              {emotion.aggregated || <i>Detecting...</i>}
            </span>
            {emotion.playback && (
              <span style={{ color: "#888", marginLeft: 8 }}>
                (Playback: {emotion.playback})
              </span>
            )}
            {/* Hidden webcam elements */}
            <video ref={videoRef} style={{ display: "none" }} autoPlay playsInline width={128} height={96} />
            <canvas ref={canvasRef} style={{ display: "none" }} width={128} height={96} />
          </div>
        )}
      </div>
    </Modal>
  );
};

export default GeminiAudioChatModal;
