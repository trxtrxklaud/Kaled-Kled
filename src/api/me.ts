import { Router, Request, Response } from 'express';
import { requireSession, SessionRequest } from './middleware.js';

/**
 * User-scoped proxy: forwards to the platform WITH THE USER'S OWN token
 * (kept server-side in the session store). Platform enforces parent/teacher
 * scoping itself (403 otherwise) — this layer only adds auth-gating,
 * id validation and a short cache to avoid pressuring the platform.
 */

const router = Router();

const BASE = (process.env.PROVIDENCE_API_BASE || 'https://laprovidencemfondationmnrh.cloud/api').replace(/\/+$/, '');
const TIMEOUT_MS = Number(process.env.PROVIDENCE_TIMEOUT_MS || 20000);
const CACHE_TTL_MS = 45 * 1000;

interface CacheRow {
  exp: number;
  status: number;
  body: unknown;
}
const cache = new Map<string, CacheRow>();

const digits = (v: string): boolean => /^\d+$/.test(v);

async function forward(
  req: SessionRequest,
  res: Response,
  platformPath: string,
  opts: { method?: string; body?: unknown; query?: Record<string, string> } = {},
): Promise<void> {
  const entry = req.sessionEntry;
  if (!entry) {
    res.status(401).json({ success: false, code: 'SESSION_EXPIRED', message: 'Session expired, please log in again.' });
    return;
  }
  const method = opts.method || 'GET';
  const url = new URL(BASE + platformPath);
  for (const [k, v] of Object.entries(opts.query || {})) url.searchParams.set(k, v);
  // Reads are cached per session; writes never are.
  if (method === 'GET') {
    const hit = cache.get(`${req.sessionId}:${url.pathname}${url.search}`);
    if (hit && hit.exp > Date.now()) {
      res.status(hit.status).json(hit.body);
      return;
    }
  }
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const upstream = await fetch(url.toString(), {
      method,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${entry.platformToken}`,
      },
      body: method === 'GET' ? undefined : JSON.stringify(opts.body ?? {}),
      signal: ctrl.signal,
    });
    const body: unknown = await upstream.json().catch(() => null);
    if (upstream.status === 401) {
      res.status(401).json({ success: false, code: 'PLATFORM_SESSION_EXPIRED', message: 'Platform session expired, please log in again.' });
      return;
    }
    if (method === 'GET' && upstream.status === 200) {
      cache.set(`${req.sessionId}:${url.pathname}${url.search}`, { exp: Date.now() + CACHE_TTL_MS, status: 200, body });
      if (cache.size > 500) {
        const oldest = cache.keys().next();
        if (!oldest.done) cache.delete(oldest.value);
      }
    }
    res.status(upstream.status).json(body ?? { success: false, message: 'Empty response from platform.' });
  } catch (err: unknown) {
    console.error('User proxy error:', (err as Error)?.message || err);
    res.status(502).json({ success: false, code: 'PROVIDENCE_UNREACHABLE' });
  } finally {
    clearTimeout(timer);
  }
}

function pickQuery(req: Request, allowed: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of allowed) {
    const v = (req.query as Record<string, unknown>)[key];
    if (typeof v === 'string' && v.trim() !== '') out[key] = v.trim();
  }
  return out;
}

const CHILD_SCOPES = ['ledger', 'receipts', 'attendance', 'grades', 'timetable', 'exams', 'clubs'];
const TEACHER_SECTIONS = ['students', 'attendance', 'results', 'grades'];

// ——— Parent reads ———
router.get('/children', requireSession, async (req: SessionRequest, res: Response) => {
  await forward(req, res, '/api/mobile/parent/children');
});

router.get('/children/:id', requireSession, async (req: SessionRequest, res: Response) => {
  if (!digits(req.params.id)) {
    res.status(400).json({ success: false, message: 'Invalid child id.' });
    return;
  }
  await forward(req, res, `/api/mobile/parent/children/${req.params.id}`);
});

router.get('/children/:id/:scope', requireSession, async (req: SessionRequest, res: Response) => {
  if (!digits(req.params.id) || !CHILD_SCOPES.includes(req.params.scope)) {
    res.status(400).json({ success: false, message: 'Invalid child request.' });
    return;
  }
  await forward(req, res, `/api/mobile/parent/children/${req.params.id}/${req.params.scope}`);
});

router.get('/announcements', requireSession, async (req: SessionRequest, res: Response) => {
  await forward(req, res, '/api/mobile/parent/announcements');
});

router.get('/notifications', requireSession, async (req: SessionRequest, res: Response) => {
  await forward(req, res, '/api/mobile/parent/notifications');
});

// ——— Teacher reads (UI wiring later; platform enforces section scope) ———
router.get('/teacher/sections', requireSession, async (req: SessionRequest, res: Response) => {
  await forward(req, res, '/api/mobile/teacher/sections');
});

router.get('/teacher/sections/:id/:scope', requireSession, async (req: SessionRequest, res: Response) => {
  if (!digits(req.params.id) || !TEACHER_SECTIONS.includes(req.params.scope)) {
    res.status(400).json({ success: false, message: 'Invalid section request.' });
    return;
  }
  await forward(req, res, `/api/mobile/teacher/sections/${req.params.id}/${req.params.scope}`, {
    query: req.params.scope === 'attendance' ? pickQuery(req, ['date']) : {},
  });
});

// ——— Teacher writes (academic only — never financial; platform re-checks scope+perms) ———
const TEACHER_WRITE_SCOPES = ['attendance', 'results', 'grades'];

router.post('/teacher/sections/:id/:scope', requireSession, async (req: SessionRequest, res: Response) => {
  if (!digits(req.params.id) || !TEACHER_WRITE_SCOPES.includes(req.params.scope)) {
    res.status(400).json({ success: false, message: 'Invalid section write request.' });
    return;
  }
  if (!req.body || typeof req.body !== 'object') {
    res.status(400).json({ success: false, message: 'JSON body required.' });
    return;
  }
  await forward(req, res, `/api/mobile/teacher/sections/${req.params.id}/${req.params.scope}`, {
    method: 'POST',
    body: req.body,
  });
});

// ——— Anything else: rejected locally ———
router.use((req: Request, res: Response) => {
  if (req.method !== 'GET') {
    res.status(405).json({ success: false, code: 'READ_ONLY', message: 'This proxy is read-only.' });
    return;
  }
  res.status(404).json({ success: false, message: 'Unknown proxy endpoint.' });
});

export default router;
