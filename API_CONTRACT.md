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

## 1b. Node session bridge (this server — no browser tokens)

| Call | Forwards to | Returns |
|---|---|---|
| `POST /api/auth/login` `{identifier, password}` | `POST {BASE}/auth/gmail-login` | httpOnly session cookie + `{success, user}` |
| `POST /api/auth/login/parent/request-otp` `{phone}` | platform `request-otp` | platform message passthrough |
| `POST /api/auth/login/parent/verify-otp` `{phone, code}` | platform `verify-otp` | httpOnly session cookie + `{success, user(role:parent)}` |
| `POST /api/auth/logout` | — (local) | clears cookie |

NOTE: `dev_code` (manual channel) is stripped by the bridge and never sent to the
browser — its presence would oracle registered phones. The cashier hands the code over
in person; the browser only receives the uniform message.
| `GET /api/auth/me` | — (cookie JWT) | `{success, user}` or 401 |

## 1c. User-scoped session bridge (this server — per-user platform token)

Login mints an httpOnly cookie JWT carrying `sid`; the platform access_token stays in a
server-side session map (12h TTL, fork×1, restart drops sessions → re-login).
`GET /api/me/*` forwards with the USER's token (45s per-session cache).
No cookie / bad signature → 401; unknown/expired sid → 401 `SESSION_EXPIRED`;
platform 401 → 401 `PLATFORM_SESSION_EXPIRED`; non-GET → 405.

| Call | Forwards to |
|---|---|
| `GET /api/me/children`, `/children/:id`, `/children/:id/{ledger,receipts,attendance,grades,timetable,exams,clubs}` | `/api/mobile/parent/...` (platform enforces `authorizeChild` → 403) |
| `GET /api/me/{announcements,notifications}` | `/api/mobile/parent/...` |
| `GET /api/me/teacher/sections`, `/teacher/sections/:id/{students,attendance,results,grades}` | `/api/mobile/teacher/...` (platform enforces section scope) |

Teacher writes (academic only — JSON body forwarded as-is, never cached):
`POST /api/me/teacher/sections/:id/{attendance,results,grades}` matching the platform
shapes (`{date?, entries:[{enrollment_id, status|score, ...}]}`). Any other non-GET → 405.

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
