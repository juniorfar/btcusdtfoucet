import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Zap, Flame, Award, Sparkles, X } from 'lucide-react';
import { soundFx } from '../utils/audio';

interface ComboBreakerModalProps {
  isOpen: boolean;
  comboCount: number;
  bonusSats: number;
  bonusScore: number;
  title?: string;
  onClose: () => void;
}

export const ComboBreakerModal: React.FC<ComboBreakerModalProps> = ({
  isOpen,
  comboCount,
  bonusSats,
  bonusScore,
  title = 'COMBO BREAKER!',
  onClose,
}) => {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (isOpen) {
      soundFx.playComboBreakerSound();
      // Auto-close animation window after 3.5 seconds
      const timer = setTimeout(() => {
        onCloseRef.current();
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 overflow-hidden"
        >
          {/* Background Radial Glow Aura */}
          <div className="absolute w-[450px] h-[450px] rounded-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-500/30 via-orange-600/10 to-transparent pointer-events-none animate-pulse" />

          {/* Popup Modal Box */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -10 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="relative w-full max-w-md bg-zinc-950 border-2 border-amber-400/80 rounded-3xl p-6 sm:p-8 text-center shadow-[0_0_40px_rgba(245,158,11,0.4)] overflow-hidden"
          >
            {/* Top Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-white/50 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition cursor-pointer z-10"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header Icon */}
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-yellow-300 text-black shadow-[0_0_25px_rgba(245,158,11,0.7)] mb-4">
              <Zap className="w-10 h-10 fill-black stroke-black" />
            </div>

            {/* Title */}
            <div>
              <h2 className="font-['Press_Start_2P',monospace] text-lg sm:text-xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-orange-400 drop-shadow-[0_2px_8px_rgba(245,158,11,0.6)] mb-2">
                {title}
              </h2>
              <div className="flex items-center justify-center gap-2 text-amber-400 text-xs font-mono font-bold tracking-wide uppercase">
                <Flame className="w-4 h-4 text-orange-500 fill-orange-500" />
                <span>{comboCount}x CASCADE BLAST MULTIPLIER</span>
                <Flame className="w-4 h-4 text-orange-500 fill-orange-500" />
              </div>
            </div>

            {/* Stats Breakdown Card */}
            <div className="my-5 p-4 rounded-2xl bg-black/80 border border-amber-500/30 space-y-3 font-mono">
              <div className="flex justify-between items-center text-sm">
                <span className="text-white/60 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  Score Bonus
                </span>
                <span className="text-amber-300 font-bold text-base">+ {bonusScore.toLocaleString()} pts</span>
              </div>
              <div className="flex flex-col pt-2 border-t border-white/10">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-white/60 flex items-center gap-2">
                    <Award className="w-4 h-4 text-cyan-400" />
                    Sats Rewarded
                  </span>
                  <span className="text-cyan-300 font-bold text-base flex items-center gap-1">
                    ⚡ +{bonusSats} SATS
                  </span>
                </div>
                <div className="text-[10px] text-emerald-400/90 text-right font-sans font-medium mt-0.5">
                  ✓ Added to withdrawal balance
                </div>
              </div>
            </div>

            {/* Action CTA Button */}
            <button
              onClick={onClose}
              className="w-full py-3.5 px-6 bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black font-['Press_Start_2P',monospace] text-xs uppercase tracking-wider font-extrabold rounded-2xl shadow-[0_0_20px_rgba(245,158,11,0.5)] active:scale-95 transition cursor-pointer flex items-center justify-center gap-2"
            >
              <Zap className="w-4 h-4 fill-black" />
              <span>REDEEM REWARD NOW!</span>
            </button>

            <p className="mt-3 text-[10px] text-amber-400/60 font-mono">
              ⚡ Auto-redeeming & closing window in 3s...
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
