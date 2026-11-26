/**
 * dashboardHelpers.js — Analytics data formatting and calculation utilities
 * =========================================================================
 * Formats raw backend metrics (from /api/profile/emotion/user) into recharts-ready
 * data series, computes trend directions, and applies client-side filtering.
 */

// ── Color Palettes ──────────────────────────────────────────────────────────

export const emotionColors = {
  happy: "#22c55e",    // green
  sad: "#3b82f6",      // blue
  angry: "#ef4444",    // red
  fear: "#f97316",     // orange
  surprise: "#a855f7", // purple
  disgust: "#84cc16",  // lime
  neutral: "#94a3b8",  // slate
  unknown: "#cbd5e1",  // light slate
};

export const gradientColors = {
  primary: ["#8b5cf6", "#6366f1"],
  secondary: ["#ec4899", "#f43f5e"],
  tertiary: ["#06b6d4", "#0ea5e9"],
};

// ── Trend Calculations ──────────────────────────────────────────────────────

/**
 * Calculates whether distress is increasing, decreasing, or steady across time.
 * @param {Array} distressTrend - Array of { score, timestamp, sessionName }
 * @returns {'increasing' | 'decreasing' | 'steady'}
 */
export const calculateTrendDirection = (distressTrend) => {
  if (!distressTrend || !Array.isArray(distressTrend) || distressTrend.length < 2) {
    return "steady";
  }

  const sortedTrend = [...distressTrend].sort(
    (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
  );

  const firstScore = sortedTrend[0].score;
  const lastScore = sortedTrend[sortedTrend.length - 1].score;

  if (lastScore < firstScore) return "decreasing";
  if (lastScore > firstScore) return "increasing";
  return "steady";
};

/**
 * Calculates the percentage change from the first distress score to the latest.
 * @param {Array} distressTrend
 * @returns {number} Integer percentage change
 */
export const calculateTrendPercentage = (distressTrend) => {
  if (!distressTrend || !Array.isArray(distressTrend) || distressTrend.length < 2) {
    return 0;
  }

  const sortedTrend = [...distressTrend].sort(
    (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
  );

  const firstScore = sortedTrend[0].score;
  const lastScore = sortedTrend[sortedTrend.length - 1].score;

  if (firstScore === 0) return 0;
  return Math.abs(Math.round(((lastScore - firstScore) / firstScore) * 100));
};

// ── Recharts Formatters ─────────────────────────────────────────────────────

/**
 * Formats chronological distress scores for AreaChart / LineChart.
 */
export const formatDistressTrend = (distressTrend) => {
  if (!distressTrend || !Array.isArray(distressTrend)) return [];

  return distressTrend.map((item) => ({
    date: new Date(item.timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    score: item.score,
    session: item.sessionName || "Chat Session",
  }));
};

/**
 * Formats daily stacked emotion occurrences for BarChart.
 */
export const formatEmotionTrend = (emotionTrend, emotionCounts) => {
  if (!emotionTrend || !Array.isArray(emotionTrend) || !emotionCounts) return [];

  const result = [];
  const emotions = Object.keys(emotionCounts);

  emotionTrend.forEach((item) => {
    const date = new Date(item.timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    const existingDate = result.find((point) => point.date === date);

    if (existingDate) {
      existingDate[item.emotion] = (existingDate[item.emotion] || 0) + 1;
    } else {
      const newPoint = { date, sessionName: item.sessionName || "Chat Session" };
      emotions.forEach((em) => {
        newPoint[em] = em === item.emotion ? 1 : 0;
      });
      result.push(newPoint);
    }
  });

  return result;
};

/**
 * Formats emotion frequencies for RadarChart.
 */
export const formatEmotionRadar = (emotionCounts) => {
  if (!emotionCounts) return [];

  const values = Object.values(emotionCounts);
  const maxVal = values.length > 0 ? Math.max(...values) : 10;

  return Object.keys(emotionCounts)
    .filter((key) => key !== "unknown")
    .map((emotion) => ({
      emotion: emotion.charAt(0).toUpperCase() + emotion.slice(1),
      count: emotionCounts[emotion] || 0,
      fullMark: maxVal + 5,
    }));
};

/**
 * Formats emotion percentages for PieChart / Donut.
 */
export const formatEmotionPie = (emotionPercentages) => {
  if (!emotionPercentages) return [];

  return Object.keys(emotionPercentages)
    .filter((emotion) => emotionPercentages[emotion] > 0 && emotion !== "unknown")
    .map((emotion) => ({
      name: emotion.charAt(0).toUpperCase() + emotion.slice(1),
      value: emotionPercentages[emotion],
    }));
};

/**
 * Formats session distress distribution for Treemap.
 */
export const formatSessionsTreemap = (sessionsByDistress) => {
  if (!sessionsByDistress) return [];

  const allSessions = [
    ...(sessionsByDistress.high || []).map((s) => ({ ...s, category: "High" })),
    ...(sessionsByDistress.medium || []).map((s) => ({ ...s, category: "Medium" })),
    ...(sessionsByDistress.low || []).map((s) => ({ ...s, category: "Low" })),
  ];

  return allSessions.map((session) => ({
    name: session.sessionName || "Session",
    size: Math.max(1, (session.avgDistress || 0) * 10),
    category: session.category,
  }));
};

/**
 * Formats timestamp vs distress scatter points for ScatterChart.
 */
export const formatDistressScatter = (distressTrend) => {
  if (!distressTrend || !Array.isArray(distressTrend)) return [];

  return distressTrend.map((item) => ({
    x: new Date(item.timestamp).getTime(),
    y: item.score,
    name: item.sessionName || "Session",
  }));
};

/**
 * Returns the most recent 3 sessions for summary preview cards.
 */
export const formatSessionCards = (sessionAnalytics) => {
  if (!sessionAnalytics || !Array.isArray(sessionAnalytics)) return [];

  return [...sessionAnalytics]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 3);
};

// ── Search & Filter ─────────────────────────────────────────────────────────

/**
 * Filters session logs by search keyword, distress level, and date range.
 */
export const getFilteredSessions = (sessionAnalytics, searchTerm = "", selectedFilters = {}) => {
  if (!sessionAnalytics || !Array.isArray(sessionAnalytics)) return [];

  let filtered = [...sessionAnalytics];

  // 1. Text search
  if (searchTerm && searchTerm.trim() !== "") {
    const term = searchTerm.toLowerCase().trim();
    filtered = filtered.filter((s) =>
      (s.sessionName || "").toLowerCase().includes(term)
    );
  }

  // 2. Distress level filter
  const { distressLevel = "all", dateRange = "all" } = selectedFilters;
  if (distressLevel !== "all") {
    if (distressLevel === "high") {
      filtered = filtered.filter((s) => (s.averageDistress ?? 0) >= 7);
    } else if (distressLevel === "medium") {
      filtered = filtered.filter((s) => (s.averageDistress ?? 0) >= 4 && (s.averageDistress ?? 0) < 7);
    } else if (distressLevel === "low") {
      filtered = filtered.filter((s) => (s.averageDistress ?? 0) < 4);
    }
  }

  // 3. Date range filter
  if (dateRange !== "all") {
    const now = new Date();
    const cutoff = new Date();
    if (dateRange === "week") {
      cutoff.setDate(now.getDate() - 7);
    } else if (dateRange === "month") {
      cutoff.setMonth(now.getMonth() - 1);
    }
    filtered = filtered.filter((s) => new Date(s.createdAt) >= cutoff);
  }

  return filtered;
};
