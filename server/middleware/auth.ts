import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    username: string;
    email: string;
  };
}

const JWT_SECRET = process.env.JWT_SECRET || 'blockmatch-super-secret-jwt-key-2026';

export function signToken(payload: { userId: string; username: string; email: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function authenticateJWT(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Authentication failed',
      message: 'Access token missing or malformed',
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      username: string;
      email: string;
    };

    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({
      error: 'Authentication failed',
      message: 'Invalid or expired session token',
    });
  }
}
