# Phase 1 — Read-only proxy to Providence + QA report

## 1. Scope

- `src/api/providence.ts`: Express router, **GET-only whitelist**, mounted at `/api/providence` in `server.ts`.
- Sanctum token lives **only** in server env (`PROVIDENCE_API_TOKEN`). The browser never sees it (verified §5).
- No writes to the platform from this app: POST/PUT/DELETE/PATCH → `405 READ_ONLY` locally.
- Pages: opt-in sync buttons in `/students` (`syncStudentsFromPlatform`) and `/finance`
  (`syncArrearsFromPlatform`). Manual CSV import stays as fallback.

## 2. Environment

Node/PWA server (`.env.local`, git-ignored — see `.env.example`):

```env
PROVIDENCE_API_BASE=https://laprovidencemfondationmnrh.cloud/api
PROVIDENCE_API_TOKEN=<sanctum token of a dedicated read-only service user>
PROVIDENCE_TIMEOUT_MS=20000
```

Laravel platform `.env` (2 lines only, applied by the server admin):

```env
CORS_ALLOWED_ORIGINS=<existing>,https://<pwa-domain>
SANCTUM_STATEFUL_DOMAINS=<existing>,<pwa-domain>
```

Service token needs `manage_students` + `view_reports` (minimum for the proxied reads).

## 3. Proxied endpoints (all GET)

| Proxy route | Platform route | Notes |
|---|---|---|
| `/status` | — (local) | `{configured, host}` — works without token, leaks nothing |
| `/levels` | `/mobile/admin/levels` | passthrough |
| `/sections?level_id=` | `/mobile/admin/sections` | passthrough |
| `/sections/:id/timetable` | `/mobile/admin/sections/:id/timetable` | `:id` digits only |
| `/students?search=&section_id=` | `/mobile/admin/students` | auto-loops all pages (`per_page=100`) |
| `/students/:id`, `/students/:id/ledger` | `/mobile/admin/students/:id[/ledger]` | `:id` digits only |
| `/platform/students/:id/:kind` | `/students/:id/{balance,fees,payments}` | `:kind` whitelisted |
| `/teachers?search=` | `/mobile/admin/teachers` | passthrough |
| `/families` | `/mobile/admin/families` | passthrough |
| `/stats` | `/mobile/admin/stats` | passthrough |
| `/ledgers?section_id=&status=` | `/mobile/admin/ledgers` | auto-loops all pages |
| `/unpaid/options?academic_year_id=` | `/reports/unpaid-monthly/options` | passthrough |
| `/unpaid?academic_year_id=&month=&section_id=` | `/reports/unpaid-monthly` | all 3 required (`month` = `YYYY-MM`, must belong to the year) |

Unknown path → 404, non-GET → 405, missing token → 503 `PROVIDENCE_NOT_CONFIGURED`,
unreachable platform → 502 `PROVIDENCE_UNREACHABLE`. Query keys outside the per-route
allowlist are dropped before forwarding; `:id` params must be digits.

## 4. Sync logic (`src/lib/providenceSync.ts` + `providenceMappers.ts`)

- **Students:** `/sections` → id→label map (`"level section"`) → `/students` (all pages) →
  `importStudents` in chunks of 400 (Firestore batch limit is 500). Adds new only, never deletes.
- **Arrears:** `/students` (phone/name map by `student_code`) + `/ledgers?status=pending|partial` →
  `outstanding = amount_due − direct_paid` (skips `paid`/zero) → chunked `writeBatch` with
  stable IDs `prov-<sid>-<YYYY-MM>` (re-sync updates, never duplicates) + local store merge.
- Arabic month labels (`سبتمبر 2026`…) derived from `due_date`; falls back to description.
- Without Firebase write access the sync throws and the UI tells the user to use CSV import.
- Out of scope: manual old debts have no mobile endpoint (covered by CSV import).

## 5. QA results (executed 2026-09-10, `node dist/server.cjs`)

- **Mappers:** 16/16 unit tests pass (`check_mappers.ts`, synthetic fixtures).
- **ESLint:** clean on all 7 touched files. **Build:** `vite build` OK.
- **Matrix A — no token (24 cases):** 20× `503 PROVEN...NOT_CONFIGURED`, `404` unknown,
  3× `405 READ_ONLY`, `/status` 200 `configured:false`. No token anywhere.
- **Matrix B — dummy token (24 cases):** 16× `401 {"message":"Unauthenticated."}` passthrough
  from the live platform (proves reachability + Bearer forwarding + platform auth chain),
  3× local `400` (bad id/kind/missing params), `404`, 3× `405`, `/status` 200 `configured:true`.
- **Leak scans:** dummy value absent from all 48 response bodies and from `dist/server.cjs`.

## 6. Manual checklist (browser, needs real token + Firebase)

- [ ] Open `/students` → مزامنة المنصة → new students appear, no duplicates on 2nd run
- [ ] Open `/finance` → sync button → arrears count/total match `/ledgers` on platform
- [ ] With token removed → sync buttons show the "not configured" error, CSV import still works
- [ ] Install PWA on Android + iPhone, open `/finance` offline (shell loads, data from device)

## 7. Known issues (not fixed here)

- `/api/mobile/admin/*` on the platform enforces `auth:sanctum + active` only, without granular
  permission middleware — restrict before issuing the service token (platform-side decision).
- `Finance.tsx` summary cards display `DH`; Tunisia uses TND/د.
