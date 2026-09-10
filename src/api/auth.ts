import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { requireAuth } from './middleware.js';

/**
 * Phase 2 — Laravel-backed sessions. No Firebase Auth, no browser tokens.
 *
 * - POST /login            staff/admin/teacher via platform gmail-login.
 * - POST /login/parent/request-otp + verify-otp   parents via platform OTP.
 * - The platform access_token NEVER leaves this server: we verify with it,
 *   then mint our own short session JWT (httpOnly cookie) carrying {id, role, name}.
 * - Removed in Phase 1: POST /sync-session (minted JWTs from unverified client claims).
 */

const router = Router();

const BASE = (process.env.PROVIDENCE_API_BASE || 'https://laprovidencemfondationmnrh.cloud/api').replace(/\/+$/, '');
const TIMEOUT_MS = Number(process.env.PROVIDENCE_TIMEOUT_MS || 20000);
const JWT_SECRET = process.env.JWT_SECRET || '';

function needJwtSecret(res: Response): string | null {
  if (!JWT_SECRET) {
    // middleware.ts already crashes production boot without it; this guards tests/dev misuse.
    res.status(503).json({ success: false, message: 'Server session signing is not configured.' });
    return null;
  }
  return JWT_SECRET;
}

async function platformPost(path: string, body: Record<string, unknown>): Promise<{ status: number; data: unknown }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(BASE + path, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    const data: unknown = await res.json().catch(() => null);
    return { status: res.status, data };
  } finally {
    clearTimeout(timer);
  }
}

function mintSession(res: Response, session: { id: unknown; role: string; name: string; username: string }): void {
  const token = jwt.sign(
    { id: session.id, uid: session.id, role: session.role, email: session.username, name: session.name },
    JWT_SECRET,
    { expiresIn: '24h' },
  );
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000,
  });
}

function asText(v: unknown): string {
  return v === null || v === undefined ? '' : String(v).trim();
}

// ——— Staff / admin / teacher login via platform ———
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const secret = needJwtSecret(res);
  if (!secret) return;
  const identifier = asText(req.body?.identifier || req.body?.username || req.body?.email);
  const password = asText(req.body?.password);
  if (identifier === '' || password === '') {
    res.status(400).json({ success: false, message: 'identifier and password are required.' });
    return;
  }
  try {
    const { status, data } = await platformPost('/auth/gmail-login', {
      email: identifier,
      phone_password: password,
    });
    const envelope = (data ?? {}) as { success?: boolean; message?: string; data?: unknown };
    const payload = (envelope.data ?? {}) as Record<string, unknown>;
    const user = (payload.user ?? {}) as Record<string, unknown>;
    if (status !== 200 || !envelope.success || !user.id) {
      // Anti-enumeration: unknown identifier and wrong secret return the SAME message,
      // otherwise phone numbers could be probed for registered accounts.
      const uniform = status === 401 ? 'بيانات الدخول غير صحيحة.' : null;
      res.status(status === 200 ? 401 : status).json({
        success: false,
        message: uniform || asText(envelope.message) || 'Invalid credentials.',
      });
      return;
    }
    const role = asText(user.role) || 'parent';
    mintSession(res, {
      id: user.id,
      role,
      name: asText(user.name) || `${asText(user.first_name)} ${asText(user.last_name)}`.trim(),
      username: asText(user.username) || asText(user.email),
    });
    res.json({
      success: true,
      user: {
        id: user.id,
        username: asText(user.username) || asText(user.email),
        role,
        name: asText(user.name) || `${asText(user.first_name)} ${asText(user.last_name)}`.trim(),
        first_name: asText(user.first_name),
        last_name: asText(user.last_name),
        email: asText(user.email),
        phone: asText(user.phone),
      },
    });
  } catch (err: unknown) {
    console.error('Staff login proxy error:', (err as Error)?.message || err);
    res.status(502).json({ success: false, message: 'Cannot reach the platform.' });
  }
});

// ——— Parent OTP login via platform ———
router.post('/login/parent/request-otp', async (req: Request, res: Response): Promise<void> => {
  const phone = asText(req.body?.phone);
  if (phone === '') {
    res.status(400).json({ success: false, message: 'phone is required.' });
    return;
  }
  try {
    const { status, data } = await platformPost('/mobile/parent/request-otp', { phone });
    res.status(status).json((data ?? { success: false }) as object);
  } catch (err: unknown) {
    console.error('Parent OTP request proxy error:', (err as Error)?.message || err);
    res.status(502).json({ success: false, message: 'Cannot reach the platform.' });
  }
});

router.post('/login/parent/verify-otp', async (req: Request, res: Response): Promise<void> => {
  const secret = needJwtSecret(res);
  if (!secret) return;
  const phone = asText(req.body?.phone);
  const code = asText(req.body?.code);
  if (phone === '' || code === '') {
    res.status(400).json({ success: false, message: 'phone and code are required.' });
    return;
  }
  try {
    const { status, data } = await platformPost('/mobile/parent/verify-otp', { phone, code });
    const envelope = (data ?? {}) as { message?: string; user?: unknown };
    const user = (envelope.user ?? {}) as Record<string, unknown>;
    if (status !== 200 || !user.id) {
      res.status(status === 200 ? 401 : status).json({
        success: false,
        message: asText(envelope.message) || 'Invalid or expired code.',
      });
      return;
    }
    mintSession(res, {
      id: user.id,
      role: 'parent',
      name: `${asText(user.first_name)} ${asText(user.last_name)}`.trim() || asText(user.phone),
      username: asText(user.email) || asText(user.phone),
    });
    res.json({
      success: true,
      user: {
        id: user.id,
        username: asText(user.email) || asText(user.phone),
        role: 'parent',
        name: `${asText(user.first_name)} ${asText(user.last_name)}`.trim(),
        first_name: asText(user.first_name),
        last_name: asText(user.last_name),
        email: asText(user.email),
        phone: asText(user.phone),
      },
    });
  } catch (err: unknown) {
    console.error('Parent OTP verify proxy error:', (err as Error)?.message || err);
    res.status(502).json({ success: false, message: 'Cannot reach the platform.' });
  }
});

router.post('/logout', (req: Request, res: Response) => {
  res.clearCookie('token');
  res.json({ success: true });
});

router.get('/me', requireAuth, async (req: any, res: Response) => {
  res.json({ success: true, user: req.user });
});

export default router;
