/**
 * Same-origin calls to the user-scoped proxy (/api/me/*).
 * The session cookie is sent automatically; no tokens in the browser.
 * Throws Error(message) with optional .status/.code on failure.
 */

export interface PlatformChild {
  id: number;
  name: string;
  student_code: string | null;
  enrollments: Array<{
    enrollment_id: number;
    section: string | null;
    level: string | null;
    academic_year: string | null;
  }>;
}

export type ChildScope = 'ledger' | 'receipts' | 'attendance' | 'grades' | 'timetable' | 'exams' | 'clubs';

async function me<T>(path: string): Promise<T> {
  const res = await fetch(`/api/me${path}`, { headers: { Accept: 'application/json' } });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const err = new Error(
      (body as { message?: string })?.message || `Request failed (${res.status})`,
    ) as Error & { status?: number; code?: string };
    err.status = res.status;
    err.code = (body as { code?: string })?.code;
    throw err;
  }
  return body as T;
}

export const getMyChildren = (): Promise<PlatformChild[]> => me<PlatformChild[]>('/children');

export const getChildDetail = (id: number): Promise<unknown> => me<unknown>(`/children/${id}`);

export const getChildScope = (id: number, scope: ChildScope): Promise<unknown> =>
  me<unknown>(`/children/${id}/${scope}`);

export const getMyAnnouncements = (): Promise<unknown> => me<unknown>('/announcements');

export const getTeacherSections = (): Promise<unknown> => me<unknown>('/teacher/sections');

export const getTeacherRoster = (sectionId: number): Promise<unknown> =>
  me<unknown>(`/teacher/sections/${sectionId}/students`);

export const getTeacherDayAttendance = (sectionId: number, date: string): Promise<unknown> =>
  me<unknown>(`/teacher/sections/${sectionId}/attendance?date=${encodeURIComponent(date)}`);

export type TeacherWriteScope = 'attendance' | 'results' | 'grades';

export async function postTeacherScope(sectionId: number, scope: TeacherWriteScope, body: unknown): Promise<any> {
  const res = await fetch(`/api/me/teacher/sections/${sectionId}/${scope}`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const err = new Error(
      (data as { message?: string })?.message || `Request failed (${res.status})`,
    ) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return data;
}
