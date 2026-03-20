# Eye Clinic Management System

Consolidated project documentation for the Eye Clinic desktop application.

This `README.md` is the single source of truth for:
- System overview and architecture
- Implemented features and production hardening
- `.bak` to SQLite conversion and import workflows
- CVF (Henson 8000) integration status
- Testing, launch, deployment, and handoff checklists
- Known limitations and next roadmap

Last consolidated update: **February 20, 2026**

---

## 1. Product Summary

The Eye Clinic Management System is an offline-first desktop application built for clinic operations.

Primary goals:
- Manage patients, tests, and clinical records
- Support doctors, assistants, and admins with role-based access
- Import and normalize legacy data from old systems (`.bak`, `.sqlite`, `.sql`, `.csv`)
- Support CVF workflows including Henson 8000 data ingestion and case study collaboration

Target deployment:
- Windows desktop environments (clinic machines)
- Local SQLite persistence for reliable offline use

---

## 2. Technology Stack

- Runtime: `Electron 38`
- Frontend: `React 19`, `Vite`, `React Router`, `Tailwind CSS`
- Database: `SQLite3`
- Packaging: `electron-builder`
- Testing: `Jest`, `React Testing Library`
- Utilities: `bcryptjs`, `uuid`, `jspdf`, `pdf-lib`, `puppeteer`

---

## 3. High-Level Architecture

Application layers:
- Electron Main Process
- Electron Preload Bridge
- React Renderer (UI)
- SQLite database + backend services

Core flow:
1. UI invokes methods through `window.electronAPI`
2. Preload (`electron/preload.js`) validates and forwards IPC requests
3. IPC handlers (`electron/ipc/handlers.js`) execute role checks and service calls
4. Database and file services process data and return structured results

Stability hardening already applied:
- Idempotent IPC registration (`safeHandle(...)`) for critical channels
- Unified preload bridge (`preload.js` delegates to `electron/preload.js`)
- Startup/electron-launch fixes to prevent malformed app path invocation

---

## 4. Roles and Core Workflows

Roles:
- `admin`
- `doctor`
- `assistant`

Role expectations:
- Admin manages configuration, imports, schema sync, and oversight
- Doctor handles diagnosis, prescription, and case study interpretation
- Assistant supports operations, updates results, and handles fulfillment support tasks

Implemented role-sensitive modules include:
- Patient management
- Test records
- Internal messaging/chat
- Inventory flows
- Reports
- Data import and sync workflows
- CVF workspace (doctor + assistant access)

---

## 5. Current Feature Status (What Has Been Done)

### 5.1 Core App

Completed:
- Role-based authentication and dashboard access
- Patients and test record management
- Internal chat system and notifications support foundation
- Inventory and related operational workflows
- Activity/audit logging patterns across major actions

### 5.2 Import + Legacy Data Pipeline

Completed:
- `.bak` import support from Admin flow
- Multi-strategy conversion pipeline for non-SQLite `.bak` sources
- Validation + conversion + import orchestration
- Legacy table mapping into current clinic schema
- External database import with schema sync channels

### 5.3 CVF (Henson 8000) Workflow

Completed:
- Dedicated CVF page for doctor + assistant (`/cvf`)
- Sidebar integration and route wiring
- Analyze single export, import single export, and import folder
- View imported CVF records from `tests`
- Collaborative updates on result/diagnosis/case-study/notes
- Update metadata tracking in raw payload:
  - `lastUpdatedBy`
  - `lastUpdatedByRole`
  - `lastUpdatedAt`

### 5.4 Production Hardening

Completed:
- Fixed IPC handler registration drift issues (missing handler errors)
- Added stable channels for import/sync/case-study table access
- Improved startup script behavior (`scripts/run-electron.js`)
- Adjusted Electron fallback relaunch behavior to valid app arg patterns
- Build verification and test pass runs completed in recent iteration

### 5.5 SQL Server Sync (Offline-First)

Completed:
- Optional SQL Server configuration and connection test in Settings (admin only)
- Local SQLite remains primary for offline work; changes are queued in `sync_queue`
- Manual `Run Sync Now` pushes queued changes to SQL Server when online

