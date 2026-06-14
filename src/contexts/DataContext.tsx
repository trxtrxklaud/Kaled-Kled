import React, { createContext, useContext, useState, useEffect } from 'react';
import { idbGet, idbSet } from '../lib/idb';
import type { AcademicAsset, User, Student, AcademicResult, Employee, Exam, Announcement, Message, Timetable, ExamPlanningFile, AttendanceRecord, FinanceArrear, NewsItem, Homework, Post, Comment, EmailDeliveryLog, SchoolBranding, CertificateRegistryEntry, ScheduleCell, WeeklySchedule, WeeklyScheduleLocks, TimetableActionLog, StatisticsFilterPreset, ClassTimetableImages, EduservSyncLog, AppPreferences, AppLanguage, ImportStudentData, ImportFinanceData, ImportAcademicResultData, ImportExamScheduleData } from '../lib/types';
import { toast } from 'sonner';
import { safeOpenExternalLink } from '../lib/utils';
import { parseSchoolLevel } from '../lib/academicAnalytics';

export const DEFAULT_ACADEMIC_RESULTS: AcademicResult[] = [
  {
    id: 'grade-1',
    studentId: '1',
    classId: '1A',
    level: '1',
    subject: 'Mathématiques',
    examLabel: 'Contrôle continu 1',
    trimester: 1,
    score: 16,
    coefficient: 1,
    recordedAt: '2026-05-15',
  },
  {
    id: 'grade-2',
    studentId: '1',
    classId: '1A',
    level: '1',
    subject: 'Français',
    examLabel: 'Composition 1',
    trimester: 1,
    score: 15.5,
    coefficient: 1,
    recordedAt: '2026-05-18',
  },
  {
    id: 'grade-3',
    studentId: '1',
    classId: '1A',
    level: '1',
    subject: 'Arabe',
    examLabel: 'Devoir surveillé',
    trimester: 1,
    score: 17,
    coefficient: 1,
    recordedAt: '2026-05-20',
  },
  {
    id: 'grade-4',
    studentId: '1',
    classId: '1A',
    level: '1',
    subject: 'Sciences',
    examLabel: 'Projet évalué',
    trimester: 1,
    score: 16.5,
    coefficient: 1,
    recordedAt: '2026-05-23',
  },
  {
    id: 'grade-5',
    studentId: '1',
    classId: '1A',
    level: '1',
    subject: 'Histoire-Géo',
    examLabel: 'Synthèse',
    trimester: 1,
    score: 14.5,
    coefficient: 1,
    recordedAt: '2026-05-26',
  },
  {
    id: 'grade-6',
    studentId: '2',
    classId: '1A',
    level: '1',
    subject: 'Mathématiques',
    examLabel: 'Contrôle continu 1',
    trimester: 1,
    score: 13,
    coefficient: 1,
    recordedAt: '2026-05-15',
  },
  {
    id: 'grade-7',
    studentId: '2',
    classId: '1A',
    level: '1',
    subject: 'Français',
    examLabel: 'Composition 1',
    trimester: 1,
    score: 12.5,
    coefficient: 1,
    recordedAt: '2026-05-18',
  },
  {
    id: 'grade-8',
    studentId: '2',
    classId: '1A',
    level: '1',
    subject: 'Arabe',
    examLabel: 'Devoir surveillé',
    trimester: 1,
    score: 14,
    coefficient: 1,
    recordedAt: '2026-05-20',
  },
  {
    id: 'grade-9',
    studentId: '2',
    classId: '1A',
    level: '1',
    subject: 'Sciences',
    examLabel: 'Projet évalué',
    trimester: 1,
    score: 11.5,
    coefficient: 1,
    recordedAt: '2026-05-23',
  },
  {
    id: 'grade-10',
    studentId: '2',
    classId: '1A',
    level: '1',
    subject: 'Histoire-Géo',
    examLabel: 'Synthèse',
    trimester: 1,
    score: 13.5,
    coefficient: 1,
    recordedAt: '2026-05-26',
  },
  {
    id: 'grade-11',
    studentId: '3',
    classId: '2B',
    level: '2',
    subject: 'Mathématiques',
    examLabel: 'Contrôle continu 1',
    trimester: 1,
    score: 9.5,
    coefficient: 1,
    recordedAt: '2026-05-15',
  },
  {
    id: 'grade-12',
    studentId: '3',
    classId: '2B',
    level: '2',
    subject: 'Français',
    examLabel: 'Composition 1',
    trimester: 1,
    score: 10,
    coefficient: 1,
    recordedAt: '2026-05-18',
  },
  {
    id: 'grade-13',
    studentId: '3',
    classId: '2B',
    level: '2',
    subject: 'Arabe',
    examLabel: 'Devoir surveillé',
    trimester: 1,
    score: 8.5,
    coefficient: 1,
    recordedAt: '2026-05-20',
  },
  {
    id: 'grade-14',
    studentId: '3',
    classId: '2B',
    level: '2',
    subject: 'Sciences',
    examLabel: 'Projet évalué',
    trimester: 1,
    score: 11,
    coefficient: 1,
    recordedAt: '2026-05-23',
  },
  {
    id: 'grade-15',
    studentId: '3',
    classId: '2B',
    level: '2',
    subject: 'Histoire-Géo',
    examLabel: 'Synthèse',
    trimester: 1,
    score: 9,
    coefficient: 1,
    recordedAt: '2026-05-26',
  },
];

