/**
 * دوال تحويل نقية (بدون أي اعتماد خارجي) من شكل بيانات المنصة
 * إلى شكل تطبيق Kaled-Kled. قابلة للاختبار المعزول.
 */

export interface SectionLabelRow {
  id?: unknown;
  name?: unknown;
  level?: { name?: unknown } | null;
  level_name?: unknown;
}

export interface PlatformStudent {
  id?: unknown;
  student_code?: unknown;
  first_name?: unknown;
  last_name?: unknown;
  full_name?: unknown;
  fullName?: unknown;
  dob?: unknown;
  birth_date?: unknown;
  guardian_phone?: unknown;
  parent_phone?: unknown;
  phone?: unknown;
  guardian_first_name?: unknown;
  guardian_last_name?: unknown;
  parent_name?: unknown;
  notes?: unknown;
  enrollments?: Array<{ section?: { id?: unknown; name?: unknown } | null }>;
  section?: { id?: unknown; name?: unknown } | null;
}

export interface SyncedStudent {
  full_name: string;
  class: string;
  birth_date: string;
  parent_name: string;
  parent_phone: string;
  notes: string;
  sid: string;
}

export interface LedgerRow {
  amount_due?: unknown;
  direct_paid_amount?: unknown;
  outstanding?: unknown;
  due_date?: unknown;
  description?: unknown;
  status?: unknown;
  enrollment?: {
    student?: { id?: unknown; first_name?: unknown; last_name?: unknown; student_code?: unknown } | null;
  } | null;
}

export interface SyncedArrear {
  student_id: string;
  student_name: string;
  parent_phone: string;
  amount: number;
  month: string;
  monthKey: string;
}

const AR_MONTHS: Record<string, string> = {
  '01': 'جانفي', '02': 'فيفري', '03': 'مارس', '04': 'أفريل',
  '05': 'ماي', '06': 'جوان', '07': 'جويلية', '08': 'أوت',
  '09': 'سبتمبر', '10': 'أكتوبر', '11': 'نوفمبر', '12': 'ديسمبر',
};

const asText = (v: unknown): string => (v === null || v === undefined ? '' : String(v)).trim();

/** يستخرج مصفوفة من أغلفة Laravel: [] أو {data:[]} أو {data:{data:[]}} */
export function unwrapPayload(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === 'object') {
    const o = payload as Record<string, unknown>;
    if (Array.isArray(o.data)) return o.data;
    const inner = o.data as Record<string, unknown> | null;
    if (inner && typeof inner === 'object' && Array.isArray(inner.data)) return inner.data;
  }
  return [];
}

/** تسمية عربية للشهر من due_date (YYYY-MM-DD) وإلا الوصف. */
export function arabicMonthLabel(dueDate: unknown, fallback?: unknown): string {
  const s = asText(dueDate);
  const m = s.match(/^(\d{4})-(\d{2})/);
  if (m && AR_MONTHS[m[2]]) return `${AR_MONTHS[m[2]]} ${m[1]}`;
  const f = asText(fallback);
  return f !== '' ? f : 'سبتمبر 2026';
}

/** مفتاح ثابت للشهر يُستعمل في معرّف المزامنة (YYYY-MM أو slug). */
export function arabicMonthKey(dueDate: unknown, fallback?: unknown): string {
  const s = asText(dueDate);
  const m = s.match(/^(\d{4})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}`;
  return asText(fallback).replace(/\s+/g, '-').slice(0, 24) || 'unknown';
}

/** خريطة section_id ← "المستوى القسم" من قائمة الأقسام. */
export function buildSectionLabels(sections: unknown[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const item of sections) {
    if (!item || typeof item !== 'object') continue;
    const s = item as SectionLabelRow;
    const id = asText(s.id);
    if (id === '') continue;
    const level = s.level && typeof s.level === 'object'
      ? asText((s.level as { name?: unknown }).name)
      : asText(s.level_name);
    const name = asText(s.name);
    out[id] = `${level} ${name}`.trim();
  }
  return out;
}

export function studentSid(s: PlatformStudent): string {
  const code = asText(s.student_code);
  if (code !== '') return code;
  return `ST-${asText(s.id)}`;
}

/** يحوّل تلاميذ المنصة إلى صيغة استيراد التطبيق. */
export function normalizePlatformStudents(
  students: unknown[],
  labels: Record<string, string>,
): SyncedStudent[] {
  const out: SyncedStudent[] = [];
  for (const item of students) {
    if (!item || typeof item !== 'object') continue;
    const s = item as PlatformStudent;
    const fullName = asText(s.full_name || s.fullName) !== ''
      ? asText(s.full_name || s.fullName)
      : `${asText(s.first_name)} ${asText(s.last_name)}`.trim();
    if (fullName === '') continue;
    const enrollment = Array.isArray(s.enrollments) ? s.enrollments[0] : undefined;
    const section = enrollment?.section ?? s.section ?? null;
    const sectionId = section ? asText(section.id) : '';
    const className = (sectionId !== '' && labels[sectionId]) ? labels[sectionId] : asText(section?.name);
    const guardianName = `${asText(s.guardian_first_name)} ${asText(s.guardian_last_name)}`.trim();
    out.push({
      full_name: fullName,
      class: className,
      birth_date: asText(s.dob || s.birth_date),
      parent_name: guardianName !== '' ? guardianName : asText(s.parent_name),
      parent_phone: asText(s.guardian_phone || s.parent_phone || s.phone),
      notes: asText(s.notes),
      sid: studentSid(s),
    });
  }
  return out;
}

const num = (v: unknown): number => {
  const n = typeof v === 'number' ? v : parseFloat(asText(v));
  return Number.isFinite(n) ? n : 0;
};

/** يحوّل صفوف الكشف المالي إلى متخلدات (يُسقط الخالص والصفر). */
export function normalizeLedgerArrears(
  rows: unknown[],
  phoneBySid: Record<string, string>,
  nameBySid: Record<string, string>,
): SyncedArrear[] {
  const out: SyncedArrear[] = [];
  for (const item of rows) {
    if (!item || typeof item !== 'object') continue;
    const r = item as LedgerRow;
    if (asText(r.status) === 'paid') continue;
    const direct = r.outstanding !== undefined && r.outstanding !== null
      ? num(r.outstanding)
      : num(r.amount_due) - num(r.direct_paid_amount);
    const amount = Math.round(direct * 100) / 100;
    if (amount <= 0) continue;
    const st = r.enrollment?.student ?? null;
    const sid = st
      ? (asText(st.student_code) !== '' ? asText(st.student_code) : `ST-${asText(st.id)}`)
      : '';
    if (sid === '') continue;
    const sname = st ? `${asText(st.first_name)} ${asText(st.last_name)}`.trim() : '';
    out.push({
      student_id: sid,
      student_name: sname !== '' ? sname : (nameBySid[sid] || sid),
      parent_phone: phoneBySid[sid] || '',
      amount,
      month: arabicMonthLabel(r.due_date, r.description),
      monthKey: arabicMonthKey(r.due_date, r.description),
    });
  }
  return out;
}

/** معرّف ثابت لسطر المتخلد: إعادة المزامنة تُحدّث بدل التكرار. */
export function stableArrearId(sid: string, monthKey: string): string {
  return `prov-${sid}-${monthKey}`;
}
