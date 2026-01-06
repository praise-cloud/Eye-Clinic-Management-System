# Eye Clinic Management System

A comprehensive desktop application for managing eye clinic operations, built with Electron, React, and SQLite, with optional Supabase sync.

---

## Table of Contents
1. Features
2. Quick Start & Setup
3. Build & Packaging
4. Delivery Checklist
5. Pre-Delivery Audit
6. Fixes & Cleanup
7. Troubleshooting & Quick Fixes
8. Database & Sync
9. Real-Time Chat
10. Dark Mode
11. Project Structure
12. Technology Stack
13. License & Support

---

## 1. Features
- User Management: Admin, Doctor, Assistant roles
- Patient Management: Complete records/history
- Test Results: Visual field data
- Reports: Generate/export patient reports
- Inventory: Equipment/supplies tracking
- Real-time Chat: Internal staff communication
- Offline-First: Works without internet, syncs when online
- Cloud Sync: Optional Supabase integration
- Dark Mode: System-aware theme switching
- Secure Authentication: Bcrypt password hashing
- Data Backup: Automatic local backups

---

## 2. Quick Start & Setup
### Prerequisites
- Node.js >= 18.x
- npm >= 9.x
- Windows OS (primary target)

### Installation
```bash
git clone <repository-url>
cd eye-clinic
npm install
cp .env.example .env
# Edit .env with your Supabase credentials (optional)
npm run dev
```

### Setup Guides
- Environment setup, database initialization, and Supabase configuration are handled automatically or via scripts. See below for details.

#### Environment Configuration
- Copy `.env.example` to `.env` and add Supabase credentials if using cloud sync.
- Default admin user: `admin@clinic.com` / `admin123` (change password after first login).

#### Supabase Setup
- Create a Supabase project, get API keys, and run the provided SQL schema.
- Add credentials to `.env`.

#### Database Setup
- Local SQLite database is created automatically on first run.
- Manual setup: Run `node init-database.js` if needed.

---

## 3. Build & Packaging
### Build Instructions
```bash
npm run build
npm run dist
```
- Windows installer: `release/Eye Clinic Management Setup 1.0.0.exe`
- Mac/Linux builds available via respective scripts.
- See troubleshooting below for build issues.

---

## 4. Delivery Checklist
- Remove `.env` from git history if committed.
- Build production version and clean previous builds.
- Test installer and verify data persistence.
- Deliver installer and documentation files to client.

---

## 5. Pre-Delivery Audit
- Check for exposed credentials in `.env`.
- Ensure database schema is complete and matches code.
- Remove test/debug files from production build.
- Fix duplicate code and missing icons in main.js.
- Regenerate Supabase keys if needed.

---

## 6. Fixes & Cleanup
- All major issues (schema mismatch, missing files, duplicate code) have been fixed.
- Temporary and debug files have been removed or moved to scripts.
- Database schema now uses UUIDs and correct field names.

---

## 7. Troubleshooting & Quick Fixes
- Remove `.env` from git and add to `.gitignore`.
- Move test files to scripts folder.
- Fix duplicate code and missing icons in main.js.
- Create `.env.production` for production builds.
- Clean and rebuild if encountering errors.

---

## 8. Database & Sync
- Local SQLite database is offline-first and auto-created.
- Supabase sync is optional and enabled via `.env`.
- Schema synchronization is handled; see project SQL files for details.
- Sync logic: Bidirectional, newest record wins, auto-sync every 5 minutes.

---

## 9. Real-Time Chat
- Chat syncs instantly across devices using Supabase real-time subscriptions.
- Offline support: Messages queue and sync when online.
- Multi-device, auto-reconnect, and broadcast features included.

---

## 10. Dark Mode
- UI supports dark mode via Tailwind CSS.
- Add `dark:` prefix to className attributes for dark mode support.
- See code comments for specific class mappings.

---

## 11. Project Structure
```
eye-clinic/
├── src/                    # Frontend source
│   ├── components/         # React components
│   ├── pages/              # Page components
│   ├── services/           # Frontend services
│   └── utils/              # Utility functions
├── services/               # Backend services
│   ├── DatabaseService.js
│   ├── FileService.js
│   └── IPCHandlers.js
├── main.js                 # Electron main process
├── preload.js              # Electron preload
├── database.js             # SQLite database
└── package.json            # Dependencies
```

---

## 12. Technology Stack
- Frontend: React 18, Vite, Tailwind CSS, React Router
- Backend: Electron, SQLite3, Supabase (optional), Bcrypt
- Key Libraries: electron-builder, uuid, better-sqlite3

---

## 13. License & Support
- Proprietary - All rights reserved
- For support: support@example.com

---

All documentation, setup, troubleshooting, and delivery instructions are now consolidated in this README for easy reference.
