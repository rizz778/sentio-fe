/**
 * useDistressNotification.jsx — Notification trigger for elevated distress
 * =========================================================================
 * Displays immediate support resources when elevated distress (score >= 7)
 * is detected by the backend turn processor.
 *
 * Note: Distress scoring is computed automatically server-side and received
 * via the live WebSocket distress_update event. No client HTTP calls are made.
 */

import React, { useEffect, useCallback } from "react";
import { notification } from "antd";

export const useDistressNotification = (distressScore) => {
  const showDistressAlert = useCallback((score) => {
    if (typeof score !== "number" || score < 7) return;

    notification.warning({
      message: "You may need support",
      description: (
        <div>
          <div>Your distress score is elevated ({score}/10). Consider reaching out:</div>
          <ul style={{ margin: "8px 0 0 0", padding: 0, listStyle: "none" }}>
            <li>
              <a href="/helpline" className="text-pink-600 font-medium hover:underline">
                Helpline Resources
              </a>
            </li>
            <li>
              <a href="/therapists" className="text-pink-600 font-medium hover:underline">
                Book a Certified Therapist
              </a>
            </li>
            <li>
              <a href="/relaxationtools" className="text-pink-600 font-medium hover:underline">
                Relaxation &amp; Mindfulness Tools
              </a>
            </li>
          </ul>
        </div>
      ),
      placement: "topRight",
      duration: 8,
    });
  }, []);

  useEffect(() => {
    if (distressScore !== null && distressScore !== undefined) {
      showDistressAlert(distressScore);
    }
  }, [distressScore, showDistressAlert]);

  // Backward compatible checkDistress function (no-op or score check)
  const checkDistress = useCallback((scoreOrText) => {
    if (typeof scoreOrText === "number") {
      showDistressAlert(scoreOrText);
    }
  }, [showDistressAlert]);

  return { showDistressAlert, checkDistress };
};
