import { Router, Request, Response } from 'express';

/**
 * Phase 1 — proxy قراءة-فقط لمنصة Providence (GET فقط).
 *
 * - توكن Sanctum يعيش هنا في السرفر (PROVIDENCE_API_TOKEN) ولا يصل للمتصفح أبداً.
 * - أي method غير GET أو أي مسار خارج القائمة البيضاء يُرفض محلياً قبل لمس المنصة.
 * - لا كتابة على المنصة من هنا: لا POST/PUT/DELETE إطلاقاً.
 */

const BASE = (process.env.PROVIDENCE_API_BASE || 'https://laprovidencemfondationmnrh.cloud/api').replace(/\/+$/, '');
const TOKEN = process.env.PROVIDENCE_API_TOKEN || '';
const TIMEOUT_MS = Number(process.env.PROVIDENCE_TIMEOUT_MS || 20000);
const PAGE_SIZE = 100;
const MAX_PAGES = 60;

const router = Router();

type Query = Record<string, string>;

const isConfigured = (): boolean => TOKEN.length > 0;

async function platformGet(path: string, query: Query = {}): Promise<{ status: number; body: unknown }> {
  const url = new URL(BASE + path);
  for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url.toString(), {
      headers: { Accept: 'application/json', Authorization: `Bearer ${TOKEN}` },
      signal: ctrl.signal,
    });
    const body: unknown = await res.json().catch(() => null);
    return { status: res.status, body };
  } finally {
    clearTimeout(timer);
  }
}

async function passthrough(res: Response, path: string, query: Query = {}): Promise<void> {
  try {
    const { status, body } = await platformGet(path, query);
    res.status(status).json(body ?? { success: false, message: 'Empty response from platform.' });
  } catch (err: unknown) {
    const e = err as { status?: number; body?: unknown; message?: string };
    if (typeof e.status === 'number') {
      res.status(e.status).json(e.body ?? { success: false, message: 'Platform error.' });
      return;
    }
    console.error('Providence proxy error:', e.message || e);
    res.status(502).json({ success: false, code: 'PROVIDENCE_UNREACHABLE', message: 'Cannot reach the platform API.' });
  }
}

/** يجمع كل صفحات Paginator اللارافيل (per_page=100) في مصفوفة واحدة. */
async function fetchAllPages(path: string, query: Query = {}): Promise<{ rows: unknown[]; pages: number }> {
  const rows: unknown[] = [];
  let pages = 0;
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const { status, body } = await platformGet(path, { ...query, page: String(page), per_page: String(PAGE_SIZE) });
    if (status !== 200) throw Object.assign(new Error('platform_error'), { status, body });
    const chunk = extractArray(body);
    rows.push(...chunk);
    pages = page;
    if (chunk.length < PAGE_SIZE) break;
  }
  return { rows, pages };
}

/** يستخرج مصفوفة من أغلفة Laravel: [] أو {data:[]} أو {data:{data:[]}} */
export function extractArray(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === 'object') {
    const o = payload as Record<string, unknown>;
    if (Array.isArray(o.data)) return o.data;
    const inner = o.data as Record<string, unknown> | null;
    if (inner && typeof inner === 'object' && Array.isArray(inner.data)) return inner.data;
  }
  return [];
}

/** يبقي فقط مفاتيح الاستعلام المسموحة ويتجاهل الباقي. */
function pick(req: Request, allowed: string[]): Query {
  const out: Query = {};
  for (const key of allowed) {
    const v = req.query[key];
    if (typeof v === 'string' && v.trim() !== '') out[key] = v.trim();
    else if (typeof v === 'number') out[key] = String(v);
  }
  return out;
}

function guard(res: Response): boolean {
  if (!isConfigured()) {
    res.status(503).json({
      success: false,
      code: 'PROVIDENCE_NOT_CONFIGURED',
      message: 'Providence API token is not configured on this server.',
    });
    return true;
  }
  return false;
}

function collection(res: Response, rows: unknown[], pages: number): void {
  res.json({ success: true, source: 'providence', data: rows, meta: { count: rows.length, pages } });
}

const digits = (v: string): boolean => /^\d+$/.test(v);

// ——— الحالة (تعمل حتى دون توكن، ولا تكشف أي سر) ———
router.get('/status', (_req: Request, res: Response) => {
  let host = '';
  try {
    host = new URL(BASE).host;
  } catch {
    host = '';
  }
  res.json({ success: true, configured: isConfigured(), host });
});

// ——— المستويات والأقسام ———
router.get('/levels', async (req: Request, res: Response) => {
  if (guard(res)) return;
  await passthrough(res, '/mobile/admin/levels', pick(req, []));
});

