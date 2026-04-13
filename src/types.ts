export type ColorOption = 'red' | 'green' | 'violet';

export interface GameRound {
  id: string;
  periodId: string;
  result: ColorOption;
  timestamp: number;
}

export interface Bet {
  id: string;
  amount: number;
  selection: ColorOption;
  periodId: string;
  status: 'pending' | 'won' | 'lost';
  winAmount?: number;
}

export interface UserStats {
  balance: number;
  totalGames: number;
  winRate: number;
  totalWon: number;
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  balance: number;
  rank: number;
}
