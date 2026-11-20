/**
 * distressApi.js — Deprecated
 * =============================
 * Distress scoring is handled automatically on each turn by the backend
 * turn processor and broadcast over the live WebSocket as a `distress_update` frame.
 * The frontend does not make explicit HTTP distress scoring requests.
 */

export const analyzeDistressScore = async () => ({ score: 0 });
