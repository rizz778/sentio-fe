/**
 * useDistressNotification.js — Utility-as-hook: distress score + antd warning
 * =============================================================================
 * This was previously inlined inside ChatPage. It is both a side-effectful
 * utility (calls an API, shows a notification) and stateful (stores the latest
 * score) — which makes it a perfect candidate for a custom hook.
 *
 * Usage:
 *   const { distressScore, checkDistress } = useDistressNotification(messages);
 *   // On user send:
 *   checkDistress(userText);
 */

import { useState, useCallback } from "react";
import { notification } from "antd";
import { analyzeDistressScore } from "../services/distressApi";

/**
 * @param {object[]} messages - Current message list (used to build history payload)
 * @returns {{ distressScore: number|null, checkDistress: (text: string) => void }}
 */
export const useDistressNotification = (messages) => {
  const [distressScore, setDistressScore] = useState(null);

  const checkDistress = useCallback(async (inputText) => {
    if (!inputText?.trim()) return;

    // Sanitise message history into the shape the distress API expects
    const conversationHistory = (messages || []).map((msg) => ({
      sender:    msg.sender    || "",
      type:      msg.type      || "",
      text:      msg.text      || msg.content || "",
      timestamp: msg.timestamp || null,
      emotion:   msg.emotion   || null,
      distress:  msg.distress  || null,
    }));

    try {
      const data = await analyzeDistressScore(inputText, conversationHistory);

      if (data && typeof data.score === "number") {
        setDistressScore(data.score);

        // Threshold: score ≥ 7 indicates elevated distress
        // Surface an antd warning with links to immediate support resources.
        if (data.score >= 7) {
          notification.warning({
            message:     "You may need support",
            description: (
              <div>
                <div>Your distress score is elevated. Consider reaching out:</div>
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
            duration:  8,
          });
        }
      }
    } catch (err) {
      console.error("[Distress] Analysis error:", err);
    }
  }, [messages]);

  return { distressScore, checkDistress };
};
