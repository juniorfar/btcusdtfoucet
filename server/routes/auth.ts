import { Router, Response } from 'express';
import { z } from 'zod';
import { User } from '../models/User.js';
import { authenticateJWT, signToken, AuthRequest } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';

const router = Router();

const RegisterSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username cannot exceed 30 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
  walletAddress: z.string().optional(),
});

const LoginSchema = z.object({
  identifier: z.string().min(1, 'Email or username is required'),
  password: z.string().min(1, 'Password is required'),
});

const WalletSchema = z.object({
  walletAddress: z.string().min(3, 'Wallet address or FaucetPay email is required'),
});

// POST /api/auth/register
router.post('/register', validateBody(RegisterSchema), async (req, res: Response) => {
  try {
    const { username, email, password, walletAddress } = req.body;

    // Check if email or username exists
    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { username }],
    });

    if (existingUser) {
      if (existingUser.email.toLowerCase() === email.toLowerCase()) {
        return res.status(400).json({ error: 'Registration Error', message: 'Email address is already registered' });
      }
      return res.status(400).json({ error: 'Registration Error', message: 'Username is already taken' });
    }

    const newUser = new User({
      username,
      email: email.toLowerCase(),
      password,
      walletAddress: walletAddress || '',
      satsBalance: 50, // Starting bonus
    });

    await newUser.save();

    const token = signToken({
      userId: newUser._id.toString(),
      username: newUser.username,
      email: newUser.email,
    });

    return res.status(201).json({
      message: 'Account created successfully! Enjoy 50 bonus sats!',
      token,
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        satsBalance: newUser.satsBalance,
        highScore: newUser.highScore,
        level: newUser.level,
        movesPlayed: newUser.movesPlayed,
        walletAddress: newUser.walletAddress,
      },
    });
  } catch (err: any) {
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Server Error', message: 'Failed to create user account' });
  }
});

// POST /api/auth/login
router.post('/login', validateBody(LoginSchema), async (req, res: Response) => {
  try {
    const { identifier, password } = req.body;

    const user = await User.findOne({
      $or: [{ email: identifier.toLowerCase() }, { username: identifier }],
    });

    if (!user) {
      return res.status(401).json({ error: 'Authentication Error', message: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Authentication Error', message: 'Invalid credentials' });
    }

    const token = signToken({
      userId: user._id.toString(),
      username: user.username,
      email: user.email,
    });

    return res.json({
      message: 'Logged in successfully',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        satsBalance: user.satsBalance,
        highScore: user.highScore,
        level: user.level,
        movesPlayed: user.movesPlayed,
        walletAddress: user.walletAddress,
      },
    });
  } catch (err: any) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Server Error', message: 'Failed to log in' });
  }
});

// GET /api/auth/me
router.get('/me', authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user?.userId).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'Not Found', message: 'User account not found' });
    }

    return res.json({
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        satsBalance: user.satsBalance,
        highScore: user.highScore,
        level: user.level,
        movesPlayed: user.movesPlayed,
        walletAddress: user.walletAddress,
        createdAt: user.createdAt,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Server Error', message: 'Failed to retrieve profile' });
  }
});

// PUT /api/auth/wallet
router.put('/wallet', authenticateJWT, validateBody(WalletSchema), async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user?.userId);
    if (!user) {
      return res.status(404).json({ error: 'Not Found', message: 'User account not found' });
    }

    user.walletAddress = req.body.walletAddress;
    await user.save();

    return res.json({
      message: 'Wallet address updated successfully',
      walletAddress: user.walletAddress,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Server Error', message: 'Failed to update wallet address' });
  }
});

export default router;
