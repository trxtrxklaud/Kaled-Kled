/**
 * مزامنة قراءة-فقط من المنصة عبر proxy السرفر (/api/providence).
 * المتصفح لا يرى توكن المنصة أبداً — كل النداءات same-origin.
 */
import { writeBatch, doc } from 'firebase/firestore';
import { db } from './firebase';
import { toast } from 'sonner';
import { useStudentStore } from '../stores/studentStore';
import { useFinanceStore } from '../stores/financeStore';
import type { FinanceArrear } from './types';
import {
  unwrapPayload,
  buildSectionLabels,
  normalizePlatformStudents,
  normalizeLedgerArrears,
  stableArrearId,
  studentSid,
  type PlatformStudent,
} from './providenceMappers';

const CHUNK = 400;

function chunks<T>(arr: T[], size: number = CHUNK): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function api<T>(path: string): Promise<T> {
  const res = await fetch(`/api/providence${path}`, { headers: { Accept: 'application/json' } });
  const body = await res.json().catch(() => null);
  if (!res.ok || !(body && (body as { success?: boolean }).success)) {
    const msg = (body as { message?: string })?.message || `Platform request failed (${res.status})`;
    throw new Error(msg);
  }
  return body as T;
}

async function ensureConfigured(): Promise<void> {
  const s = await api<{ configured?: boolean }>('/status');
  if (!s.configured) {
    throw new Error('المنصة غير مربوطة: أضف PROVIDENCE_API_TOKEN في سرفر التطبيق');
  }
}

/** مزامنة التلاميذ والأقسام من المنصة (تضيف الجديد، لا تحذف). */
export async function syncStudentsFromPlatform(): Promise<number> {
  await ensureConfigured();
  const [sectionsRes, studentsRes] = await Promise.all([
    api<{ data: unknown }>('/sections'),
    api<{ data: unknown }>('/students'),
  ]);
  const labels = buildSectionLabels(unwrapPayload(sectionsRes.data));
  const rows = normalizePlatformStudents(unwrapPayload(studentsRes.data), labels);
  const importStudents = useStudentStore.getState().importStudents;
  let total = 0;
  for (const part of chunks(rows)) {
    const before = useStudentStore.getState().students.length;
    await importStudents(part.map(({ sid: _sid, ...rest }) => rest));
    total += useStudentStore.getState().students.length - before;
  }
  return total;
}

/** مزامنة المتخلدات من الكشف المالي (upsert بمعرفات ثابتة، لا تكرار). */
export async function syncArrearsFromPlatform(): Promise<{ count: number; total: number }> {
  await ensureConfigured();
  const [studentsRes, pendingRes, partialRes] = await Promise.all([
    api<{ data: unknown }>('/students'),
    api<{ data: unknown }>('/ledgers?status=pending'),
    api<{ data: unknown }>('/ledgers?status=partial'),
  ]);

  const phoneBySid: Record<string, string> = {};
  const nameBySid: Record<string, string> = {};
  for (const item of unwrapPayload(studentsRes.data)) {
    const s = item as PlatformStudent;
    const sid = studentSid(s);
    const phone = [s.guardian_phone, s.parent_phone, s.phone].map((v) => String(v ?? '').trim()).find((v) => v !== '') || '';
    phoneBySid[sid] = phone;
    const nm = [s.first_name, s.last_name].map((v) => String(v ?? '').trim()).filter(Boolean).join(' ');
    nameBySid[sid] = nm || String(s.full_name || s.fullName || sid);
  }

  const rows = normalizeLedgerArrears(
    [...unwrapPayload(pendingRes.data), ...unwrapPayload(partialRes.data)],
    phoneBySid,
    nameBySid,
  );

  try {
    for (const part of chunks(rows)) {
      const batch = writeBatch(db);
      for (const r of part) {
        const id = stableArrearId(r.student_id, r.monthKey);
        const { monthKey: _mk, ...rest } = r;
        batch.set(doc(db, 'financeArrears', id), { ...rest, id, status: 'pending' }, { merge: true });
      }
      await batch.commit();
    }
  } catch {
    throw new Error('تعذر الكتابة في Firebase — استعمل الاستيراد بملف CSV');
  }

  const merged: FinanceArrear[] = rows.map((r) => ({
    id: stableArrearId(r.student_id, r.monthKey),
    studentId: r.student_id,
    studentName: r.student_name,
    parentPhone: r.parent_phone,
    amount: r.amount,
    month: r.month,
    status: 'pending',
  }));
  useFinanceStore.setState((state) => {
    const byId = new Map(state.financeArrears.map((a) => [a.id, a]));
    for (const m of merged) byId.set(m.id, { ...(byId.get(m.id) || {}), ...m } as FinanceArrear);
    return { financeArrears: [...byId.values()] };
  });

  const total = Math.round(rows.reduce((sum, r) => sum + r.amount, 0) * 100) / 100;
  toast.success(`تمت مزامنة ${rows.length} متخلد من المنصة`);
  return { count: rows.length, total };
}
