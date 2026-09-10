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

// ══════════════════════════════════════════════════════════════
// User sessions: sid → platform access token (server memory only).
// The browser cookie holds OUR JWT with {sid}; the platform token
// never leaves this process. PM2 runs fork×1, restart drops sessions
// (users re-login — acceptable, documented).
// ══════════════════════════════════════════════════════════════

export interface SessionEntry {
  platformToken: string;
  user: { id: unknown; role: string; name: string };
  exp: number;
}

const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // matches Sanctum token lifetime
const sessions = new Map<string, SessionEntry>();

export function createSession(platformToken: string, user: SessionEntry['user']): string {
  const sid = crypto.randomUUID();
  sessions.set(sid, { platformToken, user, exp: Date.now() + SESSION_TTL_MS });
  return sid;
}

export function getSession(sid: string): SessionEntry | null {
  const s = sessions.get(sid);
  if (!s) return null;
  if (s.exp < Date.now()) {
    sessions.delete(sid);
    return null;
  }
  return s;
}

export function destroySession(sid: string): void {
  sessions.delete(sid);
}

export interface SessionRequest extends AuthRequest {
  sessionEntry?: SessionEntry;
  sessionId?: string;
}

/** Cookie JWT must carry a live sid (old pre-session cookies re-login). */
export const requireSession = (req: SessionRequest, res: Response, next: NextFunction): void => {
  const token = req.cookies?.token || req.headers.authorization?.split(' ')[1];
  if (!token) {
    res.status(401).json({ success: false, message: 'Authentication required' });
    return;
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { sid?: string } & Record<string, unknown>;
    const entry = typeof decoded.sid === 'string' ? getSession(decoded.sid) : null;
    if (!entry) {
      res.status(401).json({ success: false, code: 'SESSION_EXPIRED', message: 'Session expired, please log in again.' });
      return;
    }
    req.user = decoded as SessionRequest['user'];
    req.sessionEntry = entry;
    req.sessionId = decoded.sid;
    next();
  } catch (err) {
    res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};
