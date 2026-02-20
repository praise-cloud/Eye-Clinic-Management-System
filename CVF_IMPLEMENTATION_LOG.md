# CVF Implementation Log

## Date
- February 20, 2026

## Objective
- Provide a dedicated CVF workflow for doctors and assistants.
- Ensure Henson 8000 imports are usable beyond admin.
- Allow collaborative updates of patient test results and case study notes.

## Implemented Items

### 1. Dedicated CVF Workspace (Doctor + Assistant)
- Added `src/components/content/CVFWorkspaceContent.jsx`.
- Features:
  - Analyze Henson export file.
  - Import single Henson export file.
  - Import Henson export folder.
  - View imported Henson CVF test records.
  - Edit and save:
    - `result`
    - `diagnosis`
    - `caseStudy`
    - `notes`
  - Save metadata on updates:
    - `lastUpdatedBy`
    - `lastUpdatedByRole`
    - `lastUpdatedAt`

### 2. App Navigation Integration
- Updated `src/components/MainApp.jsx`:
  - Added route: `/cvf`
  - Added active section mapping for `cvf`
  - Wired route to `CVFWorkspaceContent`
- Updated `src/components/layout/Sidebar.jsx`:
  - Added `CVF Workspace` menu item for `doctor` and `assistant` roles.

### 3. Role Permissions for Henson Endpoints
- Updated `electron/ipc/handlers.js`:
  - `henson:analyzeExport` now allows `admin`, `doctor`, `assistant`.
  - `henson:importExport` now allows `admin`, `doctor`, `assistant`.
  - `henson:importFolder` now allows `admin`, `doctor`, `assistant`.

### 4. Existing CVF/Henson Backend Foundation
- Existing service retained and used:
  - `src/services/HensonImportService.js`
- Existing API exposure retained and used:
  - `electron/preload.js`:
    - `analyzeHensonExport`
    - `importHensonExport`
    - `importHensonFolder`

## Data Model Notes
- CVF records remain in `tests` table.
- Henson payload and collaborative notes are stored in `tests.raw_data` JSON.
- Source tagging uses `source: "henson_8000"` and/or `machine_type: "henson_8000"`.

## Collaboration Workflow
- Doctor can import Henson exports and write interpretation/case study.
- Assistant can import and update notes/result status to support doctor workflow.
- Both roles work on same patient test records through the CVF Workspace.

## Files Changed In This Pass
- Added:
  - `src/components/content/CVFWorkspaceContent.jsx`
  - `CVF_IMPLEMENTATION_LOG.md`
- Updated:
  - `src/components/MainApp.jsx`
  - `src/components/layout/Sidebar.jsx`
  - `electron/ipc/handlers.js`

## Validation Checklist (Manual)
- [ ] Login as doctor: confirm `CVF Workspace` visible in sidebar.
- [ ] Login as assistant: confirm `CVF Workspace` visible in sidebar.
- [ ] Import Henson file from CVF Workspace.
- [ ] Import Henson folder from CVF Workspace.
- [ ] Open an imported record and update case study.
- [ ] Verify update persists after page refresh.

## Update
- Date: February 20, 2026 (Case Study Board pass)

### Case Study Board Added
- Added a second tab inside CVF Workspace: `Case Study Board`.
- Board provides:
  - Search filter (patient/diagnosis/notes)
  - Result filter
  - Sign-off state filter (signed/pending)
  - Eye filter
  - Date range filter
  - Select-all and multi-row selection

### Assistant Batch Update Workflow
- Added batch update panel for selected board rows.
- Batch fields:
  - result
  - diagnosis
  - notes
- Empty batch fields keep current per-record values.
- Batch apply is restricted to `assistant` role.

### Doctor Sign-Off Workflow
- Added doctor sign-off controls in Case Study Editor:
  - `Doctor Sign Off`
  - `Revoke Sign Off`
- Sign-off action restricted to `doctor` role.
- Sign-off metadata written into `tests.raw_data.signoff`:
  - `status`
  - `signedOffBy`
  - `signedOffRole`
  - `signedOffAt`

### Audit Trail
- Added per-record audit trail list in Case Study Board.
- Actions append entries under `tests.raw_data.auditTrail` with:
  - `action`
  - `at`
  - `by`
  - `role`
  - `note`
- Current tracked actions include:
  - case-study-updated
  - case-study-batch-updated
  - case-study-signed-off
  - case-study-sign-off-revoked

### File Updated
- `src/components/content/CVFWorkspaceContent.jsx`
- `CVF_IMPLEMENTATION_LOG.md`

## Update
- Date: February 20, 2026 (CVF document attachment pass)

### CVF Result -> Client Documents
- Added a direct action in CVF Case Study Editor:
  - `Attach CVF To Client Documents`
- Action creates a report entry in `reports` table with:
  - `report_type: cvf_case_study_attachment`
  - JSON payload snapshot of CVF result, diagnosis, case study, notes, sign-off, and audit context

### New IPC Bridge
- Added renderer API:
  - `attachCvfToPatientDocuments(testId, options)`
- Added main-process handler:
  - `tests:attachCvfToDocuments`
- Role access for this action:
  - `admin`, `doctor`, `assistant`

### Patient Detail Documents View
- Added `Client Documents` section in patient details page:
  - Lists all `reports` for selected patient
  - Shows CVF case-study attachments and regular reports
  - Supports viewing CVF attachment content in-app
  - Supports download/export action per document

### Files Updated
- `electron/preload.js`
- `electron/ipc/handlers.js`
- `src/components/content/CVFWorkspaceContent.jsx`
- `src/pages/PatientDetailsPage.jsx`
- `CVF_IMPLEMENTATION_LOG.md`
