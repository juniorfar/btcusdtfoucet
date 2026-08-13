import React, { useState } from 'react';
import { api } from '../utils/api';
import { X, Wallet, Check } from 'lucide-react';

interface WalletSettingsModalProps {
  isOpen: boolean;
  currentWallet?: string;
  onClose: () => void;
  onSuccess: (newWallet: string) => void;
}

export const WalletSettingsModal: React.FC<WalletSettingsModalProps> = ({
  isOpen,
  currentWallet = '',
  onClose,
  onSuccess,
}) => {
  const [walletAddress, setWalletAddress] = useState(currentWallet);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await api.updateWallet(walletAddress.trim());
      onSuccess(res.walletAddress);
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        onClose();
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Failed to update wallet address');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in font-mono">
      <div className="relative w-full max-w-md border border-white/10 bg-[#0a0a0a] rounded-2xl p-6 shadow-[0_0_50px_rgba(0,0,0,0.8)]">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/40 hover:text-white transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-5">
          <h2 className="font-['Press_Start_2P',monospace] text-xs text-cyan-400 uppercase flex items-center gap-2">
            <Wallet className="w-4 h-4 text-cyan-400" />
            Wallet Settings
          </h2>
          <p className="text-xs text-white/50 mt-1.5">
            Update your default FaucetPay email or Bitcoin wallet address saved in MongoDB.
          </p>
        </div>

        {error && <div className="mb-3 p-2.5 bg-red-950/80 border border-red-500/50 text-red-200 text-xs rounded-xl">{error}</div>}

        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div>
            <label className="block text-white/60 mb-1">Default FaucetPay Email / Wallet Address</label>
            <input
              type="text"
              required
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              placeholder="e.g. user@faucetpay.io or bc1q..."
              className="w-full bg-[#111111] border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-['Press_Start_2P',monospace] text-[10px] font-bold rounded-xl transition shadow-[0_0_20px_rgba(6,182,212,0.4)] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
          >
            {saved ? (
              <>
                <Check className="w-4 h-4 text-black" /> SAVED TO MONGODB
              </>
            ) : loading ? (
              'SAVING...'
            ) : (
              'UPDATE WALLET ADDRESS'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
