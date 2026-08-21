import React, { useState } from 'react';
import { X, Trophy, Crown, Gift, Clock } from 'lucide-react';
import { LeaderboardEntry } from '../types';
import { WEEKLY_PRIZES } from '../utils/constants';

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  entries: LeaderboardEntry[];
  userScore: number;
  userBalls: number;
  onPlayGame: () => void;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
  isOpen,
  onClose,
  entries,
  userScore,
  userBalls,
  onPlayGame,
}) => {
  const [activeTab, setActiveTab] = useState<'ranks' | 'prizes'>('ranks');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md max-h-[90vh] bg-gradient-to-b from-[#091B3A] via-[#07152E] to-[#040C1A] border-2 border-amber-400/50 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-amber-100">
        <div className="relative p-4 pb-3 border-b border-amber-500/20 bg-gradient-to-r from-[#0E2752] to-[#091B3A] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-400/20 border border-amber-400/50 flex items-center justify-center text-amber-300">
              <Trophy className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-amber-200 tracking-wide flex items-center gap-1.5">
                Weekly Leaderboard
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                  WEEK 34
                </span>
              </h3>
              <p className="text-[11px] text-amber-300/70 flex items-center gap-1">
                <Clock className="w-3 h-3 text-amber-400" />
                Resets in: <strong className="text-amber-200">2d 14h 42m</strong>
              </p>
            </div>
          </div>

          <button
            id="close-leaderboard-btn"
            onClick={onClose}
            className="p-1.5 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-amber-200 active:scale-95 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center p-2 bg-[#051124] border-b border-slate-800 gap-2">
          <button
            id="tab-ranks-btn"
            onClick={() => setActiveTab('ranks')}
            className={`flex-1 py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'ranks'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Crown className="w-3.5 h-3.5 text-amber-400" />
            <span>Rankings & Scores</span>
          </button>

          <button
            id="tab-prizes-btn"
            onClick={() => setActiveTab('prizes')}
            className={`flex-1 py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'prizes'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Gift className="w-3.5 h-3.5 text-amber-400" />
            <span>Weekly Grand Prizes</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {activeTab === 'ranks' ? (
            <>
              <div className="grid grid-cols-3 gap-2 pt-2 pb-1">
                {entries[1] && (
                  <div className="flex flex-col items-center p-2 rounded-2xl bg-gradient-to-b from-[#0F2852] to-[#081730] border border-slate-400/40 shadow-md text-center mt-3">
                    <div className="w-5 h-5 rounded-full bg-slate-300 text-slate-950 text-[10px] font-black flex items-center justify-center mb-1 shadow">
                      2
                    </div>
                    <img
                      src={entries[1].avatar}
                      alt={entries[1].userName}
                      className="w-10 h-10 rounded-full border-2 border-slate-300 object-cover shadow"
                    />
                    <span className="text-[11px] font-bold text-slate-200 truncate w-full mt-1">
                      {entries[1].userName}
                    </span>
                    <span className="text-xs font-black text-amber-300 mt-0.5">
                      {entries[1].score} pts
                    </span>
                    <span className="text-[9px] text-emerald-300">
                      {entries[1].ballsEscaped} balls
                    </span>
                  </div>
                )}

                {entries[0] && (
                  <div className="flex flex-col items-center p-2.5 rounded-2xl bg-gradient-to-b from-[#1E3E75] to-[#0A1B38] border-2 border-amber-400 shadow-xl text-center relative -mt-1 scale-105">
                    <Crown className="w-5 h-5 text-amber-300 absolute -top-3.5 animate-bounce" />
                    <div className="w-6 h-6 rounded-full bg-gradient-to-r from-amber-400 to-amber-600 text-slate-950 text-xs font-black flex items-center justify-center mb-1 shadow-md">
                      1
                    </div>
                    <img
                      src={entries[0].avatar}
                      alt={entries[0].userName}
                      className="w-12 h-12 rounded-full border-2 border-amber-400 object-cover shadow-lg"
                    />
                    <span className="text-[11px] font-extrabold text-amber-200 truncate w-full mt-1">
                      {entries[0].userName}
                    </span>
                    <span className="text-sm font-black text-amber-300 mt-0.5">
                      {entries[0].score} pts
                    </span>
                    <span className="text-[10px] text-emerald-300 font-bold">
                      {entries[0].ballsEscaped} balls
                    </span>
                  </div>
                )}

                {entries[2] && (
                  <div className="flex flex-col items-center p-2 rounded-2xl bg-gradient-to-b from-[#0F2852] to-[#081730] border border-amber-700/60 shadow-md text-center mt-4">
                    <div className="w-5 h-5 rounded-full bg-amber-700 text-amber-100 text-[10px] font-black flex items-center justify-center mb-1 shadow">
                      3
                    </div>
                    <img
                      src={entries[2].avatar}
                      alt={entries[2].userName}
                      className="w-10 h-10 rounded-full border-2 border-amber-700 object-cover shadow"
                    />
                    <span className="text-[11px] font-bold text-slate-200 truncate w-full mt-1">
                      {entries[2].userName}
                    </span>
                    <span className="text-xs font-black text-amber-300 mt-0.5">
                      {entries[2].score} pts
                    </span>
                    <span className="text-[9px] text-emerald-300">
                      {entries[2].ballsEscaped} balls
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-1.5 pt-2">
                {entries.slice(3).map((entry) => (
                  <div
                    key={entry.userId}
                    className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                      entry.isCurrentUser
                        ? 'bg-amber-500/20 border-amber-400 text-amber-200 shadow-md'
                        : 'bg-[#081730]/70 border-slate-800 text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 text-center font-bold text-xs text-amber-400">
                        #{entry.rank}
                      </span>
                      <img
                        src={entry.avatar}
                        alt={entry.userName}
                        className="w-8 h-8 rounded-full border border-slate-600 object-cover"
                      />
                      <div>
                        <div className="text-xs font-bold flex items-center gap-1">
                          <span>{entry.userName}</span>
                          {entry.isCurrentUser && (
                            <span className="text-[9px] px-1 py-0.2 rounded bg-amber-400 text-slate-950 font-black">
                              YOU
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {entry.tier} • {entry.date}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs font-extrabold text-amber-300">
                        {entry.score} pts
                      </div>
                      <div className="text-[10px] text-emerald-400">
                        {entry.ballsEscaped} balls
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="space-y-2.5">
              <div className="p-3 rounded-2xl bg-gradient-to-r from-amber-500/20 to-amber-600/30 border border-amber-400/70">
                <h4 className="text-xs font-black text-amber-200 mb-1">
                  WEEKLY PRIZE POOL REWARDS
                </h4>
                <p className="text-[11px] text-amber-100/80 leading-snug">
                  Every Sunday 23:59 GMT+8, leaderboard winners are finalized and rewards are directly deposited to member accounts.
                </p>
              </div>

              {WEEKLY_PRIZES.map((prize, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-2xl bg-[#091A38] border border-amber-500/30 hover:border-amber-400/60 transition-all flex items-start gap-3 shadow-md"
                >
                  <div className="text-2xl p-2 rounded-xl bg-[#051124] border border-amber-500/20">
                    {prize.prizeImage}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-300">
                        {prize.rank}
                      </span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 font-bold border border-amber-400/40">
                        {prize.tag}
                      </span>
                    </div>
                    <h4 className="text-xs font-extrabold text-white mt-0.5">
                      {prize.title}
                    </h4>
                    <p className="text-[10px] text-slate-300/80 mt-0.5">
                      {prize.subtitle}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-3.5 border-t border-amber-500/20 bg-[#051226] flex items-center justify-between gap-3">
          <div>
            <span className="text-[10px] text-slate-400 block">Your Best Score</span>
            <span className="text-sm font-black text-amber-300">
              {userScore > 0 ? `${userScore} pts (${userBalls} balls)` : 'No games played yet'}
            </span>
          </div>

          <button
            id="leaderboard-play-btn"
            onClick={() => {
              onClose();
              onPlayGame();
            }}
            className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-400 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-lg active:scale-95 transition-all"
          >
            <span>Play to Climb Rank</span>
          </button>
        </div>
      </div>
    </div>
  );
};
