import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { Shield, Sparkles } from 'lucide-react';

interface SplashScreenProps {
  onComplete: () => void;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 2000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#09090B] text-[#FAFAFA] select-none relative overflow-hidden font-sans">
      
      {/* Background elegant depth */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[240px] h-[240px] bg-blue-600/5 rounded-full blur-[90px] pointer-events-none"></div>

      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="flex flex-col items-center space-y-6 z-10"
      >
        {/* Apple Style Minimal Icon */}
        <div className="w-16 h-16 bg-[#18181B] border border-white/10 rounded-2xl flex items-center justify-center shadow-lg relative">
          <span className="text-white font-extrabold text-4xl font-sans tracking-tight">C</span>
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#2563EB] rounded-full"></span>
        </div>

        {/* Elegant typography */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-black tracking-widest text-white font-sans flex items-center justify-center gap-1.5">
            CallMe
          </h1>
          <p className="text-[#A1A1AA] text-xs max-w-xs leading-relaxed font-medium">
            مكالمات آمنة، غرف صوتية، دردشة وحكايات مشفرة بالكامل
          </p>
        </div>
      </motion.div>

      {/* Modern, non-bouncy static minimal loader indicator */}
      <div className="absolute bottom-16 flex flex-col items-center gap-2">
        <div className="flex items-center gap-2 text-[10px] text-[#A1A1AA] bg-[#18181B] px-3.5 py-1.5 rounded-full border border-white/5 shadow">
          <Shield className="w-3.5 h-3.5 text-blue-500" />
          <span>تشفير P2P محمي بتقنية WebRTC</span>
        </div>
      </div>

    </div>
  );
}
