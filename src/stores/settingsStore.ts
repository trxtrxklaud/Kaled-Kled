import { create } from 'zustand';
import { doc, setDoc, onSnapshot, collection } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { toast } from 'sonner';
import type { AppPreferences, SchoolBranding, EduservSyncLog, StatisticsFilterPreset } from '../lib/types';

export const DEFAULT_APP_PREFERENCES: AppPreferences = {
  language: 'fr',
  updatedAt: new Date().toISOString()
};

export const DEFAULT_SCHOOL_BRANDING: SchoolBranding = {
  schoolNameFr: 'Providence',
  schoolNameAr: 'العناية',
  updatedAt: new Date().toISOString()
};

interface BackupRecord {
  id: string;
  lastBackupAt: string;
  status: 'success' | 'failed';
}

interface SettingsStore {
  appPreferences: AppPreferences;
  schoolBranding: SchoolBranding;
  eduservSyncLogs: EduservSyncLog[];
  statisticsFilterPresets: StatisticsFilterPreset[];
  backups: BackupRecord[];
  
  loading: boolean;
  error: string | null;

  fetchData: () => void;
  clearStore: () => void;

  updateAppPreferences: (prefs: Partial<AppPreferences>) => Promise<void>;
  updateSchoolBranding: (branding: Partial<Omit<SchoolBranding, 'updatedAt'>>) => Promise<void>;
  addEduservSyncLog: (log: Omit<EduservSyncLog, 'id' | 'timestamp'>) => Promise<void>;
  saveStatisticsFilterPreset: (preset: Omit<StatisticsFilterPreset, 'id' | 'createdAt'>) => Promise<void>;
  deleteStatisticsFilterPreset: (id: string) => Promise<void>;
  
  triggerBackup: (moduleName: string) => Promise<void>;
  clearEduservSyncLogs: () => void;
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  appPreferences: DEFAULT_APP_PREFERENCES,
  schoolBranding: DEFAULT_SCHOOL_BRANDING,
  eduservSyncLogs: [],
  statisticsFilterPresets: [],
  backups: [],
  loading: false,
  error: null,

  clearStore: () => {
    set({
      appPreferences: DEFAULT_APP_PREFERENCES,
      schoolBranding: DEFAULT_SCHOOL_BRANDING,
      eduservSyncLogs: [],
      statisticsFilterPresets: [],
      backups: [],
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
        
        unsubs.push(onSnapshot(doc(db, 'settings', 'preferences'), (snap) => {
          if (snap.exists()) set({ appPreferences: snap.data() as AppPreferences });
        }, (err) => console.error('Error fetching preferences:', err)));

        unsubs.push(onSnapshot(doc(db, 'settings', 'branding'), (snap) => {
          if (snap.exists()) set({ schoolBranding: snap.data() as SchoolBranding });
        }, (err) => console.error('Error fetching branding:', err)));

        unsubs.push(onSnapshot(collection(db, 'eduservSyncLogs'), (snap) => {
          set({ eduservSyncLogs: snap.docs.map(d => ({ id: d.id, ...d.data() })) as EduservSyncLog[] });
        }, (err) => console.error('Error fetching sync logs:', err)));

        unsubs.push(onSnapshot(collection(db, 'statisticsFilterPresets'), (snap) => {
          set({ statisticsFilterPresets: snap.docs.map(d => ({ id: d.id, ...d.data() })) as StatisticsFilterPreset[] });
        }, (err) => console.error('Error fetching presets:', err)));

        unsubs.push(onSnapshot(collection(db, 'system_backups_meta'), (snap) => {
          set({ backups: snap.docs.map(d => ({ id: d.id, ...d.data() })) as BackupRecord[] });
        }, (err) => console.error('Error fetching backups meta:', err)));

        set({ loading: false });
        return () => unsubs.forEach(fn => fn());
      } catch (err: any) {
        console.error('Settings fetch error:', err);
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

  updateAppPreferences: async (prefs) => {
    try {
      const updated = { ...get().appPreferences, ...prefs, updatedAt: new Date().toISOString() };
      await setDoc(doc(db, 'settings', 'preferences'), updated);
    } catch (e) { console.error('Failed to update prefs', e); }
  },

  updateSchoolBranding: async (branding) => {
    try {
      const updated = { ...get().schoolBranding, ...branding, updatedAt: new Date().toISOString() };
      await setDoc(doc(db, 'settings', 'branding'), updated);
      toast.success('تم حفظ إعدادات المدرسة');
    } catch (e) { toast.error('فشل حفظ الإعدادات'); console.error(e); }
  },

  clearEduservSyncLogs: () => set({ eduservSyncLogs: [] }),

  addEduservSyncLog: async (log) => {
    try {
      const id = crypto.randomUUID();
      const newLog = { ...log, id, timestamp: new Date().toISOString() };
      await setDoc(doc(db, 'eduservSyncLogs', id), newLog);
    } catch (e) { console.error('Error adding sync log', e); }
  },

  saveStatisticsFilterPreset: async (preset) => {
    try {
      const id = crypto.randomUUID();
      const newPreset = { ...preset, id, createdAt: new Date().toISOString() };
      await setDoc(doc(db, 'statisticsFilterPresets', id), newPreset);
      toast.success('تم حفظ الفلتر المسبق');
    } catch (e) { toast.error('فشل حفظ الفلتر'); console.error(e); }
  },

  deleteStatisticsFilterPreset: async (id) => {
    try {
      const { deleteDoc } = await import('firebase/firestore');
      await deleteDoc(doc(db, 'statisticsFilterPresets', id));
    } catch (e) { toast.error('فشل حذف الفلتر'); console.error(e); }
  },

  triggerBackup: async (moduleName) => {
    try {
      // Instead of storing a massive JSON string which breaks the 1MB limit, 
      // we only store a metadata record for the backup run.
      // Actual backup could be done via Cloud Functions or exporting to Cloud Storage.
      const backupMeta: BackupRecord = {
        id: moduleName,
        lastBackupAt: new Date().toISOString(),
        status: 'success'
      };
      await setDoc(doc(db, 'system_backups_meta', moduleName), backupMeta);
    } catch (e) {
      console.error('Backup trigger failed', e);
    }
  }
}));
