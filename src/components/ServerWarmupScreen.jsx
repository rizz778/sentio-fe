import React from "react";
import { CheckCircleFilled, LoadingOutlined, CloudServerOutlined, ThunderboltOutlined, DatabaseOutlined } from "@ant-design/icons";

export default function ServerWarmupScreen({
  gatewayStatus,
  nodeStatus,
  elapsedSeconds,
  dismiss,
}) {
  const isBothReady = gatewayStatus === "ready" && nodeStatus === "ready";

  const renderStatusBadge = (status) => {
    if (status === "ready") {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200">
          <CheckCircleFilled className="text-emerald-500" />
          <span>Online</span>
        </span>
      );
    }
    if (status === "waking") {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-600 border border-amber-200 animate-pulse">
          <LoadingOutlined className="text-amber-500 animate-spin" />
          <span>Spinning up...</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-gray-50 text-gray-500 border border-gray-200">
        <LoadingOutlined className="text-gray-400 animate-spin" />
        <span>Connecting...</span>
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-[#ffe5ee]/95 via-[#fff0f5]/95 to-[#e0f2fe]/95 backdrop-blur-md px-4 transition-all duration-300">
      <div className="w-full max-w-lg bg-white/90 backdrop-blur-xl border border-pink-100 shadow-2xl rounded-3xl p-6 sm:p-8 text-center relative overflow-hidden">
        {/* Soft top gradient bar */}
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-[#f64a8a] via-[#ff70a6] to-[#70d6ff]" />

        {/* Pulsing Icon */}
        <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-[#ffe4ed] to-[#e0f2fe] flex items-center justify-center mb-6 shadow-inner relative">
          <CloudServerOutlined className="text-3xl sm:text-4xl text-[#f64a8a] animate-bounce" />
          <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#f64a8a] animate-ping" />
        </div>

        {/* Title */}
        <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
          {isBothReady ? "All Systems Ready! ✨" : "Waking Up Free-Tier Servers..."}
        </h2>

        {/* Explanatory description */}
        <p className="mt-2.5 text-sm sm:text-base text-gray-600 max-w-md mx-auto leading-relaxed">
          {isBothReady
            ? "Servers are online and ready. Connecting you to Sentio..."
            : "Render's free tier spins down idle services after inactivity. We're waking them up now (usually takes ~30–45s)."}
        </p>

        {/* Service Cards */}
        <div className="mt-6 space-y-3 text-left">
          {/* Service 1: Gateway & FastAPI */}
          <div className="flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-gray-50/80 border border-gray-100 transition-all">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-pink-50 flex items-center justify-center text-[#f64a8a] text-lg font-bold">
                <ThunderboltOutlined />
              </div>
              <div>
                <div className="font-semibold text-gray-800 text-sm sm:text-base flex items-center gap-2">
                  <span>API Gateway & AI Core</span>
                </div>
                <div className="text-xs text-gray-500">
                  WebSocket & Gemini Live (FastAPI)
                </div>
              </div>
            </div>
            {renderStatusBadge(gatewayStatus)}
          </div>

          {/* Service 2: Node Backend */}
          <div className="flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-gray-50/80 border border-gray-100 transition-all">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-[#007AFF] text-lg font-bold">
                <DatabaseOutlined />
              </div>
              <div>
                <div className="font-semibold text-gray-800 text-sm sm:text-base flex items-center gap-2">
                  <span>Storage & Auth Engine</span>
                </div>
                <div className="text-xs text-gray-500">
                  User accounts, MongoDB & Chat History
                </div>
              </div>
            </div>
            {renderStatusBadge(nodeStatus)}
          </div>
        </div>

        {/* Elapsed Timer & Progress indicator */}
        <div className="mt-6 flex flex-col items-center">
          <div className="text-xs text-gray-500 font-medium">
            Time elapsed: <span className="font-semibold text-gray-700">{elapsedSeconds}s</span>
          </div>

          {/* Animated loading bar */}
          <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2.5 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                isBothReady
                  ? "w-full bg-emerald-500"
                  : "bg-gradient-to-r from-[#f64a8a] to-[#70d6ff] animate-pulse"
              }`}
              style={{
                width: isBothReady
                  ? "100%"
                  : `${Math.min(95, 10 + elapsedSeconds * 2.5)}%`,
              }}
            />
          </div>
        </div>

        {/* Skip button */}
        {!isBothReady && (
          <div className="mt-6 pt-4 border-t border-gray-100 flex justify-center">
            <button
              onClick={dismiss}
              className="text-xs text-gray-500 hover:text-gray-800 underline transition-colors cursor-pointer"
            >
              Skip and browse home (servers will finish waking in the background)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
