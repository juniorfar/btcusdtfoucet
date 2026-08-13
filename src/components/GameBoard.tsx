import React, { useState, useEffect, useCallback } from 'react';
import { soundFx } from '../utils/audio';
import { api } from '../utils/api';
import { RefreshCw, Zap, TrendingUp, Pickaxe, Flame, Sparkles } from 'lucide-react';
import { ComboBreakerModal } from './ComboBreakerModal';
import { MiningCurrency } from '../types';

interface GameBoardProps {
  isAuthenticated: boolean;
  activeCurrency?: MiningCurrency;
  onSatsUpdated?: (newBalance: number) => void;
  onUsdtUpdated?: (newBalance: number) => void;
  onToast: (msg: string) => void;
  onRequireAuth?: () => void;
}

const COLORS = [
  { sym: '₿', name: 'Bitcoin', color: '#f2a900' },
  { sym: '₮', name: 'Tether USDT', color: '#26a17b' },
  { sym: '●', name: 'Node', color: '#7aa2f7' },
  { sym: '▲', name: 'Validator', color: '#ef5b5b' },
  { sym: '■', name: 'Ledger', color: '#c792ea' },
  { sym: '★', name: 'Reward', color: '#ffd166' },
];

const SIZE = 8;

export const LEVELS = [
  { name: 'Genesis Block', threshold: 0, rate: 1 },
  { name: 'Merkle Root', threshold: 300, rate: 1.5 },
  { name: 'Proof of Work', threshold: 800, rate: 2 },
  { name: 'Full Node', threshold: 1600, rate: 3 },
  { name: 'Mining Pool', threshold: 3000, rate: 4 },
  { name: 'Halving Era', threshold: 5000, rate: 6 },
  { name: 'Satoshi Tier', threshold: 8000, rate: 9 },
];

