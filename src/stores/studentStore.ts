import { create } from 'zustand';
import { collection, query, where, onSnapshot, doc, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Student, AcademicResult, AttendanceRecord } from '../lib/types';
import { toast } from 'sonner';

interface StudentState {
  students: Student[];
  academicResults: AcademicResult[];
  attendance: AttendanceRecord[];
  loading: boolean;
  error: string | null;
  unsubscribeStudents: (() => void) | null;
  unsubscribeResults: (() => void) | null;
  unsubscribeAttendance: (() => void) | null;
  
  // Actions
  fetchData: (role: string, assignedClasses?: string[], childrenIds?: string[]) => void;
  
  // Student Actions
  addStudent: (student: Omit<Student, 'id'> & { id?: string }) => Promise<void>;
  updateStudent: (id: string, data: Partial<Student>) => Promise<void>;
  deleteStudent: (id: string) => Promise<void>;
  bulkDeleteStudents: (ids: string[]) => Promise<void>;
  importStudents: (data: any[], defaultClass?: string) => Promise<void>;
  
  // Academic Result Actions
  addAcademicResult: (result: Omit<AcademicResult, 'id'>) => Promise<void>;
  updateAcademicResult: (id: string, data: Partial<AcademicResult>) => Promise<void>;
  deleteAcademicResult: (id: string) => Promise<void>;
  deleteAcademicResults: (ids: string[]) => Promise<void>;
  importAcademicResultsStore: (results: any[]) => Promise<void>;
  saveBatchAcademicResults: (resultsToUpdate: any[], resultsToAdd: any[]) => Promise<void>; // Pre-processed array
  
  // Attendance Actions
  recordAttendance: (record: Omit<AttendanceRecord, 'id'>) => Promise<void>;

  clearStore: () => void;
}

