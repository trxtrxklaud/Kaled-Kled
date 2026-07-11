import { create } from 'zustand';
import { collection, onSnapshot, doc, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Announcement, Timetable, WeeklySchedule, WeeklyScheduleLocks, TimetableActionLog, ClassTimetableImages, ScheduleCell } from '../lib/types';
import { toast } from 'sonner';

interface SchoolStore {
  announcements: Announcement[];
  timetables: Timetable[];
  weeklySchedule: WeeklySchedule;
  weeklyScheduleLocks: WeeklyScheduleLocks;
  timetableActionLogs: TimetableActionLog[];
  classTimetableImages: ClassTimetableImages;
  
  loading: boolean;
  error: string | null;
  
  fetchData: () => void;
  clearStore: () => void;

  addAnnouncement: (announcement: Omit<Announcement, 'id'>) => Promise<void>;
  deleteAnnouncement: (id: string) => Promise<void>;

  addTimetable: (timetable: Omit<Timetable, 'id'>) => Promise<void>;
  deleteTimetable: (id: string) => Promise<void>;

  saveScheduleCell: (classId: string, day: string, time: string, cell: ScheduleCell) => Promise<void>;
  clearScheduleCell: (classId: string, day: string, time: string) => Promise<void>;
  replaceClassWeeklySchedule: (classId: string, classSchedule: any) => Promise<void>;
  replaceWeeklySchedule: (schedule: WeeklySchedule) => Promise<void>;

  updateScheduleLock: (classId: string, day: string | null, locked: boolean) => Promise<void>;
  replaceWeeklyScheduleLocks: (locks: WeeklyScheduleLocks) => Promise<void>;

  addTimetableActionLog: (log: Omit<TimetableActionLog, 'id' | 'createdAt'>) => Promise<void>;

  setClassTimetableImage: (classId: string, data: string) => Promise<void>;
  removeClassTimetableImage: (classId: string) => Promise<void>;
}