Notes:
- Requires the `mssql` dependency to be installed on target machines
- SQL Server connection settings are stored in `config.json` under `sql_server`

---

## 6. `.bak` Conversion and Import System

### 6.1 Supported Input Formats

- SQLite files: `.sqlite`, `.db`, or SQLite-formatted `.bak`
- SQL dump files: `.sql`, `.bak`, `.txt` containing SQL statements
- Delimited text: `.csv`, `.tsv`, `.txt`, `.bak`
- SQL Server backups: true `.bak` backups (requires SQL Server tooling)

### 6.2 Conversion Strategy Order

The converter uses fallback strategies in this order:
1. Detect and copy if source is valid SQLite
2. Parse and execute if source is SQL dump
3. Parse delimited/text records and generate SQLite tables
4. Attempt SQL Server restore/export path when tooling exists

If all strategies fail, the app returns format-specific guidance.

### 6.3 Admin Workflow

Recommended flow:
1. Admin selects `Analyze BAK File Format`
2. Review format report and recommended action
3. Run `Import External Intelligence`
4. System converts (if needed), validates, and imports
5. Restart app when prompted
6. Verify imported data and schema visibility in UI

### 6.4 Legacy Mapping Coverage

Legacy names auto-recognized and mapped into the clinic model:
- `users`, `staff`, `admins`, `employees` -> `users`
- `patients`, `clients`, `customer` -> `patients`
- `tests`, `exams`, `examinations` -> `tests`
- `inventory`, `items`, `stock` -> `inventory`
- `chat`, `messages` -> `chat`

### 6.5 Safety and Error Handling

- File existence and readability checks
- SQLite validation before import
- Transactional import behavior with rollback on failure
- Duplicate handling logic during merge operations
- User-facing error responses with actionable next steps

---

## 7. CVF Module Details (Doctor + Assistant)

### 7.1 What Was Added

- New UI: `src/components/content/CVFWorkspaceContent.jsx`
- Route integration: `/cvf`
- Sidebar entry: `CVF Workspace` for `doctor` and `assistant`
- IPC role expansion on Henson endpoints for doctor/assistant access

### 7.2 Clinical Collaboration Model

- Doctor interprets CVF findings and updates case study
- Assistant supports with notes/result status updates
- Both interact with shared test records and persisted payload metadata

### 7.3 Data Model Notes

- CVF records currently live in the `tests` table
- Henson and collaboration details stored in `tests.raw_data` JSON
- Source tagging uses `henson_8000` fields for traceability

---

## 8. Project Structure (Key Paths)

- `electron/main.js` - Electron app bootstrap
- `electron/preload.js` - secure renderer bridge
- `electron/ipc/handlers.js` - IPC channel registration and role checks
- `src/pages/dashboard/AdminDashboard.jsx` - admin workflows and import controls
- `src/components/content/CVFWorkspaceContent.jsx` - doctor/assistant CVF workspace
- `src/services/DatabaseService.js` - database import/merge and core data operations
- `src/services/HensonImportService.js` - Henson import service logic
- `scripts/convert_bak_to_sqlite.py` - multi-strategy conversion utility
- `scripts/restore_bak_to_sqlite.py` - SQL Server backup conversion utility
- `scripts/run-electron.js` - Electron launch wrapper for env stability

---

## 9. Commands

Install:

```bash
npm install
```

Run development:

```bash
npm run dev
```

Build frontend:

```bash
npm run build
```

Run tests:

```bash
npm test
```

Package app:

```bash
npm run dist
npm run dist:win
npm run dist:mac
npm run dist:linux
```

Database setup helpers:

```bash
npm run setup-db
npm run seed-admin
```

Manual conversion example:

```bash
python scripts/restore_bak_to_sqlite.py "PATH_TO_BAK_FILE" "output_name.sqlite"
```

---

## 10. Quality and Readiness Status

Current status: **Release Candidate (RC)**

