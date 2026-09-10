# API Contract — App ↔ Laravel (Phase 1, pinned)

Base: `PROVIDENCE_API_BASE` (verified `https://laprovidencemfondationmnrh.cloud/api`).
Auth: Sanctum Bearer (`Authorization: Bearer <token>`), except OTP request (public, throttled).
Envelope: `{success: true, data: ...}` — paginated lists use Laravel paginator
(`data: {data: [...], current_page, last_page}`).

## 1. Authentication (verified in code)

| Call | Fields | Returns |
|---|---|---|
| `POST /api/login` | staff credentials | Sanctum token (employees) |
| `POST /api/auth/gmail-login` | identifier (`email\|username\|pseudo\|identifier`) + secret (`phone\|phone_password\|password`) | `{access_token, token_type: "Bearer", user}` · `throttle:10,1` |
| `POST /api/auth/login-by-phone` | `phone` (+ `otp_code`) | unified phone login · `throttle:10,1` |
| `POST /api/mobile/parent/request-otp` | `phone` (must belong to a student) | OTP issued (mail) · `throttle:6,1` |
| `POST /api/mobile/parent/verify-otp` | `phone` + `code` | parent user (find-or-create) + token |
| `POST /api/auth/parent/request-code` + `verify-code` | `phone`, `email` + code | parent registration + `parent-pwa` token |

## 2. Parent scope (`mobile_role:parent` + `view_own_children`)

Children = students whose `guardian_phone`/`mother_phone` match `users.phone` (last 8 digits),
enforced server-side (`MobileScopeService` + `authorizeChild` → 403). Never trust client ids.

| Call | Purpose |
|---|---|
| `GET /api/mobile/parent/children` | own children list |
| `GET /api/mobile/parent/children/{student}` | child detail |
| `GET /api/mobile/parent/children/{student}/{ledger,receipts,attendance,grades,timetable,exams,clubs}` | per-child data |
| `GET /api/mobile/parent/{announcements,notifications}` | school announcements |

## 3. Teacher scope (`mobile_role:teacher` + granular perms)

Sections = `section_teacher` rows for the teacher's `employees` record (`user_id` link).

| Call | Guard |
|---|---|
| `GET /api/mobile/teacher/sections`, `.../{section}/students` | `view_own_sections` |
| `GET/POST .../{section}/attendance` | `manage_attendance` |
| `GET/POST .../{section}/{results,grades}` | `manage_grades` |
| `POST .../{section}/announcements` | `manage_announcements` |

## 4. Admin reads (service token — also exposed via Node `/api/providence/*`)

`GET /api/mobile/admin/{stats,levels,sections,sections/{id}/timetable,students,students/{id}[/ledger|attendance|grades],teachers[/{id}],families,attendance,grades,ledgers,clubs,notifications,timetable}`
+ `GET /api/students/{id}/{balance,fees,payments}` + `GET /api/reports/unpaid-monthly[/options]`
(`academic_year_id?`, `month=YYYY-MM` must belong to the year, `section_id` required).
Students/ledgers paginate (`page`, `per_page` 10–100). NOTE: this group has no granular
permission middleware on the platform — service token must belong to an admin user,
and the group should be restricted platform-side (flagged, not changed here).

## 5. Gaps (no endpoint — NEW platform work, not started)

`homework` (none), real per-class timetables (only a static national grid),
per-user notifications (only broadcast `announcements`), push delivery (only an
unused `device_tokens` table; reminders go via SMS/Twilio), family entity
(`guardians` M2M exists but scope uses phone matching), file storage
(Firebase Storage today; Laravel Storage proposed).

## 6. App-side mapping (Phase 3+)

`studentStore` ← 4/students+ledger · `financeStore` ← 4/ledgers+unpaid (proxy done) ·
`employeeStore` ← 4/teachers · `communicationStore` ← announcements ·
`academicStore` ← results/attendance (teacher scope) · `notificationStore` ← 2/notifications ·
profile/family ← 2/children. `homework`/timetables/files stay in Firebase until §5 is built.