export const useSchoolStore = create<SchoolStore>((set, get) => ({
  announcements: [],
  timetables: [],
  weeklySchedule: {},
  weeklyScheduleLocks: {},
  timetableActionLogs: [],
  classTimetableImages: {},
  loading: false,
  error: null,

  clearStore: () => {
    set({
      announcements: [],
      timetables: [],
      weeklySchedule: {},
      weeklyScheduleLocks: {},
      timetableActionLogs: [],
      classTimetableImages: {},
      loading: false,
      error: null
    });
  },

  fetchData: () => {
    get().clearStore();
    set({ loading: true, error: null });

    const setupListeners = () => {
      try {
        const unsubs: (() => void)[] = [];
        
        unsubs.push(onSnapshot(collection(db, 'announcements'), (snap) => {
          set({ announcements: snap.docs.map(d => ({ id: d.id, ...d.data() })) as Announcement[] });
        }, (err) => console.error('Error fetching announcements:', err)));

        unsubs.push(onSnapshot(collection(db, 'timetables'), (snap) => {
          set({ timetables: snap.docs.map(d => ({ id: d.id, ...d.data() })) as Timetable[] });
        }, (err) => console.error('Error fetching timetables:', err)));

        unsubs.push(onSnapshot(collection(db, 'weeklySchedules'), (snap) => {
          const schedule: WeeklySchedule = {};
          snap.forEach(d => { schedule[d.id] = d.data().schedule || {}; });
          set({ weeklySchedule: schedule });
        }, (err) => console.error('Error fetching weekly schedules:', err)));

        unsubs.push(onSnapshot(collection(db, 'weeklyScheduleLocks'), (snap) => {
          const locks: WeeklyScheduleLocks = {};
          snap.forEach(d => { locks[d.id] = d.data() as any; });
          set({ weeklyScheduleLocks: locks });
        }, (err) => console.error('Error fetching locks:', err)));

        unsubs.push(onSnapshot(collection(db, 'timetableActionLogs'), (snap) => {
          set({ timetableActionLogs: snap.docs.map(d => ({ id: d.id, ...d.data() })) as TimetableActionLog[] });
        }, (err) => console.error('Error fetching timetable logs:', err)));

        unsubs.push(onSnapshot(collection(db, 'classTimetableImages'), (snap) => {
          const images: ClassTimetableImages = {};
          snap.forEach(d => { images[d.id] = d.data().data; });
          set({ classTimetableImages: images });
        }, (err) => console.error('Error fetching class timetable images:', err)));

        set({ loading: false });
        return () => unsubs.forEach(fn => fn());
      } catch (err: any) {
        console.error('School fetch error:', err);
        set({ error: err.message, loading: false });
      }
    };

    import('../lib/firebase').then(({ auth }) => {
      if (auth.currentUser) {
        setupListeners();
      } else {
        const unsubscribeAuth = auth.onAuthStateChanged((user) => {
          if (user) {
            setupListeners();
            unsubscribeAuth();
          }
        });
        setTimeout(() => {
          unsubscribeAuth();
          if (!auth.currentUser && get().loading) {
            setupListeners();
          }
        }, 2000);
      }
    });
  },

  addAnnouncement: async (ann) => {
    try {
      const id = crypto.randomUUID();
      await setDoc(doc(db, 'announcements', id), { ...ann, id });
      toast.success('تم إضافة الإعلان');
    } catch (e) { toast.error('فشل إضافة الإعلان'); console.error(e); }
  },

  deleteAnnouncement: async (id) => {
    try { await deleteDoc(doc(db, 'announcements', id)); toast.success('تم الحذف'); } 
    catch (e) { toast.error('فشل في الحذف'); console.error(e); }
  },

  addTimetable: async (tt) => {
    try {
      const id = crypto.randomUUID();
      await setDoc(doc(db, 'timetables', id), { ...tt, id });
      toast.success('تم إضافة الجدول');
    } catch (e) { toast.error('فشل إضافة الجدول'); console.error(e); }
  },

  deleteTimetable: async (id) => {
    try { await deleteDoc(doc(db, 'timetables', id)); toast.success('تم الحذف'); } 
    catch (e) { toast.error('فشل في الحذف'); console.error(e); }
  },

  saveScheduleCell: async (classId, day, time, cell) => {
    try {
      const schedule = get().weeklySchedule[classId] || {};
      const newSchedule = {
        ...schedule,
        [day]: {
          ...(schedule[day] || {}),
          [time]: cell,
        }
      };
      await setDoc(doc(db, 'weeklySchedules', classId), { schedule: newSchedule });
    } catch (e) { toast.error('فشل الحفظ'); console.error(e); }
  },

  clearScheduleCell: async (classId, day, time) => {
    try {
      const schedule = get().weeklySchedule[classId] || {};
      const updated = { ...schedule };
      if (updated[day]?.[time]) {
        delete updated[day][time];
      }
      await setDoc(doc(db, 'weeklySchedules', classId), { schedule: updated });
    } catch (e) { toast.error('فشل المسح'); console.error(e); }
  },

  replaceClassWeeklySchedule: async (classId, classSchedule) => {
    try {
      await setDoc(doc(db, 'weeklySchedules', classId), { schedule: classSchedule });
    } catch (e) { toast.error('فشل التحديث'); console.error(e); }
  },

  replaceWeeklySchedule: async (schedule) => {
    try {
      const batch = writeBatch(db);
      Object.entries(schedule).forEach(([classId, classSchedule]) => {
        batch.set(doc(db, 'weeklySchedules', classId), { schedule: classSchedule });
      });
      await batch.commit();
      toast.success('تم الحفظ بنجاح');
    } catch (e) { toast.error('فشل الحفظ الشامل'); console.error(e); }
  },

  updateScheduleLock: async (classId, day, locked) => {
    try {
      const locks = get().weeklyScheduleLocks[classId] || { weekLocked: false, lockedDays: {} };
      if (day) {
        locks.lockedDays[day] = locked;
      } else {
        locks.weekLocked = locked;
      }
      await setDoc(doc(db, 'weeklyScheduleLocks', classId), locks);
    } catch (e) { toast.error('فشل تحديث القفل'); console.error(e); }
  },

  replaceWeeklyScheduleLocks: async (locks) => {
    try {
      const batch = writeBatch(db);
      Object.entries(locks).forEach(([classId, lock]) => {
        batch.set(doc(db, 'weeklyScheduleLocks', classId), lock);
      });
      await batch.commit();
    } catch (e) { toast.error('فشل تحديث الأقفال'); console.error(e); }
  },

  addTimetableActionLog: async (log) => {
    try {
      const id = crypto.randomUUID();
      const newLog = { ...log, id, createdAt: new Date().toISOString() };
      await setDoc(doc(db, 'timetableActionLogs', id), newLog);
    } catch (e) { console.error('Error logging timetable action:', e); }
  },

  setClassTimetableImage: async (classId, data) => {
    try {
      await setDoc(doc(db, 'classTimetableImages', classId), { data });
    } catch (e) { toast.error('فشل حفظ الصورة'); console.error(e); }
  },

  removeClassTimetableImage: async (classId) => {
    try {
      await deleteDoc(doc(db, 'classTimetableImages', classId));
    } catch (e) { toast.error('فشل حذف الصورة'); console.error(e); }
  }
}));
