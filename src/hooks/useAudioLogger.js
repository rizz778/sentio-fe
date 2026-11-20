/**
 * useAudioLogger.js — Hook: Activity Log
 * ========================================
 * Maintains a capped, timestamped log of events for display in the
 * audio modal's debug/status panel. Extracted from the component because
 * it owns its own state and is consumed by all other audio hooks.
 *
 * @returns {{ logs, addLog, clearLogs }}
 */

import { useState, useCallback } from "react";

const MAX_LOG_ENTRIES = 50;

export const useAudioLogger = () => {
  const [logs, setLogs] = useState([]);

  /**
   * Append a new log entry.
   * @param {string} message
   * @param {"info"|"success"|"error"|"warning"|"user-input"|"ai-response"} [type]
   */
  const addLog = useCallback((message, type = "info") => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev.slice(-MAX_LOG_ENTRIES), { timestamp, message, type }]);
  }, []);

  const clearLogs = useCallback(() => setLogs([]), []);

  return { logs, addLog, clearLogs };
};
