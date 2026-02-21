# 5.1 Cost Estimation Input Justification (MediAI)

This document explains why each value was selected in `fpcal.html` for MediAI.

## Selected Result Context

- Domain counts and weights used:
  - User Inputs = `28` (Average weight `4`)
  - User Outputs = `24` (Average weight `5`)
  - User Inquiries = `18` (Average weight `4`)
  - Files = `11` (Average weight `10`)
  - External Interfaces = `6` (Average weight `7`)
- Unadjusted FP (UFP): `456`
- Complexity ratings selected (Q1..Q14): `[3,4,3,3,2,4,3,4,3,3,3,1,1,3]`
- Complexity sum: `40`
- TCF: `1.05`
- Final Adjusted FP (AFP): `478.8`

---

## A) Domain Characteristic Table Justification

### 1) Number of User Inputs = 28 (Average)
Why:
- MediAI has many form-driven transactions: registration, login, profile basic/comprehensive forms, doctor registration, consultation request/edit/confirm/cancel flows, medicine add/update/log/edit, report/complaint/bug forms, admin action submissions.
- Inputs are not trivial; most involve validation, role checks, and persistence, so `Average` complexity is appropriate instead of `Simple`.

### 2) Number of User Outputs = 24 (Average)
Why:
- System returns structured outputs across dashboard cards, consultation statuses, notifications, AI results (interaction, side effects, symptom analysis), health report data, report/complaint admin responses.
- Outputs are generally multi-field JSON/UI summaries with moderate business logic, so `Average` fits.

### 3) Number of User Inquiries = 18 (Average)
Why:
- MediAI has many read/query operations: my consultations, doctor consultations, doctor list/public profile, notifications list, adherence stats, today doses, report lists/details, admin stats and user listings.
- Inquiry logic often includes filtering, role-aware checks, sorting, and joins/enrichment, making them `Average`.

### 4) Number of Files = 11 (Average)
Why:
- Logical data groups include users, health profiles, consultations, medicine trackers, medicine logs, notifications, symptom reports, doctor applications, complaints, bug reports, AI bug/medicine issue reports, chat histories.
- Data model count is high but each store is not extremely complex at schema-rule level in this calculator context, so `Average`.

### 5) Number of External Interfaces = 6 (Average)
Why:
- External integrations include Python AI API, OCR Flask API, Cloudinary, email provider (SMTP/Gmail), SMS provider (Twilio), and auth/session interface dependencies.
- Integration handling includes API calls, timeout/error handling, and payload mapping, so `Average` is justified.

---

## B) Complexity Adjustment Table Justification (Q1 to Q14)

### Q1. Reliable backup and recovery = 3
Why:
- Production data is persisted in MongoDB and critical health/consultation records exist.
- Backup/recovery is important but not a dedicated custom DR module in current codebase.

### Q2. Data communications required = 4
Why:
- Heavy API communication between frontend and backend plus outbound service calls (AI/OCR/Cloudinary/Email/SMS).
- Communication is central to almost every feature.

### Q3. Distributed processing functions = 3
Why:
- Processing is split between Next.js APIs and separate Python/OCR services.
- Distributed behavior exists but is moderate, not highly microservice-orchestrated.

### Q4. Performance critical = 3
Why:
- User-facing interaction and AI response latency matter.
- Current system has performance considerations but no hard real-time constraints.

### Q5. Existing heavily utilized operational environment = 2
Why:
- Runs on common managed platforms (web + cloud DB/services).
- Operational intensity is moderate for project scope.

### Q6. On-line data entry required = 4
Why:
- Core app is continuous online form/data entry (profile, consultations, medicine logs, reports).
- This is a major characteristic of MediAI.

### Q7. Multi-screen/multi-operation data entry = 3
Why:
- Several transactions span multiple fields and screens (comprehensive profile, doctor registration, consultation lifecycle).
- Moderate complexity in transaction flow.

### Q8. Master files updated online = 4
Why:
- Users, profiles, consultation statuses, medicine trackers/logs, and notifications are updated online frequently.
- Strong online update behavior across modules.

### Q9. Inputs/outputs/files/inquiries complexity = 3
Why:
- Many features involve moderate business rules and enriched responses.
- Complexity is meaningful but not extreme algorithmically for most CRUD/report flows.

### Q10. Internal processing complexity = 3
Why:
- Includes role-based logic, consultation status transitions, adherence calculations, cron processing, and AI orchestration.
- Overall moderate internal complexity.

### Q11. Reusability requirement = 3
Why:
- Shared services/utilities exist (notification service, API patterns, model reuse).
- Reusability is intended but not a strict framework-level reusable product line.

### Q12. Conversion/installation included = 1
Why:
- Minimal migration/conversion concerns within current scope.
- Deployment/setup exists but not heavy legacy conversion.

### Q13. Multiple installations in different organizations = 1
Why:
- Current project is primarily a single product deployment model.
- Multi-tenant/multi-organization packaging is limited.

### Q14. Designed for ease of change and user friendliness = 3
Why:
- UI is feature-rich with modular routes/components and clear user workflows.
- Design supports iterative updates, though not at extreme enterprise configurability.

---

## C) Why This Yields 478.8

- UFP = `456`
- Complexity sum = `40`
- TCF = `0.65 + (0.01 * 40) = 1.05`
- AFP = `456 * 1.05 = 478.8`

This is a reasonable conservative-mid estimate for MediAI given current scope and implementation maturity.
