import { create } from 'zustand';
import { collection, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { toast } from 'sonner';
import type { ParentUser } from '../lib/types';

interface UserStore {
  parentUsers: ParentUser[];
  loading: boolean;
  
  fetchData: () => void;
  clearStore: () => void;

  addParentUser: (parent: Omit<ParentUser, 'id'>) => Promise<void>;
  updateParentUser: (parent: ParentUser) => Promise<void>;
  deleteParentUser: (id: string) => Promise<void>;
}

export const useUserStore = create<UserStore>((set, get) => ({
  parentUsers: [],
  loading: false,

  clearStore: () => set({ parentUsers: [], loading: false }),

  fetchData: () => {
    get().clearStore();
    set({ loading: true });
    const setupListeners = () => {
      const unsubs: (() => void)[] = [];
      unsubs.push(onSnapshot(collection(db, 'parentUsers'), snap => set({ parentUsers: snap.docs.map(d => ({ id: d.id, ...d.data() }) as ParentUser) })));
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

  addParentUser: async (parent) => {
    try {
      const id = crypto.randomUUID();
      await setDoc(doc(db, 'parentUsers', id), { ...parent, id });
      toast.success('تم إضافة ولي الأمر');
    } catch { toast.error('فشل الإضافة'); }
  },

  updateParentUser: async (parent) => {
    try {
      await setDoc(doc(db, 'parentUsers', parent.id), parent, { merge: true });
      toast.success('تم التحديث');
    } catch { toast.error('فشل التحديث'); }
  },

  deleteParentUser: async (id) => {
    try {
      await deleteDoc(doc(db, 'parentUsers', id));
      toast.success('تم الحذف');
    } catch { toast.error('فشل الحذف'); }
  }
}));
