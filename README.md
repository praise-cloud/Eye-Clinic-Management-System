# KORENE Eye Clinic Management System

A professional offline-first desktop application for managing eye clinic operations. Built with Electron and React, it provides role-based workflows for admins, doctors, and assistants to manage patients, examinations, prescriptions, pharmacy dispensing, inventory, financial records, internal messaging, and clinical case documentation.

---

## Purpose

This application replaces paper-based and legacy-system workflows in eye clinics with a unified digital platform. It is designed for **KORENE Eye Clinic Nig. Ltd** and similar eye care facilities, with three operational modes:

- **Standalone Mode** — Single PC with local SQLite database
- **Server Mode** — One PC runs the backend API server (port 3001) with the clinic database
- **Client Mode** — Other PCs connect to the server PC via HTTP API + WebSocket

This means a single-computer clinic can use standalone mode with zero network setup, while multi-computer clinics can share data across the network without internet dependency.

---

## Key Features

| Feature | Description |
|---------|-------------|
| **Role-Based Access** | Three roles — Admin, Doctor, Assistant — each with tailored dashboards and permissions |
| **Patient Management** | Full CRUD with auto-generated IDs (`P-XXXXXX`), search, demographics, visit history, intake tracking |
| **Examinations / Tests** | Visual field test records with eye designation, machine type tracking, raw data in JSON |
| **Prescriptions** | Doctor creates, Assistant dispenses. Supports both drug and glasses prescriptions with status workflow |
| **Pharmacy Dispensing** | Drug inventory with stock thresholds, dispensing that auto-records revenue and reduces stock |
| **Clinic Inventory** | Equipment/supplies tracking with categories, suppliers, expiry dates, low-stock alerts |
| **Doctor Case Notes** | Comprehensive ophthalmology form (50+ clinical fields): visual acuity, refraction, IOP, anterior/posterior segment, OCT, CVF, diagnosis, treatment plan, follow-up. PDF export. |
| **CVF / Henson 8000** | Import and collaborative workspace for Henson 8000 visual field exports. Doctor sign-off workflow with audit trail |
| **Internal Chat** | Real-time staff messaging with read receipts, reply threading, file attachments |
| **Notifications** | Per-user notification system (prescription alerts, chat, system notices) with bell icon and click-to-navigate |
| **Financial Tracking** | Revenue recording with source breakdown, transaction history, daily/monthly/total stats |
| **Activity Logging** | Complete audit trail with time-based filters (5 min, 1 hour, 24 hours, 7 days, all) |
| **Legacy Data Import** | Multi-strategy `.bak`/`.sql`/`.csv` file converter supporting SQLite detection, SQL dump parsing, CSV extraction, and SQL Server backup restoration |
| **Backup & Restore** | Create timestamped backups, list available backups, restore with safety checks |
| **Offline-First** | All data stored locally in SQLite by default; server mode available for multi-computer setups |

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| **Desktop Runtime** | Electron 38 |
| **UI Framework** | React 19 |
| **Build Tool** | Vite 7 |
| **Styling** | Tailwind CSS 3 |
| **Routing** | React Router 7 |
| **Local Database** | better-sqlite3 (SQLite with WAL mode) |
| **Server Database** | SQL Server (optional, via mssql) |
| **Auth** | bcryptjs + jsonwebtoken |
| **PDF** | jsPDF, pdf-lib |
| **Real-time** | ws (WebSocket) |
| **HTTP API** | Express 4 |
| **Packaging** | electron-builder 24 |
| **Testing** | Jest 30 + React Testing Library |

---

## Architecture

### Three-Tier Electron Architecture

```
┌──────────────────────────────────────────────────────┐
│            PRESENTATION LAYER (React 19)              │
│   Pages → Hooks → Services → window.electronAPI       │
├──────────────────────────────────────────────────────┤
│          PRELOAD LAYER (electron/preload.js)           │
│  contextBridge exposes 50+ safe APIs to renderer      │
├──────────────────────────────────────────────────────┤
│            MAIN PROCESS LAYER (Node.js)               │
│  electron/main.js + 22 modular IPC handlers           │
│  Each handler: checks serverUrl config                │
│    → proxies to server HTTP API if configured         │
│    → calls local SQLite (better-sqlite3) if not       │
├──────────────────────────────────────────────────────┤
│               DATA LAYER (SQLite / DB)                │
│  19 tables, WAL mode, foreign keys, auto-migrations   │
└──────────────────────────────────────────────────────┘
```

### Three Operational Modes

