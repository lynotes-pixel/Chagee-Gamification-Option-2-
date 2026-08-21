import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MazeGameCanvas } from './components/MazeGameCanvas';
import { VoucherWalletModal } from './components/VoucherWalletModal';
import { GameOverModal } from './components/GameOverModal';
import { HowToPlayModal } from './components/HowToPlayModal';
import { WeeklyPrizesModal } from './components/WeeklyPrizesModal';
import { BallColor, LeaderboardEntry, Voucher } from './types';
import {
  BALL_TYPES,
  COST_PER_GAME,
  GAME_DURATION_SECONDS,
  INITIAL_LEADERBOARD,
  INITIAL_USER_POINTS,
} from './utils/constants';
import { soundManager } from './utils/audio';
import {
  Award,
  Calendar,
  Clock,
  Coins,
  Gift,
  HelpCircle,
  Play,
  Sparkles,
  Tag,
  Trophy,
  Volume2,
  VolumeX,
} from 'lucide-react';

const STORAGE_KEY_POINTS = 'chagee_maze_points_v1';
const STORAGE_KEY_HIGHSCORE = 'chagee_maze_highscore_v1';
const STORAGE_KEY_VOUCHERS = 'chagee_maze_vouchers_v1';
const STORAGE_KEY_CHECKIN = 'chagee_maze_last_checkin_v1';