export const useStudentStore = create<StudentState>((set, get) => ({
  students: [],
  academicResults: [],
  attendance: [],
  loading: false,
  error: null,
  unsubscribeStudents: null,
  unsubscribeResults: null,
  unsubscribeAttendance: null,

  fetchData: (role, assignedClasses = [], childrenIds = []) => {
    get().clearStore(); // clear existing listeners
    set({ loading: true, error: null });

    const setupListeners = () => {
      const studentsRef = collection(db, 'students');
      const resultsRef = collection(db, 'academicResults');
      const attendanceRef = collection(db, 'attendance');

      let qStudents = query(studentsRef);
      let qResults = query(resultsRef);
      let qAttendance = query(attendanceRef);

      try {
        if (role === 'teacher') {
          if (assignedClasses.length > 0) {
            const classesBatch = assignedClasses.slice(0, 10);
            qStudents = query(studentsRef, where('class', 'in', classesBatch));
            qResults = query(resultsRef, where('classId', 'in', classesBatch));
          } else {
            set({ students: [], academicResults: [], attendance: [], loading: false });
            return;
          }
        } else if (role === 'parent') {
          if (childrenIds.length > 0) {
            const childrenBatch = childrenIds.slice(0, 10);
            qStudents = query(studentsRef, where('__name__', 'in', childrenBatch));
            qResults = query(resultsRef, where('studentId', 'in', childrenBatch));
            qAttendance = query(attendanceRef, where('studentId', 'in', childrenBatch));
          } else {
            set({ students: [], academicResults: [], attendance: [], loading: false });
            return;
          }
        } else if (role !== 'admin' && role !== 'staff') {
          set({ students: [], academicResults: [], attendance: [], loading: false });
          return;
        }

        const unsubscribeStudents = onSnapshot(qStudents, (snapshot) => {
          set({ students: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student)) });
        }, (err) => {
          console.error('Students fetch error:', err);
          set({ error: err.message });
        });

        const unsubscribeResults = onSnapshot(qResults, (snapshot) => {
          set({ academicResults: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AcademicResult)) });
        }, (err) => {
          console.error('Results fetch error:', err);
          set({ error: err.message, loading: false });
        });

        const unsubscribeAttendance = onSnapshot(qAttendance, (snapshot) => {
          set({ attendance: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AttendanceRecord)) });
          set({ loading: false });
        }, (err) => {
          console.error('Attendance fetch error:', err);
          set({ error: err.message, loading: false });
        });

        set({ unsubscribeStudents, unsubscribeResults, unsubscribeAttendance });
      } catch (err: any) {
        console.error('Query setup error:', err);
        toast.error('حدث خطأ في تحميل البيانات.');
        set({ error: err.message, loading: false });
      }
    };

    // Firebase auth import is needed. We will use the already imported auth from firebase.ts
    // Wait for auth to be ready
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
        
        // Timeout to fallback if auth never happens (e.g. mock mode without firebase sync)
        setTimeout(() => {
           unsubscribeAuth();
           if (!auth.currentUser && get().loading) {
              setupListeners(); // Attempt anyway, might fail if strict rules
           }
        }, 2000);
      }
    });
  },

  addStudent: async (student) => {
    try {
      const id = student.id || crypto.randomUUID();
      const newStudent = { ...student, id };
      set(state => ({ students: [...state.students, newStudent as Student] }));
      await setDoc(doc(db, 'students', id), newStudent);
      toast.success('تمت إضافة الطالب');
    } catch (err) {
      toast.error('فشل في الإضافة');
    }
  },

  updateStudent: async (id, data) => {
    try {
      await setDoc(doc(db, 'students', id), data, { merge: true });
      toast.success('تم التحديث');
    } catch (err) {
      toast.error('فشل في التحديث');
    }
  },

  deleteStudent: async (id) => {
    try {
      await deleteDoc(doc(db, 'students', id));
      
      const resultsToDelete = get().academicResults.filter(r => r.studentId === id);
      if (resultsToDelete.length > 0) {
        const batch = writeBatch(db);
        resultsToDelete.forEach(r => batch.delete(doc(db, 'academicResults', r.id)));
        await batch.commit();
      }
      toast.success('تم حذف الطالب');
    } catch (err) {
      toast.error('فشل في الحذف');
    }
  },
  
  bulkDeleteStudents: async (ids) => {
    try {
      if (ids.length === 0) return;
      
      // Batch deletes in chunks of 500 (Firestore limit)
      const batches = [];
      let currentBatch = writeBatch(db);
      let opCount = 0;
      
      const resultsToDelete = get().academicResults.filter(r => ids.includes(r.studentId));
      
      // Delete students
      ids.forEach(id => {
        currentBatch.delete(doc(db, 'students', id));
        opCount++;
        if (opCount === 500) {
          batches.push(currentBatch);
          currentBatch = writeBatch(db);
          opCount = 0;
        }
      });
      
      // Delete related results
      resultsToDelete.forEach(r => {
        currentBatch.delete(doc(db, 'academicResults', r.id));
        opCount++;
        if (opCount === 500) {
          batches.push(currentBatch);
          currentBatch = writeBatch(db);
          opCount = 0;
        }
      });
      
      if (opCount > 0) {
        batches.push(currentBatch);
      }
      
      for (const b of batches) {
        await b.commit();
      }
      
      toast.success('تم حذف التلاميذ بنجاح');
    } catch (err) {
      toast.error('فشل في الحذف الجماعي');
      console.error(err);
    }
  },

  importStudents: async (data, defaultClass) => {
    try {
      if (!data || !Array.isArray(data)) {
        toast.error('بيانات الملف غير صالحة');
        return;
      }
      
      const findValue = (obj: any, keys: string[]) => {
        if (!obj || typeof obj !== 'object') return undefined;
        const found = Object.keys(obj).find(k => keys.some(key => k.toLowerCase().includes(key.toLowerCase())));
        return found ? obj[found] : undefined;
      };

      const newStudents = data.map((item, index) => {
        try {
          if (!item || typeof item !== 'object') return null;
          // Skip completely empty rows
          if (Object.keys(item).length === 0) return null;

          let fullName = item.full_name || item.fullName || findValue(item, ['اسم', 'nom', 'name', 'تلميذ', 'eleve', 'student']);
          let className = item.class || findValue(item, ['قسم', 'صف', 'classe', 'niveau', 'level']);
          
          if (!fullName) {
             // Try to find any string column that looks like a name
             const firstStringKey = Object.keys(item).find(k => typeof item[k] === 'string' && isNaN(Number(item[k])) && item[k].trim().length > 2);
             fullName = firstStringKey ? item[firstStringKey] : `تلميذ غير مسمى ${index + 1}`;
          }
          
          if (!className) {
             className = defaultClass || 'قسم غير محدد';
          }

          return {
            id: crypto.randomUUID(),
            fullName: String(fullName).trim(),
            class: String(className).trim(),
            birthDate: String(item.birth_date || findValue(item, ['تاريخ', 'date']) || '').trim(),
            parentName: String(item.parent_name || findValue(item, ['ولي', 'parent']) || '').trim(),
            parentPhone: String(item.parent_phone || findValue(item, ['هاتف', 'tel', 'phone']) || '').trim(),
            notes: String(item.notes || findValue(item, ['ملاحظة', 'note']) || '').trim(),
          };
        } catch (e) {
          console.error("Error parsing student row", e);
          return null; // Skip this row
        }
      }).filter(Boolean) as Student[];

      const existingNames = new Set(get().students.map(s => s.fullName.trim().toLowerCase()));
      const filtered = newStudents.filter(s => {
        const name = s.fullName.trim().toLowerCase();
        if (existingNames.has(name)) return false;
        existingNames.add(name);
        return true;
      });

      if (filtered.length > 0) {
        set((state) => ({ students: [...state.students, ...filtered] }));
        const batch = writeBatch(db);
        filtered.forEach(s => batch.set(doc(db, 'students', s.id), s, { merge: true }));
        await batch.commit();
        toast.success(`تم الاستيراد بنجاح مع إصلاح بعض البيانات غير المنظمة تلقائياً (${filtered.length} تلميذ)`);
      } else {
         toast.warning('لم يتم العثور على تلاميذ جدد للاستيراد');
      }
    } catch (err) {
      console.error("Import students error:", err);
      toast.error('حدث خطأ أثناء استيراد البيانات. يرجى التحقق من الملف.');
    }
  },


  addAcademicResult: async (result) => {
    try {
      const id = crypto.randomUUID();
      await setDoc(doc(db, 'academicResults', id), { ...result, id });
      toast.success('تم تسجيل النتيجة');
    } catch (err) {
      toast.error('فشل التسجيل');
    }
  },

  updateAcademicResult: async (id, data) => {
    try {
      await setDoc(doc(db, 'academicResults', id), data, { merge: true });
      toast.success('تم تحديث النتيجة');
    } catch (err) {
      toast.error('فشل التحديث');
    }
  },

  deleteAcademicResult: async (id) => {
    try {
      await deleteDoc(doc(db, 'academicResults', id));
      toast.success('تم حذف النتيجة');
    } catch (err) {
      toast.error('فشل الحذف');
    }
  },

  deleteAcademicResults: async (ids) => {
    try {
      const batch = writeBatch(db);
      ids.forEach(id => batch.delete(doc(db, 'academicResults', id)));
      await batch.commit();
      toast.success('تم حذف النتائج المحددة');
    } catch (err) {
      toast.error('فشل الحذف');
    }
  },

  importAcademicResultsStore: async (results) => {
    try {
      if (results && results.length > 0) {
        set((state) => {
          const newResults = [...state.academicResults];
          results.forEach(r => {
            const index = newResults.findIndex(ex => ex.id === r.id);
            if (index >= 0) newResults[index] = { ...newResults[index], ...r };
            else newResults.push({ ...r, id: r.id || crypto.randomUUID() });
          });
          return { academicResults: newResults };
        });
      }
      
      const batches = [];
      let currentBatch = writeBatch(db);
      let count = 0;
      
      results.forEach(r => {
        const id = r.id || crypto.randomUUID();
        currentBatch.set(doc(db, 'academicResults', id), { ...r, id }, { merge: true });
        count++;
        if (count === 400) {
          batches.push(currentBatch);
          currentBatch = writeBatch(db);
          count = 0;
        }
      });
      if (count > 0) batches.push(currentBatch);
      
      for (const b of batches) {
        await b.commit();
      }
      toast.success('تم استيراد النتائج بنجاح');
    } catch (err) {
      toast.error('خطأ في استيراد النتائج');
    }
  },

  saveBatchAcademicResults: async (resultsToUpdate, resultsToAdd) => {
    try {
      if (resultsToUpdate.length === 0 && resultsToAdd.length === 0) return;
      
      set((state) => {
        const newResults = [...state.academicResults];
        resultsToUpdate.forEach(r => {
          const index = newResults.findIndex(ex => ex.id === r.id);
          if (index >= 0) newResults[index] = { ...newResults[index], ...r.updates };
        });
        resultsToAdd.forEach(r => {
          newResults.push({ ...r, id: crypto.randomUUID() });
        });
        return { academicResults: newResults };
      });
      
      const batches = [];
      let currentBatch = writeBatch(db);
      let count = 0;
      
      resultsToUpdate.forEach(r => {
        currentBatch.update(doc(db, 'academicResults', r.id), r.updates);
        count++;
        if (count === 400) {
          batches.push(currentBatch);
          currentBatch = writeBatch(db);
          count = 0;
        }
      });
      
      resultsToAdd.forEach(r => {
        const id = crypto.randomUUID();
        currentBatch.set(doc(db, 'academicResults', id), { ...r, id });
        count++;
        if (count === 400) {
          batches.push(currentBatch);
          currentBatch = writeBatch(db);
          count = 0;
        }
      });
      
      if (count > 0) batches.push(currentBatch);
      
      for (const b of batches) {
        await b.commit();
      }
      
      toast.success('تم حفظ النتائج بنجاح');
    } catch (err) {
      console.error('Save batch error', err);
      toast.error('فشل في حفظ النتائج');
    }
  },
  recordAttendance: async (record) => {
    try {
      const id = crypto.randomUUID();
      await setDoc(doc(db, 'attendance', id), { ...record, id });
      
      if (!record.present) {
        // We will trigger a school announcement
        const { useSchoolStore } = await import('./schoolStore');
        const student = get().students.find(s => s.id === record.studentId);
        if (student) {
          useSchoolStore.getState().addAnnouncement({
            title: `Absence signalée : ${student.fullName}`,
            content: `L'élève ${student.fullName} (classe ${student.class}) a été marqué absent aujourd'hui.`,
            date: new Date().toISOString(), priority: 'normal'
          });

// Auto-notification removed to prevent duplication with manual notification in UI
        }
      }
      // Removed toast to prevent spamming in loops
    } catch (err) {
      console.error('فشل تسجيل الحضور/الغياب', err);
    }
  },

  clearStore: () => {
    get().unsubscribeStudents?.();
    get().unsubscribeResults?.();
    get().unsubscribeAttendance?.();
    set({ students: [], academicResults: [], attendance: [], loading: false, error: null, unsubscribeStudents: null, unsubscribeResults: null, unsubscribeAttendance: null });
  }
}));