```
┌──────────────────────────────────────────────────────┐
│  STANDALONE MODE (default)                            │
│  ┌─────────────┐                                      │
│  │  Single PC  │──► local SQLite database             │
│  └─────────────┘      (%APPDATA%/KORENE_EyeClinic/)   │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│  SERVER MODE                                          │
│  ┌──────────────────┐   HTTP + WebSocket   ┌────────┐│
│  │  Server PC        │◄──────────────────► │ Client ││
│  │  (Electron + UI)  │     Port 3001       │   PCs  ││
│  │  Express + WS     │                     └────────┘│
│  │  SQLite / SQL Svr │◄──────────────────► ┌────────┐│
│  └──────────────────┘                     │ Client ││
│                                           │   PCs  ││
│                                           └────────┘│
└──────────────────────────────────────────────────────┘
```

### Data Flow Pattern

```
React Component
  → Hook (e.g., usePatients)
    → Service (e.g., patientService.createPatient(data))
      → window.electronAPI.createPatient(data)
        → preload.js validates + forwards via ipcRenderer.invoke
          → IPC handler (patients.js)
            → checks serverUrl
              → if configured: HTTP POST to server
              → if standalone: INSERT into local SQLite
```

### Database Tables (19)

| Table | Purpose |
|-------|---------|
| `users` | System user accounts with role (admin/doctor/assistant) |
| `patients` | Patient demographics, client type, intake date |
| `visits` | Patient visit records with payment tracking |
| `tests` | Examination/test results including CVF/Henson data |
| `reports` | Generated reports and CVF document attachments |
| `chat` | Internal staff messaging |
| `inventory` | Clinic equipment and supplies |
| `pharmacy_drugs` | Pharmacy drug inventory |
| `pharmacy_dispensations` | Drug dispensation records with pricing |
| `prescriptions` | Doctor prescriptions (drug/glasses) with status workflow |
| `prescription_dispensations` | Prescription fulfillment records |
| `revenue` | Financial transactions with source tracking |
| `notifications` | Per-user notifications |
| `activity_logs` | Complete audit trail |
| `settings` | Key-value application configuration |
| `user_presence` | Online/offline user status |
| `case_notes` | Comprehensive ophthalmology case notes (50+ clinical fields) |
| `case_note_attachments` | CVF attachments linked to case notes |
| `appointment_reminders` | Follow-up appointment scheduling |

---

## Role-Based Permissions

| Feature | Admin | Doctor | Assistant |
|---------|-------|--------|-----------|
| User Management | Yes | — | — |
| Patient CRUD | Yes | Yes | Yes |
| Examinations / Tests | Yes | Create | View |
| Prescriptions | Yes | Create | Dispense |
| Pharmacy Dispensing | — | — | Yes |
| Clinic Inventory | Yes | — | Yes |
| Doctor Case Notes | Yes | Yes | — |
| CVF Workspace | — | Yes | Yes |
| Chat / Messaging | Yes | Yes | Yes |
| Reports | Yes | Yes | Yes |
| Settings | Yes | — | — |
| Legacy Data Import | Yes | — | — |
| Backup / Restore | Yes | — | — |
| Financial Oversight | Yes | — | Yes (daily) |

---

## Installation

### Prerequisites

- **Node.js** 18+
- **npm** 9+
- **Python 3.x** (required for legacy `.bak` conversion)

### Quick Start

```bash
# Clone the repository
git clone <repo-url>
cd eye-clinic

# Install dependencies
npm install

# Initialize the local database
npm run setup-db

# Start in development mode (Electron + Vite hot reload)
npm run dev
```

This opens the Electron app. On first run, you will be guided through setting up the admin account.

### Production Build

```bash
# Build frontend
npm run build

# Package as Windows desktop app
npm run build:app
```

The packaged app will be in `release/KORENE_v2/`.

### Server Mode (Multi-Computer Setup)

On the server PC:

```bash
# Start the API server (Express on port 3001)
npm run start:server
```

On client PCs, go to **Settings > Server Connection**, enter the server URL (e.g., `http://192.168.1.100:3001`), and connect.

---

## Development

### NPM Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Start Electron + Vite dev server with hot reload |
| `npm run build` | Production build of React frontend |
| `npm run build:app` | Package full desktop application |
| `npm run setup-db` | Initialize SQLite database schema |
| `npm run setup:server` | Setup SQL Server database (for server mode) |
| `npm run start:server` | Start standalone Express API server |
| `npm test` | Run Jest test suite |
| `npm run electron` | Launch Electron production build |

### Project Structure