export default function App() {
  // Persistence state
  const [userPoints, setUserPoints] = useState<number>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_POINTS);
    return saved ? parseInt(saved, 10) : INITIAL_USER_POINTS;
  });

  const [highScore, setHighScore] = useState<number>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_HIGHSCORE);
    return saved ? parseInt(saved, 10) : 0;
  });

  const [vouchers, setVouchers] = useState<Voucher[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_VOUCHERS);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return [];
      }
    }
    return [
      {
        id: 'v_welcome',
        title: '20% OFF Welcome Drink Voucher',
        discount: '20% OFF',
        description: 'Valid for all Signature Fresh Milk Tea & Cold Brews',
        code: 'CHAGEE20WELCOME',
        minSpend: 5.0,
        expiryDate: '31 Aug 2026',
        used: false,
        dateWon: 'Welcome Bonus',
        gameScore: 0,
      },
    ];
  });

  const [checkedInToday, setCheckedInToday] = useState<boolean>(() => {
    const todayStr = new Date().toDateString();
    return localStorage.getItem(STORAGE_KEY_CHECKIN) === todayStr;
  });

  // Sound state
  const [soundOn, setSoundOn] = useState<boolean>(true);

  // Modals state
  const [showVoucherModal, setShowVoucherModal] = useState<boolean>(false);
  const [showGameOverModal, setShowGameOverModal] = useState<boolean>(false);
  const [showHowToPlayModal, setShowHowToPlayModal] = useState<boolean>(false);
  const [showPrizesModal, setShowPrizesModal] = useState<boolean>(false);

  // Active Game State
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState<number>(GAME_DURATION_SECONDS);
  const [currentScore, setCurrentScore] = useState<number>(0);
  const [escapedCount, setEscapedCount] = useState<number>(0);
  const [escapedBreakdown, setEscapedBreakdown] = useState<Record<BallColor, number>>({
    green: 0,
    yellow: 0,
    red: 0,
    purple: 0,
    gold: 0,
  });
  const [lastEarnedVoucher, setLastEarnedVoucher] = useState<Voucher | null>(null);
  const [isNewHighScore, setIsNewHighScore] = useState<boolean>(false);

  // Leaderboard data
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(INITIAL_LEADERBOARD);

  // Persist handlers
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_POINTS, userPoints.toString());
  }, [userPoints]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_HIGHSCORE, highScore.toString());
  }, [highScore]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_VOUCHERS, JSON.stringify(vouchers));
  }, [vouchers]);

  // Audio mute sync
  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    soundManager.setEnabled(next);
  };

  // Daily check-in (+20 points)
  const handleDailyCheckIn = () => {
    if (checkedInToday) return;
    const todayStr = new Date().toDateString();
    localStorage.setItem(STORAGE_KEY_CHECKIN, todayStr);
    setCheckedInToday(true);
    setUserPoints((prev) => prev + 20);
    soundManager.playRedeem();
  };

  // Start new game session (Deducts 9 points)
  const startGame = () => {
    if (userPoints < COST_PER_GAME) {
      alert(`You need at least ${COST_PER_GAME} points to play! Claim your daily check-in bonus or earn points.`);
      return;
    }

    setUserPoints((prev) => prev - COST_PER_GAME);
    soundManager.playRedeem();

    // Reset game state
    setCurrentScore(0);
    setEscapedCount(0);
    setEscapedBreakdown({
      green: 0,
      yellow: 0,
      red: 0,
      purple: 0,
      gold: 0,
    });
    setTimeLeft(GAME_DURATION_SECONDS);
    setIsNewHighScore(false);
    setLastEarnedVoucher(null);
    setIsPlaying(true);
  };

  // Ball escaped callback from canvas
  const handleBallEscaped = useCallback(
    (ballType: BallColor, points: number, totalEscaped: number) => {
      setEscapedCount(totalEscaped);
      setCurrentScore((prev) => prev + points);
      setEscapedBreakdown((prev) => ({
        ...prev,
        [ballType]: (prev[ballType] || 0) + 1,
      }));
    },
    []
  );

  // End game logic
  const endGame = useCallback(() => {
    setIsPlaying(false);

    // Calculate voucher and highscore
    const randomCodeSuffix = Math.floor(1000 + Math.random() * 9000);
    const newVoucher: Voucher = {
      id: `v_${Date.now()}`,
      title: '20% OFF Participation Reward',
      discount: '20% OFF',
      description: 'Guaranteed participant reward for completing the Golden Maze',
      code: `CHAGEE20-${randomCodeSuffix}`,
      minSpend: 6.0,
      expiryDate: '7 Days from Now',
      used: false,
      dateWon: new Date().toLocaleDateString(),
      gameScore: currentScore,
    };

    setVouchers((prev) => [newVoucher, ...prev]);
    setLastEarnedVoucher(newVoucher);

    // Check highscore
    if (currentScore > highScore) {
      setHighScore(currentScore);
      setIsNewHighScore(true);

      // Insert or update player in leaderboard
      setLeaderboard((prev) => {
        const userEntry: LeaderboardEntry = {
          rank: 1,
          userId: 'current_user',
          userName: 'You (Tea Master)',
          avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
          score: currentScore,
          ballsEscaped: escapedCount,
          tier: 'Imperial Grandmaster',
          date: 'Just now',
          isCurrentUser: true,
        };

        const updated = [...prev.filter((p) => p.userId !== 'current_user'), userEntry]
          .sort((a, b) => b.score - a.score)
          .map((item, idx) => ({ ...item, rank: idx + 1 }));

        return updated.slice(0, 8);
      });
    }

    setShowGameOverModal(true);
  }, [currentScore, escapedCount, highScore]);

  // Game countdown timer loop
  useEffect(() => {
    if (!isPlaying) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          endGame();
          return 0;
        }
        if (prev <= 10) {
          soundManager.playTick();
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isPlaying, endGame]);

  return (
    <div className="w-full min-h-screen bg-[#001B3A] text-white font-sans flex flex-col justify-between select-none">
      {/* Container with standard bento max-width */}
      <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 flex-1 flex flex-col">
        {/* ================= HEADER ================= */}
        <header className="flex flex-wrap items-center justify-between gap-4 mb-5 pb-2 border-b border-[#D4AF37]/15">
          {/* Logo & Brand Title */}
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 bg-gradient-to-br from-[#FFE885] via-[#D4AF37] to-[#854d0e] rounded-full flex items-center justify-center shadow-lg shadow-black/30 border border-[#FFF0A0]">
              <span className="text-[#001B3A] font-black text-2xl tracking-tighter">C</span>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white uppercase">
                  CHAGEE <span className="text-[#D4AF37]">MAZE CHALLENGE</span>
                </h1>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/30 text-[#D4AF37] text-[10px] font-bold tracking-wider">
                  SEASON 34
                </span>
              </div>
              <p className="text-xs text-slate-300 font-medium tracking-wide">
                霸王茶姬 • 金玉迷宫 3D物理闯关
              </p>
            </div>
          </div>

          {/* User Status, Points & Navigation Controls */}
          <div className="flex items-center space-x-2.5 sm:space-x-3 flex-wrap">
            {/* Audio Toggle */}
            <button
              id="btn-toggle-sound"
              onClick={toggleSound}
              className="w-10 h-10 rounded-full bg-[#002B54] border border-[#D4AF37]/30 hover:border-[#D4AF37] flex items-center justify-center text-[#D4AF37] hover:text-white transition-all cursor-pointer shadow"
              title={soundOn ? 'Mute Audio' : 'Unmute Audio'}
            >
              {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* How to Play Button */}
            <button
              id="btn-how-to-play"
              onClick={() => setShowHowToPlayModal(true)}
              className="w-10 h-10 rounded-full bg-[#002B54] border border-[#D4AF37]/30 hover:border-[#D4AF37] flex items-center justify-center text-[#D4AF37] hover:text-white transition-all cursor-pointer shadow"
              title="How to Play & Rules"
            >
              <HelpCircle className="w-4 h-4" />
            </button>

            {/* My Vouchers Button with Badge */}
            <button
              id="btn-my-vouchers"
              onClick={() => setShowVoucherModal(true)}
              className="px-3.5 py-2 rounded-full bg-[#002B54] border border-[#D4AF37]/40 hover:border-[#D4AF37] text-white flex items-center space-x-2 transition-all cursor-pointer shadow text-xs font-semibold"
            >
              <Gift className="w-4 h-4 text-[#D4AF37]" />
              <span className="hidden sm:inline">My Vouchers</span>
              <span className="px-1.5 py-0.2 rounded-full bg-[#D4AF37] text-[#001B3A] text-[10px] font-black">
                {vouchers.length}
              </span>
            </button>

            {/* User Points Badge */}
            <div className="bg-gradient-to-r from-[#002B54] to-[#001B3A] border border-[#D4AF37]/50 px-4 py-2 rounded-full flex items-center space-x-2.5 shadow-md">
              <Coins className="w-4 h-4 text-[#D4AF37]" />
              <span className="text-xs text-slate-300 font-medium">Your Points:</span>
              <span className="text-[#D4AF37] font-black font-mono text-sm sm:text-base">
                {userPoints.toLocaleString()} pts
              </span>
            </div>
          </div>
        </header>

        {/* ================= MAIN BENTO GRID ================= */}
        <main className="flex-1 grid grid-cols-12 gap-4 auto-rows-auto">
          {/* ================= LEFT BENTO: WEEKLY LEADERBOARD & PRIZES ================= */}
          <section className="col-span-12 lg:col-span-3 bg-[#002B54] rounded-3xl border border-[#D4AF37]/20 p-5 flex flex-col justify-between shadow-xl">
            <div>
              {/* Leaderboard Header */}
              <div className="flex items-center justify-between mb-3.5">
                <div className="flex items-center space-x-2">
                  <Trophy className="w-4 h-4 text-[#D4AF37]" />
                  <h2 className="text-[#D4AF37] uppercase text-xs font-black tracking-widest">
                    Weekly Leaderboard
                  </h2>
                </div>
                <span className="text-[10px] text-slate-300 font-mono bg-[#001B3A] px-2 py-0.5 rounded-full border border-[#D4AF37]/20">
                  Resets in: 2d 14h
                </span>
              </div>

              {/* Leaderboard List */}
              <div className="space-y-2.5">
                {leaderboard.slice(0, 5).map((entry) => {
                  const isTop1 = entry.rank === 1;
                  const isTop2 = entry.rank === 2;
                  const isTop3 = entry.rank === 3;

                  return (
                    <div
                      key={entry.userId}
                      className={`flex items-center justify-between p-2.5 rounded-2xl border transition-all ${
                        entry.isCurrentUser
                          ? 'bg-[#D4AF37]/20 border-[#D4AF37] shadow-md'
                          : isTop1
                          ? 'bg-[#001B3A]/80 border-[#D4AF37]/40 shadow-sm'
                          : 'bg-[#001B3A]/40 border-[#D4AF37]/10'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 min-w-0">
                        {/* Rank Badge */}
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                            isTop1
                              ? 'bg-[#D4AF37] text-[#001B3A]'
                              : isTop2
                              ? 'bg-slate-300 text-[#001B3A]'
                              : isTop3
                              ? 'bg-amber-700 text-white'
                              : 'text-slate-400 font-bold'
                          }`}
                        >
                          {entry.rank}
                        </div>

                        {/* Avatar */}
                        <img
                          src={entry.avatar}
                          alt={entry.userName}
                          className="w-7 h-7 rounded-full object-cover border border-[#D4AF37]/30 shrink-0"
                        />

                        {/* Name & Escaped info */}
                        <div className="truncate">
                          <span
                            className={`text-xs font-bold truncate block ${
                              entry.isCurrentUser ? 'text-[#D4AF37]' : 'text-white'
                            }`}
                          >
                            {entry.userName}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {entry.ballsEscaped} pearls freed
                          </span>
                        </div>
                      </div>

                      {/* Score */}
                      <span className="text-xs font-mono font-bold text-[#D4AF37] shrink-0 ml-2">
                        {entry.score.toLocaleString()}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Weekly Top Prize Card in Leaderboard */}
            <div className="mt-4 pt-3.5 border-t border-[#D4AF37]/20">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Top Prize This Week
                </span>
                <button
                  onClick={() => setShowPrizesModal(true)}
                  className="text-[10px] text-[#D4AF37] hover:underline font-bold cursor-pointer"
                >
                  View All &gt;
                </button>
              </div>

              <div
                onClick={() => setShowPrizesModal(true)}
                className="bg-[#001B3A]/70 border border-[#D4AF37]/30 rounded-2xl p-2.5 flex items-center space-x-3 cursor-pointer hover:border-[#D4AF37] transition-all group"
              >
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#FFE885] to-[#D4AF37] flex items-center justify-center text-lg shadow-inner text-[#001B3A] shrink-0">
                  🏆
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-[#D4AF37] font-bold truncate group-hover:text-[#FFE885] transition-colors">
                    Imperial 24K Gold Tumbler Set
                  </p>
                  <p className="text-[10px] text-slate-400 truncate">
                    + 1-Year Free CHAGEE Tea Pass
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* ================= CENTER BENTO: 3D ROUNDED MAZE PLAYGROUND ================= */}
          <section className="col-span-12 lg:col-span-6 min-h-[460px] bg-[#001B3A] border-2 border-[#D4AF37]/40 rounded-[3rem] relative flex flex-col items-center justify-center p-4 sm:p-6 overflow-hidden shadow-[0_0_50px_rgba(212,175,55,0.12)]">
            {/* Ambient Radial Spotlight */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#002B54_0%,_transparent_75%)] opacity-60 pointer-events-none"></div>

            {/* Exit Gate Indicator Label */}
            <div className="absolute top-4 bg-[#D4AF37] text-[#001B3A] px-4 py-1 rounded-full font-black text-[11px] uppercase tracking-wider shadow-md z-10">
              Top Exit Chute ⮝
            </div>

            {/* Canvas Maze Component */}
            <div className="relative w-full flex-1 flex items-center justify-center my-2">
              <MazeGameCanvas
                isPlaying={isPlaying}
                onBallEscaped={handleBallEscaped}
                soundEnabled={soundOn}
              />

              {/* Start Overlay when game not currently running */}
              {!isPlaying && (
                <div className="absolute inset-0 bg-[#001B3A]/85 backdrop-blur-sm rounded-[2.5rem] flex flex-col items-center justify-center p-6 text-center z-20 animate-fadeIn">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#FFE885] via-[#D4AF37] to-[#854d0e] flex items-center justify-center text-3xl shadow-xl border-2 border-[#FFF0A0] mb-3 text-[#001B3A]">
                    🌀
                  </div>

                  <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">
                    CHAGEE <span className="text-[#D4AF37]">GOLDEN MAZE</span>
                  </h2>
                  <p className="text-xs text-slate-300 max-w-sm mt-1.5 mb-5 leading-relaxed">
                    Rotate the 3D rounded maze to guide the tea pearls through the channels and out the top exit within 60 seconds!
                  </p>

                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    <button
                      id="btn-start-game-overlay"
                      onClick={startGame}
                      className="px-7 py-3.5 rounded-2xl bg-[#D4AF37] text-[#001B3A] font-black text-sm uppercase tracking-wider hover:bg-[#F3E5AB] active:scale-95 transition-all shadow-xl shadow-black/50 flex items-center space-x-2 cursor-pointer"
                    >
                      <Play className="w-4 h-4 fill-[#001B3A]" />
                      <span>Start Round ({COST_PER_GAME} Pts)</span>
                    </button>

                    <button
                      id="btn-view-rules-overlay"
                      onClick={() => setShowHowToPlayModal(true)}
                      className="px-5 py-3.5 rounded-2xl bg-[#002B54] border border-[#D4AF37]/40 text-white font-bold text-xs hover:border-[#D4AF37] transition-colors cursor-pointer"
                    >
                      How to Play
                    </button>
                  </div>

                  <p className="text-[11px] text-[#D4AF37] font-semibold mt-4">
                    🎁 Guaranteed 20% OFF Voucher for every participant!
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* ================= RIGHT BENTO: STATS & CONTROLS STACK ================= */}
          <div className="col-span-12 lg:col-span-3 flex flex-col gap-4">
            {/* 1. Remaining Time Card */}
            <div className="bg-[#002B54] rounded-3xl border border-[#D4AF37]/20 p-4 sm:p-5 flex flex-col justify-center items-center text-center shadow-lg">
              <div className="flex items-center space-x-1.5 text-xs uppercase text-slate-300 font-semibold mb-1">
                <Clock className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>Remaining Time</span>
              </div>

              <span
                className={`text-4xl sm:text-5xl font-mono font-black tracking-tight ${
                  timeLeft <= 10 && isPlaying
                    ? 'text-red-400 animate-pulse'
                    : 'text-[#D4AF37]'
                }`}
              >
                00:{timeLeft < 10 ? `0${timeLeft}` : timeLeft}
              </span>

              {/* Progress Bar */}
              <div className="w-full h-1.5 bg-[#001B3A] mt-3 rounded-full overflow-hidden border border-[#D4AF37]/10">
                <div
                  className="h-full bg-gradient-to-r from-[#D4AF37] to-[#FFE885] transition-all duration-300"
                  style={{
                    width: `${(timeLeft / GAME_DURATION_SECONDS) * 100}%`,
                  }}
                />
              </div>
            </div>

            {/* 2. Current Score Card */}
            <div className="bg-[#002B54] rounded-3xl border border-[#D4AF37]/20 p-4 sm:p-5 flex flex-col justify-center items-center text-center shadow-lg">
              <div className="flex items-center space-x-1.5 text-xs uppercase text-slate-300 font-semibold mb-1">
                <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>Current Score</span>
              </div>

              <span className="text-4xl sm:text-5xl font-mono font-black text-white tracking-tight">
                {currentScore.toLocaleString()}
              </span>

              <div className="mt-2 flex items-center space-x-2 text-xs text-slate-300">
                <span className="text-[#D4AF37] font-bold font-mono">
                  {escapedCount}
                </span>
                <span>pearls freed</span>
              </div>
            </div>

            {/* 3. Points & Redeem Card */}
            <div className="bg-gradient-to-br from-[#D4AF37] via-[#C99E25] to-[#AA820A] rounded-3xl p-4 sm:p-5 flex flex-col justify-between text-[#001B3A] shadow-xl">
              <div className="flex items-center justify-between mb-2">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#001B3A]/80">
                    Play Round
                  </span>
                  <span className="text-sm font-black text-[#001B3A]">
                    {COST_PER_GAME} Points / Game
                  </span>
                </div>

                <button
                  id="btn-redeem-game"
                  disabled={isPlaying}
                  onClick={startGame}
                  className="bg-[#001B3A] text-white px-4 py-2 rounded-xl text-xs font-bold uppercase hover:bg-black active:scale-95 transition-all shadow cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPlaying ? 'Playing...' : 'Redeem'}
                </button>
              </div>

              {/* Free Daily Check-in Bonus Action */}
              <div className="pt-2 border-t border-[#001B3A]/20 flex items-center justify-between">
                <div className="flex items-center space-x-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#001B3A]" />
                  <span className="text-[11px] font-bold text-[#001B3A]">
                    Daily Check-in: +20 pts
                  </span>
                </div>

                <button
                  id="btn-daily-checkin"
                  onClick={handleDailyCheckIn}
                  disabled={checkedInToday}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-all ${
                    checkedInToday
                      ? 'bg-[#001B3A]/20 text-[#001B3A]/60 cursor-default'
                      : 'bg-[#001B3A] text-[#FFE885] hover:bg-black cursor-pointer shadow-sm'
                  }`}
                >
                  {checkedInToday ? 'Claimed' : 'Claim'}
                </button>
              </div>
            </div>

            {/* 4. Ball Score Key Card */}
            <div className="bg-[#002B54] rounded-3xl border border-[#D4AF37]/20 p-4 shadow-lg">
              <div className="flex items-center justify-between mb-2.5">
                <h3 className="text-[10px] font-bold uppercase text-slate-300 tracking-wider">
                  Tea Pearl Point Key
                </h3>
                <span className="text-[9px] text-[#D4AF37]">5 Pearl Flavors</span>
              </div>

              <div className="space-y-2">
                {Object.values(BALL_TYPES).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-1.5 rounded-xl bg-[#001B3A]/40 border border-[#D4AF37]/10"
                  >
                    <div className="flex items-center space-x-2">
                      <div
                        className="w-3.5 h-3.5 rounded-full shadow"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-xs text-white font-medium">
                        {item.name}
                      </span>
                    </div>
                    <span className="text-xs font-mono font-black text-[#D4AF37]">
                      +{item.points}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ================= BOTTOM BENTO: PARTICIPATION REWARD BANNER ================= */}
          <section className="col-span-12 bg-gradient-to-r from-[#002B54] via-[#003466] to-[#001B3A] border border-[#D4AF37]/40 rounded-3xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 shadow-xl">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#FFE885] to-[#D4AF37] flex items-center justify-center text-2xl text-[#001B3A] shadow shrink-0">
                🎁
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-sm sm:text-base font-bold text-white">
                    Guaranteed Participation Reward
                  </h3>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold uppercase">
                    100% Win Rate
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  Finish the 60-second maze challenge to receive a{' '}
                  <span className="text-[#D4AF37] font-bold">20% OFF Drink Voucher</span>{' '}
                  applicable to any CHAGEE fresh brew or milk tea.
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="text-right hidden sm:block">
                <p className="text-[10px] uppercase text-slate-400 font-semibold">
                  Season 34 Closes In
                </p>
                <p className="text-xs font-mono font-bold text-[#D4AF37]">
                  2d 14h 32m
                </p>
              </div>

              <button
                id="btn-view-wallet-bottom"
                onClick={() => setShowVoucherModal(true)}
                className="px-4 py-2.5 rounded-xl bg-[#D4AF37] text-[#001B3A] font-bold text-xs hover:bg-[#F3E5AB] active:scale-95 transition-all shadow flex items-center space-x-1.5 cursor-pointer"
              >
                <Tag className="w-3.5 h-3.5" />
                <span>View Voucher Wallet ({vouchers.length})</span>
              </button>
            </div>
          </section>
        </main>
      </div>

      {/* ================= MODALS & DRAWERS ================= */}
      {/* 1. Voucher Wallet Modal */}
      <VoucherWalletModal
        isOpen={showVoucherModal}
        onClose={() => setShowVoucherModal(false)}
        vouchers={vouchers}
      />

      {/* 2. Game Over Summary Modal */}
      <GameOverModal
        isOpen={showGameOverModal}
        score={currentScore}
        escapedBallsCount={escapedCount}
        escapedBreakdown={escapedBreakdown}
        earnedVoucher={lastEarnedVoucher}
        onPlayAgain={() => {
          setShowGameOverModal(false);
          startGame();
        }}
        onClose={() => setShowGameOverModal(false)}
        userPoints={userPoints}
        isNewHighScore={isNewHighScore}
      />

      {/* 3. How to Play Rules Modal */}
      <HowToPlayModal
        isOpen={showHowToPlayModal}
        onClose={() => setShowHowToPlayModal(false)}
      />

      {/* 4. Weekly Prizes Ladder Modal */}
      <WeeklyPrizesModal
        isOpen={showPrizesModal}
        onClose={() => setShowPrizesModal(false)}
      />
    </div>
  );
}
