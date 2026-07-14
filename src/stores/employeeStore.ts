import { create } from 'zustand';
import { collection, query, onSnapshot, doc, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Employee } from '../lib/types';
import { toast } from 'sonner';

interface EmployeeStore {
  employees: Employee[];
  loading: boolean;
  error: string | null;
  fetchData: () => void;
  clearStore: () => void;
  addEmployee: (employee: Omit<Employee, 'id'> & { id?: string }) => Promise<void>;
  updateEmployee: (id: string, updates: Partial<Employee>) => Promise<void>;
  deleteEmployee: (id: string) => Promise<void>;
  deleteEmployees: (ids: string[]) => Promise<void>;
  importEmployees: (data: any[]) => Promise<void>;
}

export const useEmployeeStore = create<EmployeeStore>((set, get) => ({
  employees: [],
  loading: false,
  error: null,

  clearStore: () => {
    set({ employees: [], loading: false, error: null });
  },

  fetchData: () => {
    get().clearStore();
    set({ loading: true, error: null });

    const setupListeners = () => {
      const employeesRef = collection(db, 'employees');
      const qEmployees = query(employeesRef);

      try {
        const unsubscribeEmployees = onSnapshot(
          qEmployees,
          (snapshot) => {
            const employees = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            })) as Employee[];
            set({ employees, loading: false });
          },
          (err) => {
            console.error('Employees fetch error:', err?.message || err);
            set({ error: err.message, loading: false });
          }
        );

        // Keep unsubscribe in a scoped variable if needed, or attach to the state if you want to clean up manually
        // Since we want simple logic, we just return
        return unsubscribeEmployees;
      } catch (err: any) {
        console.error('Query setup error:', err?.message || err);
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

  addEmployee: async (employee) => {
    try {
      const id = employee.id || crypto.randomUUID();
      await setDoc(doc(db, 'employees', id), { ...employee, id });
      toast.success('تمت إضافة الموظف بنجاح');
    } catch (err: any) {
      console.error('Error adding employee:', err?.message || err);
      toast.error('فشل في إضافة الموظف');
      throw err;
    }
  },

  updateEmployee: async (id, updates) => {
    try {
      await setDoc(doc(db, 'employees', id), updates, { merge: true });
      toast.success('تم تحديث بيانات الموظف');
    } catch (err: any) {
      console.error('Error updating employee:', err?.message || err);
      toast.error('فشل في التحديث');
      throw err;
    }
  },

  deleteEmployee: async (id) => {
    try {
      await deleteDoc(doc(db, 'employees', id));
      toast.success('تم حذف الموظف بنجاح');
    } catch (err: any) {
      console.error('Error deleting employee:', err?.message || err);
      toast.error('فشل في الحذف');
      throw err;
    }
  },

  deleteEmployees: async (ids) => {
    try {
      const batch = writeBatch(db);
      ids.forEach(id => {
        batch.delete(doc(db, 'employees', id));
      });
      await batch.commit();
      toast.success('تم حذف الموظفين المحددين');
    } catch (err: any) {
      console.error('Error deleting employees:', err?.message || err);
      toast.error('فشل في الحذف');
      throw err;
    }
  },

  importEmployees: async (data) => {
    try {
      const findValue = (obj: any, keys: string[]) => {
        const foundKey = Object.keys(obj).find(k => 
          keys.some(key => k.toLowerCase().includes(key.toLowerCase()))
        );
        return foundKey ? obj[foundKey] : undefined;
      };

      const newEmployees = data.map(item => {
        const fullName = item.fullName || item.full_name || findValue(item, ['اسم', 'الاسم', 'nom', 'prénom', 'name']) || '';
        const role = item.role || item.poste || findValue(item, ['دور', 'مهمة', 'وظيفة', 'role', 'poste', 'title']) || '';
        const typeStr = item.type || item.category || findValue(item, ['نوع', 'فئة', 'صنف', 'type', 'catégorie', 'category']) || 'Teacher';
        const phone = item.phone || item.telephone || findValue(item, ['هاتف', 'رقم', 'téléphone', 'tel', 'phone']) || '';

        if (!fullName) return null;

        let type: 'Teacher' | 'Administration' | 'Security' | 'Other' = 'Other';
        const t = String(typeStr).toLowerCase();
        if (t.includes('teach') || t.includes('prof') || t.includes('أستاذ') || t.includes('معلم')) type = 'Teacher';
        else if (t.includes('admin') || t.includes('إدارة') || t.includes('مدير') || t.includes('gestion')) type = 'Administration';
        else if (t.includes('sec') || t.includes('أمن') || t.includes('حارس') || t.includes('gard')) type = 'Security';

        return {
          id: crypto.randomUUID(),
          fullName: String(fullName),
          role: String(role),
          type,
          phone: String(phone),
        };
      }).filter(Boolean) as Employee[];

      const currentEmployees = get().employees;
      const existingNames = new Set(currentEmployees.map(e => (e.fullName || '').trim().toLowerCase()));
      const filteredNewEmployees = newEmployees.filter(e => {
        const name = (e.fullName || '').trim().toLowerCase();
        if (existingNames.has(name)) return false;
        existingNames.add(name);
        return true;
      });

      if (filteredNewEmployees.length === 0) {
        toast.info('لم يتم العثور على موظفين جدد لإضافتهم');
        return;
      }

      const batch = writeBatch(db);
      filteredNewEmployees.forEach(emp => {
        batch.set(doc(db, 'employees', emp.id), emp);
      });
      await batch.commit();
      
      toast.success('تم استيراد الموظفين بنجاح');
    } catch (err: any) {
      console.error('Error importing employees:', err?.message || err);
      toast.error('فشل في استيراد الموظفين');
      throw err;
    }
  },
}));