```
eye-clinic/
├── electron/
│   ├── main.js                  # App lifecycle, windows, menus
│   ├── preload.js               # Context bridge (50+ APIs)
│   ├── ipc/
│   │   ├── handlers.js          # Module aggregator (22 modules)
│   │   └── handlers/            # Domain-specific IPC handlers
│   │       ├── auth.js          # Authentication & user management
│   │       ├── patients.js      # Patient CRUD
│   │       ├── tests.js         # Test/exam CRUD
│   │       ├── pharmacy.js      # Drug management & dispensing
│   │       ├── prescriptions.js # Prescription workflow
│   │       ├── inventory.js     # Inventory CRUD
│   │       ├── chat.js          # Messaging
│   │       ├── dashboard.js     # Dashboard statistics
│   │       ├── case-notes.js    # Doctor case notes
│   │       ├── revenue.js       # Financial records
│   │       ├── notifications.js # Notifications
│   │       ├── admin.js         # Admin operations
│   │       ├── file.js          # File/import operations
│   │       └── ...              # 9 more modules
│   └── server/                  # Express server routes (21 modules)
│       ├── ServerManager.js
│       └── routes/              # Route modules per domain
├── src/                         # React frontend
│   ├── components/
│   │   ├── content/             # Page content components
│   │   ├── layout/              # Layout shell (Header, Sidebar)
│   │   ├── modals/              # Modal dialogs
│   │   ├── ui/                  # Reusable UI kit
│   │   └── MainApp.jsx          # Router + app shell
│   ├── hooks/                   # Custom React hooks (16)
│   ├── services/                # Service layer (16 modules)
│   ├── pages/                   # Page components
│   │   ├── auth/                # Login, Setup, Signup
│   │   └── dashboard/           # Role-based dashboards
│   ├── context/                 # React context providers
│   └── utils/                   # Logger, formatters, constants
├── scripts/                     # Build/run/setup utilities
├── database.js                  # SQLite database class
├── __tests__/                   # Test files
├── package.json
├── vite.config.js
├── tailwind.config.js
├── electron-builder.yml
└── README.md
```

---

## User Workflows

### Patient Journey

1. **Intake** — Assistant or Doctor registers a new patient (auto-assigned `P-XXXXXX` ID)
2. **Examination** — Doctor performs tests (visual field, etc.), records results
3. **Diagnosis** — Doctor writes case notes with comprehensive clinical findings
4. **Prescription** — Doctor prescribes drugs or glasses
5. **Dispensing** — Assistant dispenses prescribed drugs; revenue is automatically recorded
6. **Follow-up** — Appointment reminders scheduled; case notes marked as completed

### Assistant Daily Workflow

1. View dashboard for today's pending queue and revenue
2. Register new patients
3. Dispense pharmacy drugs against doctor prescriptions
4. Monitor clinic inventory and restock when low
5. Manage appointment reminders

### Doctor Daily Workflow

1. Review patient queue from dashboard
2. Conduct examinations and record test results
3. Write detailed case notes (visual acuity, refraction, IOP, diagnosis, treatment plan)
4. Create prescriptions for required drugs/glasses
5. Review and sign off CVF case studies from Henson 8000 imports

### Admin Workflow

1. Manage user accounts (add/edit/deactivate doctors and assistants)
2. Financial oversight — view revenue reports and transaction history
3. Import legacy data from old systems (`.bak` files)
4. Configure system settings (server connection, CVF watch folder)
5. Create database backups
6. Monitor system activity logs

---

## Legacy Data Import

The system can import data from previous clinic management systems. It supports:

1. **SQLite databases** — Direct copy (`.db`, `.sqlite`, `.bak`)
2. **SQL dump files** — Parses CREATE TABLE and INSERT statements (`.sql`, `.bak`)
3. **CSV/text files** — Detects delimiters and creates tables automatically
4. **SQL Server backups** — Requires local SQL Server installation

**Legacy table mapping** is automatic:
- `users/staff/employees` → `users`
- `patients/clients/customer` → `patients`
- `tests/exams/examinations` → `tests`
- `inventory/items/stock` → `inventory`
- `chat/messages` → `chat`

**Workflow**: Admin Dashboard → Analyze BAK File Format → Import External Intelligence → System converts/validates/imports → Restart application

---

## Testing

```bash
npm test
```

The test suite uses Jest 30 + React Testing Library with test files in `__tests__/`. The setup provides mocks for `window.electronAPI`, `window.matchMedia`, and static assets.

---

## Current Status

**Release Candidate (RC)** — Core functionality is complete and production-hardened. Final validation in the target clinic environment is recommended before full deployment.

---

## License

MIT — See `LICENSE.txt` for details.

---

## Support

For issues or feature requests, please provide:
- Exact error message
- User role at time of issue
- Steps to reproduce
- App version (from Help > About)
- Relevant logs from `%APPDATA%/KORENE_EyeClinic/logs/`
