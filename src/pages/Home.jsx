import { useEffect, useRef, useState } from "react";
import sakura from "../assets/sakura.mp3";
import HomeInfo from "../components/HomeInfo";
import { soundoff, soundon } from "../assets/icons";
import Testimonials from "../components/Testimonials.jsx";
import Benefits from "../components/Benefits.jsx";
import Faq from "../components/Faq.jsx";
import BuyToken from "./BuyToken.jsx";
import Footer from "../components/Footer.jsx";

const Home = () => {
  const audioRef = useRef(null);
  const [isPlayingMusic, setIsPlayingMusic] = useState(false);

  useEffect(() => {
    if (isPlayingMusic) {
      if (!audioRef.current) {
        audioRef.current = new Audio(sakura);
        audioRef.current.volume = 0.4;
        audioRef.current.loop = true;
      }
      audioRef.current.play().catch(() => {});
    } else if (audioRef.current) {
      audioRef.current.pause();
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [isPlayingMusic]);

  return (
    <section className="w-full relative overflow-hidden">
      {/* Lightweight Ambient Hero Section (Zero 3D/WebGL overhead) */}
      <div className="w-full min-h-[90vh] py-16 sm:py-24 relative flex flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-[#ffe5ee] via-[#ffd6e5] to-[#f4faff]">
        {/* Soft, Calming Ambient Glowing Orbs in CSS */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-[#ff70a6]/20 rounded-full blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute top-1/4 -right-24 w-[28rem] h-[28rem] bg-[#70d6ff]/20 rounded-full blur-3xl pointer-events-none animate-pulse [animation-delay:2s]" />
        <div className="absolute -bottom-24 left-1/3 w-[32rem] h-[32rem] bg-[#e7c6ff]/30 rounded-full blur-3xl pointer-events-none" />

        {/* Hero Card */}
        <div className="relative z-10 w-full flex items-center justify-center px-4">
          <HomeInfo />
        </div>

        {/* Audio Toggle */}
        <div className="absolute bottom-6 left-6 z-20">
          <img
            src={!isPlayingMusic ? soundoff : soundon}
            alt="Toggle Music"
            onClick={() => setIsPlayingMusic((prev) => !prev)}
            className="w-10 h-10 cursor-pointer object-contain hover:scale-110 transition-transform drop-shadow"
            title={isPlayingMusic ? "Mute music" : "Play calming music"}
          />
        </div>
      </div>

      <div className="sections">
        <div className="testimonial-section">
          <Testimonials />
        </div>
        <div className="benefits-section flex justify-center items-center min-h-screen">
          <Benefits />
        </div>
      </div>

      <div className="faq-section">
        <Faq />
      </div>

      <div className="pricing-section">
        <BuyToken />
      </div>

      <Footer />
    </section>
  );
};

export default Home;
