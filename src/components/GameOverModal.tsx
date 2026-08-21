import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { BallColor, Voucher } from '../types';
import { BALL_TYPES, COST_PER_GAME } from '../utils/constants';
import { soundManager } from '../utils/audio';
import { Award, Check, Copy, Gift, Play, RotateCcw, Sparkles, Trophy, X } from 'lucide-react';

interface GameOverModalProps {
  isOpen: boolean;
  score: number;
  escapedBallsCount: number;
  escapedBreakdown: Record<BallColor, number>;
  earnedVoucher: Voucher | null;
  onPlayAgain: () => void;
  onClose: () => void;
  userPoints: number;
  isNewHighScore: boolean;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  isOpen,
  score,
  escapedBallsCount,
  escapedBreakdown,
  earnedVoucher,
  onPlayAgain,
  onClose,
  userPoints,
  isNewHighScore,
}) => {
  const [copied, setCopied] = React.useState(false);

  useEffect(() => {
    if (isOpen) {
      soundManager.playGameOver();

      // Confetti blast
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#D4AF37', '#F3E5AB', '#3b82f6', '#22c55e', '#ef4444', '#a855f7'],
        });
      } catch (err) {
        console.error('Confetti error', err);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopyCode = () => {
    if (earnedVoucher) {
      navigator.clipboard.writeText(earnedVoucher.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-md bg-[#001B3A] border-2 border-[#D4AF37] rounded-3xl p-6 text-white shadow-[0_0_50px_rgba(212,175,55,0.25)] relative flex flex-col max-h-[90vh] overflow-y-auto custom-scrollbar">
        {/* Close button */}
        <button
          id="btn-close-game-over"
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Top Header Badge */}
        <div className="text-center space-y-2 mt-2">
          <div className="inline-flex items-center space-x-1 px-3 py-1 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37]/50 text-[#D4AF37] text-xs font-bold uppercase tracking-wider">
            <Trophy className="w-3.5 h-3.5" />
            <span>Game Summary</span>
          </div>

          <h2 className="text-2xl font-black tracking-tight text-white">
            {escapedBallsCount >= 40
              ? 'Imperial Grandmaster!'
              : escapedBallsCount >= 20
              ? 'Splendid Performance!'
              : 'Great Effort!'}
          </h2>
          <p className="text-xs text-slate-300">
            20-second Golden Maze Challenge completed
          </p>
        </div>

        {/* High Score Banner if achieved */}
        {isNewHighScore && (
          <div className="my-2 py-1.5 px-3 bg-gradient-to-r from-[#D4AF37]/20 via-[#D4AF37]/40 to-[#D4AF37]/20 border border-[#D4AF37] rounded-xl text-center text-[#D4AF37] text-xs font-bold flex items-center justify-center space-x-1.5 animate-pulse">
            <Sparkles className="w-4 h-4" />
            <span>NEW PERSONAL HIGH SCORE!</span>
          </div>
        )}

        {/* Score & Balls Extracted Bento Blocks */}
        <div className="grid grid-cols-2 gap-3 my-4">
          <div className="bg-[#002B54] border border-[#D4AF37]/30 rounded-2xl p-3 text-center">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block mb-0.5">
              Total Score
            </span>
            <span className="text-3xl font-black font-mono text-[#D4AF37]">
              {score.toLocaleString()}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">points</span>
          </div>

          <div className="bg-[#002B54] border border-[#D4AF37]/30 rounded-2xl p-3 text-center">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block mb-0.5">
              Escaped Pearls
            </span>
            <span className="text-3xl font-black font-mono text-white">
              {escapedBallsCount}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">balls freed</span>
          </div>
        </div>

        {/* Ball Breakdown Chips */}
        <div className="bg-[#002B54]/60 border border-[#D4AF37]/20 rounded-2xl p-3 mb-4">
          <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Tea Pearl Breakdown</span>
            <span className="text-[10px] font-normal text-slate-400">Score per pearl</span>
          </div>
          <div className="grid grid-cols-5 gap-1.5 text-center">
            {(Object.keys(BALL_TYPES) as BallColor[])
              .filter((col) => !BALL_TYPES[col].isBomb)
              .map((col) => {
                const count = escapedBreakdown[col] || 0;
                const conf = BALL_TYPES[col];
                return (
                  <div
                    key={col}
                    className="bg-[#001B3A] border border-[#D4AF37]/20 rounded-xl p-1.5 flex flex-col items-center"
                  >
                    <div
                      className="w-3.5 h-3.5 rounded-full mb-1 shadow-sm"
                      style={{ backgroundColor: conf.color }}
                    />
                    <span className="text-xs font-bold font-mono text-white">
                      x{count}
                    </span>
                    <span className="text-[9px] text-[#D4AF37] font-mono">
                      +{conf.points}
                    </span>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Guaranteed 20% Participation Voucher Card */}
        {earnedVoucher && (
          <div className="relative bg-gradient-to-br from-[#002B54] to-[#001730] border-2 border-[#D4AF37] rounded-2xl p-4 mb-4 shadow-lg overflow-hidden">
            <div className="flex items-center space-x-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-[#D4AF37] text-[#001B3A] flex items-center justify-center font-bold text-lg shadow">
                🎁
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-1">
                  <span className="text-[10px] uppercase font-bold text-[#D4AF37]">
                    Guaranteed Participation Reward
                  </span>
                </div>
                <h3 className="text-base font-bold text-white leading-tight">
                  20% OFF CHAGEE Drink Voucher
                </h3>
              </div>
            </div>

            <p className="text-xs text-slate-300 mb-3">
              Thank you for playing the Golden Maze! Enjoy 20% off your next Fresh Milk Tea or Brew.
            </p>

            <div className="bg-[#001B3A] border border-[#D4AF37]/40 rounded-xl p-2.5 flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[9px] text-slate-400 uppercase">Promo Code</span>
                <span className="font-mono font-bold text-sm text-[#D4AF37] tracking-wider">
                  {earnedVoucher.code}
                </span>
              </div>

              <button
                id="btn-copy-reward-code"
                onClick={handleCopyCode}
                className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-[#D4AF37] text-[#001B3A] font-bold text-xs hover:bg-[#F3E5AB] active:scale-95 transition-all cursor-pointer shadow"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-900" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2 pt-1">
          <button
            id="btn-modal-play-again"
            onClick={onPlayAgain}
            className="w-full py-3.5 rounded-2xl bg-[#D4AF37] text-[#001B3A] font-bold text-sm tracking-wide uppercase hover:bg-[#F3E5AB] active:scale-98 transition-all flex items-center justify-center space-x-2 shadow-lg shadow-black/40 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-[#001B3A]" />
            <span>Play Again ({COST_PER_GAME} Points)</span>
          </button>

          <button
            id="btn-modal-view-board"
            onClick={onClose}
            className="w-full py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-medium text-xs transition-colors flex items-center justify-center space-x-1.5 cursor-pointer"
          >
            <Award className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>View Weekly Leaderboard & Prizes</span>
          </button>
        </div>
      </div>
    </div>
  );
};