router.get('/sections', async (req: Request, res: Response) => {
  if (guard(res)) return;
  await passthrough(res, '/mobile/admin/sections', pick(req, ['level_id']));
});

router.get('/sections/:id/timetable', async (req: Request, res: Response) => {
  if (guard(res)) return;
  if (!digits(req.params.id)) {
    res.status(400).json({ success: false, message: 'Invalid section id.' });
    return;
  }
  await passthrough(res, `/mobile/admin/sections/${req.params.id}/timetable`);
});

// ——— التلاميذ (جمع تلقائي لكل الصفحات) ———
router.get('/students', async (req: Request, res: Response) => {
  if (guard(res)) return;
  try {
    const { rows, pages } = await fetchAllPages('/mobile/admin/students', pick(req, ['search', 'section_id']));
    collection(res, rows, pages);
  } catch (err: unknown) {
    const e = err as { status?: number; body?: unknown };
    if (typeof e.status === 'number') {
      res.status(e.status).json(e.body ?? { success: false });
      return;
    }
    console.error('Providence proxy error:', (e as Error).message || e);
    res.status(502).json({ success: false, code: 'PROVIDENCE_UNREACHABLE' });
  }
});

router.get('/students/:id', async (req: Request, res: Response) => {
  if (guard(res)) return;
  if (!digits(req.params.id)) {
    res.status(400).json({ success: false, message: 'Invalid student id.' });
    return;
  }
  await passthrough(res, `/mobile/admin/students/${req.params.id}`);
});

router.get('/students/:id/ledger', async (req: Request, res: Response) => {
  if (guard(res)) return;
  if (!digits(req.params.id)) {
    res.status(400).json({ success: false, message: 'Invalid student id.' });
    return;
  }
  await passthrough(res, `/mobile/admin/students/${req.params.id}/ledger`);
});

// تفاصيل الحساب/الرسوم/المدفوعات من مسارات المنصة المباشرة (قراءة فقط)
router.get('/platform/students/:id/:kind', async (req: Request, res: Response) => {
  if (guard(res)) return;
  const { id, kind } = req.params;
  if (!digits(id) || !['balance', 'fees', 'payments'].includes(kind)) {
    res.status(400).json({ success: false, message: 'Invalid student detail request.' });
    return;
  }
  await passthrough(res, `/students/${id}/${kind}`);
});

// ——— المعلمون والعائلات والإحصاءات ———
router.get('/teachers', async (req: Request, res: Response) => {
  if (guard(res)) return;
  await passthrough(res, '/mobile/admin/teachers', pick(req, ['search']));
});

router.get('/families', async (req: Request, res: Response) => {
  if (guard(res)) return;
  await passthrough(res, '/mobile/admin/families', pick(req, []));
});

router.get('/stats', async (req: Request, res: Response) => {
  if (guard(res)) return;
  await passthrough(res, '/mobile/admin/stats', pick(req, []));
});

// ——— المتخلدات (قراءة فقط) ———
router.get('/ledgers', async (req: Request, res: Response) => {
  if (guard(res)) return;
  try {
    const { rows, pages } = await fetchAllPages('/mobile/admin/ledgers', pick(req, ['section_id', 'status']));
    collection(res, rows, pages);
  } catch (err: unknown) {
    const e = err as { status?: number; body?: unknown };
    if (typeof e.status === 'number') {
      res.status(e.status).json(e.body ?? { success: false });
      return;
    }
    console.error('Providence proxy error:', (e as Error).message || e);
    res.status(502).json({ success: false, code: 'PROVIDENCE_UNREACHABLE' });
  }
});

router.get('/unpaid/options', async (req: Request, res: Response) => {
  if (guard(res)) return;
  await passthrough(res, '/reports/unpaid-monthly/options', pick(req, ['academic_year_id']));
});

router.get('/unpaid', async (req: Request, res: Response) => {
  if (guard(res)) return;
  const q = pick(req, ['academic_year_id', 'month', 'section_id']);
  if (!q.academic_year_id || !q.month || !q.section_id) {
    res.status(400).json({ success: false, message: 'academic_year_id, month and section_id are required.' });
    return;
  }
  await passthrough(res, '/reports/unpaid-monthly', q);
});

// ——— أي شيء آخر: رفض محلي (لا يصل للمنصة) ———
router.use((req: Request, res: Response) => {
  if (req.method !== 'GET') {
    res.status(405).json({ success: false, code: 'READ_ONLY', message: 'This proxy is read-only.' });
    return;
  }
  res.status(404).json({ success: false, message: 'Unknown proxy endpoint.' });
});

export default router;