What has passed recently:
- IPC/preload hardening for missing-handler stability
- Frontend production build pass (`npm run build`)
- Unit/UI test suite pass (`npm test`) in latest implementation cycle

What still must be completed for full production sign-off:
- Multi-run cold start validation on clinic machines
- Full role workflow UAT (admin/doctor/assistant)
- Chat notification route correctness verification in real usage
- Real `.bak` and batch import stress tests with clinic-sized data
- Installer validation on clean machine
- Backup/restore drill with clinic snapshot

---

## 11. Known Limitations and Risks

- True SQL Server `.bak` conversion depends on local SQL Server tooling availability
- Very large multi-file imports (tens of GB) require operational controls:
  - disk-space checks
  - staged/batched processing
  - long-running task monitoring
- CSV imports may need stronger type inference for strict schemas
- Some end-to-end runtime checks are environment-dependent and must be verified in clinic

---

## 12. Deployment and Handoff

### 12.1 Recommended Clinic Delivery Steps

1. Freeze release branch and tag exact version
2. Generate Windows package (`npm run dist:win`)
3. Validate installer on clean machine
4. Perform UAT checklist with clinic staff
5. Train admin on import + backup procedures
6. Deliver installer + this README + support contact process

### 12.2 Online Delivery Options

- Private GitHub repository release (for technical teams)
- Cloud file share with checksum and version notes (for clinic operations)
- Include migration package:
  - installer artifact
  - backup snapshot
  - import templates
  - this README

---

## 13. What To Work On Next (Roadmap)

Priority roadmap:
1. End-to-end automated UI tests for import, CVF, prescription, and chat notifications
2. Batch import queue manager with progress, retries, and resume support
3. Schema adaptation visibility layer (clear diff and migration preview)
4. CVF case-study dashboard with filters and doctor sign-off workflow
5. Performance hardening for very large legacy datasets
6. Deployment automation and versioned release notes

---

## 14. Consolidated Change Log (Recent)

### A. Import and schema sync
- Added/secured channels for external DB import and sync paths
- Improved failure handling and import diagnostics

### B. IPC reliability
- Idempotent handler registration for key channels
- Removed preload drift via compatibility delegation

### C. Electron startup reliability
- Added `scripts/run-electron.js`
- Updated scripts to avoid `ELECTRON_RUN_AS_NODE` launch issues
- Corrected relaunch args in Electron main fallback

### D. CVF implementation
- Introduced doctor/assistant CVF Workspace route/page
- Enabled doctor/assistant access to Henson import/analyze channels
- Added collaboration updates for case-study fields and metadata

---

## 15. Historical Documents Consolidated Into This README

The content previously spread across these files is now consolidated here:
- `IMPLEMENTATION_SUMMARY.md`
- `IMPLEMENTATION_CHECKLIST.md`
- `BAK_CONVERSION_GUIDE.md`
- `README_BAK_IMPORT.md`
- `CONVERSION_GUIDE.md`
- `ANALYZE_BAK_QUICK_START.md`
- `CVF_IMPLEMENTATION_LOG.md`
- `PRODUCTION_READINESS_REPORT.md`
- `LAUNCH_READY.md`

These files can be retained for archive history, but this `README.md` should be treated as the main reference for repository handoff.

---

## 16. Final Operational Checklist Before Clinic Submission

- [ ] Build and package latest release artifact
- [ ] Run smoke tests across all roles on packaged app
- [ ] Validate import/analyze flow with real `.bak` sample
- [ ] Configure SQL Server settings and confirm `Test Connection` succeeds
- [ ] Run `Sync Now` and confirm server tables receive updates
- [ ] Validate CVF workflow with doctor + assistant accounts
- [ ] Confirm chat notifications route to correct thread
- [ ] Confirm backups/restores in clinic-like environment
- [ ] Document exact release tag and artifact hash
- [ ] Share deployment and rollback instructions with clinic stakeholders

---

## 17. Support Notes

When reporting issues, include:
- Exact error text
- User role used
- Reproduction steps
- File type/size (for import issues)
- App version and OS build
- Relevant logs/screenshots

This accelerates triage and protects clinic operations during rollout.
