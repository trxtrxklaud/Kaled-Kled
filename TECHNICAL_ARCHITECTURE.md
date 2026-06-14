# Technical Architecture Document

## 1. System overview
Providence is a client-heavy school administration platform built with:
- **React 19**
- **TypeScript**
- **Vite**
- **Tailwind CSS**
- **Framer Motion**
- **Recharts**
- **SheetJS (`xlsx`)**
- **PDF.js (`pdfjs-dist`)**
- **jsPDF / jspdf-autotable**
- **JSZip**
- **EmailJS / SMTP backend bridge**

The application currently uses a **single centralized application store** implemented through `DataContext`, with **LocalStorage as the client-side persistence layer**.

---

## 2. High-level architecture

### 2.1 Presentation layer
Located mainly in `src/pages/*` and `src/components/*`.

Primary page modules:
- `Dashboard.tsx`
- `Students.tsx`
- `Employees.tsx`
- `Parents.tsx`
- `Schedules.tsx`
- `Homework.tsx`
- `NewsFeed.tsx`
- `EduservIntegration.tsx`
- `Communication.tsx`
- `Statistics.tsx`
- `Certificates.tsx`
- `CertificateRegistry.tsx`
- `SchoolHeaderConfig.tsx`
- `Finance.tsx`

### 2.2 Application state layer
Implemented in:
- `src/contexts/DataContext.tsx`
- `src/contexts/AuthContext.tsx`
- `src/contexts/LanguageContext.tsx`

Responsibilities:
- durable business data state
- persistence to LocalStorage
- auth session state
- application preferences (language)
- operational logs

### 2.3 Domain services / utility layer
Implemented in:
- `src/lib/academicAnalytics.ts`
- `src/lib/importEngine.ts`
- `src/lib/emailDelivery.ts`
- `src/lib/pdfReports.ts`
- `src/lib/certificateArchive.ts`
- `src/lib/xlsx.ts`
- `src/lib/utils.ts`

Responsibilities:
- analytics computation
- PDF/XLSX import parsing
- email transport
- report generation
- ZIP bundling

### 2.4 Persistence layer
Temporary database:
- **browser LocalStorage**

Persistence strategy:
- the global `DataContext` initializes state from LocalStorage on startup
- every relevant state slice is written back via `useEffect`
- refresh-safe behavior is guaranteed for domain state and selected UI preferences

---

## 3. Runtime data flow

### 3.1 Boot sequence
1. `main.tsx` mounts `DataProvider`
2. `DataProvider` rehydrates persisted state from LocalStorage
3. `LanguageProvider` consumes `appPreferences.language`
4. `AuthProvider` consumes `authSessionUser`
5. `App.tsx` resolves routing through `PrivateRoute`

### 3.2 Mutation flow
Example: add academic result
1. user fills form in `Statistics.tsx`
2. page calls `addAcademicResult(...)`
3. `DataContext` normalizes and validates payload
4. in-memory global state updates
5. LocalStorage persistence effect runs
6. derived analytics recompute via `useMemo`
7. charts / counters / tables re-render

### 3.3 Import flow
#### XLSX
1. user selects file
2. `FileReader` / `arrayBuffer()` reads binary content
3. `xlsx.read(...)` parses workbook
4. rows map into typed import DTOs
5. DTOs pass into context import functions
6. store updates and persists
7. UI rehydrates live

#### PDF
1. file buffer passed into `pdfjs-dist`
2. raw page text extracted in `importEngine.ts`
3. RegExp mapping converts raw text into typed DTOs
4. DTOs imported into global state
5. analytics / schedules update instantly

---

## 4. Major functional subsystems

### 4.1 Academic analytics
Core file:
- `src/lib/academicAnalytics.ts`

Provides:
- student average aggregation
- level success rate
- excellence rate
- per-level leaderboard
- chart-ready data structures

Used by:
- `Statistics.tsx`

### 4.2 Timetable engine
Core page:
- `src/pages/Schedules.tsx`

Capabilities:
- interactive weekly schedule grid
- manual subject override
- manual time override
- drag move
- drag resize
- copy/paste cell/day/week
- undo/redo
- class-to-class copy/move
- teacher conflict detection
- room conflict detection
- day/week locks
- visual action history
- timetable imports/exports

### 4.3 Certificates subsystem
Core files:
- `src/pages/Certificates.tsx`
- `src/pages/CertificateRegistry.tsx`
- `src/pages/SchoolHeaderConfig.tsx`
- `src/lib/pdfReports.ts`
- `src/lib/certificateArchive.ts`

Capabilities:
- bilingual certificate generation (FR/AR)
- embedded Arabic font support
- certificate references
- preview-before-download
- one PDF per student
- ZIP archive export
- registry tracking
- revoke / invalidate certificate references
- manager email dispatch
- branding/logo/stamp injection

### 4.4 Eduserv integration workflow
Core page:
- `src/pages/EduservIntegration.tsx`

Capabilities:
- backend sync endpoint invocation
- import of remote students / grades / exams
- persistent sync logs
- official CSV exports

### 4.5 Reporting + email delivery
Core files:
- `src/lib/emailDelivery.ts`
- `src/lib/pdfReports.ts`

Capabilities:
- SMTP/API delivery if configured
- EmailJS fallback if configured
- attachment packaging
- persistent success/failure logs

---

## 5. Security and trust boundaries

### 5.1 Current state
This is still a **front-end-first architecture** with client-side persistence.
It is suitable for preview, prototyping, and controlled admin-only environments.

### 5.2 Sensitive boundaries
Sensitive operations controlled by environment configuration:
- auth credentials
- SMTP endpoint and API key
- EmailJS service/template/public key
- Eduserv backend endpoint and credentials

### 5.3 Recommended production evolution
For a true production backend architecture:
- move authentication server-side
- move LocalStorage persistence to API/database persistence
- issue signed auth tokens
- add RBAC enforcement on the backend
- move report/email dispatch to trusted server jobs

---

## 6. Routing structure
Main routes:
- `/`
- `/students`
- `/employees`
- `/parents`
- `/schedules`
- `/homework`
- `/newsfeed`
- `/eduserv`
- `/communication`
- `/statistics`
- `/certificates`
- `/certificate-registry`
- `/school-header`
- `/finance`

Protected via `PrivateRoute`.

---

## 7. Operational logs now present
Persisted logs include:
- email delivery logs
- Eduserv sync logs
- timetable action logs
- certificate registry entries

These enable audit-style visibility even in the LocalStorage architecture.

---

## 8. Build and quality gate
Primary quality gate:
- `npm run build`

A release is considered acceptable only if:
- TypeScript compiles with 0 errors
- Vite build succeeds
- no simulated critical workflow remains in active features

---

## 9. Current architecture status
The system now behaves as a **state-synchronized, persistence-backed SPA** with:
- centralized business state
- durable client persistence
- real import/export/reporting logic
- real transport integration hooks for backend/email services

It is production-structured, while still using LocalStorage as its temporary database layer.