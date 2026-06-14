# Deployment & Environment Setup Guide

This guide explains how to configure Providence for production-style deployments, especially for:
- SMTP delivery
- EmailJS delivery
- Eduserv backend synchronization

---

## 1. Required prerequisites
- Node.js 20+
- npm 10+
- Vite-compatible environment configuration
- browser with LocalStorage enabled

Install dependencies:
```bash
npm install
```

Run development:
```bash
npm run dev
```

Build production bundle:
```bash
npm run build
```

---

## 2. Environment file strategy
Create:
- `.env.local`

Never commit secrets.

Base reference exists in:
- `.env.example`

---

## 3. Supported environment variables

## Authentication
```env
VITE_ADMIN_USERNAME=
VITE_ADMIN_PASSWORD=
VITE_STAFF_USERNAME=
VITE_STAFF_PASSWORD=
VITE_TEACHER_PASSWORD=
VITE_AR_ADMIN_USERNAME=
VITE_AR_ADMIN_PASSWORD=
```

## Manager email
```env
VITE_MANAGER_EMAIL=director@example.com
```
Used for:
- analytics email dispatch
- certificate email dispatch
- selected reports email dispatch
- registry resend flows

## File base URL
```env
VITE_SERVER_BASE_URL=
```
Used when timetable URLs are rebuilt from persisted file names.

## EmailJS
```env
VITE_EMAILJS_SERVICE_ID=
VITE_EMAILJS_TEMPLATE_ID=
VITE_EMAILJS_PUBLIC_KEY=
```

## SMTP / backend mail transport
```env
VITE_SMTP_API_ENDPOINT=
VITE_SMTP_API_KEY=
```

## Eduserv backend sync
```env
VITE_EDUSERV_SYNC_ENDPOINT=
VITE_EDUSERV_API_KEY=
VITE_EDUSERV_API_SECRET=
```

---

## 4. SMTP backend integration
Preferred production approach for large attachments.

### 4.1 Expected request shape
The front-end sends:
```json
{
  "to": "director@example.com",
  "subject": "Academic analytics report",
  "message": "Rapport académique généré...",
  "attachments": [
    {
      "fileName": "report.xlsx",
      "content": "data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,...",
      "type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    }
  ]
}
```

### 4.2 Expected backend behavior
Your SMTP/API endpoint should:
1. authenticate request
2. decode incoming Data URL attachments
3. attach files to outbound email
4. send via SMTP / mail provider
5. return a 2xx response on success

### 4.3 Example env
```env
VITE_SMTP_API_ENDPOINT=https://api.your-domain.com/mail/send
VITE_SMTP_API_KEY=your_backend_token
```

### 4.4 Why preferred
Use SMTP/backend when:
- attachments can exceed EmailJS variable limits
- you need better logging/control
- you want production-safe credential handling

---

## 5. EmailJS integration
Useful for direct browser-driven sending when backend SMTP is not available.

### 5.1 Required env
```env
VITE_EMAILJS_SERVICE_ID=service_xxxxx
VITE_EMAILJS_TEMPLATE_ID=template_xxxxx
VITE_EMAILJS_PUBLIC_KEY=public_xxxxx
```

### 5.2 Template expectations
Current implementation expects template parameters such as:
- `to_email`
- `email`
- `subject`
- `message`
- `attachment_1_name`
- `attachment_1_content`
- `attachment_2_name`
- `attachment_2_content`
- `attachment_3_name`
- `attachment_3_content`

### 5.3 Important limitation
The current browser implementation intentionally limits EmailJS attachment count to **3 variable attachments**.

If you need more attachments:
- use SMTP/backend, or
- zip files before sending

This is already used for some certificate bulk flows.

---

## 6. Eduserv backend sync workflow
The Eduserv screen now expects a real backend sync endpoint.

### 6.1 Front-end request
Sent to:
```env
VITE_EDUSERV_SYNC_ENDPOINT
```

Headers may include:
- `X-Eduserv-Api-Key`
- `X-Eduserv-Api-Secret`

### 6.2 Expected response shape
The endpoint may return any of the following arrays:
```json
{
  "students": [],
  "academicResults": [],
  "grades": [],
  "exams": [],
  "schedules": [],
  "message": "Optional human-readable status"
}
```

### 6.3 Imported mappings
- `students` → `importStudents(...)`
- `academicResults` or `grades` → `importAcademicResults(...)`
- `exams` or `schedules` → `importExams(...)`

### 6.4 Example env
```env
VITE_EDUSERV_SYNC_ENDPOINT=https://api.your-domain.com/eduserv/sync
VITE_EDUSERV_API_KEY=your_eduserv_key
VITE_EDUSERV_API_SECRET=your_eduserv_secret
```

---

## 7. Build and deployment workflow

## Local validation
```bash
npm install
npm run build
```

## Preview local build
```bash
npm run preview
```

## Static deployment targets
Because this is a Vite SPA, it can be deployed to:
- Vercel
- Netlify
- Cloudflare Pages
- static Nginx / Apache hosting

### Note
Even if front-end is static, **SMTP and Eduserv sync require real backend/API endpoints**.

---

## 8. Production deployment checklist
- [ ] `.env.local` or hosting env vars configured
- [ ] `VITE_MANAGER_EMAIL` configured
- [ ] either SMTP endpoint or EmailJS configured
- [ ] Eduserv sync endpoint configured if using backend sync
- [ ] `npm run build` passes
- [ ] browser LocalStorage available
- [ ] attachment size tested in real email workflow
- [ ] PDF generation tested with Arabic font rendering
- [ ] certificate ZIP generation tested
- [ ] timetable XLSX import/export tested

---

## 9. Operational recommendations

### For email
Prefer SMTP/backend in production.

### For storage
Current persistence is LocalStorage-based.
Recommended future migration:
- backend database
- authenticated APIs
- secure audit logging

### For large documents
Use ZIP packaging for batches.
This is already implemented in the certificate flows.

---

## 10. Troubleshooting

### Email fails immediately
Check:
- `VITE_MANAGER_EMAIL`
- SMTP endpoint availability
- EmailJS service/template/public key values

### Eduserv sync fails
Check:
- `VITE_EDUSERV_SYNC_ENDPOINT`
- backend 2xx response
- CORS settings on the backend
- returned JSON shape

### PDF import yields no records
Check:
- source PDF text layout
- regex expectations in `src/lib/importEngine.ts`
- whether the PDF is image-only (no text layer)

### Arabic text rendering issues in generated certificates
Check:
- embedded font generation file exists:
  - `src/lib/notoNaskhArabicBase64.ts`
- PDF generation path uses the bilingual report helpers

---

## 11. Suggested production backend endpoints
Examples only:
- `POST /mail/send`
- `POST /eduserv/sync`
- future:
  - `POST /auth/login`
  - `GET /students`
  - `POST /academic-results/import`
  - `POST /reports/certificates/send`

---

## 12. Final note
The current system is now deployment-ready for a **static SPA + backend service** model.
The front-end already knows how to:
- generate the payloads
- package attachments
- call the configured services
- persist operational logs locally

The remaining production hardening step beyond configuration is moving from LocalStorage to a real server-side database.