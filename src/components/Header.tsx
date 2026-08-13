import React from 'react';
import { UserProfile, DBHealth, MiningCurrency } from '../types';
import { Trophy, History, Wallet, UserCheck, LogIn, Coins, UserPlus } from 'lucide-react';

interface HeaderProps {
  user: UserProfile | null;
  dbHealth: DBHealth | null;
  activeCurrency?: MiningCurrency;
  onSelectCurrency?: (curr: MiningCurrency) => void;
  onOpenAuth: (mode: 'login' | 'register') => void;
  onLogout: () => void;
  onOpenLeaderboard: () => void;
  onOpenHistory: () => void;
  onOpenPayout: () => void;
  onOpenWallet: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  dbHealth,
  activeCurrency = 'BTC',
  onSelectCurrency,
  onOpenAuth,
  onLogout,
  onOpenLeaderboard,
  onOpenHistory,
  onOpenPayout,
  onOpenWallet,
}) => {
  return (
    <header className="relative border border-white/10 bg-[#0a0a0a]/80 backdrop-blur-xl rounded-2xl p-5 sm:p-6 mb-5 overflow-hidden shadow-2xl">
      {/* Background Grid Pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-10"
        style={{
          backgroundImage:
            'linear-gradient(90deg, transparent 0 24px, rgba(255,255,255,0.1) 24px 25px), linear-gradient(0deg, transparent 0 24px, rgba(255,255,255,0.1) 24px 25px)',
          backgroundSize: '25px 25px',
        }}
      />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Brand Title */}
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-cyan-500 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.5)] shrink-0 mt-0.5">
            <div className="w-5 h-5 border-2 border-black rounded-sm bg-black/20 flex items-center justify-center text-black font-bold text-xs">
              ⚡
            </div>
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="font-['Press_Start_2P',monospace] text-[8px] tracking-widest text-cyan-400 uppercase">
                FIREBASE + FAUCET ENGINE
              </span>
              {dbHealth && (
                <span className="inline-flex items-center gap-1.5 text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#22c55e]" />
                  {dbHealth.database.mode}
                </span>
              )}
            </div>
            <h1 className="font-['Press_Start_2P',monospace] text-xl sm:text-2xl text-white tracking-wider flex items-center gap-2">
              BLOCKMATCH <span className="text-amber-400 text-xs sm:text-sm">₿</span> <span className="text-emerald-400 text-xs sm:text-sm">₮</span>
            </h1>
            <p className="text-xs text-white/50 mt-1">
              Mine Bitcoin Sats or USDT Tether. Withdraw instantly via FaucetPay or Cwallet.
            </p>
          </div>
        </div>

        {/* Currency Switcher & Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {onSelectCurrency && (
            <div className="flex items-center bg-black/40 border border-white/10 p-1 rounded-xl">
              <button
                onClick={() => onSelectCurrency('BTC')}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  activeCurrency === 'BTC'
                    ? 'bg-amber-500 text-black shadow-[0_0_10px_rgba(245,158,11,0.4)]'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                ⚡ BTC
              </button>
              <button
                onClick={() => onSelectCurrency('USDT')}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  activeCurrency === 'USDT'
                    ? 'bg-emerald-500 text-black shadow-[0_0_10px_rgba(16,185,129,0.4)]'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                💵 USDT
              </button>
            </div>
          )}

          <button
            onClick={onOpenLeaderboard}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-mono bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/10 rounded-xl transition cursor-pointer"
            title="View Leaderboard"
          >
            <Trophy className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Leaderboard</span>
          </button>

          {user ? (
            <>
              <button
                onClick={onOpenHistory}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-mono bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/10 rounded-xl transition cursor-pointer"
                title="View Session & Payout History"
              >
                <History className="w-3.5 h-3.5 text-indigo-400" />
                <span className="hidden sm:inline">History</span>
              </button>

              <button
                onClick={onOpenWallet}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-mono bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/10 rounded-xl transition cursor-pointer"
                title="Wallet Settings"
              >
                <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Wallet</span>
              </button>

              <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl text-xs font-mono">
                <UserCheck className="w-4 h-4 text-emerald-400" />
                <div className="text-left">
                  <div className="text-[8px] text-white/40 uppercase">User</div>
                  <div className="font-bold text-white truncate max-w-[80px]">{user.username}</div>
                </div>
                <button
                  onClick={onLogout}
                  className="ml-1 text-[10px] text-red-400 hover:text-red-300 border-l border-white/10 pl-2 cursor-pointer"
                >
                  Logout
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onOpenAuth('login')}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-mono bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl transition cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5 text-cyan-400" />
                <span>Log In</span>
              </button>

              <button
                onClick={() => onOpenAuth('register')}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-mono bg-cyan-500 hover:bg-cyan-400 text-black font-semibold rounded-xl transition shadow-[0_0_15px_rgba(6,182,212,0.4)] cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Register</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
