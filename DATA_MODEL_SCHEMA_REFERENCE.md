# Data Model / Schema Reference

This document describes the main application data schemas and all persisted LocalStorage keys.

---

## 1. Central store source
Primary store:
- `src/contexts/DataContext.tsx`

Type definitions:
- `src/lib/types.ts`

---

## 2. Core TypeScript domain models

### User
```ts
interface User {
  id: string;
  username: string;
  role: 'admin' | 'staff' | 'teacher';
  name: string;
  assignedClasses?: string[];
}
```

### Student
```ts
interface Student {
  id: string;
  fullName: string;
  class: string;
  birthDate: string;
  parentName: string;
  parentPhone: string;
  notes?: string;
}
```

### AcademicResult
```ts
interface AcademicResult {
  id: string;
  studentId: string;
  classId: string;
  level: '1' | '2' | '3' | '4' | '5' | '6';
  subject: string;
  examLabel: string;
  trimester: 1 | 2 | 3;
  score: number;
  coefficient?: number;
  recordedAt: string;
}
```

### Employee
```ts
interface Employee {
  id: string;
  fullName: string;
  role: string;
  type: 'Teacher' | 'Administration' | 'Security' | 'Other';
  phone: string;
  photo?: string;
}
```

### Exam
```ts
interface Exam {
  id: string;
  subject: string;
  date: string;
  time: string;
  room: string;
  supervisor: string;
  session: 'S1' | 'S2' | 'Rattrapage';
  trimester?: 1 | 2 | 3;
}
```

### Announcement
```ts
interface Announcement {
  id: string;
  title: string;
  content: string;
  date: string;
  priority: 'urgent' | 'normal' | 'info';
  authorRole?: Role;
}
```

### NewsItem
```ts
interface NewsItem {
  id: string;
  title: string;
  description: string;
  category: 'urgent' | 'event' | 'announcement';
  date: string;
  mediaUrl?: string;
  mediaType?: 'video' | 'link';
}
```

### Message
```ts
interface Message {
  id: string;
  name: string;
  subject: string;
  message: string;
  timestamp: string;
  read: boolean;
}
```

### ScheduleCell
```ts
interface ScheduleCell {
  subject: string;
  teacher?: string;
  room?: string;
  colorIdx: number;
  startTime: string;
  endTime: string;
}
```

### WeeklySchedule
```ts
type WeeklySchedule = Record<string, Record<string, Record<string, ScheduleCell>>>;
```
Meaning:
- classId → dayKey → anchorTime → cell

### ClassScheduleLock
```ts
interface ClassScheduleLock {
  weekLocked: boolean;
  lockedDays: Record<string, boolean>;
}
```

### WeeklyScheduleLocks
```ts
type WeeklyScheduleLocks = Record<string, ClassScheduleLock>;
```

### TimetableActionLog
```ts
interface TimetableActionLog {
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
```

### Timetable
```ts
interface Timetable {
  id: string;
  classId: string;
  level?: string;
  fileName: string;
  fileType: string;
  fileData?: string;
  uploadDate: string;
  url: string;
  trimester: 1 | 2 | 3;
  type: 'schedule' | 'exam';
}
```

### ExamPlanningFile
```ts
interface ExamPlanningFile {
  id: string;
  level: string;
  trimester: 1 | 2 | 3;
  fileName: string;
  fileData: string;
  uploadDate: string;
}
```

### AttendanceRecord
```ts
interface AttendanceRecord {
  id: string;
  classId: string;
  date: string;
  studentId: string;
  present: boolean;
  recordedBy: string;
}
```

### FinanceArrear
```ts
interface FinanceArrear {
  id: string;
  studentId: string;
  studentName: string;
  parentPhone: string;
  amount: number;
  month: string;
  status: 'pending' | 'paid' | 'reminded';
}
```

### Homework
```ts
interface Homework {
  id: string;
  title: string;
  description: string;
  classes: string[];
  subject: string;
  session: string;
  fileName?: string;
  uploadDate: string;
}
```