interface DataContextType {
  students: Student[];
  academicResults: AcademicResult[];
  employees: Employee[];
  exams: Exam[];
  announcements: Announcement[];
  news: NewsItem[];
  messages: Message[];
  emailDeliveryLogs: EmailDeliveryLog[];
  schoolBranding: SchoolBranding;
  certificateRegistry: CertificateRegistryEntry[];
  weeklySchedule: WeeklySchedule;
  weeklyScheduleLocks: WeeklyScheduleLocks;
  timetableActionLogs: TimetableActionLog[];
  classTimetableImages: ClassTimetableImages;
  statisticsFilterPresets: StatisticsFilterPreset[];
  eduservSyncLogs: EduservSyncLog[];
  appPreferences: AppPreferences;
  authSessionUser: User | null;
  timetables: Timetable[];
  examPlanningFiles: ExamPlanningFile[];
  attendance: AttendanceRecord[];
  financeArrears: FinanceArrear[];
  academicAssets: AcademicAsset[];
  addAcademicAsset: (asset: Omit<AcademicAsset, 'id'>) => void;
  removeAcademicAsset: (id: string) => void;
  addStudent: (student: Omit<Student, 'id'> & { id?: string }) => void;
  updateStudent: (student: Student) => void;
  deleteStudent: (id: string) => void;
  importStudents: (data: ImportStudentData[], defaultClass?: string) => void;
  addAcademicResult: (result: Omit<AcademicResult, 'id' | 'level'>) => void;
  updateAcademicResult: (result: AcademicResult) => void;
  updateAcademicResults: (results: AcademicResult[]) => void;
  importAcademicResults: (data: ImportAcademicResultData[]) => void;
  deleteAcademicResult: (id: string) => void;
  deleteAcademicResults: (ids: string[]) => void;
  addEmployee: (employee: Omit<Employee, 'id'> & { id?: string }) => void;
  updateEmployee: (employee: Employee) => void;
  deleteEmployee: (id: string) => void;
  deleteEmployees: (ids: string[]) => void;
  importEmployees: (data: any[]) => void;
  addExam: (exam: Omit<Exam, 'id'>) => void;
  importExams: (data: ImportExamScheduleData[]) => void;
  deleteExam: (id: string) => void;
  addAnnouncement: (announcement: Omit<Announcement, 'id'>) => void;
  deleteAnnouncement: (id: string) => void;
  addNews: (newsItem: Omit<NewsItem, 'id' | 'date'>) => void;
  deleteNews: (id: string) => void;
  addMessage: (message: Omit<Message, 'id' | 'timestamp' | 'read'>) => void;
  markMessageRead: (id: string) => void;
  addEmailDeliveryLog: (log: Omit<EmailDeliveryLog, 'id' | 'createdAt'>) => void;
  updateSchoolBranding: (branding: Partial<Omit<SchoolBranding, 'updatedAt'>>) => void;
  addCertificateRegistryEntries: (entries: Array<Omit<CertificateRegistryEntry, 'id' | 'createdAt' | 'status'>>) => void;
  revokeCertificateRegistryEntry: (id: string, reason?: string) => void;
  saveScheduleCell: (classId: string, day: string, time: string, cell: ScheduleCell) => void;
  clearScheduleCell: (classId: string, day: string, time: string) => void;
  replaceClassWeeklySchedule: (classId: string, classSchedule: WeeklySchedule[string]) => void;
  replaceWeeklySchedule: (schedule: WeeklySchedule) => void;
  updateScheduleLock: (classId: string, day: string | null, locked: boolean) => void;
  addTimetableActionLog: (log: Omit<TimetableActionLog, 'id' | 'createdAt'>) => void;
  replaceWeeklyScheduleLocks: (locks: WeeklyScheduleLocks) => void;
  setClassTimetableImage: (classId: string, data: string) => void;
  removeClassTimetableImage: (classId: string) => void;
  saveStatisticsFilterPreset: (preset: Omit<StatisticsFilterPreset, 'id' | 'createdAt'>) => void;
  deleteStatisticsFilterPreset: (id: string) => void;
  addEduservSyncLog: (log: Omit<EduservSyncLog, 'id' | 'timestamp'>) => void;
  clearEduservSyncLogs: () => void;
  updateAppLanguage: (language: AppLanguage) => void;
  setAuthSessionUser: (user: User | null) => void;
  addTimetable: (timetable: Omit<Timetable, 'id'>) => void;
  deleteTimetable: (id: string) => void;
  addExamPlanningFile: (file: Omit<ExamPlanningFile, 'id'>) => void;
  deleteExamPlanningFile: (id: string) => void;
  recordAttendance: (record: Omit<AttendanceRecord, 'id'>) => void;
  markAttendance: (studentId: string, present: boolean) => void;
  importFinanceArrears: (data: ImportFinanceData[]) => void;
  addFinanceArrear: (arrear: Omit<FinanceArrear, 'id'>) => void;
  updateFinanceArrear: (arrear: FinanceArrear) => void;
  sendPaymentReminder: (arrearId: string) => void;
  homeworks: Homework[];
  addHomework: (homework: Omit<Homework, 'id'>) => void;
  updateHomework: (homework: Homework) => void;
  deleteHomework: (id: string) => void;
  posts: Post[];
  addPost: (postData: Omit<Post, 'id' | 'date' | 'likes' | 'likedByCurrentUser' | 'comments'>) => void;
  likePost: (postId: string) => void;
  addComment: (postId: string, commentData: Omit<Comment, 'id' | 'date'>) => void;
  editPost: (postId: string, updatedData: Partial<Pick<Post, 'content' | 'audience' | 'images'>>) => void;
  deletePost: (postId: string) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const DEFAULT_SCHOOL_BRANDING: SchoolBranding = {
  schoolNameFr: 'Complexe La Providence',
  schoolNameAr: 'مجمع لابروفيدانس',
  updatedAt: new Date().toISOString(),
};

const DEFAULT_APP_PREFERENCES: AppPreferences = {
  language: 'fr',
  updatedAt: new Date().toISOString(),
};

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [academicResults, setAcademicResults] = useState<AcademicResult[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [emailDeliveryLogs, setEmailDeliveryLogs] = useState<EmailDeliveryLog[]>([]);
  const [schoolBranding, setSchoolBranding] = useState<SchoolBranding>(DEFAULT_SCHOOL_BRANDING);
  const [certificateRegistry, setCertificateRegistry] = useState<CertificateRegistryEntry[]>([]);
  const [weeklySchedule, setWeeklySchedule] = useState<WeeklySchedule>({});
  const [weeklyScheduleLocks, setWeeklyScheduleLocks] = useState<WeeklyScheduleLocks>({});
  const [timetableActionLogs, setTimetableActionLogs] = useState<TimetableActionLog[]>([]);
  const [classTimetableImages, setClassTimetableImages] = useState<ClassTimetableImages>({});
  const [statisticsFilterPresets, setStatisticsFilterPresets] = useState<StatisticsFilterPreset[]>([]);
  const [eduservSyncLogs, setEduservSyncLogs] = useState<EduservSyncLog[]>([]);
  const [appPreferences, setAppPreferences] = useState<AppPreferences>(DEFAULT_APP_PREFERENCES);
  const [authSessionUser, setAuthSessionUserState] = useState<User | null>(null);
  const [timetables, setTimetables] = useState<Timetable[]>([]);
  const [examPlanningFiles, setExamPlanningFiles] = useState<ExamPlanningFile[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [financeArrears, setFinanceArrears] = useState<FinanceArrear[]>([]);
  const [homeworks, setHomeworks] = useState<Homework[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [academicAssets, setAcademicAssets] = useState<AcademicAsset[]>([]);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // Load initial data
  useEffect(() => {
    async function loadInitiator() {
      // Helper to fetch from IDB, fallback to localStorage if missing/null
      async function fetchOrFallback<T>(key: string, fallback: T): Promise<T> {
        const idbVal = await idbGet<T>(key);
        if (idbVal !== null && idbVal !== undefined) return idbVal;
        const local = localStorage.getItem(key);
        if (local) {
          try { return JSON.parse(local) as T; } catch { return fallback; }
        }
        return fallback;
      }

      const defaultStudents: Student[] = [
        { id: '1', fullName: 'Ahmed Mansour',   class: '1A', birthDate: '2015-05-12', parentName: 'Mohamed Mansour', parentPhone: '0612345678', notes: 'Excellent student' },
        { id: '2', fullName: 'Sarah Alami',     class: '1A', birthDate: '2015-08-22', parentName: 'Karim Alami',     parentPhone: '0687654321' },
      ].sort((a, b) => a.fullName.localeCompare(b.fullName));

      setStudents(await fetchOrFallback('providence_students', defaultStudents));
      setAcademicResults(await fetchOrFallback('providence_academic_results', []));
      setEmployees(await fetchOrFallback('providence_employees', [
        { id: '1', fullName: 'Mme. Fatima Zahra', role: 'Directrice', type: 'Administration', phone: '0600112233' },
        { id: '2', fullName: 'M. Rachid Hamidi', role: 'Professeur de Français', type: 'Teacher', phone: '0611223344' },
      ]));
      setExams(await fetchOrFallback('providence_exams', []));
      setAnnouncements(await fetchOrFallback('providence_announcements', []));
      setNews(await fetchOrFallback('providence_news', []));
      setMessages(await fetchOrFallback('providence_messages', []));
      setEmailDeliveryLogs(await fetchOrFallback('providence_email_delivery_logs', []));
      setSchoolBranding({ ...DEFAULT_SCHOOL_BRANDING, ...(await fetchOrFallback('providence_school_branding', {})) });
      setCertificateRegistry(await fetchOrFallback('providence_certificate_registry', []));
      setWeeklySchedule(await fetchOrFallback('providence_weekly_schedule', {}));
      setWeeklyScheduleLocks(await fetchOrFallback('providence_weekly_schedule_locks', {}));
      setTimetableActionLogs(await fetchOrFallback('providence_timetable_action_logs', []));
      setClassTimetableImages(await fetchOrFallback('providence_class_timetable_images', {}));
      setStatisticsFilterPresets(await fetchOrFallback('providence_statistics_filter_presets', []));
      setEduservSyncLogs(await fetchOrFallback('providence_eduserv_sync_logs', []));
      setAppPreferences({ ...DEFAULT_APP_PREFERENCES, ...(await fetchOrFallback('providence_app_preferences', {})) });
      setAuthSessionUserState(await fetchOrFallback('providence_auth_session_user', null));
      setTimetables(await fetchOrFallback('providence_timetables', []));
      setExamPlanningFiles(await fetchOrFallback('providence_exam_planning', []));
      setAttendance(await fetchOrFallback('providence_attendance', []));
      setFinanceArrears(await fetchOrFallback('providence_finance', []));
      setHomeworks(await fetchOrFallback('providence_homeworks', []));
      setAcademicAssets(await fetchOrFallback('providence_academic_assets', []));
      
      const loadedPosts = await fetchOrFallback<Post[]>('providence_posts', []);
      if (loadedPosts.length > 0) {
        setPosts(loadedPosts);
      } else {
        const samplePosts: Post[] = [
          {
            id: 'p1',
            author: 'M. Rachid Hamidi',
            role: 'Professeur de Français',
            date: '2026-06-05T10:30:00Z',
            content: 'Rappel : Les élèves de 3A doivent apporter leurs cahiers de texte demain pour la correction collective.',
            audience: 'Classes spécifiques',
            images: [],
            likes: 12,
            likedByCurrentUser: false,
            comments: []
          }
        ];
        setPosts(samplePosts);
      }

      setIsDataLoaded(true);
    }
    loadInitiator();
  }, []);

  // Persistence
  const safeSetItem = (key: string, value: any) => {
    if (!isDataLoaded) return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error(`Failed to save ${key} to localStorage:`, e);
      if (e instanceof DOMException && e.name === 'QuotaExceededError') {
        toast.error("La mémoire locale est pleine. L'image de l'emploi du temps est peut-être trop grande.", { id: 'quota_error' });
      }
    }
    
    // Also save seamlessly to IndexedDB locally for enterprise-scale
    idbSet(key, value).catch(console.error);
  };

  useEffect(() => safeSetItem('providence_students', students), [students]);
  useEffect(() => safeSetItem('providence_academic_results', academicResults), [academicResults]);
  useEffect(() => safeSetItem('providence_employees', employees), [employees]);
  useEffect(() => safeSetItem('providence_exams', exams), [exams]);
  useEffect(() => safeSetItem('providence_announcements', announcements), [announcements]);
  useEffect(() => safeSetItem('providence_news', news), [news]);
  useEffect(() => safeSetItem('providence_messages', messages), [messages]);
  useEffect(() => safeSetItem('providence_email_delivery_logs', emailDeliveryLogs), [emailDeliveryLogs]);
  useEffect(() => safeSetItem('providence_school_branding', schoolBranding), [schoolBranding]);
  useEffect(() => safeSetItem('providence_certificate_registry', certificateRegistry), [certificateRegistry]);
  useEffect(() => safeSetItem('providence_weekly_schedule', weeklySchedule), [weeklySchedule]);
  useEffect(() => safeSetItem('providence_weekly_schedule_locks', weeklyScheduleLocks), [weeklyScheduleLocks]);
  useEffect(() => safeSetItem('providence_timetable_action_logs', timetableActionLogs), [timetableActionLogs]);
  useEffect(() => safeSetItem('providence_class_timetable_images', classTimetableImages), [classTimetableImages]);
  useEffect(() => safeSetItem('providence_statistics_filter_presets', statisticsFilterPresets), [statisticsFilterPresets]);
  useEffect(() => safeSetItem('providence_eduserv_sync_logs', eduservSyncLogs), [eduservSyncLogs]);
  useEffect(() => safeSetItem('providence_app_preferences', appPreferences), [appPreferences]);
  useEffect(() => safeSetItem('providence_auth_session_user', authSessionUser), [authSessionUser]);
  useEffect(() => safeSetItem('providence_timetables', timetables), [timetables]);
  useEffect(() => safeSetItem('providence_exam_planning', examPlanningFiles), [examPlanningFiles]);
  useEffect(() => safeSetItem('providence_attendance', attendance), [attendance]);
  useEffect(() => safeSetItem('providence_finance', financeArrears), [financeArrears]);
  useEffect(() => safeSetItem('providence_homeworks', homeworks), [homeworks]);
  useEffect(() => safeSetItem('providence_posts', posts), [posts]);
  useEffect(() => safeSetItem('providence_academic_assets', academicAssets), [academicAssets]);

  const addStudent = (student: Omit<Student, 'id'> & { id?: string }) => {
    const newStudent = { ...student, id: student.id || crypto.randomUUID() } as Student;
    setStudents(prev => [...prev, newStudent].sort((a, b) => (a.fullName || '').localeCompare(b.fullName || '')));
  };

  const updateStudent = (student: Student) => {
    setStudents(prev => prev.map(s => s.id === student.id ? student : s).sort((a, b) => (a.fullName || '').localeCompare(b.fullName || '')));
  };

  const deleteStudent = (id: string) => {
    setStudents(prev => prev.filter(s => s.id !== id));
    setAcademicResults(prev => prev.filter(result => result.studentId !== id));
  };

  const importStudents = (data: any[], defaultClass?: string) => {
    const findValue = (obj: any, keys: string[]) => {
      const foundKey = Object.keys(obj).find(k => 
        keys.some(key => k.toLowerCase().includes(key.toLowerCase()))
      );
      return foundKey ? obj[foundKey] : undefined;
    };

    const newStudents = data.map(item => {
      // Provide wide compatibility for columns
      const fullName = item.full_name || item.fullName || findValue(item, ['اسم', 'الاسم', 'nom', 'prénom', 'name']) || '';
      let className = item.class || findValue(item, ['قسم', 'القسم', 'صف', 'الصف', 'classe', 'grade']) || '';
      const birthDate = item.birth_date || item.birthDate || findValue(item, ['تاريخ', 'ولادة', 'ميلاد', 'date', 'naissance', 'birth']) || '';
      const parentName = item.parent_name || item.parentName || findValue(item, ['ولي', 'أب', 'parent']) || '';
      const parentPhone = item.parent_phone || item.parentPhone || findValue(item, ['هاتف', 'رقم', 'téléphone', 'tel', 'phone']) || '';
      const notes = item.notes || findValue(item, ['ملاحظة', 'ملاحظات', 'note', 'remarque']) || '';

      // Set fallback class if available
      if (!className && defaultClass) {
        className = defaultClass;
      }

      // Skip empty rows
      if (!fullName) return null;

      return {
        id: crypto.randomUUID(),
        fullName: String(fullName),
        class: String(className),
        birthDate: String(birthDate),
        parentName: String(parentName),
        parentPhone: String(parentPhone),
        notes: String(notes),
      };
    }).filter(Boolean) as Student[]; // filter out nulls where name was empty

    setStudents(prev => [...prev, ...newStudents].sort((a, b) => (a.fullName || '').localeCompare(b.fullName || '')));
  };

  const normalizeAcademicResult = (result: AcademicResult): AcademicResult | null => {
    const linkedStudent = students.find(student => student.id === result.studentId);
    const classId = linkedStudent?.class || result.classId;
    const level = parseSchoolLevel(classId);

    if (!level) {
      return null;
    }

    return {
      ...result,
      classId,
      level,
      coefficient: result.coefficient && result.coefficient > 0 ? result.coefficient : 1,
    };
  };

  const addAcademicResult = (result: Omit<AcademicResult, 'id' | 'level'>) => {
    const normalizedResult = normalizeAcademicResult({
      ...result,
      id: crypto.randomUUID(),
      level: '1',
    });

    if (!normalizedResult) {
      toast.error('Classe invalide pour la note académique');
      return;
    }

    setAcademicResults(prev => [normalizedResult, ...prev]);
    toast.success('Résultat académique enregistré');
  };

  const updateAcademicResult = (result: AcademicResult) => {
    const normalizedResult = normalizeAcademicResult(result);

    if (!normalizedResult) {
      toast.error('Classe invalide pour la mise à jour');
      return;
    }

    setAcademicResults(prev => prev.map(current => current.id === normalizedResult.id ? normalizedResult : current));
    toast.success('Résultat académique mis à jour');
  };

  const updateAcademicResults = (results: AcademicResult[]) => {
    if (results.length === 0) {
      return;
    }

    const normalizedResults = results
      .map(normalizeAcademicResult)
      .filter((result): result is AcademicResult => result !== null);

    if (normalizedResults.length === 0) {
      toast.error('Aucun résultat académique valide à mettre à jour');
      return;
    }

    const updatesById = new Map(normalizedResults.map(result => [result.id, result]));
    setAcademicResults(prev => prev.map(current => updatesById.get(current.id) ?? current));
    toast.success(`${normalizedResults.length} résultats académiques mis à jour`);
  };

  const importAcademicResults = async (data: any[]) => {
    const { PRIMARY_CLASSES } = await import('../lib/constants');
    const normalizedStudents = new Map<string, Student>();
    for (const student of students) {
      normalizedStudents.set(student.id, student);
      normalizedStudents.set(`${student.fullName.toLowerCase().trim()}::${student.class}`, student);
    }

    const importedResults: AcademicResult[] = [];
    const knownNonGradeColumns = new Set([
      'student_id', 'studentid', 'full_name', 'fullname', 'class', 'classid', 'القسم', 'تلميذ', 'الاسم', 'trimester', 'coefficient', 'recorded_at', 'recordedat', 'subject', 'exam_label', 'examlabel'
    ]);

    for (const row of data) {
      const studentId = row.student_id || row.studentId || '';
      const rawClassId = String(row.class || row.classId || row['القسم'] || '').trim().toUpperCase();
      const fullName = row.full_name || row.fullName || row['الاسم'] || row['تلميذ'] || '';
      
      const linkedStudent = normalizedStudents.get(studentId) || normalizedStudents.get(`${fullName.toLowerCase().trim()}::${rawClassId}`);
      
      // Validation: must match 30 primary sections or be an existing student
      const classId = linkedStudent?.class || rawClassId;
      if (!PRIMARY_CLASSES.includes(classId)) {
        continue; // Only ingest valid primary classes
      }
      
      const level = parseSchoolLevel(classId) || '1';
      
      let score: number | null = null;
      let subject = row.subject || 'Moyenne / المعدل';
      
      // If there's an explicit average, use it
      const explicitScore = String(row.score ?? row.average ?? row['معدل'] ?? row.moyenne ?? '');
      if (explicitScore.trim() !== '') {
        score = Number.parseFloat(explicitScore);
      } else {
        // Fallback GradeCalc Engine
        const numericValues: number[] = [];
        for (const [key, value] of Object.entries(row)) {
          if (knownNonGradeColumns.has(key.toLowerCase().trim())) continue;
          const parsedValue = Number.parseFloat(String(value));
          if (Number.isFinite(parsedValue) && parsedValue >= 0 && parsedValue <= 20) {
            numericValues.push(parsedValue);
          }
        }
        if (numericValues.length > 0) {
          score = numericValues.reduce((a, b) => a + b, 0) / numericValues.length;
        }
      }

      const trimester = Number.parseInt(String(row.trimester ?? '1'), 10);
      const coefficient = Number.parseFloat(String(row.coefficient ?? '1'));

      if (!Number.isFinite(score) || score === null || score < 0 || score > 20 || ![1, 2, 3].includes(trimester)) {
        continue;
      }

      importedResults.push({
        id: crypto.randomUUID(),
        studentId: linkedStudent?.id || `temp-${crypto.randomUUID()}`, // if student doesn't exist, we'd need to create them? "assign it to the student". I'll create a student if not found?
        classId,
        level,
        subject,
        examLabel: row.exam_label || row.examLabel || 'Évaluation importée',
        trimester: trimester as 1 | 2 | 3,
        score,
        coefficient: Number.isFinite(coefficient) && coefficient > 0 ? coefficient : 1,
        recordedAt: row.recorded_at || row.recordedAt || new Date().toISOString().split('T')[0],
      });
    }

    if (importedResults.length === 0) {
      toast.error('Aucune note académique valide à importer');
      return;
    }

    // Batched writing 100 at a time to prevent UI freeze
    toast.info(`Importing ${importedResults.length} records in batches...`);
    
    // Create new students if temporary IDs were assigned
    const newStudents: Student[] = [];
    const newResults = [...importedResults];
    for (const res of newResults) {
      if (res.studentId.startsWith('temp-')) {
        const correspondingRow = data.find(r => 
          (String(r.class || r.classId || r['القسم'] || '').trim().toUpperCase() === res.classId) && 
          ((r.full_name || r.fullName || r['الاسم'] || r['تلميذ'] || '') !== '')
        );
        const name = correspondingRow ? (correspondingRow.full_name || correspondingRow.fullName || correspondingRow['الاسم'] || correspondingRow['تلميذ']) : `Élève Inconnu`;
        
        const newStudent: Student = {
          id: res.studentId, // keep the same ID so result links properly
          fullName: name,
          class: res.classId,
          birthDate: '2015-01-01',
          parentName: 'Non renseigné',
          parentPhone: ''
        };
        newStudents.push(newStudent);
      }
    }
    
    // Actually add students synchronously to memory (IDB syncs later)
    if (newStudents.length > 0) {
      setStudents(prev => [...prev, ...newStudents].sort((a, b) => (a.fullName || '').localeCompare(b.fullName || '')));
    }
    
    // Helper function to process in chunks
    const chunkArray = <T,>(arr: T[], size: number): T[][] => {
      const chunks = [];
      for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
      return chunks;
    };

    const batches = chunkArray(newResults, 100);
    let allProcessedResults: AcademicResult[] = [];
    
    const processBatch = (index: number) => {
      if (index >= batches.length) {
        setAcademicResults(prev => [...allProcessedResults, ...prev]);
        toast.success(`${allProcessedResults.length} notes académiques importées avec succès`);
        return;
      }
      allProcessedResults.push(...batches[index]);
      setTimeout(() => processBatch(index + 1), 50); // allow UI repaint between chunks
    };
    
    processBatch(0);
  };

  const deleteAcademicResult = (id: string) => {
    setAcademicResults(prev => prev.filter(result => result.id !== id));
  };

  const deleteAcademicResults = (ids: string[]) => {
    if (ids.length === 0) {
      return;
    }

    const idsToDelete = new Set(ids);
    setAcademicResults(prev => prev.filter(result => !idsToDelete.has(result.id)));
    toast.success(`${ids.length} résultats académiques supprimés`);
  };

  const addEmployee = (employee: Omit<Employee, 'id'> & { id?: string }) => {
    const newEmployee = { ...employee, id: employee.id || crypto.randomUUID() } as Employee;
    setEmployees(prev => [...prev, newEmployee]);
  };

  const updateEmployee = (employee: Employee) => {
    setEmployees(prev => prev.map(e => e.id === employee.id ? employee : e));
  };

  const deleteEmployee = (id: string) => {
    setEmployees(prev => prev.filter(e => e.id !== id));
  };

  const deleteEmployees = (ids: string[]) => {
    const idsToDelete = new Set(ids);
    setEmployees(prev => prev.filter(e => !idsToDelete.has(e.id)));
  };

  const importEmployees = (data: any[]) => {
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

      // Determine correct type
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

    setEmployees(prev => [...prev, ...newEmployees].sort((a, b) => (a.fullName || '').localeCompare(b.fullName || '')));
  };

  const addExam = (exam: Omit<Exam, 'id'>) => {
    const newExam = { ...exam, id: crypto.randomUUID() };
    setExams(prev => [...prev, newExam]);
  };

  const importExams = (data: ImportExamScheduleData[]) => {
    const newExams: Exam[] = data
      .map((item) => ({
        id: crypto.randomUUID(),
        subject: item.subject || '',
        date: item.date || '',
        time: item.time || '',
        room: item.room || '',
        supervisor: item.supervisor || '',
        session: (item.session === 'S2' || item.session === 'Rattrapage' ? item.session : 'S1') as Exam['session'],
        trimester: ([1, 2, 3].includes(Number(item.trimester)) ? Number(item.trimester) : 1) as 1 | 2 | 3,
      }))
      .filter((exam) => exam.subject && exam.date && exam.time);

    if (newExams.length === 0) {
      toast.error('Aucun examen valide à importer');
      return;
    }

    setExams(prev => [...prev, ...newExams]);
    toast.success(`${newExams.length} examens importés`);
  };

  const deleteExam = (id: string) => {
    setExams(prev => prev.filter(e => e.id !== id));
  };

  const addAnnouncement = (announcement: Omit<Announcement, 'id'>) => {
    const newAnnouncement = { ...announcement, id: crypto.randomUUID() };
    setAnnouncements(prev => [newAnnouncement, ...prev]);
  };

  const deleteAnnouncement = (id: string) => {
    setAnnouncements(prev => prev.filter(a => a.id !== id));
  };

  const addNews = (newsItem: Omit<NewsItem, 'id' | 'date'>) => {
    const newItem: NewsItem = { 
      ...newsItem, 
      id: crypto.randomUUID(), 
      date: new Date().toISOString() 
    };
    setNews(prev => [newItem, ...prev]);
    toast.success('Actualité publiée avec succès');
  };

  const deleteNews = (id: string) => {
    setNews(prev => prev.filter(n => n.id !== id));
    toast.success('Actualité supprimée');
  };

  const addMessage = (message: Omit<Message, 'id' | 'timestamp' | 'read'>) => {
    const newMessage = { 
      ...message, 
      id: crypto.randomUUID(), 
      timestamp: new Date().toISOString(),
      read: false
    };
    setMessages(prev => [newMessage, ...prev]);
  };

  const markMessageRead = (id: string) => {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, read: true } : m));
  };

  const addEmailDeliveryLog = (log: Omit<EmailDeliveryLog, 'id' | 'createdAt'>) => {
    const newLog: EmailDeliveryLog = {
      ...log,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    setEmailDeliveryLogs(prev => [newLog, ...prev].slice(0, 50));
  };

  const updateSchoolBranding = (branding: Partial<Omit<SchoolBranding, 'updatedAt'>>) => {
    setSchoolBranding(prev => ({
      ...prev,
      ...branding,
      updatedAt: new Date().toISOString(),
    }));
  };

  const addCertificateRegistryEntries = (entries: Array<Omit<CertificateRegistryEntry, 'id' | 'createdAt' | 'status'>>) => {
    if (entries.length === 0) {
      return;
    }

    const newEntries = entries.map((entry) => ({
      ...entry,
      id: crypto.randomUUID(),
      status: 'active' as const,
      createdAt: new Date().toISOString(),
    } satisfies CertificateRegistryEntry));

    setCertificateRegistry(prev => [
      ...newEntries,
      ...prev,
    ].slice(0, 500));
  };

  const revokeCertificateRegistryEntry = (id: string, reason?: string) => {
    setCertificateRegistry(prev => prev.map((entry) => (
      entry.id === id
        ? {
            ...entry,
            status: 'revoked' as const,
            revokedAt: new Date().toISOString(),
            revokedReason: reason || (entry.revokedReason ?? 'Référence invalidée'),
          }
        : entry
    )));
    toast.success('Référence de certificat invalidée');
  };

  const saveScheduleCell = (classId: string, day: string, time: string, cell: ScheduleCell) => {
    setWeeklySchedule(prev => ({
      ...prev,
      [classId]: {
        ...(prev[classId] || {}),
        [day]: {
          ...(prev[classId]?.[day] || {}),
          [time]: cell,
        },
      },
    }));
  };

  const clearScheduleCell = (classId: string, day: string, time: string) => {
    setWeeklySchedule(prev => {
      const updated = { ...prev };
      if (updated[classId]?.[day]?.[time]) {
        delete updated[classId][day][time];
      }
      return updated;
    });
  };

  const replaceClassWeeklySchedule = (classId: string, classSchedule: WeeklySchedule[string]) => {
    setWeeklySchedule(prev => ({
      ...prev,
      [classId]: classSchedule,
    }));
  };

  const replaceWeeklySchedule = (schedule: WeeklySchedule) => {
    setWeeklySchedule(schedule);
  };

  const updateScheduleLock = (classId: string, day: string | null, locked: boolean) => {
    setWeeklyScheduleLocks(prev => ({
      ...prev,
      [classId]: {
        weekLocked: day === null ? locked : (prev[classId]?.weekLocked || false),
        lockedDays: day === null
          ? { ...(prev[classId]?.lockedDays || {}) }
          : {
              ...(prev[classId]?.lockedDays || {}),
              [day]: locked,
            },
      },
    }));
  };

  const addTimetableActionLog = (log: Omit<TimetableActionLog, 'id' | 'createdAt'>) => {
    const newLog: TimetableActionLog = {
      ...log,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    setTimetableActionLogs(prev => [newLog, ...prev].slice(0, 200));
  };

  const replaceWeeklyScheduleLocks = (locks: WeeklyScheduleLocks) => {
    setWeeklyScheduleLocks(locks);
  };

  const setClassTimetableImage = (classId: string, data: string) => {
    setClassTimetableImages(prev => ({
      ...prev,
      [classId]: data,
    }));
  };

  const removeClassTimetableImage = (classId: string) => {
    setClassTimetableImages(prev => {
      const updated = { ...prev };
      delete updated[classId];
      return updated;
    });
  };

  const saveStatisticsFilterPreset = (preset: Omit<StatisticsFilterPreset, 'id' | 'createdAt'>) => {
    const newPreset: StatisticsFilterPreset = {
      ...preset,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    setStatisticsFilterPresets(prev => [newPreset, ...prev]);
  };

  const deleteStatisticsFilterPreset = (id: string) => {
    setStatisticsFilterPresets(prev => prev.filter(preset => preset.id !== id));
  };

  const addEduservSyncLog = (log: Omit<EduservSyncLog, 'id' | 'timestamp'>) => {
    const newLog: EduservSyncLog = {
      ...log,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    };
    setEduservSyncLogs(prev => [newLog, ...prev].slice(0, 200));
  };

  const clearEduservSyncLogs = () => {
    setEduservSyncLogs([]);
  };

  const updateAppLanguage = (language: AppLanguage) => {
    setAppPreferences(prev => ({
      ...prev,
      language,
      updatedAt: new Date().toISOString(),
    }));
  };

  const setAuthSessionUser = (user: User | null) => {
    setAuthSessionUserState(user);
  };

  const addTimetable = (timetable: Omit<Timetable, 'id'>) => {
    const newTimetable = { ...timetable, id: crypto.randomUUID() };
    setTimetables(prev => [newTimetable, ...prev]);
  };

  const deleteTimetable = (id: string) => {
    setTimetables(prev => prev.filter(t => t.id !== id));
  };

  const addExamPlanningFile = (file: Omit<ExamPlanningFile, 'id'>) => {
    const newFile = { ...file, id: crypto.randomUUID() };
    // Replace any existing file for same level+trimester
    setExamPlanningFiles(prev => [
      ...prev.filter(f => !(f.level === file.level && f.trimester === file.trimester)),
      newFile,
    ]);
  };

  const deleteExamPlanningFile = (id: string) => {
    setExamPlanningFiles(prev => prev.filter(f => f.id !== id));
  };

  const addHomework = (homework: Omit<Homework, 'id'>) => {
    const newHomework = { ...homework, id: crypto.randomUUID() };
    setHomeworks(prev => [newHomework, ...prev]);
  };

  const deleteHomework = (id: string) => {
    setHomeworks(prev => prev.filter(h => h.id !== id));
  };

  const updateHomework = (homework: Homework) => {
    setHomeworks(prev => prev.map(h => h.id === homework.id ? homework : h));
  };

  const addPost = (postData: Omit<Post, 'id' | 'date' | 'likes' | 'likedByCurrentUser' | 'comments'>) => {
    const newPost: Post = {
      ...postData,
      id: `post-${Date.now()}`,
      date: new Date().toISOString(),
      likes: 0,
      likedByCurrentUser: false,
      comments: []
    };
    setPosts(prev => [newPost, ...prev]);
  };

  const likePost = (postId: string) => {
    setPosts(prev => prev.map(post => {
      if (post.id === postId) {
        const newLiked = !post.likedByCurrentUser;
        return {
          ...post,
          likedByCurrentUser: newLiked,
          likes: newLiked ? post.likes + 1 : Math.max(0, post.likes - 1)
        };
      }
      return post;
    }));
  };

  const addComment = (postId: string, commentData: Omit<Comment, 'id' | 'date'>) => {
    const newComment: Comment = {
      ...commentData,
      id: `comment-${Date.now()}`,
      date: new Date().toISOString()
    };
    setPosts(prev => prev.map(post => {
      if (post.id === postId) {
        return {
          ...post,
          comments: [...post.comments, newComment]
        };
      }
      return post;
    }));
  };

  const editPost = (postId: string, updatedData: Partial<Pick<Post, 'content' | 'audience' | 'images'>>) => {
    setPosts(prev => prev.map(post => {
      if (post.id === postId) {
        return {
          ...post,
          ...updatedData
        };
      }
      return post;
    }));
  };

  const deletePost = (postId: string) => {
    setPosts(prev => prev.filter(p => p.id !== postId));
  };

  const recordAttendance = (record: Omit<AttendanceRecord, 'id'>) => {
    const newRecord = { ...record, id: crypto.randomUUID() };
    setAttendance(prev => [...prev, newRecord]);
  };

  const markAttendance = (studentId: string, present: boolean) => {
    const today = new Date().toISOString().split('T')[0];
    const student = students.find(s => s.id === studentId);
    if (!student) return;

    // Remove previous for today
    setAttendance(prev => prev.filter(r => !(r.studentId === studentId && r.date.split('T')[0] === today)));

    const newRecord: AttendanceRecord = {
      id: crypto.randomUUID(),
      classId: student.class,
      date: today,
      studentId,
      present,
      recordedBy: 'teacher'
    };
    setAttendance(prev => [...prev, newRecord]);

    if (!present) {
      addAnnouncement({
        title: `Absence signalée : ${student.fullName}`,
        content: `L'élève ${student.fullName} (classe ${student.class}) a été marqué absent aujourd'hui.`,
        date: new Date().toISOString(),
        priority: 'urgent'
      });
      toast.success('Absence transmise à l\'administration');
    } else {
      toast.success('Présence enregistrée');
    }
  };

  const importFinanceArrears = (data: ImportFinanceData[]) => {
    const newArrears = data.map(item => ({
      id: crypto.randomUUID(),
      studentId: item.student_id || '',
      studentName: item.student_name || item.fullName || '',
      parentPhone: item.parent_phone || item.parentPhone || '',
      amount: parseFloat(String(item.amount ?? '0')) || 0,
      month: item.month || new Date().toLocaleString('fr-FR', { month: 'long', year: 'numeric' }),
      status: 'pending' as const,
    }));
    setFinanceArrears(prev => [...prev, ...newArrears]);
    toast.success(`Imported ${newArrears.length} arrears`);
  };

  const addFinanceArrear = (arrear: Omit<FinanceArrear, 'id'>) => {
    const newArrear = { ...arrear, id: crypto.randomUUID() };
    setFinanceArrears(prev => [...prev, newArrear]);
  };

  const updateFinanceArrear = (arrear: FinanceArrear) => {
    setFinanceArrears(prev => prev.map(a => a.id === arrear.id ? arrear : a));
  };

  const addAcademicAsset = (asset: Omit<AcademicAsset, 'id'>) => {
    setAcademicAssets(prev => [...prev, { ...asset, id: crypto.randomUUID() }]);
  };

  const removeAcademicAsset = (id: string) => {
    setAcademicAssets(prev => prev.filter(a => a.id !== id));
  };

  const sendPaymentReminder = (arrearId: string) => {
    const arrear = financeArrears.find(a => a.id === arrearId);
    setFinanceArrears(prev => prev.map(a => 
      a.id === arrearId ? { ...a, status: 'reminded' as const } : a
    ));
    
    if (arrear?.parentPhone) {
      const cleanPhone = arrear.parentPhone.replace(/\D/g, '');
      const fullPhone = cleanPhone.startsWith('0') ? '212' + cleanPhone.substring(1) : cleanPhone;
      // Open WhatsApp deep link as the "action"
      const msg = `السلام عليكم،\nنذكركم بأن المبلغ المتخلد بذمة تلميذكم *${arrear.studentName}* والمقدر بـ *${arrear.amount} درهم* لشهر ${arrear.month} لم يتم تسديده بعد.\nالرجاء دفع المعلوم الشهري المتخلد بالذمة وشكرا لتفهمكم.\n— مجمع لابروفيدانس`;
      safeOpenExternalLink(`https://wa.me/${fullPhone}?text=${encodeURIComponent(msg)}`);
    }
    toast.success('Payment reminder sent via WhatsApp');
  };

  return (
    <DataContext.Provider value={{ 
      academicAssets, addAcademicAsset, removeAcademicAsset,
      students, academicResults, employees, exams, announcements, news, messages, emailDeliveryLogs, schoolBranding, certificateRegistry, weeklySchedule, weeklyScheduleLocks, timetableActionLogs, classTimetableImages, statisticsFilterPresets, eduservSyncLogs, appPreferences, authSessionUser, timetables, examPlanningFiles, attendance, financeArrears,
      addStudent, updateStudent, deleteStudent, importStudents,
      addAcademicResult, updateAcademicResult, updateAcademicResults, importAcademicResults, deleteAcademicResult, deleteAcademicResults,
      addEmployee, updateEmployee, deleteEmployee, deleteEmployees, importEmployees,
      addExam, importExams, deleteExam,
      addAnnouncement, deleteAnnouncement,
      addNews, deleteNews,
      addMessage, markMessageRead,
      addEmailDeliveryLog,
      updateSchoolBranding,
      addCertificateRegistryEntries,
      revokeCertificateRegistryEntry,
      saveScheduleCell,
      clearScheduleCell,
      replaceClassWeeklySchedule,
      replaceWeeklySchedule,
      updateScheduleLock,
      addTimetableActionLog,
      replaceWeeklyScheduleLocks,
      setClassTimetableImage,
      removeClassTimetableImage,
      saveStatisticsFilterPreset,
      deleteStatisticsFilterPreset,
      addEduservSyncLog,
      clearEduservSyncLogs,
      updateAppLanguage,
      setAuthSessionUser,
      addTimetable,
      deleteTimetable,
      addExamPlanningFile,
      deleteExamPlanningFile,
      recordAttendance,
      markAttendance,
      importFinanceArrears,
      addFinanceArrear,
      updateFinanceArrear,
      sendPaymentReminder,
      homeworks,
      addHomework,
      updateHomework,
      deleteHomework,
      posts,
      addPost,
      likePost,
      addComment,
      editPost,
      deletePost
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
