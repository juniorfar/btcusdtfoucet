import React, { useEffect, useState } from 'react';
import { api } from '../utils/api';
import { GameSessionRecord, PayoutRecord } from '../types';
import { X, History, Pickaxe, ArrowUpRight } from 'lucide-react';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({ isOpen, onClose }) => {
  const [tab, setTab] = useState<'sessions' | 'payouts'>('sessions');
  const [sessions, setSessions] = useState<GameSessionRecord[]>([]);
  const [payouts, setPayouts] = useState<PayoutRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      setError(null);
      Promise.all([api.getHistory(), api.getPayoutHistory()])
        .then(([historyRes, payoutRes]) => {
          setSessions(historyRes.sessions);
          setPayouts(payoutRes.payouts);
        })
        .catch((err) => {
          setError(err.message || 'Failed to fetch logs');
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in font-mono">
      <div className="relative w-full max-w-lg border border-white/10 bg-[#0a0a0a] rounded-2xl p-6 shadow-[0_0_50px_rgba(0,0,0,0.8)]">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/40 hover:text-white transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-4">
          <h2 className="font-['Press_Start_2P',monospace] text-xs text-cyan-400 uppercase flex items-center gap-2">
            <History className="w-4 h-4 text-cyan-400" />
            Activity & Payout Logs
          </h2>
          <p className="text-xs text-white/50 mt-1.5">
            Real-time mining logs and withdrawal records synced with Firebase Firestore.
          </p>
        </div>

        {/* Tab selector */}
        <div className="flex border-b border-white/10 mb-4 text-xs">
          <button
            onClick={() => setTab('sessions')}
            className={`pb-2.5 px-4 font-bold border-b-2 transition cursor-pointer ${
              tab === 'sessions'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-white/40 hover:text-white'
            }`}
          >
            Mining Sessions
          </button>
          <button
            onClick={() => setTab('payouts')}
            className={`pb-2.5 px-4 font-bold border-b-2 transition cursor-pointer ${
              tab === 'payouts'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-white/40 hover:text-white'
            }`}
          >
            Payout History
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8 text-xs text-white/40">Fetching logs from database...</div>
        ) : error ? (
          <div className="p-3 bg-red-950/80 border border-red-500/50 text-red-200 rounded-xl text-xs">{error}</div>
        ) : tab === 'sessions' ? (
          sessions.length === 0 ? (
            <div className="text-center py-8 text-xs text-white/40">
              No game sessions logged yet. Play match-3 to record score syncs!
            </div>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {sessions.map((s) => (
                <div
                  key={s._id}
                  className="flex justify-between items-center p-3.5 bg-[#111111] border border-white/10 rounded-xl text-xs"
                >
                  <div>
                    <div className="font-bold text-white flex items-center gap-1.5">
                      <Pickaxe className="w-3.5 h-3.5 text-cyan-400" /> +{s.scoreGained} points
                    </div>
                    <div className="text-[10px] text-white/40 mt-0.5">
                      Lvl {s.levelAchieved} • {new Date(s.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end">
                    {s.satsMined > 0 && (
                      <span className="font-bold text-amber-400">+{s.satsMined} sats</span>
                    )}
                    {s.usdtMined ? (
                      <span className="font-bold text-emerald-400">+{s.usdtMined.toFixed(4)} USDT</span>
                    ) : null}
                    {!s.satsMined && !s.usdtMined && (
                      <span className="text-white/40">0 mined</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        ) : payouts.length === 0 ? (
          <div className="text-center py-8 text-xs text-white/40">
            No withdrawal requests processed yet.
          </div>
        ) : (
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
            {payouts.map((p) => (
              <div
                key={p._id}
                className="flex justify-between items-center p-3.5 bg-[#111111] border border-white/10 rounded-xl text-xs"
              >
                <div>
                  <div className="font-bold text-emerald-400 flex items-center gap-1.5">
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    <span>{p.receiveAmount || (p.amountSats ? `${p.amountSats} SATS` : `${p.amountUsdt} USDT`)}</span>
                  </div>
                  <div className="text-[10px] text-white/50 truncate max-w-[200px] mt-0.5">
                    Via <strong className="text-cyan-400 uppercase">{p.provider || 'faucetpay'}</strong> • To: {p.walletAddress}
                  </div>
                  <div className="text-[9px] text-white/30">{new Date(p.createdAt).toLocaleString()}</div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-[10px] text-emerald-400 font-bold uppercase bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 inline-block mb-1">
                    {p.status}
                  </div>
                  {p.withdrawValueUsd > 0 && (
                    <div className="text-[10px] text-amber-300 font-bold">
                      ${p.withdrawValueUsd.toFixed(2)} USD
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
