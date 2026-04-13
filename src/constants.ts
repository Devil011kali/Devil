import { ColorOption, LeaderboardEntry, GameRound } from './types';

export const COLORS: Record<ColorOption, string> = {
  red: '#FF3B30',
  green: '#34C759',
  violet: '#AF52DE',
};

export const NEON_COLORS: Record<ColorOption, string> = {
  red: 'shadow-[0_0_15px_rgba(255,59,48,0.5)]',
  green: 'shadow-[0_0_15px_rgba(52,199,89,0.5)]',
  violet: 'shadow-[0_0_15px_rgba(175,82,222,0.5)]',
};

export const INITIAL_BALANCE = 1000;
export const ROUND_DURATION = 30; // seconds

export const MOCK_LEADERBOARD: LeaderboardEntry[] = [
  { id: '1', name: 'CryptoKing', balance: 25400, rank: 1 },
  { id: '2', name: 'LuckyShot', balance: 18200, rank: 2 },
  { id: '3', name: 'ZenTrader', balance: 15600, rank: 3 },
  { id: '4', name: 'AlphaBet', balance: 12400, rank: 4 },
  { id: '5', name: 'NeonGamer', balance: 9800, rank: 5 },
];

export const INITIAL_HISTORY: GameRound[] = Array.from({ length: 20 }).map((_, i) => ({
  id: `round-init-${i}-${Math.random().toString(36).substr(2, 5)}`,
  periodId: `${20240412000 + i}`,
  result: ['red', 'green', 'violet'][Math.floor(Math.random() * 3)] as ColorOption,
  timestamp: Date.now() - (20 - i) * 30000,
})).reverse();