### Post / Comment
```ts
interface Comment {
  id: string;
  author: string;
  role: string;
  text: string;
  date: string;
}

interface Post {
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
```

### EmailDeliveryLog
```ts
interface EmailDeliveryLog {
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
```

### SchoolBranding
```ts
interface SchoolBranding {
  schoolNameFr: string;
  schoolNameAr: string;
  logoDataUrl?: string;
  stampDataUrl?: string;
  updatedAt: string;
}
```

### CertificateRegistryEntry
```ts
interface CertificateRegistryEntry {
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
```

### StatisticsFilterPreset
```ts
interface StatisticsFilterPreset {
  id: string;
  name: string;
  createdAt: string;
  filters: {
    selectedTrimester: string;
    selectedClass: string;
    scoreMinFilter: string;
    scoreMaxFilter: string;
    performanceFilter: 'all' | 'excellence' | 'failing';
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
```

### ClassTimetableImages
```ts
type ClassTimetableImages = Record<string, string>;
```
Meaning:
- classId → base64 data URL

### EduservSyncLog
```ts
interface EduservSyncLog {
  id: string;
  timestamp: string;
  level: 'info' | 'success' | 'warning' | 'error';
  message: string;
}
```

### AppPreferences
```ts
interface AppPreferences {
  language: 'fr' | 'ar' | 'en';
  updatedAt: string;
}
```

---

## 3. Import DTOs

### ImportStudentData
Flexible student import mapping.

### ImportAcademicResultData
Used by XLSX/PDF grade import.
Supported fields include:
- `student_id`
- `full_name`
- `class`
- `subject`
- `exam_label`
- `trimester`
- `score`
- `coefficient`
- `recorded_at`

### ImportExamScheduleData
Used by XLSX/PDF exam schedule import.
Supported fields include:
- `subject`
- `date`
- `time`
- `room`
- `supervisor`
- `session`
- `trimester`

---

## 4. LocalStorage persistence keys

### Core data keys
- `providence_students`
- `providence_academic_results`
- `providence_employees`
- `providence_exams`
- `providence_announcements`
- `providence_news`
- `providence_messages`
- `providence_attendance`
- `providence_finance`
- `providence_homeworks`
- `providence_posts`

### Document / reporting keys
- `providence_email_delivery_logs`
- `providence_school_branding`
- `providence_certificate_registry`

### Schedule / planning keys
- `providence_weekly_schedule`
- `providence_weekly_schedule_locks`
- `providence_timetable_action_logs`
- `providence_class_timetable_images`
- `providence_timetables`
- `providence_exam_planning`

### Preferences / operational keys
- `providence_statistics_filter_presets`
- `providence_eduserv_sync_logs`
- `providence_app_preferences`
- `providence_auth_session_user`

---

## 5. Derived / computed models (not primary persistence)
These are built on-demand from the primary state:
- academic analytics snapshots
- level metrics
- success chart datasets
- excellence chart datasets
- subject metrics
- teacher availability summaries
- timetable conflict summaries

These are **computed**, not persisted as separate storage keys.

---

## 6. Schema relationships
- `AcademicResult.studentId` → `Student.id`
- `AttendanceRecord.studentId` → `Student.id`
- `FinanceArrear.studentId` → `Student.id`
- `CertificateRegistryEntry.studentId` → `Student.id`
- `WeeklySchedule[classId]` aligns with `Student.class`

---

## 7. Persistence model notes
- LocalStorage acts as the temporary client-side database
- each global slice is rehydrated at boot
- each mutation writes through the global store and persists automatically
- no component-level isolated durable state should be used for business-critical data

---

## 8. Recommended future server-side mapping
When migrating from LocalStorage to a real backend, these domains map naturally to tables/collections:
- users
- students
- academic_results
- employees
- exams
- announcements
- messages
- attendance
- finance_arrears
- homework
- posts
- certificates_registry
- email_delivery_logs
- school_branding
- weekly_schedule
- weekly_schedule_locks
- timetable_action_logs
- sync_logs