export const GameBoard: React.FC<GameBoardProps> = ({
  isAuthenticated,
  activeCurrency = 'BTC',
  onSatsUpdated,
  onUsdtUpdated,
  onToast,
  onRequireAuth,
}) => {
  const [grid, setGrid] = useState<(number | null)[][]>([]);
  const [score, setScore] = useState(0);
  const [sessionSats, setSessionSats] = useState(0);
  const [sessionUsdt, setSessionUsdt] = useState(0);
  const [moves, setMoves] = useState(0);
  const [selected, setSelected] = useState<{ r: number; c: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [clearingCells, setClearingCells] = useState<string[]>([]);

  // Combo Breaker state
  const [chargeMeter, setChargeMeter] = useState(25);
  const [comboBreakerOpen, setComboBreakerOpen] = useState(false);
  const [comboCount, setComboCount] = useState(2);
  const [comboBonusSats, setComboBonusSats] = useState(150);
  const [comboBonusScore, setComboBonusScore] = useState(300);
  const [comboTitle, setComboTitle] = useState('COMBO BREAKER!');

  const handleCloseComboBreaker = useCallback(() => {
    setComboBreakerOpen(false);
    setBusy(false);
    onToast('⚡ Reward claimed! Keep playing!');
  }, [onToast]);

  const randColor = () => Math.floor(Math.random() * COLORS.length);

  const initGrid = useCallback(() => {
    const newGrid: (number | null)[][] = [];
    for (let r = 0; r < SIZE; r++) {
      const row: number[] = [];
      for (let c = 0; c < SIZE; c++) {
        let val: number;
        do {
          val = randColor();
        } while (
          (c >= 2 && row[c - 1] === val && row[c - 2] === val) ||
          (r >= 2 && newGrid[r - 1][c] === val && newGrid[r - 2][c] === val)
        );
        row.push(val);
      }
      newGrid.push(row);
    }
    setGrid(newGrid);
    setSelected(null);
  }, []);

  useEffect(() => {
    initGrid();
  }, [initGrid]);

  const currentLevelIndex = useCallback((currentScore: number) => {
    let idx = 0;
    for (let i = 0; i < LEVELS.length; i++) {
      if (currentScore >= LEVELS[i].threshold) idx = i;
    }
    return idx;
  }, []);

  const findMatchesInGrid = (currentGrid: (number | null)[][]) => {
    const matched = new Set<string>();
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE - 2; c++) {
        const v = currentGrid[r][c];
        if (v === null) continue;
        if (v === currentGrid[r][c + 1] && v === currentGrid[r][c + 2]) {
          matched.add(`${r},${c}`);
          matched.add(`${r},${c + 1}`);
          matched.add(`${r},${c + 2}`);
        }
      }
    }
    for (let c = 0; c < SIZE; c++) {
      for (let r = 0; r < SIZE - 2; r++) {
        const v = currentGrid[r][c];
        if (v === null) continue;
        if (v === currentGrid[r + 1][c] && v === currentGrid[r + 2][c]) {
          matched.add(`${r},${c}`);
          matched.add(`${r + 1},${c}`);
          matched.add(`${r + 2},${c}`);
        }
      }
    }
    return Array.from(matched).map((s) => {
      const [r, c] = s.split(',').map(Number);
      return { r, c };
    });
  };

  const collapseGrid = (currentGrid: (number | null)[][]) => {
    const nextGrid = currentGrid.map((row) => [...row]);
    for (let c = 0; c < SIZE; c++) {
      let pointer = SIZE - 1;
      for (let r = SIZE - 1; r >= 0; r--) {
        if (nextGrid[r][c] !== null) {
          nextGrid[pointer][c] = nextGrid[r][c];
          if (pointer !== r) nextGrid[r][c] = null;
          pointer--;
        }
      }
      for (let r = pointer; r >= 0; r--) {
        nextGrid[r][c] = randColor();
      }
    }
    return nextGrid;
  };

  const syncStatsWithServer = async (
    scoreGained: number,
    satsMined: number,
    usdtMined: number,
    level: number,
    movesCount: number,
    newTotalScore: number
  ) => {
    if (!isAuthenticated) {
      if (satsMined > 0 && onSatsUpdated) onSatsUpdated(sessionSats + satsMined);
      if (usdtMined > 0 && onUsdtUpdated) onUsdtUpdated(sessionUsdt + usdtMined);
      return;
    }
    try {
      const res = await api.syncScore({
        scoreGained,
        satsMined,
        usdtMined,
        currencyMined: (activeCurrency || 'BTC') as MiningCurrency,
        levelAchieved: level,
        movesInSession: movesCount,
        totalScore: newTotalScore,
      });
      if (onSatsUpdated && res.satsBalance !== undefined) {
        onSatsUpdated(res.satsBalance);
      }
      if (onUsdtUpdated && res.usdtBalance !== undefined) {
        onUsdtUpdated(res.usdtBalance);
      }
    } catch {
      // Background sync fail gracefully
    }
  };

  const resolveMatchesRecursive = async (
    currentGrid: (number | null)[][],
    accumulatedScore: number,
    accumulatedSats: number,
    accumulatedUsdt: number,
    movesMade: number,
    cascadeDepth = 1
  ) => {
    const matches = findMatchesInGrid(currentGrid);
    if (matches.length === 0) {
      setGrid(currentGrid);
      setBusy(false);
      return;
    }

    if (cascadeDepth > 1) {
      soundFx.playComboBreakerSound();
    } else {
      soundFx.playMatchSound();
    }

    const clearKeys = matches.map(({ r, c }) => `${r},${c}`);
    setClearingCells(clearKeys);

    setChargeMeter((prev) => Math.min(100, prev + 25));

    const baseScore = matches.length * 10;
    const gainedScore = baseScore * cascadeDepth;
    const currentLvlIdx = currentLevelIndex(accumulatedScore);
    const lvlRate = LEVELS[currentLvlIdx].rate;

    let gainedSats = 0;
    let gainedUsdt = 0;

    if (activeCurrency === 'BTC') {
      gainedSats = Math.round(gainedScore * lvlRate);
    } else {
      gainedUsdt = Number(((gainedScore * lvlRate * 0.00005)).toFixed(4));
    }

    let totalGainedScore = gainedScore;
    let totalGainedSats = gainedSats;
    let totalGainedUsdt = gainedUsdt;

    if (cascadeDepth >= 2 || matches.length >= 5) {
      const bonusScoreVal = gainedScore * cascadeDepth;
      totalGainedScore += bonusScoreVal;

      if (activeCurrency === 'BTC') {
        const bonusSatsVal = gainedSats * 2 + cascadeDepth * 50;
        totalGainedSats += bonusSatsVal;
        setComboBonusSats(bonusSatsVal);
      } else {
        const bonusUsdtVal = Number((gainedUsdt * 2 + cascadeDepth * 0.001).toFixed(4));
        totalGainedUsdt += bonusUsdtVal;
        setComboBonusSats(Math.round(bonusUsdtVal * 10000));
      }

      setComboCount(cascadeDepth);
      setComboBonusScore(bonusScoreVal);
      setComboTitle(cascadeDepth >= 3 ? '⚡ MEGA COMBO BREAKER!' : '⚡ COMBO BREAKER!');
      setComboBreakerOpen(true);
    }

    const newScore = accumulatedScore + totalGainedScore;
    const newSats = accumulatedSats + totalGainedSats;
    const newUsdt = Number((accumulatedUsdt + totalGainedUsdt).toFixed(4));

    setScore(newScore);
    setSessionSats(newSats);
    setSessionUsdt(newUsdt);

    const newLvlIdx = currentLevelIndex(newScore);
    if (newLvlIdx > currentLvlIdx) {
      soundFx.playLevelUpSound();
      onToast(`🎉 LEVEL UP! Now: ${LEVELS[newLvlIdx].name} (${LEVELS[newLvlIdx].rate}x Rate)`);
    }

    syncStatsWithServer(totalGainedScore, totalGainedSats, totalGainedUsdt, newLvlIdx + 1, movesMade, newScore);

    await new Promise((res) => setTimeout(res, 250));

    const clearedGrid = currentGrid.map((row) => [...row]);
    matches.forEach(({ r, c }) => {
      clearedGrid[r][c] = null;
    });

    setClearingCells([]);
    const collapsedGrid = collapseGrid(clearedGrid);
    setGrid(collapsedGrid);

    await new Promise((res) => setTimeout(res, 200));

    await resolveMatchesRecursive(collapsedGrid, newScore, newSats, newUsdt, 0, cascadeDepth + 1);
  };

  const handleCellClick = (r: number, c: number) => {
    if (busy) return;

    if (!selected) {
      setSelected({ r, c });
      return;
    }

    const dr = Math.abs(selected.r - r);
    const dc = Math.abs(selected.c - c);
    const adjacent = dr + dc === 1;

    if (!adjacent) {
      setSelected({ r, c });
      return;
    }

    const nextGrid = grid.map((row) => [...row]);
    const tmp = nextGrid[selected.r][selected.c];
    nextGrid[selected.r][selected.c] = nextGrid[r][c];
    nextGrid[r][c] = tmp;

    const matches = findMatchesInGrid(nextGrid);
    if (matches.length === 0) {
      onToast('No match — try another swap!');
      setSelected(null);
      return;
    }

    const newMoves = moves + 1;
    setMoves(newMoves);
    setGrid(nextGrid);
    setSelected(null);
    setBusy(true);

    setTimeout(() => {
      resolveMatchesRecursive(nextGrid, score, sessionSats, sessionUsdt, 1, 1);
    }, 100);
  };

  const triggerComboBreakerAbility = () => {
    if (chargeMeter < 100 || busy) return;

    setBusy(true);
    setChargeMeter(0);

    const nextGrid = grid.map((row) => [...row]);
    const clearKeys: string[] = [];

    for (let i = 0; i < SIZE; i++) {
      clearKeys.push(`3,${i}`, `4,${i}`, `${i},3`, `${i},4`);
    }

    setClearingCells(clearKeys);
    soundFx.playComboBreakerSound();

    const bonusSats = activeCurrency === 'BTC' ? 500 : 0;
    const bonusUsdt = activeCurrency === 'USDT' ? 0.05 : 0;
    const bonusScore = 1000;

    const newScore = score + bonusScore;
    const newSats = sessionSats + bonusSats;
    const newUsdt = sessionUsdt + bonusUsdt;

    setScore(newScore);
    setSessionSats(newSats);
    setSessionUsdt(newUsdt);

    setComboCount(5);
    setComboBonusSats(activeCurrency === 'BTC' ? bonusSats : 500);
    setComboBonusScore(bonusScore);
    setComboTitle('⚡ SUPER COMBO BREAKER BLAST!');
    setComboBreakerOpen(true);

    syncStatsWithServer(bonusScore, bonusSats, bonusUsdt, currentLevelIndex(newScore) + 1, moves, newScore);

    setTimeout(() => {
      for (let i = 0; i < SIZE; i++) {
        nextGrid[3][i] = null;
        nextGrid[4][i] = null;
        nextGrid[i][3] = null;
        nextGrid[i][4] = null;
      }
      setClearingCells([]);
      const collapsedGrid = collapseGrid(nextGrid);
      setGrid(collapsedGrid);

      setTimeout(() => {
        resolveMatchesRecursive(collapsedGrid, newScore, newSats, newUsdt, 0, 2);
      }, 200);
    }, 300);
  };

  const handleReshuffle = () => {
    initGrid();
    onToast('Board reshuffled!');
  };

  const currentLvlIdx = currentLevelIndex(score);
  const currentLvl = LEVELS[currentLvlIdx];
  const nextLvl = LEVELS[currentLvlIdx + 1];

  let levelProgressPct = 100;
  let levelProgressText = 'MAX LEVEL';

  if (nextLvl) {
    const span = nextLvl.threshold - currentLvl.threshold;
    const prog = score - currentLvl.threshold;
    levelProgressPct = Math.min(100, Math.round((prog / span) * 100));
    levelProgressText = `${score.toLocaleString()} / ${nextLvl.threshold.toLocaleString()}`;
  }

  return (
    <div className="space-y-4">
      <ComboBreakerModal
        isOpen={comboBreakerOpen}
        comboCount={comboCount}
        bonusSats={comboBonusSats}
        bonusScore={comboBonusScore}
        title={comboTitle}
        onClose={handleCloseComboBreaker}
      />

      {/* Level Progress Bar */}
      <div className="border border-white/10 bg-[#0a0a0a]/80 backdrop-blur-xl rounded-2xl p-4 shadow-xl">
        <div className="flex justify-between items-baseline mb-2 font-mono text-xs">
          <span className="font-['Press_Start_2P',monospace] text-[10px] text-white">
            LEVEL {currentLvlIdx + 1} — <span className="text-cyan-400">{currentLvl.name}</span>
          </span>
          <span className="text-white/50">{levelProgressText}</span>
        </div>
        <div className="h-3.5 rounded-full bg-black/60 border border-white/10 overflow-hidden relative">
          <div
            className="h-full transition-all duration-300 relative rounded-full bg-gradient-to-r from-cyan-500 via-sky-400 to-indigo-500 shadow-[0_0_12px_rgba(6,182,212,0.5)]"
            style={{
              width: `${levelProgressPct}%`,
            }}
          />
        </div>
      </div>

      {/* Main Grid Card & Live Game Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Board Column */}
        <div className="lg:col-span-2 border border-white/10 bg-[#0a0a0a]/80 backdrop-blur-xl rounded-2xl p-4 sm:p-6 shadow-2xl flex flex-col items-center">
          <div className="grid grid-cols-8 gap-1.5 w-full max-w-[480px] aspect-square p-2 bg-black/40 rounded-2xl border border-white/5 shadow-inner">
            {grid.map((row, r) =>
              row.map((colorIdx, c) => {
                const key = `${r},${c}`;
                const isSelected = selected && selected.r === r && selected.c === c;
                const isClearing = clearingCells.includes(key);
                const colorObj = colorIdx !== null ? COLORS[colorIdx] : null;

                return (
                  <button
                    key={key}
                    onClick={() => handleCellClick(r, c)}
                    disabled={busy}
                    className={`
                      aspect-square rounded-xl border flex items-center justify-center font-bold text-lg sm:text-2xl select-none transition-all duration-150 cursor-pointer
                      ${
                        isSelected
                          ? 'bg-cyan-950/60 border-cyan-400 ring-2 ring-cyan-400/80 scale-95 shadow-[0_0_20px_rgba(6,182,212,0.5)]'
                          : 'bg-[#111111] border-white/10 hover:bg-white/10 hover:border-cyan-500/50'
                      }
                      ${isClearing ? 'scale-0 opacity-0 transition-all duration-200' : 'scale-100 opacity-100'}
                    `}
                    style={{ color: colorObj?.color || 'inherit' }}
                  >
                    {colorObj?.sym}
                  </button>
                );
              })
            )}
          </div>

          <div className="w-full max-w-[480px] mt-4 flex justify-between items-center text-xs font-mono text-white/50 pt-3 border-t border-white/10">
            <span>
              Mining: <strong className={activeCurrency === 'BTC' ? 'text-amber-400' : 'text-emerald-400'}>
                {activeCurrency === 'BTC' ? '⚡ Bitcoin Sats' : '💵 Tether USDT'}
              </strong>
            </span>
            <button
              onClick={handleReshuffle}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/10 rounded-xl transition cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
              <span>Reshuffle</span>
            </button>
          </div>
        </div>

        {/* Side Panel Stats & Combo Breaker */}
        <div className="space-y-4">
          <div className="border border-amber-500/40 bg-gradient-to-br from-amber-950/30 via-black to-zinc-950/90 backdrop-blur-xl rounded-2xl p-4 shadow-[0_0_25px_rgba(245,158,11,0.15)] relative overflow-hidden">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-['Press_Start_2P',monospace] text-[10px] text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-orange-400 fill-orange-400 animate-pulse" />
                Combo Breaker
              </h3>
              <span className="font-mono text-xs font-bold text-amber-300">{chargeMeter}%</span>
            </div>

            <div className="h-3 rounded-full bg-black/80 border border-amber-500/30 overflow-hidden mb-3 relative">
              <div
                className="h-full transition-all duration-300 bg-gradient-to-r from-amber-500 via-orange-400 to-yellow-300 shadow-[0_0_12px_#f59e0b]"
                style={{ width: `${chargeMeter}%` }}
              />
            </div>

            <button
              onClick={triggerComboBreakerAbility}
              disabled={chargeMeter < 100 || busy}
              className={`
                w-full py-2.5 px-4 rounded-xl font-['Press_Start_2P',monospace] text-[10px] uppercase tracking-wider font-bold transition flex items-center justify-center gap-2 cursor-pointer
                ${
                  chargeMeter >= 100
                    ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-400 text-black shadow-[0_0_20px_rgba(245,158,11,0.6)] hover:scale-[1.02] active:scale-[0.98] animate-pulse'
                    : 'bg-white/5 text-white/30 border border-white/10 cursor-not-allowed'
                }
              `}
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>{chargeMeter >= 100 ? '⚡ UNLEASH COMBO BREAKER!' : 'CHARGE POWER (MATCH TILES)'}</span>
            </button>
          </div>

          <div className="border border-white/10 bg-[#0a0a0a]/80 backdrop-blur-xl rounded-2xl p-4 shadow-xl">
            <h3 className="font-['Press_Start_2P',monospace] text-[10px] text-white/40 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              Mining Rate
            </h3>
            <div className="font-['Press_Start_2P',monospace] text-base text-emerald-400">
              {activeCurrency === 'BTC' ? `${currentLvl.rate} sats/pt` : `$${(currentLvl.rate * 0.00005).toFixed(5)} USDT/pt`}
            </div>
            <p className="text-xs text-white/50 mt-2">
              Leveling up increases your block multiplier rate per match.
            </p>
          </div>

          <div className="border border-white/10 bg-[#0a0a0a]/80 backdrop-blur-xl rounded-2xl p-4 shadow-xl">
            <h3 className="font-['Press_Start_2P',monospace] text-[10px] text-white/40 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Pickaxe className="w-3.5 h-3.5 text-indigo-400" />
              Block Legend
            </h3>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono text-white/60">
              {COLORS.map((c) => (
                <div key={c.name} className="flex items-center gap-2 bg-[#111111] p-2 rounded-xl border border-white/10">
                  <span className="text-base font-bold" style={{ color: c.color }}>
                    {c.sym}
                  </span>
                  <span className="truncate">{c.name}</span>
                </div>
              ))}
            </div>
          </div>

          {!isAuthenticated && (
            <div className="border border-cyan-500/30 bg-cyan-950/20 rounded-2xl p-4 text-xs font-mono text-cyan-200 space-y-2">
              <div className="font-bold flex items-center gap-1.5 text-cyan-400">
                <TrendingUp className="w-4 h-4" />
                Playing in Guest Mode
              </div>
              <p className="text-[11px] text-cyan-200/70">
                Register or log in to sync mined stats, keep your leaderboard position, and send instant payouts to FaucetPay or Cwallet!
              </p>
              {onRequireAuth && (
                <button
                  onClick={onRequireAuth}
                  className="w-full mt-1 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded-xl transition text-center shadow-[0_0_15px_rgba(6,182,212,0.4)] cursor-pointer"
                >
                  Create Free Account
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
