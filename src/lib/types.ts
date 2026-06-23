export type Role = 'admin' | 'staff' | 'teacher' | 'parent';

export type ResultsPerformanceFilter = 'all' | 'excellence' | 'failing';
export type ResultsSortField = 'student' | 'class' | 'subject' | 'examLabel' | 'trimester' | 'score' | 'coefficient' | 'recordedAt';
export type ResultsSortDirection = 'asc' | 'desc';

export interface User {
  id: string;
  username: string;
  role: Role;
  name: string;
  assignedClasses?: string[]; // For teachers
  childrenIds?: string[]; // For parents
  phone?: string;
  mustChangePassword?: boolean;
}

export type SchoolLevel = '1' | '2' | '3' | '4' | '5' | '6';

export interface AcademicAsset {
  id: string;
  fileName: string;
  fileSize?: number;
  mimeType: string;
  payload: string;
  subjectKey: string;
  classId: string;
}

export interface Student {
  id: string;
  fullName: string;
  class: string;
  birthDate: string;
  parentName?: string;   // optional — may be absent in imports from ministry portal
  parentPhone?: string;  // optional — same reason
  notes?: string;
}

export interface AcademicResult {
  id: string;
  studentId: string;
  classId: string;
  level: SchoolLevel;
  subject: string;
  examLabel: string;
  trimester: 1 | 2 | 3 | 4;
  score: number;
  coefficient?: number;
  recordedAt: string;
}

export interface Employee {
  id: string;
  fullName: string;
  role: string;
  type: 'Teacher' | 'Administration' | 'Security' | 'Other';
  phone: string;
  photo?: string;
}

export interface Exam {
  id: string;
  subject: string;
  date: string;
  time: string;
  room: string;
  supervisor: string;
  session: 'S1' | 'S2' | 'Rattrapage';
  trimester?: 1 | 2 | 3;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  date: string;
  priority: 'urgent' | 'normal' | 'info';
  authorRole?: Role;
}

export interface NewsItem {
  id: string;
  title: string;
  description: string;
  category: 'urgent' | 'event' | 'announcement';
  date: string;
  mediaUrl?: string;
  mediaData?: string; // base64 persistence
  mediaType?: 'video' | 'link';
}

export interface Message {
  id: string;
  name: string;
  subject: string;
  message: string;
  timestamp: string;
  read: boolean;
}

export interface ParentUser {
  id: string;
  fullName: string;
  phone: string;
  passwordHash: string;
  mustChangePassword: boolean;
  childrenIds: string[];
}

export interface ScheduleCell {
  subject?: string;
  teacher?: string;
  room?: string;
  colorIdx: number;
  startTime: string;
  endTime: string;
}

export type WeeklySchedule = Record<string, Record<string, Record<string, ScheduleCell>>>;
export type ClassTimetableImages = Record<string, string>;

export interface StatisticsTableColumnSearchState {
  student: string;
  classId: string;
  subject: string;
  examLabel: string;
  trimester: string;
  score: string;
  coefficient: string;
  recordedAt: string;
}

export interface StatisticsFilterPreset {
  id: string;
  name: string;
  createdAt: string;
  filters: {
    selectedTrimester: string;
    selectedClass: string;
    scoreMinFilter: string;
    scoreMaxFilter: string;
    performanceFilter: ResultsPerformanceFilter;
    resultsPageSize: number;
    resultsSortField: ResultsSortField;
    resultsSortDirection: ResultsSortDirection;
    tableColumnSearches: StatisticsTableColumnSearchState;
    selectedSubject: string;
    selectedSubjectStudent: string;
    trendMode: 'class' | 'student';
    selectedTrendClass: string;
    selectedTrendStudent: string;
  };
}

export interface EduservSyncLog {
  id: string;
  timestamp: string;
  level: 'info' | 'success' | 'warning' | 'error';
  message: string;
}

export type AppLanguage = 'fr' | 'ar' | 'en';

export interface AppPreferences {
  language: AppLanguage;
  updatedAt: string;
}

export interface ClassScheduleLock {
  weekLocked: boolean;
  lockedDays: Record<string, boolean>;
}

export type WeeklyScheduleLocks = Record<string, ClassScheduleLock>;

