export type BallColor = 'green' | 'yellow' | 'red' | 'purple' | 'gold' | 'bomb';

export interface BallTypeConfig {
  id: BallColor;
  name: string;
  nameZh: string;
  points: number;
  color: string;
  glowColor: string;
  highlightColor: string;
  shadowColor: string;
  count: number;
  description: string;
  isBomb?: boolean;
}

export interface PhysicsBall {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  colorType: BallColor;
  points: number;
  escaped: boolean;
  escapeTime?: number;
  alpha: number;
  isBomb?: boolean;
}

export interface ScorePopup {
  id: string;
  x: number;
  y: number;
  points: number;
  color: string;
  text: string;
  opacity: number;
  createdAt: number;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  userName: string;
  avatar: string;
  score: number;
  ballsEscaped: number;
  tier: string;
  date: string;
  isCurrentUser?: boolean;
}

export interface Voucher {
  id: string;
  title: string;
  discount: string;
  description: string;
  code: string;
  minSpend: number;
  expiryDate: string;
  used: boolean;
  dateWon: string;
  gameScore: number;
}

export interface WeeklyPrize {
  rank: string;
  title: string;
  subtitle: string;
  prizeImage: string;
  tag: string;
}

export interface UserStats {
  points: number;
  gamesPlayed: number;
  highScore: number;
  totalBallsEscaped: number;
  vouchersCount: number;
  checkedInToday: boolean;
}
