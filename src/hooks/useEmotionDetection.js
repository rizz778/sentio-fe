/**
 * useEmotionDetection.js — Hook: Webcam + Emotion Detection via Gateway
 * ======================================================================
 * When enabled, opens a camera stream, captures JPEG frames, and sends them
 * to the Sentio API Gateway /ws/live endpoint via WSClient or provided sender.
 *
 * Incoming frames return { type: "distress_update", emotion: string } from
 * the hosted Gemini 2.5 Flash Vision emotion model in FastAPI.
 */

import { useState, useEffect, useRef } from "react";
import { createWsClient, getLiveWsUrl } from "../services/wsClient";

export const useEmotionDetection = (sessionId = "emotion-session", options = {}) => {
  const [emotionDetectionEnabled, setEmotionDetectionEnabled] = useState(false);
  const [emotion, setEmotion] = useState({ current: "", aggregated: "" });

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const customSendRef = useRef(options.onFrame);
  customSendRef.current = options.onFrame;

  useEffect(() => {
    if (!emotionDetectionEnabled) return;

    let ws = null;
    let interval = null;
    let stream = null;
    let mounted = true;

    // If no custom sender is provided, open a WSClient to the Gateway
    if (!customSendRef.current) {
      const wsUrl = getLiveWsUrl({ sessionId, modalities: ["TEXT"] });
      ws = createWsClient(wsUrl, {
        onMessage: (data) => {
          if (!mounted) return;
          // Gateway broadcast
          if (data.type === "distress_update" && data.emotion) {
            setEmotion({ current: data.emotion, aggregated: data.emotion });
          } else if (data.emotion) {
            const emo = typeof data.emotion === "string" ? data.emotion : data.emotion.current;
            setEmotion({ current: emo, aggregated: emo });
          }
        },
        onClose: () => console.warn("[Emotion] WebSocket closed"),
        onError: (err) => console.error("[Emotion] WebSocket error:", err),
      });
    }

    // Request webcam access and start frame-capture loop (1 frame every 1.5s to conserve bandwidth)
    console.log("[EmotionDetection] Requesting camera access via getUserMedia...");
    navigator.mediaDevices
      ?.getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 480 } } })
      .then((mediaStream) => {
        if (!mounted) {
          mediaStream.getTracks().forEach((t) => t.stop());
          return;
        }
        console.log("[EmotionDetection] Camera access granted:", mediaStream.getVideoTracks().map(t => t.label));
        stream = mediaStream;

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.setAttribute("playsinline", "true");
          videoRef.current.onloadedmetadata = () => {
            console.log(`[EmotionDetection] Video ready: ${videoRef.current.videoWidth}x${videoRef.current.videoHeight}`);
            if (canvasRef.current && videoRef.current) {
              canvasRef.current.width = videoRef.current.videoWidth || 640;
              canvasRef.current.height = videoRef.current.videoHeight || 480;
            }
            videoRef.current.play()
              .then(() => console.log("[EmotionDetection] Video playback started."))
              .catch((e) => console.warn("[EmotionDetection] Video play() failed:", e));
          };
        }

        interval = setInterval(() => {
          if (
            videoRef.current &&
            canvasRef.current &&
            videoRef.current.readyState >= 2
          ) {
            const ctx = canvasRef.current.getContext("2d");
            ctx.drawImage(
              videoRef.current,
              0,
              0,
              canvasRef.current.width,
              canvasRef.current.height
            );

            const dataURL = canvasRef.current.toDataURL("image/jpeg", 0.6);
            const base64Data = dataURL.split(",")[1];

            if (base64Data) {
              const frameMsg = {
                type: "frame",
                data: base64Data,
                mime_type: "image/jpeg",
              };

              if (customSendRef.current) {
                customSendRef.current(frameMsg);
              } else if (ws?.isOpen) {
                ws.send(frameMsg);
              }
            }
          }
        }, 1500);
      })
      .catch((err) => {
        console.error("[EmotionDetection] Camera access error:", err);
        alert(`Camera access denied or unavailable: ${err.message}`);
      });

    return () => {
      mounted = false;
      if (interval) clearInterval(interval);
      ws?.close();
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [emotionDetectionEnabled, sessionId]);

  return {
    emotion,
    setEmotion,
    emotionDetectionEnabled,
    setEmotionDetectionEnabled,
    videoRef,
    canvasRef,
  };
};
