import React, { useState } from 'react';
import { api } from '../utils/api';
import { soundFx } from '../utils/audio';
import { PayoutRecord, PaymentProvider, MiningCurrency } from '../types';
import { X, Wallet, CheckCircle, AlertCircle, ArrowUpRight, Sparkles, DollarSign } from 'lucide-react';

interface PayoutModalProps {
  isOpen: boolean;
  satsBalance: number;
  usdtBalance?: number;
  userWallet?: string;
  onClose: () => void;
  onSuccess: (newSats: number, newUsdt?: number) => void;
}

export const PayoutModal: React.FC<PayoutModalProps> = ({
  isOpen,
  satsBalance,
  usdtBalance = 0,
  userWallet = '',
  onClose,
  onSuccess,
}) => {
  const [provider, setProvider] = useState<PaymentProvider>('faucetpay');
  const [currency, setCurrency] = useState<MiningCurrency>('BTC');
  const [amountInput, setAmountInput] = useState<number>(currency === 'BTC' ? Math.max(500, satsBalance) : Math.max(0.10, usdtBalance));
  const [walletAddress, setWalletAddress] = useState<string>(userWallet);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<PayoutRecord | null>(null);

  if (!isOpen) return null;

  const currentAvailable = currency === 'BTC' ? satsBalance : usdtBalance;

  // Calculation of withdrawal USD value and receive amount
  let calculatedUsdValue = 0;
  let formattedReceiveAmount = '';

  if (currency === 'BTC') {
    const sats = Math.round(amountInput || 0);
    calculatedUsdValue = Number(((sats / 100000000) * 96000).toFixed(4));
    formattedReceiveAmount = `${sats.toLocaleString()} SATS (~$${calculatedUsdValue.toFixed(2)} USD)`;
  } else {
    const usdt = Number(amountInput || 0);
    calculatedUsdValue = usdt;
    formattedReceiveAmount = `${usdt.toFixed(4)} USDT ($${usdt.toFixed(2)} USD)`;
  }

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await api.requestPayout({
        provider,
        currency,
        amount: Number(amountInput),
        walletAddress: walletAddress.trim(),
      });
      soundFx.playPayoutSound();
      setReceipt(res.receipt);
      onSuccess(res.remainingSats, res.remainingUsdt);
    } catch (err: any) {
      setError(err.message || 'Failed to process payout request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in font-mono">
      <div className="relative w-full max-w-lg border border-white/10 bg-[#0a0a0a] rounded-2xl p-6 shadow-[0_0_50px_rgba(0,0,0,0.8)]">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/40 hover:text-white transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-5">
          <h2 className="font-['Press_Start_2P',monospace] text-xs text-cyan-400 uppercase flex items-center gap-2">
            <Wallet className="w-4 h-4 text-cyan-400" />
            Crypto Faucet Payout
          </h2>
          <p className="text-xs text-white/50 mt-1.5">
            Withdraw your mined Bitcoin Sats or Tether USDT directly to FaucetPay or Cwallet.
          </p>
        </div>

        {receipt ? (
          <div className="space-y-4">
            <div className="p-4 bg-emerald-950/60 border border-emerald-500/50 rounded-2xl text-emerald-300 text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold text-emerald-400 text-sm">
                <CheckCircle className="w-5 h-5" />
                Payout Transferred Successfully!
              </div>
              <p>
                {receipt.txHash?.startsWith('fp_') || receipt.txHash?.startsWith('cw_')
                  ? `⚡ Sent via ${receipt.provider.toUpperCase()} network! Funds delivered to your wallet.`
                  : 'Withdrawal recorded successfully in Firebase Firestore! API credentials verified.'}
              </p>
            </div>

            <div className="bg-[#111111] border border-white/10 p-4 rounded-2xl text-xs space-y-2">
              <div className="flex justify-between py-1 border-b border-white/10">
                <span className="text-white/50">Provider:</span>
                <span className="font-bold text-cyan-400 uppercase">{receipt.provider}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/10">
                <span className="text-white/50">Currency:</span>
                <span className="font-bold text-amber-400">{receipt.currency}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/10">
                <span className="text-white/50">Amount Sent:</span>
                <span className="font-bold text-emerald-400">{receipt.receiveAmount}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/10">
                <span className="text-white/50">USD Value:</span>
                <span className="font-bold text-white">${receipt.withdrawValueUsd?.toFixed(2)} USD</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/10">
                <span className="text-white/50">Wallet Address / ID:</span>
                <span className="font-bold text-white truncate max-w-[200px]">{receipt.walletAddress}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/10">
                <span className="text-white/50">Transaction Hash:</span>
                <span className="font-mono text-emerald-400 truncate max-w-[180px]">{receipt.txHash}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-white/50">Status:</span>
                <span className="uppercase text-emerald-400 font-bold">{receipt.status}</span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full py-3 bg-cyan-500 text-black font-['Press_Start_2P',monospace] text-[10px] rounded-xl font-bold hover:bg-cyan-400 transition shadow-[0_0_20px_rgba(6,182,212,0.4)] cursor-pointer"
            >
              RETURN TO GAME
            </button>
          </div>
        ) : (
          <form onSubmit={handleWithdraw} className="space-y-4 text-xs">
            {error && (
              <div className="p-3 bg-red-950/80 border border-red-500/50 text-red-200 rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Provider Selection (FaucetPay vs Cwallet) */}
            <div>
              <label className="block text-white/60 mb-1.5 font-bold">1. Select Payout Method</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setProvider('faucetpay')}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col gap-1 ${
                    provider === 'faucetpay'
                      ? 'bg-cyan-950/60 border-cyan-400 text-cyan-300 ring-1 ring-cyan-400'
                      : 'bg-[#111111] border-white/10 text-white/60 hover:text-white'
                  }`}
                >
                  <span className="font-bold text-xs">FaucetPay</span>
                  <span className="text-[10px] opacity-70">Instant micro-payouts</span>
                </button>
                <button
                  type="button"
                  onClick={() => setProvider('cwallet')}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col gap-1 ${
                    provider === 'cwallet'
                      ? 'bg-indigo-950/60 border-indigo-400 text-indigo-300 ring-1 ring-indigo-400'
                      : 'bg-[#111111] border-white/10 text-white/60 hover:text-white'
                  }`}
                >
                  <span className="font-bold text-xs">Cwallet</span>
                  <span className="text-[10px] opacity-70">Direct Cwallet ID / email</span>
                </button>
              </div>
            </div>

            {/* Currency Selection (BTC vs USDT) */}
            <div>
              <label className="block text-white/60 mb-1.5 font-bold">2. Select Currency</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setCurrency('BTC');
                    setAmountInput(Math.max(100, satsBalance));
                  }}
                  className={`p-2.5 rounded-xl border text-center transition cursor-pointer font-bold ${
                    currency === 'BTC'
                      ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                      : 'bg-[#111111] border-white/10 text-white/60 hover:text-white'
                  }`}
                >
                  ⚡ Bitcoin (Sats)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCurrency('USDT');
                    setAmountInput(Math.max(0.05, usdtBalance));
                  }}
                  className={`p-2.5 rounded-xl border text-center transition cursor-pointer font-bold ${
                    currency === 'USDT'
                      ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                      : 'bg-[#111111] border-white/10 text-white/60 hover:text-white'
                  }`}
                >
                  💵 Tether (USDT)
                </button>
              </div>
            </div>

            {/* Available Balance Overview */}
            <div className="p-3.5 bg-[#111111] border border-white/10 rounded-xl flex justify-between items-center">
              <span className="text-white/50">Available {currency} Balance:</span>
              <span className="font-['Press_Start_2P',monospace] text-xs text-emerald-400">
                {currency === 'BTC' ? `${satsBalance.toLocaleString()} sats` : `${usdtBalance.toFixed(4)} USDT`}
              </span>
            </div>

            {/* Withdrawal Amount Input */}
            <div>
              <label className="block text-white/60 mb-1">
                Amount to Withdraw ({currency === 'BTC' ? 'Min 100 sats' : 'Min 0.05 USDT'})
              </label>
              <input
                type="number"
                step={currency === 'BTC' ? '1' : '0.001'}
                min={currency === 'BTC' ? 100 : 0.05}
                max={currentAvailable}
                required
                value={amountInput}
                onChange={(e) => setAmountInput(Number(e.target.value))}
                className="w-full bg-[#111111] border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 font-bold"
              />
            </div>

            {/* Live Calculation Preview */}
            <div className="p-3.5 bg-black/60 border border-white/10 rounded-xl space-y-1.5">
              <div className="flex justify-between text-[11px]">
                <span className="text-white/50">Estimated USD Value:</span>
                <span className="font-bold text-amber-300">${calculatedUsdValue.toFixed(2)} USD</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-white/50">Amount to Receive:</span>
                <span className="font-bold text-emerald-400">{formattedReceiveAmount}</span>
              </div>
            </div>

            {/* Wallet Address / Account Email Input */}
            <div>
              <label className="block text-white/60 mb-1">
                {provider === 'faucetpay'
                  ? 'FaucetPay Email / Wallet Address'
                  : 'Cwallet Account Email or ID'}
              </label>
              <input
                type="text"
                required
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
                placeholder={provider === 'faucetpay' ? 'user@faucetpay.io or bc1q...' : 'user@cwallet.com or 123456'}
                className="w-full bg-[#111111] border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
              />
            </div>

            <button
              type="submit"
              disabled={loading || (currency === 'BTC' ? satsBalance < 100 : usdtBalance < 0.05)}
              className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-['Press_Start_2P',monospace] text-[10px] rounded-xl font-bold transition shadow-[0_0_20px_rgba(6,182,212,0.4)] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? 'Processing...' : `REQUEST ${currency} PAYOUT VIA ${provider.toUpperCase()}`}
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
