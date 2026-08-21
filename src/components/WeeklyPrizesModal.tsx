import React from 'react';
import { WEEKLY_PRIZES } from '../utils/constants';
import { Trophy, X } from 'lucide-react';

interface WeeklyPrizesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WeeklyPrizesModal: React.FC<WeeklyPrizesModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-lg bg-[#001B3A] border-2 border-[#D4AF37] rounded-3xl p-6 text-white shadow-2xl relative flex flex-col max-h-[85vh] overflow-y-auto custom-scrollbar">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#D4AF37]/20">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37] flex items-center justify-center text-[#D4AF37]">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#D4AF37] tracking-tight">
                Weekly Prize Pool
              </h2>
              <p className="text-xs text-slate-300">
                Season #34: Resets every Sunday 23:59 SGT
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

        {/* Big Highlight Winner Showcase */}
        <div className="my-4 bg-gradient-to-r from-[#D4AF37]/20 via-[#002B54] to-[#D4AF37]/20 border-2 border-[#D4AF37] rounded-3xl p-4 relative overflow-hidden shadow-lg">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#FFE885] via-[#D4AF37] to-[#854d0e] flex items-center justify-center text-3xl shadow-inner text-[#001B3A]">
              🏆
            </div>
            <div className="flex-1">
              <div className="inline-block px-2.5 py-0.5 rounded-full bg-[#D4AF37] text-[#001B3A] text-[10px] font-black uppercase tracking-wider mb-1">
                TOP WINNER GRAND PRIZE
              </div>
              <h3 className="text-lg font-bold text-white leading-tight">
                Imperial 24K Gold Tumbler Set
              </h3>
              <p className="text-xs text-[#D4AF37] font-medium mt-0.5">
                + 1-Year Free CHAGEE Fresh Milk Tea Pass (365 cups)
              </p>
            </div>
          </div>
        </div>

        {/* Prize Tier Cards */}
        <div className="space-y-3">
          {WEEKLY_PRIZES.map((prize, idx) => (
            <div
              key={idx}
              className="bg-[#002B54]/70 border border-[#D4AF37]/30 rounded-2xl p-3.5 flex items-center space-x-3.5"
            >
              <div className="w-10 h-10 rounded-xl bg-[#001B3A] border border-[#D4AF37]/40 flex items-center justify-center text-xl shrink-0">
                {prize.prizeImage}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider">
                    {prize.rank}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">
                    {prize.tag}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-white mt-0.5">
                  {prize.title}
                </h4>
                <p className="text-xs text-slate-300 mt-0.5">
                  {prize.subtitle}
                </p>
              </div>
            </div>
          ))}

          {/* Guaranteed Participation Voucher */}
          <div className="bg-[#002B54]/40 border border-emerald-500/40 rounded-2xl p-3.5 flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#001B3A] border border-emerald-500/50 flex items-center justify-center text-xl shrink-0">
              🎟️
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  All Participants
                </span>
                <span className="text-[10px] text-emerald-300 font-medium">
                  Guaranteed 100% Win Rate
                </span>
              </div>
              <h4 className="text-sm font-bold text-white mt-0.5">
                20% OFF CHAGEE Discount Voucher
              </h4>
              <p className="text-xs text-slate-300 mt-0.5">
                Automatically credited to your account voucher wallet upon completing every maze session.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-[#D4AF37]/20 flex items-center justify-between text-xs text-slate-400 mt-4">
          <span>Prizes shipped to registered address or claimed via app.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-[#D4AF37] text-[#001B3A] font-bold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
