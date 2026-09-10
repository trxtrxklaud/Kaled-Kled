import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

/**
 * Fail-closed secret: production refuses to boot without JWT_SECRET
 * (no more silent insecure default). Development keeps a loud fallback.
 */
function resolveJwtSecret(): string {
  const s = process.env.JWT_SECRET;
  if (!s) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET is required in production.');
    }
    console.warn('[auth] JWT_SECRET missing — using INSECURE development fallback.');
    return 'default_jwt_secret_for_development';
  }
  return s;
}

const JWT_SECRET = resolveJwtSecret();

export interface AuthRequest extends Request {
  user?: {
    id: number;
    uid: string;
    role: string;
    email: string;
  };
}

export const requireAuth = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const token = req.cookies?.token || req.headers.authorization?.split(' ')[1];

  if (!token) {
    res.status(401).json({ message: 'Authentication required' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
};

export const requireRole = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ message: 'Insufficient permissions' });
      return;
    }
    next();
  };
};
