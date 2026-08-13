import React, { useState } from 'react';
import { api, setStoredToken } from '../utils/api';
import { UserProfile } from '../types';
import { X, Lock, Mail, User as UserIcon, Wallet, Sparkles, KeyRound } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  initialMode: 'login' | 'register';
  onClose: () => void;
  onSuccess: (user: UserProfile) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, initialMode, onClose, onSuccess }) => {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'register') {
        const data = await api.register({
          username: username.trim(),
          email: email.trim(),
          password,
          walletAddress: walletAddress.trim(),
        });
        setStoredToken(data.token);
        onSuccess(data.user);
        onClose();
      } else {
        const data = await api.login({
          identifier: email.trim() || username.trim(),
          password,
        });
        setStoredToken(data.token);
        onSuccess(data.user);
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
      <div className="relative w-full max-w-md border border-white/10 bg-[#0a0a0a] rounded-2xl p-6 shadow-[0_0_50px_rgba(0,0,0,0.8)]">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/40 hover:text-white transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-6">
          <h2 className="font-['Press_Start_2P',monospace] text-xs text-cyan-400 uppercase flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-cyan-400" />
            {mode === 'login' ? 'User Login' : 'Create Account'}
          </h2>
          <p className="text-xs text-white/50 mt-1.5">
            {mode === 'login'
              ? 'Access your MongoDB account and sync mined sats across sessions.'
              : 'Register to store sats balance, high scores, and payout history in MongoDB.'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-950/80 border border-red-500/50 text-red-200 rounded-xl text-xs font-mono">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 font-mono text-xs">
          {mode === 'register' && (
            <div>
              <label className="block text-white/60 mb-1">Username</label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-2.5 w-4 h-4 text-white/40" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. SatoshiMiner"
                  className="w-full bg-[#111111] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-white focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-white/60 mb-1">
              {mode === 'login' ? 'Email or Username' : 'Email Address'}
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 w-4 h-4 text-white/40" />
              <input
                type={mode === 'register' ? 'email' : 'text'}
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={mode === 'register' ? 'user@example.com' : 'email or username'}
                className="w-full bg-[#111111] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-white focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-white/60 mb-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 w-4 h-4 text-white/40" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters (bcrypt hashed)"
                className="w-full bg-[#111111] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-white focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
              />
            </div>
          </div>

          {mode === 'register' && (
            <div>
              <label className="block text-white/60 mb-1">
                FaucetPay / Bitcoin Wallet Address <span className="text-white/30">(Optional)</span>
              </label>
              <div className="relative">
                <Wallet className="absolute left-3 top-2.5 w-4 h-4 text-white/40" />
                <input
                  type="text"
                  value={walletAddress}
                  onChange={(e) => setWalletAddress(e.target.value)}
                  placeholder="e.g. user@faucetpay.io or bc1q..."
                  className="w-full bg-[#111111] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-white focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                />
              </div>
            </div>
          )}

          {mode === 'register' && (
            <div className="p-3 bg-cyan-950/30 border border-cyan-500/30 rounded-xl text-cyan-200 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>Includes 50 bonus sats upon account creation!</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-['Press_Start_2P',monospace] text-[10px] rounded-xl tracking-wider font-bold transition shadow-[0_0_20px_rgba(6,182,212,0.4)] cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Processing...' : mode === 'login' ? 'LOG IN' : 'REGISTER NOW'}
          </button>
        </form>

        <div className="mt-4 pt-4 border-t border-white/10 text-center text-xs font-mono text-white/50">
          {mode === 'login' ? (
            <p>
              Don't have an account?{' '}
              <button onClick={() => setMode('register')} className="text-cyan-400 hover:underline font-bold cursor-pointer">
                Create Account
              </button>
            </p>
          ) : (
            <p>
              Already registered?{' '}
              <button onClick={() => setMode('login')} className="text-cyan-400 hover:underline font-bold cursor-pointer">
                Log In
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
