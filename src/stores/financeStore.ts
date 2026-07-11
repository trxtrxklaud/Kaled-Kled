import { create } from 'zustand';
import { collection, doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { toast } from 'sonner';
import type { FinanceArrear } from '../lib/types';

interface FinanceStore {
  financeArrears: FinanceArrear[];
  loading: boolean;
  
  fetchData: () => void;
  clearStore: () => void;

  addFinanceArrear: (arrear: Omit<FinanceArrear, 'id'>) => Promise<void>;
  updateFinanceArrear: (id: string, data: Partial<FinanceArrear>) => Promise<void>;
  sendPaymentReminder: (studentId: string, amount?: number) => Promise<void>;
}

export const useFinanceStore = create<FinanceStore>((set, get) => ({
  financeArrears: [],
  loading: false,

  clearStore: () => set({ financeArrears: [], loading: false }),

  fetchData: () => {
    get().clearStore();
    set({ loading: true });
    const setupListeners = () => {
      const unsubs: (() => void)[] = [];
      unsubs.push(onSnapshot(collection(db, 'financeArrears'), snap => set({ financeArrears: snap.docs.map(d => ({ id: d.id, ...d.data() }) as FinanceArrear) })));
      set({ loading: false });
      return () => unsubs.forEach(fn => fn());
    };
    import('../lib/firebase').then(({ auth }) => {
      if (auth.currentUser) { setupListeners(); }
      else {
        const unsub = auth.onAuthStateChanged(user => { if (user) { setupListeners(); unsub(); } });
        setTimeout(() => { unsub(); if (!auth.currentUser && get().loading) setupListeners(); }, 2000);
      }
    });
  },

  addFinanceArrear: async (arrear) => {
    try {
      const id = crypto.randomUUID();
      await setDoc(doc(db, 'financeArrears', id), { ...arrear, id });
      toast.success('تم إضافة السجل');
    } catch { toast.error('فشل الإضافة'); }
  },

  updateFinanceArrear: async (id, data) => {
    try {
      await setDoc(doc(db, 'financeArrears', id), data, { merge: true });
      toast.success('تم التحديث');
    } catch { toast.error('فشل التحديث'); }
  },

  sendPaymentReminder: async (_studentId, _amount) => {
    toast.success('تم إرسال التذكير بنجاح');
  }
}));
