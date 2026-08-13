import React, { useEffect, useState } from 'react';
import { api } from '../utils/api';
import { LeaderboardUser } from '../types';
import { X, Trophy, Medal, Flame } from 'lucide-react';

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({ isOpen, onClose }) => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      setError(null);
      api
        .getLeaderboard()
        .then((res) => {
          setLeaderboard(res.leaderboard);
        })
        .catch((err) => {
          setError(err.message || 'Failed to load leaderboard from MongoDB');
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

        <div className="mb-5">
          <h2 className="font-['Press_Start_2P',monospace] text-xs text-cyan-400 uppercase flex items-center gap-2">
            <Trophy className="w-4 h-4 text-cyan-400" />
            MongoDB Leaderboard
          </h2>
          <p className="text-xs text-white/50 mt-1.5">
            Top miners ranked by high score & total sats balance saved in database.
          </p>
        </div>

        {loading ? (
          <div className="text-center py-8 text-xs text-white/40">Loading MongoDB rankings...</div>
        ) : error ? (
          <div className="p-3 bg-red-950/80 border border-red-500/50 text-red-200 rounded-xl text-xs">{error}</div>
        ) : leaderboard.length === 0 ? (
          <div className="text-center py-8 text-xs text-white/40">
            No registered players yet. Be the first to register and top the leaderboard!
          </div>
        ) : (
          <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
            {leaderboard.map((user, idx) => {
              const isTop3 = idx < 3;
              const rankColor =
                idx === 0 ? 'text-cyan-400' : idx === 1 ? 'text-indigo-300' : idx === 2 ? 'text-indigo-400' : 'text-white/40';

              return (
                <div
                  key={user._id}
                  className="flex items-center justify-between p-3.5 bg-[#111111] border border-white/10 rounded-xl text-xs transition hover:border-cyan-500/40"
                >
                  <div className="flex items-center gap-3">
                    <span className={`font-['Press_Start_2P',monospace] w-6 text-center ${rankColor}`}>
                      #{idx + 1}
                    </span>
                    <div>
                      <div className="font-bold text-white flex items-center gap-1.5">
                        {user.username}
                        {isTop3 && <Medal className={`w-3.5 h-3.5 ${rankColor}`} />}
                      </div>
                      <div className="text-[10px] text-white/40 mt-0.5">
                        Lvl {user.level} • {user.movesPlayed} moves
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-bold text-cyan-400">{user.highScore.toLocaleString()} pts</div>
                    <div className="text-[10px] text-emerald-400 font-bold">
                      {user.satsBalance.toLocaleString()} sats
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