export interface TimetableActionLog {
  id: string;
  classId: string;
  actionType:
    | 'cell_saved'
    | 'cell_deleted'
    | 'cell_moved'
    | 'cell_resized'
    | 'cell_pasted'
    | 'day_copied'
    | 'day_pasted'
    | 'week_copied'
    | 'week_pasted'
    | 'batch_copied'
    | 'batch_moved'
    | 'week_locked'
    | 'week_unlocked'
    | 'day_locked'
    | 'day_unlocked'
    | 'xlsx_import'
    | 'xlsx_export'
    | 'csv_export'
    | 'pdf_export';
  day?: string;
  time?: string;
  targetClassIds?: string[];
  description: string;
  createdAt: string;
}

export interface Timetable {
  id: string;
  classId: string;      // e.g. '1A' or level '4' (applies to 4A-4E)
  level?: string;       // '1'|'2'|'3'|'4'|'5'|'6' — bulk-level assignment
  fileName: string;
  fileType: string;
  fileData?: string;    // base64 data URL stored in localStorage
  uploadDate: string;
  url: string;
  trimester: 1 | 2 | 3;
  type: 'schedule' | 'exam';
}

// Exam planning file per (level, trimester)
export interface ExamPlanningFile {
  id: string;
  level: string;        // '1'–'6'
  trimester: 1 | 2 | 3;
  fileName: string;
  fileData: string;     // base64 data URL
  uploadDate: string;
}

export interface AttendanceRecord {
  id: string;
  classId: string;
  date: string;
  studentId: string;
  present: boolean;
  recordedBy: string;
}

export interface FinanceArrear {
  id: string;
  studentId: string;
  studentName: string;
  parentPhone: string;
  amount: number;
  month: string;
  status: 'pending' | 'paid' | 'reminded';
}

export interface Homework {
  id: string;
  title: string;
  description: string;
  classes: string[];
  subject: string;
  session: string;
  fileName?: string;
  fileData?: string; // base64 persistence
  uploadDate: string;
}

export interface Comment {
  id: string;
  author: string;
  role: string;
  text: string;
  date: string;
}

export interface Post {
  id: string;
  author: string;
  role: string;
  date: string;
  content: string;
  audience: string;
  images: string[];
  likes: number;
  likedByCurrentUser: boolean;
  comments: Comment[];
}

export interface EmailDeliveryLog {
  id: string;
  recipientEmail: string;
  subject: string;
  provider: 'smtp' | 'emailjs' | 'manual';
  status: 'success' | 'failed';
  attachmentCount: number;
  attachmentNames: string[];
  scopeLabel?: string;
  errorMessage?: string;
  createdAt: string;
}

export interface SchoolBranding {
  schoolNameFr: string;
  schoolNameAr: string;
  logoDataUrl?: string;
  stampDataUrl?: string;
  updatedAt: string;
}

export interface CertificateRegistryEntry {
  id: string;
  reference: string;
  studentId: string;
  studentName: string;
  classId: string;
  trimesterFilter: string;
  classFilter: string;
  scopeLabel: string;
  averageScore: number;
  evaluationsCount: number;
  fileName: string;
  action: 'preview' | 'download' | 'email' | 'zip_export' | 'bulk_download';
  status: 'active' | 'revoked';
  revokedAt?: string;
  revokedReason?: string;
  createdAt: string;
}

// For Excel/CSV import data (loose structure from ministry portal)
export interface ImportStudentData {
  full_name?: string;
  fullName?: string;
  class?: string;
  birth_date?: string;
  birthDate?: string;
  parent_name?: string;
  parentName?: string;
  parent_phone?: string;
  parentPhone?: string;
  notes?: string;
}

export interface ImportFinanceData {
  student_id?: string;
  student_name?: string;
  fullName?: string;
  parent_phone?: string;
  parentPhone?: string;
  amount?: number | string;
  month?: string;
}

export interface ImportAcademicResultData {
  student_id?: string;
  studentId?: string;
  full_name?: string;
  fullName?: string;
  class?: string;
  classId?: string;
  subject?: string;
  exam_label?: string;
  examLabel?: string;
  trimester?: number | string;
  score?: number | string;
  coefficient?: number | string;
  recorded_at?: string;
  recordedAt?: string;
}

export interface ImportExamScheduleData {
  subject?: string;
  date?: string;
  time?: string;
  room?: string;
  supervisor?: string;
  session?: 'S1' | 'S2' | 'Rattrapage' | string;
  trimester?: number | string;
}

// For form data and other loose objects
export interface StudentFormData {
  fullName: string;
  class: string;
  birthDate: string;
  parentName: string;
  parentPhone: string;
  notes?: string;
}

export interface ExamFormData {
  subject: string;
  date: string;
  time: string;
  room: string;
  supervisor: string;
  session: 'S1' | 'S2' | 'Rattrapage';
  trimester: 1 | 2 | 3;
}