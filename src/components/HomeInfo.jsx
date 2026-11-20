import React from "react";
import { Link } from "react-router-dom";
import { ArrowRightOutlined, HeartFilled, SafetyCertificateFilled, SmileFilled } from "@ant-design/icons";

const HomeInfo = () => {
  return (
    <div className="max-w-4xl mx-auto text-center px-4 py-8">
      {/* Top Wellness Pill Badge */}
      <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/80 border border-pink-200/80 shadow-xs backdrop-blur-md mb-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <span className="w-2 h-2 rounded-full bg-[#f64a8a] animate-pulse" />
        <span className="text-xs sm:text-sm font-semibold text-[#f64a8a] tracking-wide">
          24/7 AI Sanctuary for Emotional Well-Being
        </span>
      </div>

      {/* Main Title */}
      <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-gray-900 tracking-tight leading-tight sm:leading-tight">
        Meet{" "}
        <span className="bg-gradient-to-r from-[#e91e63] via-[#ff6b8b] to-[#845ec2] bg-clip-text text-transparent">
          SENTIO.
        </span>
        <br />
        <span className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-800">
          Your Sanctuary for Healing & Growth.
        </span>
      </h1>

      {/* Subtitle */}
      <p className="mt-6 text-base sm:text-lg lg:text-xl text-gray-700 max-w-2xl mx-auto font-normal leading-relaxed">
        A confidential, empathetic companion designed to listen, guide, and support you through life's ups and downs. Access clinically-informed assessments, calming tools, and licensed therapist support.
      </p>

      {/* Action CTA Buttons */}
      <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
        <Link
          to="/login"
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full bg-gradient-to-r from-[#f64a8a] to-[#ff6b8b] text-white font-semibold text-base shadow-lg shadow-pink-500/25 hover:shadow-pink-500/40 hover:scale-105 transition-all duration-200"
        >
          <span>Get Started Free</span>
          <ArrowRightOutlined className="text-sm" />
        </Link>
        <Link
          to="/selfassessment"
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full bg-white/90 border border-pink-200 text-gray-800 font-semibold text-base shadow-xs hover:bg-white hover:border-pink-300 hover:scale-105 transition-all duration-200"
        >
          <span>Explore Assessments</span>
        </Link>
      </div>

      {/* Trust & Feature Badges */}
      <div className="mt-12 pt-8 border-t border-pink-200/50 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
        <div className="flex items-center justify-center gap-2 text-xs sm:text-sm font-medium text-gray-700 bg-white/50 backdrop-blur-xs py-2 px-3 rounded-xl border border-white/60">
          <SafetyCertificateFilled className="text-emerald-500 text-base" />
          <span>100% Private & Anonymous</span>
        </div>
        <div className="flex items-center justify-center gap-2 text-xs sm:text-sm font-medium text-gray-700 bg-white/50 backdrop-blur-xs py-2 px-3 rounded-xl border border-white/60">
          <SmileFilled className="text-pink-500 text-base" />
          <span>Empathetic AI Companion</span>
        </div>
        <div className="flex items-center justify-center gap-2 text-xs sm:text-sm font-medium text-gray-700 bg-white/50 backdrop-blur-xs py-2 px-3 rounded-xl border border-white/60">
          <HeartFilled className="text-rose-500 text-base" />
          <span>Professional Therapist Network</span>
        </div>
      </div>
    </div>
  );
};

export default HomeInfo;
