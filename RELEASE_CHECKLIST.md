# Providence — Final Release Checklist

## Core architecture
- [x] Global centralized store via `DataContext`
- [x] Persistent LocalStorage-backed data model
- [x] Auth session centralized in global store
- [x] Language preference centralized in global store
- [x] School branding centralized in global store
- [x] Timetable images centralized in global store
- [x] Statistics presets centralized in global store
- [x] Eduserv sync logs centralized in global store

## Data domains persisted
- [x] Students
- [x] Academic results
- [x] Employees
- [x] Exams
- [x] Announcements
- [x] News
- [x] Messages
- [x] Finance arrears
- [x] Attendance
- [x] Homework
- [x] Posts / comments
- [x] Weekly schedules
- [x] Weekly locks
- [x] Timetable action history
- [x] Certificates registry
- [x] Email delivery logs
- [x] School branding

## Import / extraction engines
- [x] XLSX import with SheetJS (`xlsx`)
- [x] PDF text extraction with `pdfjs-dist`
- [x] Academic results import from XLSX
- [x] Academic results import from PDF text parsing
- [x] Exam schedules import from XLSX
- [x] Exam schedules import from PDF text parsing

## Analytics & dashboards
- [x] Live academic analytics re-render
- [x] Filtered charts & counters
- [x] Level analytics
- [x] Subject analytics
- [x] Leaderboards
- [x] Export XLSX / PDF reports

## Timetable / schedules
- [x] Manual start/end time override
- [x] Manual subject override priority
- [x] Drag move schedule cells
- [x] Drag resize schedule cells
- [x] Snap preview with highlighted drop targets
- [x] Teacher conflict detection
- [x] Room conflict detection
- [x] Weekly conflict summary panel
- [x] Teacher weekly availability view
- [x] Copy/paste single cell
- [x] Copy/paste whole day
- [x] Copy/paste whole week
- [x] Undo / redo history
- [x] Batch copy/move between classes
- [x] Lock/unlock day
- [x] Lock/unlock week
- [x] Visual lock state on locked cells
- [x] EXAM LOCK behavior on exam cells
- [x] Timetable action history with date/type filtering
- [x] Export timetable XLSX
- [x] Export timetable CSV
- [x] Export class PDF timetable
- [x] Export level PDF timetable
- [x] Export level XLSX timetable
- [x] Export multi-class PDF / ZIP batch

## Certificates & registry
- [x] Dedicated Certificates page
- [x] Dedicated Certificate Registry page
- [x] Dedicated School Header Configuration page
- [x] One PDF per student certificate
- [x] ZIP export of all generated certificates
- [x] Preview-before-download certificates
- [x] Bilingual FR/AR certificate template
- [x] Arabic font embedding
- [x] Official certificate references
- [x] Registry export XLSX / PDF
- [x] Registry date-range filters
- [x] Registry revoke / invalidate flow
- [x] Bulk re-send selected certificates

## Email delivery
- [x] SMTP/backend sending support
- [x] EmailJS sending support
- [x] Attachment packaging for XLSX / PDF / ZIP
- [x] Persistent delivery logs
- [x] Director email workflow

## Branding / documents
- [x] School logo upload
- [x] Real stamp upload
- [x] Bilingual school header
- [x] Official signature/stamp area
- [x] Letterhead applied across generated PDFs

## Login / preferences
- [x] Demo credentials removed from login UI text
- [x] Language persisted via global store
- [x] Auth session persisted via global store

## Validation
- [x] `npm install xlsx pdfjs-dist` completed
- [x] `npm run build` passes
- [x] 0 TypeScript / compilation errors
