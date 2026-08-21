import React from 'react';
import { BALL_TYPES, COST_PER_GAME, GAME_DURATION_SECONDS } from '../utils/constants';
import { HelpCircle, X } from 'lucide-react';

interface HowToPlayModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HowToPlayModal: React.FC<HowToPlayModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-lg bg-[#001B3A] border-2 border-[#D4AF37]/50 rounded-3xl p-6 text-white shadow-2xl relative flex flex-col max-h-[85vh] overflow-y-auto custom-scrollbar">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#D4AF37]/20">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37] flex items-center justify-center text-[#D4AF37]">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#D4AF37] tracking-tight">
                How to Play CHAGEE Maze
              </h2>
              <p className="text-xs text-slate-300">
                Official Rules & Weekly Prize Tournament
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Steps */}
        <div className="py-4 space-y-4 text-xs text-slate-200">
          <div className="flex items-start space-x-3 bg-[#002B54]/70 border border-[#D4AF37]/20 p-3.5 rounded-2xl">
            <div className="w-7 h-7 rounded-full bg-[#D4AF37] text-[#001B3A] font-bold flex items-center justify-center shrink-0">
              1
            </div>
            <div>
              <h4 className="font-bold text-sm text-white mb-0.5">
                Redeem Game with {COST_PER_GAME} Points
              </h4>
              <p className="text-slate-300 leading-relaxed">
                Each round costs 9 points. Claim your daily check-in (+20 points) or earn points through CHAGEE drink purchases.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3 bg-[#002B54]/70 border border-[#D4AF37]/20 p-3.5 rounded-2xl">
            <div className="w-7 h-7 rounded-full bg-[#D4AF37] text-[#001B3A] font-bold flex items-center justify-center shrink-0">
              2
            </div>
            <div>
              <h4 className="font-bold text-sm text-white mb-0.5">
                Rotate the 3D Golden Maze
              </h4>
              <p className="text-slate-300 leading-relaxed">
                Drag the circular maze, use the on-screen rotation buttons (↺ ↻), or press keyboard arrow keys to tilt the maze and guide the tea pearls out through the top exit channel.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3 bg-[#002B54]/70 border border-[#D4AF37]/20 p-3.5 rounded-2xl">
            <div className="w-7 h-7 rounded-full bg-[#D4AF37] text-[#001B3A] font-bold flex items-center justify-center shrink-0">
              3
            </div>
            <div>
              <h4 className="font-bold text-sm text-white mb-0.5">
                {GAME_DURATION_SECONDS} Seconds Time Limit
              </h4>
              <p className="text-slate-300 leading-relaxed">
                Free as many pearls as possible before the clock expires! Different colored pearls grant different point multipliers.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3 bg-[#002B54]/70 border border-[#D4AF37]/20 p-3.5 rounded-2xl">
            <div className="w-7 h-7 rounded-full bg-[#D4AF37] text-[#001B3A] font-bold flex items-center justify-center shrink-0">
              4
            </div>
            <div>
              <h4 className="font-bold text-sm text-white mb-0.5">
                Guaranteed 20% Voucher + Weekly Big Prizes
              </h4>
              <p className="text-slate-300 leading-relaxed">
                Every participant instantly receives a 20% OFF discount voucher. The weekly #1 champion wins the Exclusive 24K Gold Tumbler Set and 1-Year VIP Tea Pass!
              </p>
            </div>
          </div>

          {/* Pearl Value Table */}
          <div className="bg-[#001B3A] border border-[#D4AF37]/30 rounded-2xl p-3 mt-2">
            <h5 className="font-bold text-xs text-[#D4AF37] mb-2 uppercase tracking-wider">
              Tea Pearl Point Values
            </h5>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              {Object.values(BALL_TYPES).map((bt) => (
                <div key={bt.id} className="flex items-center space-x-2 bg-[#002B54] p-2 rounded-xl border border-[#D4AF37]/15">
                  <div className="w-3 h-3 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: bt.color }} />
                  <div className="flex-1 truncate">
                    <span className="font-medium text-white">{bt.name}</span>
                  </div>
                  <span className="font-mono font-bold text-[#D4AF37]">+{bt.points}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-[#D4AF37]/20 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#D4AF37] text-[#001B3A] font-bold text-xs hover:bg-[#F3E5AB] transition-colors cursor-pointer"
          >
            Got It, Let's Play!
          </button>
        </div>
      </div>
    </div>
  );
};
