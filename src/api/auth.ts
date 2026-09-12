import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { requireAuth, createSession, destroySession } from './middleware.js';

/**
 * Phase 2 — Laravel-backed sessions. No Firebase Auth, no browser tokens.
 *
 * - POST /login                                  staff/admin/teacher via platform gmail-login.
 * - POST /parent/request-otp (+ /login/parent/…) parents via platform OTP.
 * - POST /parent/verify-otp (+ /login/parent/…)  verify and mint session.
 * - The platform access_token NEVER leaves this server: we verify with it,
 *   then mint our own short session JWT (httpOnly cookie) carrying {id, role, name}.
 */

const router = Router();

const BASE = (process.env.PROVIDENCE_API_BASE || 'https://laprovidencemfondationmnrh.cloud/api').replace(/\/+$/, '');
const TIMEOUT_MS = Number(process.env.PROVIDENCE_TIMEOUT_MS || 20000);
const JWT_SECRET = process.env.JWT_SECRET || '';

const DEFAULT_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function needJwtSecret(res: Response): string | null {
  if (!JWT_SECRET) {
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
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': DEFAULT_UA,
      },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    const data: unknown = await res.json().catch(() => null);
    return { status: res.status, data };
  } finally {
    clearTimeout(timer);
  }
}

function mintSession(
  res: Response,
  session: { id: unknown; role: string; name: string; username: string },
  platformToken: string,
): void {
  const sid = createSession(platformToken, { id: session.id, role: session.role, name: session.name });
  const token = jwt.sign(
    { id: session.id, uid: session.id, role: session.role, email: session.username, name: session.name, sid },
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
    }, asText(payload.access_token));
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

// ——— Parent OTP handlers (registered on both /parent/* and /login/parent/* for client compatibility) ———
const handleRequestOtp = async (req: Request, res: Response): Promise<void> => {
  const phone = asText(req.body?.phone);
  if (phone === '') {
    res.status(400).json({ success: false, message: 'phone is required.' });
    return;
  }
  try {
    const { status, data } = await platformPost('/mobile/parent/request-otp', { phone });
    const envelope = (data ?? {}) as { message?: string };
    res.status(status).json({
      success: status === 200,
      message: asText(envelope.message) || 'إن كان الرقم مسجّلاً مع تلميذ، فسيصلك رمز التحقّق.',
    });
  } catch (err: unknown) {
    console.error('Parent OTP request proxy error:', (err as Error)?.message || err);
    res.status(502).json({ success: false, message: 'Cannot reach the platform.' });
  }
};

const handleVerifyOtp = async (req: Request, res: Response): Promise<void> => {
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
    const envelope = (data ?? {}) as { message?: string; user?: unknown; access_token?: string };
    const user = (envelope.user ?? {}) as Record<string, unknown>;
    if (status !== 200 || !user.id) {
      res.status(status === 200 ? 401 : status).json({
        success: false,
        message: asText(envelope.message) || 'الرمز غير صحيح أو منتهي الصلاحية.',
      });
      return;
    }
    mintSession(res, {
      id: user.id,
      role: 'parent',
      name: `${asText(user.first_name)} ${asText(user.last_name)}`.trim() || asText(user.phone),
      username: asText(user.email) || asText(user.phone),
    }, asText(envelope.access_token));
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
};

router.post('/login/parent/request-otp', handleRequestOtp);
router.post('/parent/request-otp', handleRequestOtp);

router.post('/login/parent/verify-otp', handleVerifyOtp);
router.post('/parent/verify-otp', handleVerifyOtp);

router.post('/logout', (req: Request, res: Response) => {
  try {
    const raw = req.cookies?.token || req.headers.authorization?.split(' ')[1] || '';
    const decoded = jwt.decode(raw) as { sid?: string } | null;
    if (decoded && typeof decoded.sid === 'string') destroySession(decoded.sid);
  } catch {
    /* best effort — cookie is cleared regardless */
  }
  res.clearCookie('token');
  res.json({ success: true });
});

router.get('/me', requireAuth, async (req: any, res: Response) => {
  res.json({ success: true, user: req.user });
});

export default router;
