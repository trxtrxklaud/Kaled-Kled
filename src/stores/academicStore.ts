import { create } from 'zustand';
import { collection, doc, setDoc, deleteDoc, onSnapshot, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { toast } from 'sonner';
import type { Exam, ExamPlanningFile, Homework, AcademicAsset, CertificateRegistryEntry } from '../lib/types';

interface AcademicStore {
  exams: Exam[];
  examPlanningFiles: ExamPlanningFile[];
  homeworks: Homework[];
  academicAssets: AcademicAsset[];
  certificateRegistry: CertificateRegistryEntry[];
  loading: boolean;
  error: string | null;

  fetchData: () => void;
  clearStore: () => void;

  addExam: (exam: Omit<Exam, 'id'>) => Promise<void>;
  deleteExam: (id: string) => Promise<void>;
  importExams: (data: any[]) => Promise<void>;
  
  addExamPlanningFile: (file: Omit<ExamPlanningFile, 'id'>) => Promise<void>;
  deleteExamPlanningFile: (id: string) => Promise<void>;

  addHomework: (homework: Omit<Homework, 'id'>) => Promise<void>;
  updateHomework: (id: string, updates: Partial<Homework>) => Promise<void>;
  deleteHomework: (id: string) => Promise<void>;

  addAcademicAsset: (asset: Omit<AcademicAsset, 'id'>) => Promise<void>;
  removeAcademicAsset: (id: string) => Promise<void>;

  addCertificateRegistryEntries: (entries: Array<Omit<CertificateRegistryEntry, 'id' | 'createdAt' | 'status'>>) => Promise<void>;
  revokeCertificateRegistryEntry: (id: string, reason?: string) => Promise<void>;
}

export const useAcademicStore = create<AcademicStore>((set, get) => ({
  exams: [],
  examPlanningFiles: [],
  homeworks: [],
  academicAssets: [],
  certificateRegistry: [],
  loading: false,
  error: null,

  clearStore: () => set({
    exams: [], examPlanningFiles: [], homeworks: [], academicAssets: [], certificateRegistry: [], loading: false, error: null
  }),

  fetchData: () => {
    get().clearStore();
    set({ loading: true });

    const setupListeners = () => {
      const unsubs: (() => void)[] = [];
      try {
        unsubs.push(onSnapshot(collection(db, 'exams'), snap => set({ exams: snap.docs.map(d => ({ id: d.id, ...d.data() }) as Exam) })));
        unsubs.push(onSnapshot(collection(db, 'examPlanningFiles'), snap => set({ examPlanningFiles: snap.docs.map(d => ({ id: d.id, ...d.data() }) as ExamPlanningFile) })));
        unsubs.push(onSnapshot(collection(db, 'homeworks'), snap => set({ homeworks: snap.docs.map(d => ({ id: d.id, ...d.data() }) as Homework) })));
        unsubs.push(onSnapshot(collection(db, 'academicAssets'), snap => set({ academicAssets: snap.docs.map(d => ({ id: d.id, ...d.data() }) as AcademicAsset) })));
        unsubs.push(onSnapshot(collection(db, 'certificateRegistry'), snap => set({ certificateRegistry: snap.docs.map(d => ({ id: d.id, ...d.data() }) as CertificateRegistryEntry) })));
        set({ loading: false });
        return () => unsubs.forEach(fn => fn());
      } catch (e: any) {
        set({ error: e.message, loading: false });
      }
    };

    import('../lib/firebase').then(({ auth }) => {
      if (auth.currentUser) { setupListeners(); }
      else {
        const unsub = auth.onAuthStateChanged(user => { if (user) { setupListeners(); unsub(); } });
        setTimeout(() => { unsub(); if (!auth.currentUser && get().loading) setupListeners(); }, 2000);
      }
    });
  },

  addExam: async (exam) => {
    try {
      const id = crypto.randomUUID();
      await setDoc(doc(db, 'exams', id), { ...exam, id });
      toast.success('تمت إضافة الامتحان');
    } catch { toast.error('فشل إضافة الامتحان'); }
  },

  deleteExam: async (id) => {
    try { await deleteDoc(doc(db, 'exams', id)); toast.success('تم الحذف'); } catch { toast.error('فشل الحذف'); }
  },

  importExams: async (data) => {
    try {
      const batch = writeBatch(db);
      data.forEach(exam => {
        const id = crypto.randomUUID();
        batch.set(doc(db, 'exams', id), { ...exam, id });
      });
      await batch.commit();
      toast.success('تم استيراد الامتحانات');
    } catch { toast.error('فشل الاستيراد'); }
  },

  addExamPlanningFile: async (file) => {
    try {
      const id = crypto.randomUUID();
      await setDoc(doc(db, 'examPlanningFiles', id), { ...file, id });
    } catch { toast.error('فشل حفظ الملف'); }
  },

  deleteExamPlanningFile: async (id) => {
    try { await deleteDoc(doc(db, 'examPlanningFiles', id)); } catch { toast.error('فشل الحذف'); }
  },

  addHomework: async (hw) => {
    try {
      const id = crypto.randomUUID();
      await setDoc(doc(db, 'homeworks', id), { ...hw, id });
      toast.success('تم إضافة الواجب');
    } catch { toast.error('فشل إضافة الواجب'); }
  },

  updateHomework: async (id, updates) => {
    try {
      await setDoc(doc(db, 'homeworks', id), updates, { merge: true });
      toast.success('تم تحديث الواجب');
    } catch { toast.error('فشل التحديث'); }
  },

  deleteHomework: async (id) => {
    try { await deleteDoc(doc(db, 'homeworks', id)); toast.success('تم حذف الواجب'); } catch { toast.error('فشل الحذف'); }
  },

  addAcademicAsset: async (asset) => {
    try {
      const id = crypto.randomUUID();
      await setDoc(doc(db, 'academicAssets', id), { ...asset, id });
    } catch { toast.error('فشل إضافة المورد'); }
  },

  removeAcademicAsset: async (id) => {
    try { await deleteDoc(doc(db, 'academicAssets', id)); } catch { toast.error('فشل الحذف'); }
  },

  addCertificateRegistryEntries: async (entries) => {
    try {
      const batch = writeBatch(db);
      entries.forEach(entry => {
        const id = crypto.randomUUID();
        batch.set(doc(db, 'certificateRegistry', id), { ...entry, id, createdAt: new Date().toISOString(), status: 'valid' });
      });
      await batch.commit();
      toast.success('تم تسجيل الشهادات');
    } catch { toast.error('فشل تسجيل الشهادات'); }
  },

  revokeCertificateRegistryEntry: async (id, reason) => {
    try {
      await setDoc(doc(db, 'certificateRegistry', id), { status: 'revoked', revocationReason: reason, revokedAt: new Date().toISOString() }, { merge: true });
      toast.success('تم إبطال الشهادة');
    } catch { toast.error('فشل إبطال الشهادة'); }
  }
}));
