export type PaymentProvider = 'faucetpay' | 'cwallet';
export type MiningCurrency = 'BTC' | 'USDT';

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  satsBalance: number;
  usdtBalance: number;
  preferredCurrency?: MiningCurrency;
  highScore: number;
  level: number;
  movesPlayed: number;
  walletAddress?: string;
  createdAt?: string;
}

export interface AuthState {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
}

export interface LeaderboardUser {
  _id: string;
  username: string;
  highScore: number;
  satsBalance: number;
  usdtBalance?: number;
  level: number;
  movesPlayed: number;
}

export interface GameSessionRecord {
  _id: string;
  scoreGained: number;
  satsMined: number;
  usdtMined?: number;
  currencyMined?: MiningCurrency;
  levelAchieved: number;
  movesInSession: number;
  createdAt: string;
}

export interface PayoutRecord {
  _id: string;
  amountSats?: number;
  amountUsdt?: number;
  provider: PaymentProvider;
  currency: MiningCurrency;
  withdrawValueUsd: number;
  receiveAmount: string;
  walletAddress: string;
  status: 'pending' | 'completed' | 'rejected' | 'failed';
  txHash?: string;
  notes?: string;
  createdAt: string;
}

export interface DBHealth {
  status: string;
  database: {
    isConnected: boolean;
    mode: string;
  };
}
