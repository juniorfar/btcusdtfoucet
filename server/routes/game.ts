import { Router, Response } from 'express';
import { z } from 'zod';
import { User } from '../models/User.js';
import { GameSession } from '../models/GameSession.js';
import { authenticateJWT, AuthRequest } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';

const router = Router();

const SyncScoreSchema = z.object({
  scoreGained: z.number().min(0, 'Score gained must be non-negative'),
  satsMined: z.number().min(0).default(0),
  usdtMined: z.number().min(0).optional().default(0),
  currencyMined: z.enum(['BTC', 'USDT']).optional().default('BTC'),
  levelAchieved: z.number().min(1, 'Level must be at least 1'),
  movesInSession: z.number().min(0, 'Moves must be non-negative'),
  totalScore: z.number().min(0),
});

// POST /api/game/sync-score
router.post('/sync-score', authenticateJWT, validateBody(SyncScoreSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { scoreGained, satsMined, usdtMined, levelAchieved, movesInSession, totalScore } = req.body;
    const userId = req.user?.userId;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'Not Found', message: 'User not found' });
    }

    // Update user stats
    user.satsBalance += satsMined || 0;
    user.usdtBalance = (user.usdtBalance || 0) + (usdtMined || 0);

    if (totalScore > user.highScore) {
      user.highScore = totalScore;
    }
    if (levelAchieved > user.level) {
      user.level = levelAchieved;
    }
    user.movesPlayed += movesInSession;

    await user.save();

    // Record game session log
    const sessionLog = new GameSession({
      userId: user._id,
      scoreGained,
      satsMined: satsMined || 0,
      levelAchieved,
      movesInSession,
    });
    await sessionLog.save();

    return res.json({
      message: 'Game stats synced successfully to MongoDB',
      satsBalance: user.satsBalance,
      usdtBalance: user.usdtBalance,
      highScore: user.highScore,
      level: user.level,
      movesPlayed: user.movesPlayed,
    });
  } catch (err: any) {
    console.error('Sync score error:', err);
    return res.status(500).json({ error: 'Server Error', message: 'Failed to sync game stats' });
  }
});

// GET /api/game/history
router.get('/history', authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const sessions = await GameSession.find({ userId: req.user?.userId })
      .sort({ createdAt: -1 })
      .limit(20);

    return res.json({ sessions });
  } catch (err: any) {
    return res.status(500).json({ error: 'Server Error', message: 'Failed to fetch session history' });
  }
});

// GET /api/game/leaderboard
router.get('/leaderboard', async (_req, res: Response) => {
  try {
    const topPlayers = await User.find({}, 'username highScore satsBalance usdtBalance level movesPlayed')
      .sort({ highScore: -1, satsBalance: -1 })
      .limit(10);

    return res.json({ leaderboard: topPlayers });
  } catch (err: any) {
    return res.status(500).json({ error: 'Server Error', message: 'Failed to fetch leaderboard' });
  }
});

export default router;
