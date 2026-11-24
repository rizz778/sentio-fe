import { useState, useEffect, useRef, useCallback } from "react";
import { GATEWAY_URL, NODE_BACKEND_URL } from "../config/api";

const WARMUP_SESSION_KEY = "sentio_servers_warm_v1";

/**
 * Robust fetch probe with timeout and CORS/error safety.
 */
const probeEndpoint = async (url, timeoutMs = 8000) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timer);
    return res.status >= 200 && res.status < 400;
  } catch (err) {
    clearTimeout(timer);
    return false;
  }
};

export const useServerWarmup = () => {
  const [gatewayStatus, setGatewayStatus] = useState("checking"); // checking | waking | ready
  const [nodeStatus, setNodeStatus] = useState("checking");       // checking | waking | ready
  const [allReady, setAllReady] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const mountedRef = useRef(true);

  const dismiss = useCallback(() => {
    setDismissed(true);
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    // If already marked as warm in this browser session, skip immediately
    if (sessionStorage.getItem(WARMUP_SESSION_KEY) === "true") {
      setGatewayStatus("ready");
      setNodeStatus("ready");
      setAllReady(true);
      return;
    }

    // Timer for elapsed seconds
    const intervalTimer = setInterval(() => {
      if (mountedRef.current) {
        setElapsedSeconds((prev) => prev + 1);
      }
    }, 1000);

    let gatewayDone = false;
    let nodeDone = false;

    // Continuous probe for Gateway (includes FastAPI)
    const checkGateway = async () => {
      while (mountedRef.current && !gatewayDone) {
        const ok = await probeEndpoint(`${GATEWAY_URL}/healthz`, 7000);
        if (!mountedRef.current) break;

        if (ok) {
          gatewayDone = true;
          setGatewayStatus("ready");
          break;
        } else {
          setGatewayStatus("waking");
          await new Promise((r) => setTimeout(r, 2500));
        }
      }
    };

    // Continuous probe for Node Backend
    const checkNode = async () => {
      while (mountedRef.current && !nodeDone) {
        const ok = await probeEndpoint(`${NODE_BACKEND_URL}/health`, 7000);
        if (!mountedRef.current) break;

        if (ok) {
          nodeDone = true;
          setNodeStatus("ready");
          break;
        } else {
          setNodeStatus("waking");
          await new Promise((r) => setTimeout(r, 2500));
        }
      }
    };

    // Run both probes in parallel
    Promise.all([checkGateway(), checkNode()]).then(() => {
      if (mountedRef.current) {
        sessionStorage.setItem(WARMUP_SESSION_KEY, "true");
        // Brief pause to display double checkmarks before closing
        setTimeout(() => {
          if (mountedRef.current) {
            setAllReady(true);
          }
        }, 1000);
      }
    });

    return () => {
      mountedRef.current = false;
      clearInterval(intervalTimer);
    };
  }, []);

  const showOverlay = !dismissed && !allReady;

  return {
    gatewayStatus,
    nodeStatus,
    allReady,
    showOverlay,
    elapsedSeconds,
    dismiss,
    gatewayUrl: GATEWAY_URL,
    nodeUrl: NODE_BACKEND_URL,
  };
};
