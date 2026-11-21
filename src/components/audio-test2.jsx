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
    // Cut off any playing or queued previous response and signal Gemini to stop old turn
    interrupt();
    const currentEmotion = emotionDetectionEnabled ? emotion.aggregated || "" : "";
    await startRecording(currentEmotion, handleStopRecording);
  }, [emotionDetectionEnabled, emotion, startRecording, interrupt]);

  const handleStopRecording = useCallback(async () => {
    const result = await stopRecording();
    if (result) {
      sendAudio(result.pcmData || result.base64Data, result.emotion);
    }
  }, [stopRecording, sendAudio]);

  // ── Modal close ───────────────────────────────────────────────────────────

  const handleClose = useCallback(() => {
    if (isRecording) handleStopRecording();
    disconnect();
    clearAudioQueue();
    destroyAudioContext();
    onClose?.();
    onAudioChatClose?.(sessionId);
  }, [isRecording, handleStopRecording, disconnect, clearAudioQueue, destroyAudioContext, onClose, onAudioChatClose, sessionId]);

  // ==========================================================================
  // Render
  // ==========================================================================
  return (
    <Modal
      title="Gemini Audio Chat"
      open={visible}
      onCancel={handleClose}
      footer={[
        <Button key="close" onClick={handleClose} disabled={isCalling || isRecording}>
          Close
        </Button>,
        <Button
          key="emotion"
          onClick={() => setEmotionDetectionEnabled((v) => !v)}
          type={emotionDetectionEnabled ? "primary" : "default"}
        >
          {emotionDetectionEnabled ? "Disable Emotion Detection" : "Enable Emotion Detection"}
        </Button>,
      ]}
      width={600}
    >
      <div style={{ textAlign: "center", padding: 20 }}>
        <p>Start a real-time audio conversation with the assistant.</p>

        {/* Connection / error status bar */}
        {log && (
          <Alert
            message={log}
            type={connectionStatus === "error" ? "error" : "info"}
            showIcon
            style={{ marginTop: 10 }}
          />
        )}

        {/* Mic toggle — enabled only when WS is connected */}
        <div style={{ margin: "16px 0" }}>
          <Button
            type={isRecording ? "primary" : "default"}
            icon={isRecording ? <MicOff /> : <Mic />}
            onClick={isRecording ? handleStopRecording : handleStartRecording}
            disabled={connectionStatus !== "connected"}
            style={{ marginRight: 8 }}
          >
            {isRecording ? "Stop" : "Start"} Recording
          </Button>
        </div>

        {/* Transcript display */}
        {(inputTranscript || outputTranscript) && (
          <div style={{ margin: "16px 0", textAlign: "left", background: "#f6f6f6", borderRadius: 8, padding: 12 }}>
            {inputTranscript && (
              <div style={{ marginBottom: 6 }}>
                <b>You:</b>{" "}
                <span style={{ color: "#333" }}>{inputTranscript}</span>
              </div>
            )}
            {outputTranscript && (
              <div>
                <b>Gemini:</b>{" "}
                <span style={{ color: "#1a73e8" }}>{outputTranscript}</span>
              </div>
            )}
          </div>
        )}

        {/* Emotion detection panel */}
        {emotionDetectionEnabled && (
          <div style={{ marginTop: 20, textAlign: "left" }}>
            <b>Detected Emotion:</b>{" "}
            <span>{emotion.aggregated || <i>Detecting...</i>}</span>
            <br />
            {emotion.playback && (
              <span style={{ color: "#888" }}>
                <b>Playback Emotion:</b> {emotion.playback}
              </span>
            )}
            {/* Hidden webcam elements — managed by useEmotionDetection */}
            <video ref={videoRef} style={{ display: "none" }} autoPlay playsInline width={128} height={96} />
            <canvas ref={canvasRef} style={{ display: "none" }} width={128} height={96} />
          </div>
        )}
      </div>
    </Modal>
  );
};

export default GeminiAudioChatModal;
