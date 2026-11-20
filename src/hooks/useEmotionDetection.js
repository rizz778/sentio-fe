/**
 * useEmotionDetection.js — Hook: Webcam + Emotion Detection WebSocket
 * ====================================================================
 * When enabled, opens a camera stream, captures JPEG frames every second,
 * and sends them to the Gemini emotion-detection endpoint via WSClient.
 *
 * Uses WSClient (base WS factory) instead of raw WebSocket for consistency.
 * Returns `emotion` as an object { current, aggregated } and stable refs
 * for the hidden <video> and <canvas> elements.
 */

import { useState, useEffect, useRef } from "react";
import { createWsClient } from "../services/wsClient";
import { GEMINI_WS_FRAME_URL } from "../services/wsClient";

export const useEmotionDetection = () => {
  const [emotionDetectionEnabled, setEmotionDetectionEnabled] = useState(false);
  const [emotion, setEmotion] = useState({ current: "", aggregated: "" });

  const videoRef  = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!emotionDetectionEnabled) return;

    let ws       = null;
    let interval = null;
    let stream   = null;
    let mounted  = true;

    // Open WSClient to the frame endpoint
    ws = createWsClient(GEMINI_WS_FRAME_URL, {
      onOpen: () => {
        // Send empty setup frame so the backend initialises the session
        ws.send({ setup: {} });
      },
      onMessage: (data) => {
        if (data.emotion && mounted) {
          setEmotion(data.emotion);
        }
      },
      onClose: () => console.warn("[Emotion] WebSocket closed"),
      onError: (err) => console.error("[Emotion] WebSocket error:", err),
    });

    // Request webcam access and start the frame-capture interval
    navigator.mediaDevices
      ?.getUserMedia({ video: true })
      .then((mediaStream) => {
        if (!mounted) {
          mediaStream.getTracks().forEach((t) => t.stop());
          return;
        }
        stream = mediaStream;

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.onloadedmetadata = () => {
            if (canvasRef.current && videoRef.current) {
              canvasRef.current.width  = videoRef.current.videoWidth  || 640;
              canvasRef.current.height = videoRef.current.videoHeight || 480;
              videoRef.current.play().catch((e) => console.warn("Video play() failed:", e));
            }
          };
        }

        // Capture a JPEG frame every second and send it over the WS
        interval = setInterval(() => {
          if (
            videoRef.current &&
            canvasRef.current &&
            ws?.isOpen &&
            videoRef.current.readyState >= 2
          ) {
            const ctx = canvasRef.current.getContext("2d");
            ctx.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);

            const dataURL    = canvasRef.current.toDataURL("image/jpeg", 0.6);
            const base64Data = dataURL.split(",")[1];

            if (base64Data) {
              ws.send({
                realtimeInput: {
                  mediaChunks: [{ mimeType: "image/jpeg", data: base64Data }],
                },
              });
            }
          }
        }, 1000);
      })
      .catch((err) => console.error("[Emotion] Camera access error:", err));

    // Cleanup: stop interval, close socket, stop camera tracks
    return () => {
      mounted = false;
      if (interval) clearInterval(interval);
      ws?.close();
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [emotionDetectionEnabled]);

  return {
    emotion,
    setEmotion,
    emotionDetectionEnabled,
    setEmotionDetectionEnabled,
    videoRef,
    canvasRef,
  };
};
