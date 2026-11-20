import React from 'react';
import { DownloadOutlined, HeartFilled, SafetyCertificateFilled, CompassFilled, TeamOutlined, CheckCircleFilled } from "@ant-design/icons";

const AboutUsPage = () => {
  const handleDownloadPDF = () => {
    const pdfUrl = 'Sentio  AI With Empathy (1).pdf';
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = 'Sentio-User-Guide.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const offerings = [
    { title: "Empathetic AI Companion", desc: "Adaptive, emotion-aware conversations that offer a safe space whenever you need someone to talk to.", icon: "🌸" },
    { title: "Clinical Self-Assessments", desc: "Confidential psychological evaluation tools covering depression, anxiety, trauma, and sleep.", icon: "📋" },
    { title: "Mindfulness & Relaxation", desc: "Guided meditations, breathing exercises, and soothing soundscapes to reduce stress in real time.", icon: "🧘" },
    { title: "Certified Therapist Booking", desc: "Direct, confidential scheduling with certified mental health professionals and counselors.", icon: "👥" },
    { title: "Crisis Helplines", desc: "Immediate 24/7 emergency contact directory for crisis prevention and urgent emotional support.", icon: "📞" },
    { title: "Community Forum", desc: "A moderated, supportive community to share experiences and learn from others on similar journeys.", icon: "💬" },
    { title: "Comprehensive Resources", desc: "Curated guides, educational articles, and evidence-based coping strategies for everyday life.", icon: "📚" },
    { title: "Personalized Mood Tracking", desc: "Insightful tracking to observe emotional patterns and celebrate your mental wellness progress.", icon: "📈" },
  ];

  const pillars = [
    { icon: <HeartFilled className="text-pink-500 text-xl" />, title: "Radical Empathy", desc: "Every algorithm and interface is designed with compassionate care and understanding at its heart." },
    { icon: <SafetyCertificateFilled className="text-emerald-500 text-xl" />, title: "100% Privacy First", desc: "Your mental health conversations and personal reflections belong strictly to you—never sold or shared." },
    { icon: <CompassFilled className="text-indigo-500 text-xl" />, title: "24/7 Accessibility", desc: "Quality emotional support available on any device, anywhere, at any hour of the day or night." },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fff5f8] via-[#fff9fb] to-[#f4faff] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-16">
        
        {/* Header Hero Section */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-100 text-pink-700 text-xs font-semibold uppercase tracking-wider mb-3">
            <span>Our Journey & Purpose</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-gray-900 tracking-tight">
            About{" "}
            <span className="bg-gradient-to-r from-[#e91e63] to-[#845ec2] bg-clip-text text-transparent">
              SENTIO
            </span>
          </h1>
          <p className="mt-4 text-base sm:text-lg text-gray-600 max-w-2xl mx-auto">
            Transforming emotional healthcare through accessible technology, compassionate AI, and human connection.
          </p>
        </div>

        {/* Our Story & Core Pillars */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 bg-white p-8 sm:p-10 rounded-3xl border border-pink-100/80 shadow-xs space-y-5">
            <div className="inline-block px-3 py-1 bg-pink-50 text-pink-600 rounded-lg text-xs font-semibold">
              Founded with Empathy
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900">Our Story</h2>
            <p className="text-gray-700 leading-relaxed text-sm sm:text-base">
              Sentio was founded in 2025 by a passionate team of mental health advocates, clinicians, and technologists who recognized that traditional mental health care is often too expensive, fragmented, or inaccessible when people need it most.
            </p>
            <p className="text-gray-700 leading-relaxed text-sm sm:text-base">
              We set out to create a truly safe sanctuary—one that combines empathetic AI with clinical methodologies to ensure no one has to navigate anxiety, stress, or emotional crises alone.
            </p>
          </div>

          <div className="lg:col-span-5 space-y-4">
            {pillars.map((pillar, i) => (
              <div key={i} className="p-5 bg-white rounded-2xl border border-pink-100/80 shadow-xs flex items-start gap-4">
                <div className="p-3 bg-pink-50/70 rounded-xl flex-shrink-0">
                  {pillar.icon}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-base">{pillar.title}</h3>
                  <p className="text-xs sm:text-sm text-gray-600 mt-1 leading-snug">{pillar.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Our Mission Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#ff9bbd] via-[#f782ab] to-[#f46698] p-8 sm:p-12 text-white shadow-md text-center">
          <div className="relative z-10 max-w-3xl mx-auto space-y-3">
            <span className="text-xs uppercase tracking-widest font-semibold text-white/80">Our Mission</span>
            <h2 className="text-2xl sm:text-3xl font-black">Mental Wellness Accessible to Everyone, Everywhere.</h2>
            <p className="text-sm sm:text-base text-white/90 leading-relaxed">
              We believe quality emotional support is a fundamental human need. Our mission is to break down barriers of cost, stigma, and availability by leveraging empathetic digital innovation.
            </p>
          </div>
        </div>

        {/* What We Offer - 8 Grid Cards */}
        <div>
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900">What We Offer</h2>
            <p className="text-sm sm:text-base text-gray-600 mt-2">Comprehensive tools tailored to your unique healing journey.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {offerings.map((item, i) => (
              <div
                key={i}
                className="bg-white p-6 rounded-2xl border border-pink-100/80 shadow-xs hover:shadow-md hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between"
              >
                <div>
                  <span className="text-3xl mb-3 block">{item.icon}</span>
                  <h3 className="font-bold text-gray-900 text-base mb-1">{item.title}</h3>
                  <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Download Guide Card */}
        <div className="bg-white rounded-3xl border border-pink-200 p-8 sm:p-10 shadow-xs flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-left">
            <h3 className="text-xl sm:text-2xl font-bold text-gray-900">Explore Sentio's Features</h3>
            <p className="text-sm text-gray-600 max-w-xl">
              Get an in-depth walkthrough of our platform tools, psychological assessment methods, and clinical safety measures.
            </p>
          </div>
          <button
            onClick={handleDownloadPDF}
            className="flex-shrink-0 inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-[#f64a8a] hover:bg-pink-600 text-white font-semibold text-sm shadow-md transition-all duration-200 hover:scale-105"
          >
            <DownloadOutlined />
            <span>Download Sentio Guide</span>
          </button>
        </div>

        {/* Inspiring Quote */}
        <div className="text-center py-6">
          <p className="text-base sm:text-lg italic text-gray-700 font-medium max-w-2xl mx-auto">
            "We envision a world where everyone has the tools, empathy, and safe space they need to thrive."
          </p>
          <span className="text-xs font-semibold text-[#f64a8a] uppercase tracking-wider mt-2 block">
            — The Sentio Team
          </span>
        </div>

      </div>
    </div>
  );
};

export default AboutUsPage;
