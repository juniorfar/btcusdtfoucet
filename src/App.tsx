import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { GameBoard } from './components/GameBoard';
import { AuthModal } from './components/AuthModal';
import { LeaderboardModal } from './components/LeaderboardModal';
import { HistoryModal } from './components/HistoryModal';
import { PayoutModal } from './components/PayoutModal';
import { WalletSettingsModal } from './components/WalletSettingsModal';
import { api, getStoredToken, removeStoredToken } from './utils/api';
import { UserProfile, DBHealth, MiningCurrency } from './types';
import { Wallet, Trophy, Flame, Zap, DollarSign } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [dbHealth, setDbHealth] = useState<DBHealth | null>(null);
  const [satsBalance, setSatsBalance] = useState<number>(0);
  const [usdtBalance, setUsdtBalance] = useState<number>(0.10);
  const [activeCurrency, setActiveCurrency] = useState<MiningCurrency>('BTC');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Modals state
  const [authModal, setAuthModal] = useState<{ open: boolean; mode: 'login' | 'register' }>({
    open: false,
    mode: 'login',
  });
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showPayout, setShowPayout] = useState(false);
  const [showWallet, setShowWallet] = useState(false);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg((prev) => (prev === msg ? null : prev));
    }, 2800);
  }, []);

  // Fetch health & current logged-in user on load
  useEffect(() => {
    api
      .getHealth()
      .then((data) => setDbHealth(data))
      .catch(() => {});

    const token = getStoredToken();
    if (token) {
      api
        .getMe()
        .then((res) => {
          setUser(res.user);
          setSatsBalance(res.user.satsBalance ?? 0);
          setUsdtBalance(res.user.usdtBalance ?? 0.10);
          if (res.user.preferredCurrency) {
            setActiveCurrency(res.user.preferredCurrency);
          }
        })
        .catch(() => {
          removeStoredToken();
          setUser(null);
        });
    }
  }, []);

  const handleAuthSuccess = (updatedUser: UserProfile) => {
    setUser(updatedUser);
    setSatsBalance(updatedUser.satsBalance ?? 0);
    setUsdtBalance(updatedUser.usdtBalance ?? 0.10);
    showToast(`Welcome, ${updatedUser.username}! Authenticated.`);
  };

  const handleLogout = () => {
    removeStoredToken();
    setUser(null);
    setSatsBalance(0);
    setUsdtBalance(0);
    showToast('Logged out successfully.');
  };

  const handleSatsUpdated = (newBalance: number) => {
    setSatsBalance(newBalance);
    if (user) {
      setUser({ ...user, satsBalance: newBalance });
    }
  };

  const handleUsdtUpdated = (newBalance: number) => {
    setUsdtBalance(newBalance);
    if (user) {
      setUser({ ...user, usdtBalance: newBalance });
    }
  };

  const handleWalletUpdated = (newWallet: string) => {
    if (user) {
      setUser({ ...user, walletAddress: newWallet });
    }
    showToast('Wallet address updated in user profile.');
  };

  return (
    <div className="min-h-screen bg-[#050505] text-[#f3f4f6] font-mono p-3 sm:p-6 flex flex-col items-center justify-start relative overflow-x-hidden">
      {/* Atmospheric Immersive Background Glows */}
      <div className="fixed top-[-10%] left-[-10%] w-[45vw] h-[45vw] max-w-[500px] max-h-[500px] bg-cyan-900/15 rounded-full blur-[140px] pointer-events-none z-0" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] max-w-[600px] max-h-[600px] bg-indigo-900/15 rounded-full blur-[160px] pointer-events-none z-0" />

      <div className="w-full max-w-5xl relative z-10">
        {/* Top Navbar Header */}
        <Header
          user={user}
          dbHealth={dbHealth}
          activeCurrency={activeCurrency}
          onSelectCurrency={(c) => {
            setActiveCurrency(c);
            showToast(`Mining mode switched to ${c === 'BTC' ? '⚡ Bitcoin Sats' : '💵 Tether USDT'}`);
          }}
          onOpenAuth={(mode) => setAuthModal({ open: true, mode })}
          onLogout={handleLogout}
          onOpenLeaderboard={() => setShowLeaderboard(true)}
          onOpenHistory={() => setShowHistory(true)}
          onOpenPayout={() => setShowPayout(true)}
          onOpenWallet={() => setShowWallet(true)}
        />

        {/* Live Balances & Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
          <div className="border border-white/10 bg-[#0d0d0d] p-3 rounded-2xl shadow-xl text-left transition hover:border-amber-500/40">
            <div className="text-[9px] text-white/40 uppercase font-['Press_Start_2P',monospace] flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-400" /> Sats
            </div>
            <div className="font-['Press_Start_2P',monospace] text-xs text-amber-400 mt-2 truncate">
              {satsBalance.toLocaleString()}
            </div>
          </div>

          <div className="border border-white/10 bg-[#0d0d0d] p-3 rounded-2xl shadow-xl text-left transition hover:border-emerald-500/40">
            <div className="text-[9px] text-white/40 uppercase font-['Press_Start_2P',monospace] flex items-center gap-1">
              <DollarSign className="w-3 h-3 text-emerald-400" /> USDT
            </div>
            <div className="font-['Press_Start_2P',monospace] text-xs text-emerald-400 mt-2 truncate">
              ${usdtBalance.toFixed(3)}
            </div>
          </div>

          <div className="border border-white/10 bg-[#0d0d0d] p-3 rounded-2xl shadow-xl text-left transition hover:border-cyan-500/40">
            <div className="text-[9px] text-white/40 uppercase font-['Press_Start_2P',monospace] flex items-center gap-1">
              <Trophy className="w-3 h-3 text-cyan-400" /> High Score
            </div>
            <div className="font-['Press_Start_2P',monospace] text-xs text-cyan-400 mt-2 truncate">
              {user ? user.highScore.toLocaleString() : '0'} pts
            </div>
          </div>

          <div className="border border-white/10 bg-[#0d0d0d] p-3 rounded-2xl shadow-xl text-left transition hover:border-indigo-500/40">
            <div className="text-[9px] text-white/40 uppercase font-['Press_Start_2P',monospace] flex items-center gap-1">
              <Flame className="w-3 h-3 text-indigo-400" /> Level
            </div>
            <div className="font-['Press_Start_2P',monospace] text-xs text-indigo-400 mt-2">
              Lvl {user ? user.level : 1}
            </div>
          </div>

          <div className="col-span-2 sm:col-span-1 border border-white/10 bg-[#0d0d0d] p-2.5 rounded-2xl shadow-xl flex items-center justify-center">
            <button
              onClick={() => {
                if (!user) {
                  setAuthModal({ open: true, mode: 'register' });
                } else {
                  setShowPayout(true);
                }
              }}
              className="w-full h-full py-2 bg-gradient-to-r from-cyan-500 to-emerald-400 hover:from-cyan-400 hover:to-emerald-300 text-black font-['Press_Start_2P',monospace] text-[8px] rounded-xl tracking-wider font-bold transition shadow-[0_0_15px_rgba(6,182,212,0.4)] flex items-center justify-center gap-1 cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 fill-current shrink-0" />
              {user ? 'WITHDRAW' : 'CLAIM'}
            </button>
          </div>
        </div>

        {/* Game Canvas Board */}
        <main>
          <GameBoard
            isAuthenticated={!!user}
            activeCurrency={activeCurrency}
            onSatsUpdated={handleSatsUpdated}
            onUsdtUpdated={handleUsdtUpdated}
            onToast={showToast}
            onRequireAuth={() => setAuthModal({ open: true, mode: 'register' })}
          />
        </main>
      </div>

      {/* Toast Notification overlay */}
      {toastMsg && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#111111] border border-cyan-500/60 text-cyan-300 font-mono text-xs px-5 py-2.5 rounded-xl shadow-[0_0_25px_rgba(6,182,212,0.3)] animate-bounce flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          {toastMsg}
        </div>
      )}

      {/* Modals */}
      <AuthModal
        isOpen={authModal.open}
        initialMode={authModal.mode}
        onClose={() => setAuthModal({ open: false, mode: 'login' })}
        onSuccess={handleAuthSuccess}
      />

      <LeaderboardModal isOpen={showLeaderboard} onClose={() => setShowLeaderboard(false)} />

      <HistoryModal isOpen={showHistory} onClose={() => setShowHistory(false)} />

      <PayoutModal
        isOpen={showPayout}
        satsBalance={satsBalance}
        usdtBalance={usdtBalance}
        userWallet={user?.walletAddress}
        onClose={() => setShowPayout(false)}
        onSuccess={(newSats, newUsdt) => {
          handleSatsUpdated(newSats);
          if (newUsdt !== undefined) handleUsdtUpdated(newUsdt);
          showToast('Payout request sent and processed!');
        }}
      />

      <WalletSettingsModal
        isOpen={showWallet}
        currentWallet={user?.walletAddress}
        onClose={() => setShowWallet(false)}
        onSuccess={handleWalletUpdated}
      />
    </div>
  );
}
