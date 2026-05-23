# KORENE Eye Clinic Management System

A professional offline-first desktop application for managing eye clinic operations. Built with Electron and React, it provides role-based workflows for admins, doctors, and assistants to manage patients, examinations, prescriptions, pharmacy dispensing, inventory, financial records, internal messaging, and clinical case documentation.

---

# Part I — Application Overview

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

---

# Part II — Complete Architecture Documentation

**Version:** 1.0.0 | **Date:** April 18, 2026

---

## 1. Executive Summary

The KORENE Eye Clinic Management System is a comprehensive, role-based desktop application designed for eye clinic operations. It manages patients, visual field tests, prescriptions, inventory, pharmacy, and internal communications across multiple user roles (Admin, Doctor, Assistant) with support for both standalone offline operation and networked server-client architectures.

### 1.1 Core Features

- Role-based access control (Admin, Doctor, Assistant)
- Patient management with full medical history
- Visual field test management (CVF/Henson 8000)
- Prescription management and pharmacy dispensing
- Clinic inventory management
- Internal messaging and chat
- Activity logging and audit trail
- Database backup and restore
- Multi-computer networking (server-client mode)
- Real-time updates via WebSocket

### 1.2 Target Deployment

- Windows desktop environments (clinic machines)
- Local SQLite persistence for reliable offline use
- Optional SQL Server for networked deployments
- Offline-first architecture with server sync capability

---

## 2. Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Desktop Runtime | Electron | 38.x |
| UI Framework | React | 19.x |
| Build Tool | Vite | 7.x |
| CSS Framework | Tailwind CSS | 3.x |
| Routing | React Router | 7.x |
| Database | better-sqlite3 | 12.x |
| Authentication | bcryptjs | 3.x |
| PDF Generation | jsPDF, pdf-lib | Latest |
| Packaging | electron-builder | 24.x |

### Dependencies (package.json)

```json
{
  "name": "eye-clinic",
  "version": "1.0.0",
  "main": "electron/main.js",
  "dependencies": {
    "express": "^4.18.2",
    "ws": "^8.14.2",
    "jsonwebtoken": "^9.0.3",
    "cors": "^2.8.5",
    "bcryptjs": "^3.0.2",
    "better-sqlite3": "^12.9.0",
    "jspdf": "^4.2.1",
    "uuid": "^13.0.0"
  }
}
```

---

## 3. Application Modes

### 3.1 Three Running Modes

```
┌──────────────────────────────────────────────────────────────┐
│                    APPLICATION MODES                          │
├──────────────────────────────────────────────────────────────┤
│  MODE 1: STANDALONE (Default)                                │
│  ┌─────────────────┐                                        │
│  │  This PC        │  →  Local SQLite Database              │
│  └─────────────────┘    (%APPDATA%/eye-clinic/)             │
│                                                              │
│  MODE 2: SERVER MODE (This PC runs backend)                  │
│  ┌─────────────────┐        ┌─────────────────┐             │
│  │  This PC        │←───────│  Node.js API    │             │
│  │  (Server)       │ Port   │  Server         │             │
│  │                 │ 3001   │  + SQLite       │             │
│  └─────────────────┘        └─────────────────┘             │
│         │                                                    │
│         │  HTTP + WebSocket                                  │
│         ↓                                                    │
│  ┌─────────────────┐                                        │
│  │  Other PCs      │  (Networked clients)                    │
│  └─────────────────┘                                        │
│                                                              │
│  MODE 3: CLIENT MODE (Connect to remote server)              │
│  ┌─────────────────┐        ┌─────────────────┐             │
│  │  This PC        │────────│  Remote Server  │             │
│  │  (Client)       │  HTTP  │  (Server PC)    │             │
│  └─────────────────┘        └─────────────────┘             │
└──────────────────────────────────────────────────────────────┘
```

### 3.2 Configuration (config.json)

```json
{
  "isServerMode": false,
  "serverUrl": "",
  "serverPort": 3001,
  "sql_server": {
    "host": "localhost",
    "port": 1433,
    "database": "eye_clinic_db",
    "user": "sa",
    "password": "",
    "encrypt": true,
    "trustServerCertificate": true
  }
}
```

---

## 4. Layer Architecture

### 4.1 High-Level Layer Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     PRESENTATION LAYER                       │
│  ┌───────────────────────────────────────────────────┐     │
│  │  React Components (45+ components)                │     │
│  │  • Pages: Dashboard, Patients, Tests, Pharmacy   │     │
│  │  • Layouts: Header, Sidebar, Main App            │     │
│  │  • Modals: Add Patient, Prescribe, Dispense      │     │
│  │  • UI: Button, Input, Modal, Select, Badge       │     │
│  └───────────────────────────────────────────────────┘     │
│                              │                              │
│                              │ React Hooks                  │
│                              ↓                              │
│  ┌───────────────────────────────────────────────────┐     │
│  │  Service Layer (16 services)                      │     │
│  │  patientService, testService, etc.                │     │
│  └───────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
              │
              │ IPC Bridge (contextBridge)
              ↓
┌─────────────────────────────────────────────────────────────┐
│                     PRELOAD LAYER                           │
│  ┌───────────────────────────────────────────────────┐     │
│  │  electron/preload.js (290 lines)                  │     │
│  │  • Exposes 50+ safe APIs to renderer              │     │
│  │  • Validates and sanitizes inputs                 │     │
│  └───────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
              │
              │ IPC Channels (40+ handlers)
              ↓
┌─────────────────────────────────────────────────────────────┐
│                     MAIN PROCESS LAYER                      │
│  ┌───────────────────────────────────────────────────┐     │
│  │  electron/main.js + IPC Handlers (modular)        │     │
│  │  • Database operations (SQLite)                   │     │
│  │  • File system access                             │     │
│  │  • 40+ IPC handlers split by feature domain       │     │
│  └───────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
              │
              ↓
┌─────────────────────────────────────────────────────────────┐
│                     DATA LAYER                              │
│  ┌───────────────────────────────────────────────────┐     │
│  │  database.js (SQLite via better-sqlite3)          │     │
│  │  • 20+ tables                                     │     │
│  │  • WAL mode, Foreign keys                         │     │
│  └───────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 IPC Context Flow

```javascript
// electron/main.js - buildContext()
function buildContext() {
  const config = loadConfig();
  return {
    getDatabase: () => database,
    getCurrentUser: () => currentUser,
    setCurrentUser: (u) => { currentUser = u; },
    getConfig: () => config,
    getMainWindow: () => mainWindow,
    appConfig: config,
    _saveAppConfig: saveConfig,
  };
}
```

### 4.3 Preload API Exposure Pattern

```javascript
// electron/preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  login: (credentials) => ipcRenderer.invoke('auth:login', credentials),
  logout: () => ipcRenderer.invoke('auth:logout'),
  getPatients: (params) => ipcRenderer.invoke('patients:getAll', params),
  getPatientById: (id) => ipcRenderer.invoke('patients:getById', id),
  createPatient: (data) => ipcRenderer.invoke('patients:create', data),
  updatePatient: (id, data) => ipcRenderer.invoke('patients:update', { id, data }),
  deletePatient: (id) => ipcRenderer.invoke('patients:delete', id),
  getTests: (params) => ipcRenderer.invoke('tests:getAll', params),
  createTest: (data) => ipcRenderer.invoke('tests:create', data),
  getDrugs: () => ipcRenderer.invoke('pharmacy:getDrugs'),
  dispenseDrug: (data) => ipcRenderer.invoke('pharmacy:dispense', data),
  // ... 50+ more APIs
});
```

---

## 5. Data Flow & Processing

### 5.1 User Authentication Flow

```
┌────────────────────────────────────────────────────────┐
│                  LOGIN FLOW                             │
│                                                         │
│  1. User visits /auth.html                              │
│         ↓                                               │
│  2. Enters email + password                             │
│         ↓                                               │
│  3. window.electronAPI.login({ email, password })       │
│         ↓                                               │
│  4. Preload forwards to IPC: "auth:login"              │
│         ↓                                               │
│  5. IPC Handler checks:                                 │
│     • Standalone mode: local SQLite                     │
│     • Server mode: HTTP proxy                           │
│         ↓                                               │
│  6. Password verified with bcrypt.compare()             │
│         ↓                                               │
│  7. Returns user + JWT (server mode)                    │
│         ↓                                               │
│  8. Main App loads with role-based access               │
│                                                         │
└────────────────────────────────────────────────────────┘
```

### 5.2 Authentication Code

```javascript
// electron/ipc/handlers/auth.js
ipcMain.handle('auth:login', async (event, { email, password }) => {
  const serverUrl = ctx.appConfig?.serverUrl;

  if (serverUrl) {
    const result = await httpRequest(`${serverUrl}/api/auth/login`, 'POST',
      JSON.stringify({ email, password }));
    return result;
  }

  const user = Database.sqlGet(
    'SELECT * FROM users WHERE email = ? AND status = ?',
    [email, 'active']
  );

  if (!user) return { success: false, error: 'Invalid credentials' };

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) return { success: false, error: 'Invalid credentials' };

  return {
    success: true,
    user: {
      id: user.id,
      name: `${user.first_name} ${user.last_name}`,
      email: user.email,
      role: user.role,
      first_name: user.first_name,
      last_name: user.last_name
    }
  };
});
```

### 5.3 Data Operation Flow (Create Patient)

```
┌────────────────────────────────────────────────────────┐
│              CREATE PATIENT FLOW                        │
│                                                         │
│  User Action                                            │
│      ↓                                                  │
│  AddPatientModal.jsx                                    │
│      • User fills form                                  │
│      ↓                                                  │
│  usePatients hook                                       │
│      calls createPatient(data)                          │
│      ↓                                                  │
│  patientService.js                                      │
│      window.electronAPI.createPatient(data)             │
│      ↓                                                  │
│  preload.js                                             │
│      ipcRenderer.invoke('patients:create')              │
│      ↓                                                  │
│  IPC Handler (patients.js)                              │
│      Check serverUrl                                    │
│         ├─ Server URL: HTTP POST                        │
│         └─ No server: SQLite INSERT                     │
│      ↓                                                  │
│  Database.js                                            │
│      INSERT INTO patients                               │
│      ↓                                                  │
│  WebSocket Broadcast (server mode)                      │
│      broadcast('data:update', {...})                    │
│      ↓                                                  │
│  All Clients: useServerEvents re-fetches                │
│                                                         │
└────────────────────────────────────────────────────────┘
```

### 5.4 Server Proxy Pattern

```javascript
// electron/ipc/handlers/patients.js
ipcMain.handle('patients:getAll', async (event, params = {}) => {
  const serverUrl = ctx.appConfig?.serverUrl;

  if (serverUrl) {
    const url = `${serverUrl}/api/patients`;
    const result = await httpRequest(url, 'GET', '', {
      'Authorization': `Bearer ${getToken()}`
    });
    return result;
  }

  const patients = Database.sqlQuery(
    'SELECT * FROM patients ORDER BY created_at DESC'
  );
  return { success: true, patients };
});
```

### 5.5 Real-Time Updates Flow (WebSocket)

```
┌────────────────────────────────────────────────────────┐
│              WEBSOCKET UPDATE FLOW                      │
│                                                         │
│  Server Mode:                                           │
│  ┌──────────────┐        ┌──────────────┐              │
│  │ Server PC    │───────▶│ WebSocket   │              │
│  │ Port 3001    │        │  Clients     │              │
│  └──────────────┘        └──────────────┘              │
│       │                                                │
│       │ Events:                                        │
│       │ • presence: { userId, status }                 │
│       │ • chat:message: { message }                    │
│       │ • data:update: { table, action }               │
│       │ • notifications:new: { notification }          │
│       │                                                │
│       ↓                                                │
│  Client: useServerEvents hook updates React state      │
│                                                         │
└────────────────────────────────────────────────────────┘
```

---

## 6. Database Schema

### 6.1 Users Table

```sql
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  gender TEXT DEFAULT 'other',
  role TEXT NOT NULL CHECK (role IN ('admin', 'doctor', 'assistant')),
  phone_number TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

### 6.2 Patients Table

```sql
CREATE TABLE IF NOT EXISTS patients (
  id TEXT PRIMARY KEY,
  patient_id TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  dob DATE,
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  contact TEXT,
  email TEXT,
  address TEXT,
  reason_for_visit TEXT,
  client_type TEXT,
  marital_status TEXT,
  intake_date DATE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

### 6.3 Tests Table

```sql
CREATE TABLE IF NOT EXISTS tests (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL,
  visit_id TEXT,
  test_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  eye TEXT CHECK (eye IN ('left', 'right', 'both')),
  machine_type TEXT,
  raw_data TEXT,
  report_status TEXT DEFAULT 'pending',
  created_by TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id)
)
```

### 6.4 Case Notes Table

```sql
CREATE TABLE IF NOT EXISTS case_notes (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL,
  visit_id TEXT,
  test_id TEXT,
  doctor_id TEXT NOT NULL,
  chief_complaint TEXT,
  visual_acuity_od TEXT,
  visual_acuity_os TEXT,
  intraocular_pressure_od TEXT,
  intraocular_pressure_os TEXT,
  cvf_analysis_od TEXT,
  cvf_analysis_os TEXT,
  diagnosis TEXT,
  recommendation TEXT,
  next_appointment DATE,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'signed')),
  signed_off_by TEXT,
  signed_off_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id),
  FOREIGN KEY (doctor_id) REFERENCES users(id)
)
```

### 6.5 Prescriptions Table

```sql
CREATE TABLE IF NOT EXISTS prescriptions (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL,
  visit_id TEXT,
  case_note_id TEXT,
  doctor_id TEXT NOT NULL,
  prescription_type TEXT DEFAULT 'drug' CHECK (prescription_type IN ('drug', 'glasses')),
  drug_id TEXT,
  quantity INTEGER DEFAULT 1,
  instructions TEXT,
  glasses_details TEXT,
  glasses_amount_adjusted REAL DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'dispensed', 'cancelled')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id),
  FOREIGN KEY (doctor_id) REFERENCES users(id)
)
```

### 6.6 Revenue Table

```sql
CREATE TABLE IF NOT EXISTS revenue (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  source_id TEXT,
  amount REAL NOT NULL,
  currency TEXT DEFAULT 'NGN',
  user_id TEXT,
  patient_id TEXT,
  visit_id TEXT,
  collected_by TEXT,
  description TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

### 6.7 Database Helper Functions

```javascript
function sqlQuery(sql, params = []) {
  const database = getDb();
  const stmt = database.prepare(sql);
  return params.length > 0 ? stmt.all(...params) : stmt.all();
}

function sqlRun(sql, params = []) {
  const database = getDb();
  const stmt = database.prepare(sql);
  return params.length > 0 ? stmt.run(...params) : stmt.run();
}

function sqlGet(sql, params = []) {
  const database = getDb();
  const stmt = database.prepare(sql);
  return params.length > 0 ? stmt.get(...params) : stmt.get();
}
```

---

## 7. Network Architecture

### 7.1 Server Mode Architecture

```
┌──────────────────────────────────────────────────────────┐
│           SERVER MODE ARCHITECTURE                        │
│                                                          │
│  ┌─────────────────┐        ┌─────────────────┐         │
│  │  This PC        │        │  Other PCs      │         │
│  │  (Server)       │        │  (Clients)      │         │
│  │                  │        │                  │         │
│  │ API Server      │◀──────▶│ HTTP Client    │         │
│  │ Port: 3001      │  HTTP  │  Requests      │         │
│  │                  │        │                  │         │
│  │ WebSocket       │◀──────▶│ WebSocket      │         │
│  │ Real-time       │  WS    │  Real-time     │         │
│  │                  │        │                  │         │
│  │ SQLite DB       │        │ (No DB)         │         │
│  └─────────────────┘        └─────────────────┘         │
└──────────────────────────────────────────────────────────┘
```

### 7.2 API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | /api/auth/login | User login |
| POST | /api/auth/refresh | Token refresh |
| GET | /api/auth/me | Current user |
| GET | /api/health | Server health |
| GET/POST/PUT/DELETE | /api/patients | Patient CRUD |
| GET/POST/PUT/DELETE | /api/tests | Test CRUD |
| GET/POST/PUT/DELETE | /api/prescriptions | Prescription CRUD |
| GET/POST/PUT/DELETE | /api/pharmacy/drugs | Drug CRUD |
| POST | /api/pharmacy/dispense | Dispense drug |
| GET/POST/PUT/DELETE | /api/inventory | Inventory CRUD |
| GET | /api/revenue | Revenue records |
| GET | /api/revenue/stats | Revenue statistics |
| GET | /api/dashboard/stats | Dashboard statistics |
| GET/POST | /api/chat | Chat messages |
| GET | /api/notifications | User notifications |
| GET | /api/presence/online | Online users |

### 7.3 WebSocket Events

| Event | Payload | Purpose |
|-------|---------|---------|
| presence | `{ userId, userName, userRole, deviceName, status }` | User online/offline |
| chat:message | `{ message object }` | New chat message |
| data:update | `{ table, action, record }` | Data changes |
| notifications:new | `{ notification object }` | New notification |

---

## 8. Role-Based Access Control

```javascript
function checkRole(allowedRoles) {
  const userRole = String(_currentUser?.role || '').toLowerCase();
  return allowedRoles.map(r => r.toLowerCase()).includes(userRole);
}

// Usage in handlers:
ipcMain.handle('pharmacy:dispense', async (event, data) => {
  if (!checkRole(['assistant'])) {
    return { success: false, error: 'Access denied. Only assistant can dispense drugs.' };
  }
  // ... rest of handler
});
```

### RBAC Matrix

| Feature | Admin | Doctor | Assistant |
|---------|-------|--------|---------|
| User Management | ✓ | | |
| Patient CRUD | ✓ | ✓ | ✓ |
| Create Tests | ✓ | ✓ | |
| View Tests | ✓ | ✓ | ✓ |
| Prescriptions | ✓ | ✓ | |
| Case Notes | ✓ | ✓ | |
| Pharmacy Dispense | | | ✓ |
| Inventory CRUD | ✓ | | ✓ |
| Settings | ✓ | | |
| Import Data | ✓ | | |
| Reports | ✓ | ✓ | ✓ |
| Chat | ✓ | ✓ | ✓ |
| CVF Workspace | | ✓ | ✓ |

---

## 9. Build & Deployment

### 9.1 electron-builder Configuration

```yaml
# electron-builder.yml
appId: com.korene.eyeclinic
productName: KORENE

asar: true
directories:
  output: release/KORENE
files:
  - dist/**/*
  - electron/**/*
  - src/**/*
  - database.js
  - package.json
  - node_modules/**/*
extraMetadata:
  main: electron/main.js
win:
  target:
    - target: dir
  signAndEditExecutable: false
```

### 9.2 Building

```bash
# Install dependencies
npm install

# Development mode
npm run dev

# Build frontend
npm run build

# Package app
npm run build:app

# Output: release/KORENE/win-unpacked/
```

### 9.3 File Locations

| Item | Location |
|------|----------|
| Config | %APPDATA%/eye-clinic/config.json |
| Database | %APPDATA%/eye-clinic/eye_clinic.db |
| Logs | %APPDATA%/eye-clinic/logs/ |
| Backups | %APPDATA%/eye-clinic/backups/ |

---

## 10. IPC Handler Modules

The IPC handlers are modularized by feature domain in `electron/ipc/handlers/`:

| Handler Module | IPC Channels | Purpose |
|--------------|-------------|----------|
| auth.js | login, logout, isFirstRun | Authentication |
| patients.js | getAll, getById, create, update, delete | Patient CRUD |
| tests.js | getAll, getById, create, update, delete | Test management |
| prescriptions.js | create, getByPatient, getPending, updateStatus | Prescription management |
| pharmacy.js | getDrugs, dispense | Pharmacy operations |
| inventory.js | getAll, create, update, delete | Inventory management |
| visits.js | getAll, getByPatient, create | Visit records |
| caseNotes.js | getAll, create, update, signOff | Case notes |
| reminders.js | getAll, create, update | Reminders |
| chat.js | getMessages, sendMessage | Chat/messaging |
| notifications.js | getAll, markRead | Notifications |
| admin.js | user management | Admin functions |
| file.js | file select, import | File operations |
| dashboard.js | getStats | Dashboard stats |
| revenue.js | getRevenue, getStats | Revenue records |
| settings.js | get, set | Settings |
| server.js | server start/stop | Server management |
| backup.js | create, restore | Backup/restore |
| presence.js | setOnline, getOnlineUsers | Online status |
| window.js | window controls | Window management |
| cvf.js | CVF workspace ops | CVF operations |

### Handler Registration Pattern

```javascript
// electron/ipc/handlers.js
module.exports = function registerHandlers(ctx) {
  require('./handlers/auth').registerAuthHandlers(ctx);
  require('./handlers/patients').registerPatientsHandlers(ctx);
  require('./handlers/tests').registerTestsHandlers(ctx);
  require('./handlers/pharmacy').registerPharmacyHandlers(ctx);
  // ... etc
};
```

### Utility Functions

```javascript
// electron/ipc/handlers/utils.js
function buildErrorResponse(err) {
  return {
    success: false,
    error: err.message || 'Unknown error',
    code: err.code || 'UNKNOWN'
  };
}

function httpRequest(url, method, body = '', headers = {}) {
  return new Promise((resolve, reject) => {
    const http = require('http');
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname,
      method: method,
      headers: { 'Content-Type': 'application/json', ...headers }
    };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve({ success: false, error: 'Invalid response' }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

module.exports = { buildErrorResponse, httpRequest };
```

---

## 11. Troubleshooting

### A.1 Login Issues

**Problem:** "Invalid credentials"
**Solution:** Check email/password, user status must be 'active'

**Problem:** "Save not available"
**Solution:** Ensure running latest build (npm run dev first)

### A.2 Network Issues

**Problem:** Cannot connect to server
**Solution:** Verify firewall allows port 3001, check IP address

### A.3 Database Issues

**Problem:** "SQLITE_NOTADB" error
**Solution:** Database file may be corrupted, restore from backup

### Default Credentials (after setup)

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@clinic.com | admin123 |
| Doctor | doctor@clinic.com | doctor123 |
| Assistant | assistant@clinic.com | assistant123 |

### Important Ports

| Port | Service |
|------|---------|
| 3001 | API Server (server mode) |
| 5173 | Vite Dev Server |

---

# Part III — Frontend Documentation

**Version:** 1.0.0 | **Date:** April 18, 2026

---

## 1. Component Architecture

### 1.1 Main App Structure

```javascript
// src/components/MainApp.jsx
export default function MainApp() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<RoleBasedDashboard />} />
            <Route path="/messages" element={<MessagesContent />} />
            <Route path="/patients" element={<PatientsContent />} />
            <Route path="/reports" element={<ReportsContent />} />
            <Route path="/inventory" element={<InventoryContent />} />
            <Route path="/pharmacy" element={<PharmacyContent />} />
            <Route path="/case-notes" element={<CaseNotesPage />} />
            <Route path="/patients/:id" element={<PatientDetailsPage />} />
            <Route path="/settings" element={<SettingsContent />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </ThemeProvider>
  );
}
```

### 1.2 React Hooks

| Hook | Purpose | Location |
|------|---------|----------|
| useUser | Current user state, login, logout | hooks/useUser.js |
| usePatients | Patient CRUD operations | hooks/usePatients.js |
| useTests | Test CRUD operations | hooks/useTests.js |
| usePrescriptions | Prescription CRUD + pending queue | hooks/usePrescriptions.js |
| usePharmacy | Drug inventory + dispensing | hooks/usePharmacy.js |
| useInventory | Clinic inventory management | hooks/useInventory.js |
| useVisits | Visit records | hooks/useVisits.js |
| useCaseNotes | Doctor case notes | hooks/useCaseNotes.js |
| useReminders | Appointment reminders | hooks/useReminders.js |
| useNotifications | User notifications | hooks/useNotifications.js |
| useMessages | Chat messages | hooks/useMessages.js |
| useServerConnection | Server mode + JWT tokens | hooks/useServerConnection.js |
| useServerEvents | WebSocket event handling | hooks/useServerEvents.js |
| useIPC | IPC communication wrapper | hooks/useIPC.js |
| useDataService | Generic CRUD operations | hooks/useDataService.js |
| useKeyboardShortcuts | Keyboard shortcuts | hooks/useKeyboardShortcuts.js |

### 1.3 Service Layer

| Service | Purpose |
|---------|---------|
| patientService | Patient API calls |
| testService | Test/Results API calls |
| prescriptionService | Prescription API calls |
| pharmacyService | Pharmacy drug API calls |
| inventoryService | Inventory API calls |
| visitService | Visit API calls |
| caseNoteService | Case note API calls |
| reminderService | Reminder API calls |
| reportService | Report generation |
| messageService | Chat API calls |
| activityLogService | Audit logging |
| revenueService | Revenue records |
| BackupService | Database backup/restore |
| HensonImportService | CVF/Henson import |
| DatabaseService | Database import/export |
| FileService | File operations |

### 1.4 Example Hook: usePatients

```javascript
// src/hooks/usePatients.js
import { useState, useEffect, useCallback } from 'react';
import { useServerEvents } from './useServerEvents';

export function usePatients() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { subscribe } = useServerEvents();

  const fetchPatients = useCallback(async () => {
    setLoading(true);
    try {
      const result = await window.electronAPI.getPatients();
      if (result.success) {
        setPatients(result.patients || []);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = subscribe('patients', (data) => {
      if (data.action === 'create') {
        setPatients(prev => [data.record, ...prev]);
      } else if (data.action === 'update') {
        setPatients(prev => prev.map(p => p.id === data.record.id ? data.record : p));
      } else if (data.action === 'delete') {
        setPatients(prev => prev.filter(p => p.id !== data.id));
      }
    });
    return unsubscribe;
  }, [subscribe]);

  useEffect(() => { fetchPatients(); }, [fetchPatients]);

  return { patients, loading, error, refetch: fetchPatients };
}
```

### 1.5 Role-Based Navigation

```javascript
const navigationConfig = {
  admin: [
    { section: 'overview', path: '/dashboard', icon: LayoutDashboard },
    { section: 'patients', path: '/patients', icon: Users },
    { section: 'pharmacy', path: '/pharmacy', icon: Pill },
    { section: 'inventory', path: '/inventory', icon: Package },
    { section: 'messages', path: '/messages', icon: MessageSquare },
    { section: 'settings', path: '/settings', icon: Settings },
  ],
  doctor: [
    { section: 'overview', path: '/dashboard', icon: LayoutDashboard },
    { section: 'patients', path: '/patients', icon: Users },
    { section: 'tests', path: '/tests', icon: FileText },
    { section: 'prescriptions', path: '/prescriptions', icon: FileText },
    { section: 'case_notes', path: '/case-notes', icon: FileText },
    { section: 'cvf', path: '/cvf', icon: Scan },
    { section: 'messages', path: '/messages', icon: MessageSquare },
  ],
  assistant: [
    { section: 'overview', path: '/dashboard', icon: LayoutDashboard },
    { section: 'patients', path: '/patients', icon: Users },
    { section: 'pharmacy', path: '/pharmacy', icon: Pill },
    { section: 'inventory', path: '/inventory', icon: Package },
    { section: 'messages', path: '/messages', icon: MessageSquare },
  ],
};
```

### 1.6 Service Pattern

```javascript
// src/services/patientService.js
export const patientService = {
  async getPatients(params = {}) {
    return window.electronAPI.getPatients(params);
  },
  async getPatientById(id) {
    return window.electronAPI.getPatientById(id);
  },
  async createPatient(data) {
    return window.electronAPI.createPatient(data);
  },
  async updatePatient(id, data) {
    return window.electronAPI.updatePatient(id, data);
  },
  async deletePatient(id) {
    return window.electronAPI.deletePatient(id);
  },
  async searchPatients(searchTerm) {
    return window.electronAPI.searchPatients(searchTerm);
  },
};
```

### 1.7 Theme Context

```javascript
// src/context/ThemeContext.jsx
const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('light');
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
```

### 1.8 Form Validation

```javascript
function validatePatientForm(data) {
  const errors = {};
  if (!data.first_name?.trim()) errors.first_name = 'First name is required';
  if (!data.last_name?.trim()) errors.last_name = 'Last name is required';
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email))
    errors.email = 'Invalid email address';
  if (data.contact && !/^\d{11}$/.test(data.contact.replace(/\D/g, '')))
    errors.contact = 'Invalid phone number';
  return { isValid: Object.keys(errors).length === 0, errors };
}
```

---

# Part IV — Issues & Bug Tracking

**Date:** April 18, 2026

---

## Severity Levels

- 🔴 **CRITICAL** — Application unusable, requires immediate fix
- 🟠 **HIGH** — Major functionality broken, affects daily operations
- 🟡 **MEDIUM** — Feature works but with issues
- 🟢 **LOW** — Minor inconvenience, cosmetic, or enhancement

---

## Resolved Issues

| ID | Description | Severity | Status |
|----|------------|----------|--------|
| #001 | Server Connection "Save not available" | 🔴 | ✅ Fixed |
| #002 | Handlers Not Registered | 🔴 | ✅ Fixed |
| #003 | IPC Not Proxying to Server | 🟠 | ✅ Fixed |
| #004 | Dispensation Token Missing | 🟠 | ✅ Fixed |
| #005 | Network Path Resolution in Package | 🟡 | ✅ Fixed |
| #006 | Profile Update Not Reflecting | 🟡 | ✅ Fixed |
| #007 | Console Statements in Production | 🟡 | ✅ Fixed |
| #008 | PatientDetailsPage JSX Syntax Error | 🟡 | ✅ Fixed |
| #009 | Hot Reload Auto-Reload | 🟢 | ✅ Fixed |
| #010 | Settings Icon Import | 🟢 | ✅ Fixed |
| #011 | Activity Logs Columns Missing | 🟢 | ✅ Fixed |

---

## Open Issues

### 🔴 Issue #012: Packaged App — "No handler registered" Error

**Description:** Application works in dev mode but fails in packaged `.exe` with:
```
Error: No handler registered for 'auth:login'
Error: No handler registered for 'auth:completeSetup'
```

**Root Cause Analysis:**
1. Silent require failures caught by try-catch, invisible in packaged app
2. Path resolution difference between dev and packaged
3. Console logging invisible in packaged app

**Diagnosis:** Added file-based logging to `%APPDATA%/korene/logs/`.

**Proposed Fixes:**
1. **Fix A:** Added file-based logging to main.js and handlers.js for diagnostics
2. **Fix B:** Inline handler registration into handlers.js (eliminates dynamic require())
3. **Fix C:** Verify electron-builder config handles paths correctly

---

## Error Code Reference

### Authentication Errors

| Code | Message | Cause |
|------|---------|-------|
| AUTH001 | "Invalid credentials" | Wrong email/password |
| AUTH002 | "User not found" | User doesn't exist |
| AUTH003 | "User disabled" | User status is 'inactive' |
| AUTH004 | "Token expired" | JWT token expired |
| AUTH005 | "Invalid token" | Malformed JWT |

### Database Errors

| Code | Message | Cause |
|------|---------|-------|
| DB001 | "SQLITE_NOTADB" | Not a valid SQLite file |
| DB002 | "SQLITE_CONSTRAINT" | Duplicate entry |
| DB003 | "SQLITE_CONSTRAINT_UNIQUE" | Record already exists |
| DB004 | "SQLITE_BUSY" | Database locked |

### Network Errors

| Code | Message | Cause |
|------|---------|-------|
| NET001 | "ECONNREFUSED" | Server not running |
| NET002 | "ETIMEDOUT" | Connection timeout |
| NET003 | "Server unavailable" | Server down |
| NET004 | "Save not available" | Config save function missing |

### Permission Errors

| Code | Message | Cause |
|------|---------|-------|
| PERM001 | "Access denied" | Insufficient permissions |
| PERM002 | "Admin only" | Requires admin role |
| PERM003 | "Doctor only" | Requires doctor role |
| PERM004 | "Assistant only" | Requires assistant role |

---

## Build Issues

| Issue | Error Message | Cause | Solution |
|-------|--------------|-------|----------|
| Access Denied | "Access is denied. d3dcompiler_47.dll" | App running, files locked | Close app before rebuild |
| electron-builder | "ERR_ELECTRON_BUILDER_CANNOT_EXECUTE" | Files in use | Stop app, then rebuild |
| native module | "better-sqlite3 rebuild failed" | Build tools missing | npm install |

### Version Compatibility

| Package | Version | Status |
|---------|---------|--------|
| Electron | 38.x | ✅ Stable |
| React | 19.x | ✅ Stable |
| Vite | 7.x | ✅ Stable |
| better-sqlite3 | 12.x | ✅ Stable |
| bcryptjs | 3.x | ✅ Stable |
| Tailwind CSS | 3.x | ✅ Stable |

---

# Part V — Management & Planning

**Date:** April 18, 2026

---

## Current Issues

| Issue | Priority | Description | Status |
|-------|----------|-------------|--------|
| Server Connection Save Fix | High | "Save not available" error | ✅ Fixed |
| Packaging Build Issue | High | "Access is denied" | Workaround |
| No automated UI tests | Low | Manual testing required | Pending |
| SQL Server sync optional | Low | Requires mssql dependency | Pending |
| Large imports need staging | Low | Memory management >1GB data | Pending |

---

## Planned Features

### Near Term (Next Sprint)

- Server Mode Testing — Test server-client across multiple PCs
- Multi-PC Demo — Demonstrate networked mode working

### Medium Term (Next Quarter)

- Automated UI Tests — Jest + React Testing Library setup
- Batch Import Queue — Progress, retries, resume for large imports
- Schema Migration Preview — Show diff before applying changes
- Enhanced Reports — More PDF export options

### Long Term (Future)

- SQL Server Full Integration — Complete SQL Server support
- Mobile Companion App — Staff can view on mobile
- Cloud Backup — Automatic cloud backup integration
- Performance Optimization — Large dataset handling (>10,000 patients)

---

## Architecture Decisions

| Decision | Options | Current Choice |
|----------|---------|---------------|
| Primary DB | SQLite / SQL Server | SQLite |
| Sync Approach | Manual / Scheduled / Real-time | Real-time WebSocket |
| Server Platform | This PC / Dedicated Server | This PC for small clinic |
| API Port | 3001 / Custom | 3001 |
| Token Expiry | 15min access / 7d refresh | Current |
| Session Storage | sessionStorage / localStorage | sessionStorage |

---

## TODO

### Build & Deployment
- [ ] Test Save Connection button works
- [ ] Test server mode with multiple PCs
- [ ] Verify all CRUD operations work in server mode

### Server Proxy Verification
- [ ] Test all IPC handlers proxy to server correctly
- [ ] Verify data saves to server, not local SQLite
- [ ] Test WebSocket real-time updates

### Authentication Token Sync
- [ ] Test pharmacy dispensation in server mode
- [ ] Verify token syncs correctly after login

### Frontend
- [ ] Add automated UI tests (Jest setup)
- [ ] Performance test with 1000+ patients
- [ ] Test responsive layout on different screen sizes
- [ ] Verify dark mode works correctly

### Backend
- [ ] Test all 40+ IPC handlers
- [ ] Verify server proxy works for all CRUD operations
- [ ] Test WebSocket reconnection on network drop

### Security
- [ ] Audit password requirements
- [ ] Verify JWT token handling
- [ ] Check role-based access for all features

---

## Change Log

### 2026-04-18
- Created comprehensive documentation files
- Fixed server connection "Save not available" issue
- Updated main.js with saveConfig function

### 2026-04-14
- Completed ServerManager modular split
- Fixed pharmacy revenue tracking

### 2026-04-13
- Migrated to server-client architecture
- Split handlers.js into 19 modular files

---

## Key Commands

```bash
npm run dev              # Development mode
npm run build            # Build frontend
npm run build:app        # Package app
npm run setup:server     # Setup server database
npm run start:server     # Run server
npm run setup-db         # Setup local database
```

---

# Part VI — Developer Workflow

## Quick Start for Development (Hot Reload)

**Always use this for development with live changes:**

```bash
# Kill all terminals first
# Then run:
npm run dev
```

This starts:
- Vite dev server: http://localhost:5173 (Hot Module Replacement ✅)
- Electron: Loads dev server URL, auto-reloads on code changes

**Changes appear instantly** in the app without rebuild.

## Don't Use These for Development
- `npm run electron` or `electron-dev`: No dev server, no reload
- Manual `electron .`: Same issue

## Test Production Build
```bash
npm run build  # Build dist/
npm run dist:win  # Create installer
```

## Installer Testing
- Generated in `installer-output/KORENE-1.0.0.exe`
- Copy to Desktop/other PC
- Install/run as regular user
- Database auto-creates in `%APPDATA%/eye-clinic/`

## Troubleshooting
**Changes not showing?**
1. Kill all terminals (`Ctrl+C`)
2. `npm run dev`
3. Edit `src/App.jsx` (add console.log)
4. Save - should reload automatically
5. Check DevTools console (auto-opens)

**Installer crashes on other PC?**
- Run `npm run dist:win` after `npm run build`
- Test the .exe installer
- Check Windows Event Viewer for errors

---

# Part VII — Installation Guide

## System Architecture (Network Setup)

```
┌──────────────────────────────────────────────────────────┐
│                    SERVER COMPUTER                        │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Shared Folder: C:\EyeClinicDB                   │   │
│  │  ├── eye_clinic.db (SQLite database)             │   │
│  └──────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────┘
              │
              └──────────────┬──────────────┐
                             │              │
                             ▼              ▼
                       ┌──────────┐   ┌──────────┐
                       │ Computer │   │ Computer │
                       │    1    │   │    2    │
                       │ (Admin) │   │(Doctor) │
                       └──────────┘   └──────────┘
```

## Prerequisites

### Server Requirements
- Windows 10/11
- Network connection (LAN)
- Static IP or computer name accessible by other PCs
- At least 500MB free disk space

### Client Requirements
- Windows 10/11
- Network access to server computer
- At least 500MB free disk space

## Step 1: Prepare Server

On the server computer:
1. Create folder: `C:\EyeClinicDB`
2. Right-click → Properties → Sharing → Share
3. Add users with Read/Write access
4. Note computer name or IP address

## Step 2: Install Application

Copy the packaged app to each computer (recommended: `C:\Program Files\Eye Clinic`).

## Step 3: Configure Network Database

1. Log in as Admin
2. Settings → System Settings → Configure Network
3. Enable Network Mode (toggle ON)
4. Enter server path: `\\SERVERNAME\EyeClinicDB`
5. Test Connection → Save

## Step 4: Configure Client Computers

1. On each client PC, log in as Admin
2. Go to Settings → Configure Network
3. Enable Network Mode
4. Enter the same server path
5. Test Connection → Save

## Step 5: Setup SQL Server (Server Mode)

On the server PC:
```bash
set DB_USER=eyetest
set DB_PASSWORD=EyeClinic123!
npm run setup:server
npm run start:server
```

On client PCs:
- Go to Settings > Server Connection
- Enter server IP (e.g., `http://192.168.1.100:3001`)
- Connect and login with clinic credentials

## Maintenance

- **Backup Database**: Settings → Create Backup (weekly recommended)
- **Update Application**: Close app on ALL computers, copy new files, restart
- **Monitor**: Check Network Configuration screen for sync status

---

# Part VIII — Quick Start Guide (Technician)

## Setup Steps

```
□ Create folder: C:\EyeClinicDB
□ Share with Read/Write access
□ Note computer name (e.g., DESKTOP-SERVER)

On each computer:
□ Copy win-unpacked to C:\Program Files\Eye Clinic
□ Create desktop shortcut
□ Launch app and create admin account

Admin configuration:
□ Login as Admin
□ Settings → Configure Network
□ Enable Network Mode
□ Enter: \\SERVERNAME\EyeClinicDB
□ Test Connection → Save
```

## Daily Use Notes

- **Auto-sync** runs every 30 seconds
- **Manual sync**: Click "Sync Now" button
- **Conflicts**: Shown in Network Config screen
- **Backup**: Settings → Create Backup weekly

## Common Issues

| Problem | Quick Fix |
|---------|-----------|
| Can't connect | Check server is on, ping server name |
| Database locked | Wait 5 seconds, try again |
| Sync not working | Click "Sync Now" manually |
| Conflict | Resolve in Network Config → Conflicts |

---

# Part IX — Complete Change History

## Phase 2.2: Logger Refactoring (April 17-18, 2026)

All `console.log/warn/error` statements in `src/` replaced with production logger utility.

### Logger Utility (`src/utils/logger.js`)
- Configurable log levels (debug, info, warn, error)
- Sensitive data redaction (passwords, tokens, emails, phone numbers)
- Production mode support (logs to file, hides debug in production)
- Prefixes: `[DEBUG]`, `[INFO]`, `[WARN]`, `[ERROR]`

### Import Pattern
```javascript
import logger from '../utils/logger';
logger.debug('Component: Message', { metadata });
logger.info('Component: Message', { metadata });
logger.warn('Component: Message', { error: err.message });
logger.error('Component: Error description', { error: err.message });
```

### Files Updated
30+ files across components, hooks, services, pages, and context replaced console statements with logger calls. Build verified after each batch.

---

## ServerManager Modular Split (April 14, 2026)

The monolithic `electron/server/ServerManager.js` (~810 lines) split into 19 modular files:

| File | Purpose |
|------|---------|
| `electron/server/config.js` | JWT secrets, SQL config loading |
| `electron/server/database.js` | Pool, sqlQuery, initialize, close |
| `electron/server/auth.js` | Tokens, middleware |
| `electron/server/websocket.js` | WebSocket setup, broadcast |
| `electron/server/routes/index.js` | Route registration aggregator |
| `electron/server/routes/health.js` | Health check |
| `electron/server/routes/auth.js` | Login, refresh, logout, me |
| `electron/server/routes/patients.js` | Patient CRUD |
| `electron/server/routes/tests.js` | Test CRUD |
| `electron/server/routes/inventory.js` | Inventory CRUD |
| `electron/server/routes/pharmacy.js` | Pharmacy drugs & dispense |
| `electron/server/routes/prescriptions.js` | Prescriptions CRUD |
| `electron/server/routes/chat.js` | Chat messages |
| `electron/server/routes/settings.js` | Settings CRUD |
| `electron/server/routes/dashboard.js` | Dashboard stats |
| `electron/server/routes/activity-logs.js` | Activity logs |
| `electron/server/routes/reports.js` | Reports CRUD |
| `electron/server/routes/notifications.js` | Notifications |
| `electron/server/routes/presence.js` | Presence tracking |
| `electron/server/routes/users.js` | User management |
| `electron/server/routes/server.js` | Server status |
| `electron/server/routes/revenue.js` | Revenue records |

### Drug Dispense → Revenue Flow

When assistant dispenses a drug:
1. Records dispensation in `pharmacy_dispensations` table
2. Reduces drug stock in `pharmacy_drugs`
3. Records revenue in `revenue` table (amount = unit_price × quantity)
4. Broadcasts `data:update` for pharmacy, revenue, dashboard

### Fixed useKeyboardShortcuts.js
- Added null check for `event.key` to prevent TypeError

### Fixed Prescription API
- Added `/api/prescriptions/multiple` endpoint
- Fixed field mapping (accepts both snake_case and camelCase)
- Fixed response format (returns `prescription` and `prescriptions` keys)

### Files Created
- `electron/server/routes/revenue.js`
- `src/services/revenueService.js`
- `electron/ipc/handlers/revenue.js`

---

## Server-Client Architecture Migration (April 13, 2026)

### Architecture Change: P2P → Server-Client

**Before (P2P Shared Database):**
- All computers shared ONE SQLite database file on a network path
- Complex sync timers and conflict resolution
- WAL mode for concurrent access

**After (Server-Client):**
- Server PC runs Node.js backend + SQL Server/SQLite (port 3001)
- Clients connect via HTTP REST API + WebSocket
- JWT authentication (access token: 15 min, refresh token: 7 days)
- Centralized data storage

### Files Deleted (P2P Removal)
- `src/services/LanSyncService.js`
- `src/services/NetworkConfigService.js`
- `src/services/SyncService.js`
- `src/services/SqlServerService.js`
- `src/services/SchemaSyncService.js`
- `src/pages/NetworkConfigScreen.jsx`

### Files Created
- `scripts/setup-server.js` — SQL Server database setup
- `scripts/start-server.js` — Standalone Node.js backend server

### NPM Scripts Added
```bash
npm run setup:server  # Create SQL Server database + tables + admin user
npm run start:server  # Start backend server (port 3001)
```

---

## handlers.js Modular Split (April 13, 2026)

The monolithic `electron/ipc/handlers.js` (~2234 lines) split into 22 modular files in `electron/ipc/handlers/`. Main `handlers.js` now ~65 lines.

### Modular Files Created
| File | Purpose |
|------|---------|
| utils.js | Shared helpers: mapDatabaseError, buildErrorResponse, getTimeAgo |
| auth.js | Auth: login, logout, isFirstRun, completeSetup |
| patients.js | Patient CRUD: getAll, getById, create, update, delete, search |
| tests.js | Test CRUD, attachCvfToDocuments |
| reports.js | Report: getAll, getById, generate, export, delete |
| inventory.js | Inventory CRUD + low stock + expiring |
| pharmacy.js | Drug CRUD + dispense |
| prescriptions.js | Create, getPending, updateStatus |
| notifications.js | getAll, markRead, markAllRead |
| admin.js | User management, activity logs, case studies |
| file.js | File/DB: import, backup, analyze BAK |
| chat.js | Messages, markRead, getUnreadCount |
| presence.js | Online/offline tracking |
| settings.js | Get/set settings |
| system.js | Health, network path, CVF watch |
| cvf.js | CVF file operations |
| window.js | Window controls |
| dashboard.js | Stats, sales records |
| server.js | Server start/stop/config |
| revenue.js | Revenue logs & stats |
| visits.js | Visit CRUD |
| case-notes.js | Case note CRUD + signoff |

---

## Data Persistence Fix (April 13, 2026)

**Root Cause:** ALL IPC handlers were calling DatabaseService directly (SQLite), completely bypassing the server even when server mode was configured. Data saved to LOCAL SQLite, server (SQL Server) never received data.

**Fix:** All IPC handlers rewritten to check `ctx.appConfig?.serverUrl` and proxy to server when available. Each handler:
1. Checks if `serverUrl` is configured
2. If yes: makes HTTP request to server and returns result
3. If no: falls back to local SQLite via DatabaseService
4. Broadcasts `server:dataUpdate` events for WebSocket clients

### Files Updated (IPC Handlers with server proxy):
patients.js, inventory.js, tests.js, prescriptions.js, chat.js, reports.js, pharmacy.js, notifications.js, dashboard.js, presence.js

---

## User/Token Sync Fix & Pharmacy Restriction (April 14, 2026)

**Problem:** When frontend logged in via `fetch()` (server mode), `_currentUser` and `_accessToken` in IPC handlers were never set, causing dispensation failures.

**Solution:** Added `auth:syncUser` IPC handler that syncs both user AND tokens to IPC handler context in a single call.

**Pharmacy Restricted to Assistant Only:**
- Before: admin, doctor, assistant could dispense
- After: ONLY assistant can dispense

---

## Case Notes Delete Feature (April 14, 2026)

- Added delete button next to Edit on each case note card
- Confirmation dialog before deletion
- Uses `testService.deleteTest()` to remove record
- File: `src/pages/CaseNotesPage.jsx`

---

## JSX Syntax Fixes (April 14, 2026)

- Fixed PatientDetailsPage.jsx — removed duplicate/malformed ternary expression
- Fixed CaseNotesPage.jsx — corrected import paths
- Fixed SettingsContent.jsx — removed stray closing tag

---

## Hot Reload Removal & Profile Update Fix (March 24, 2026)

- Removed `electron-reload` from main.js
- Profile updates now dispatch `userProfileUpdated` custom event
- Removed `window.location.reload()` from logout
- Components auto re-render with updated user data

---

## Pharmacy Revenue Fix (March 24, 2026)

- Added `unit_price` column to `pharmacy_dispensations` table
- Added `patient_id` column to `revenue` table
- Revenue properly recorded when drugs are dispensed
- Dashboard broadcasts refresh events after dispensation

### Admin Dashboard Cleanup
- Removed database import functionality (Analyze BAK, Import External Intelligence)
- Added Doctor Case Studies tab
- Added "Clear Database" button
- Financial Overview moved to Financial Oversight section

---

## Network Architecture Simplification (March 24, 2026)

**Before (Complex Sync):**
- Each computer had its own local database
- JSON sync files exported/imported
- Complex conflict resolution

**After (Simple Shared Database):**
- All computers share ONE SQLite database file on network path
- No data sync/export/import needed
- Only presence broadcast remains

---

## Earlier Changes (Summary)

- Complete multi-computer network database synchronization system
- Network Configuration Screen with sync features
- Activity Logs with time filters (5 min, 1 hour, 24 hours, 7 days)
- Online Users Panel with device names
- Today's Intake tracking (new clients registered today)
- Renamed "Tests" to "Results" throughout UI
- CVF incoming PDF watch folder workflow
- Doctor Case Note workflow with full clinical form (50+ fields)
- Auto-fill case note fields from CVF results
- Case Notes tab in patient profiles with PDF export
- Client type + marital status fields in patient creation
- Role-restricted features (CVF Workspace, Test creation)
- Custom SVG icons to replace lucide-react
- Idempotent IPC registration for critical channels
- Preload unification (root preload delegates to electron/preload.js)
- SQL Server configuration and connection testing in Settings
- Offline-first: SQLite primary, SQL Server optional

---

# Part X — Archived Legacy Documentation

The following content from previously deleted documentation files is preserved here for historical reference.

---

## Archived: BAK Conversion Guide

### Supported Input Formats

- SQLite files: `.sqlite`, `.db`, or SQLite-formatted `.bak`
- SQL dump files: `.sql`, `.bak`, `.txt` containing SQL statements
- Delimited text: `.csv`, `.tsv`, `.txt`, `.bak`
- SQL Server backups: true `.bak` backups (requires SQL Server tooling)

### Conversion Strategy Order

1. Detect and copy if source is valid SQLite
2. Parse and execute if source is SQL dump
3. Parse delimited/text records and generate SQLite tables
4. Attempt SQL Server restore/export path when tooling exists

### Admin Workflow

1. Admin selects `Analyze BAK File Format`
2. Review format report and recommended action
3. Run `Import External Intelligence`
4. System converts (if needed), validates, and imports
5. Restart app when prompted
6. Verify imported data and schema visibility in UI

### Manual Python Script

```bash
python scripts/convert_bak_to_sqlite.py input_file.bak output_file.sqlite
```

---

## Archived: CVF Implementation Log

**Date:** February 20, 2026

### CVF Workspace Features
- Analyze Henson export file
- Import single Henson export file
- Import Henson export folder
- View imported Henson CVF test records
- Edit and save: result, diagnosis, caseStudy, notes
- Metadata tracking: lastUpdatedBy, lastUpdatedByRole, lastUpdatedAt

### Case Study Board
- Search filter (patient/diagnosis/notes)
- Result filter
- Sign-off state filter (signed/pending)
- Eye filter
- Date range filter
- Select-all and multi-row selection

### Batch Update (Assistant)
- Batch fields: result, diagnosis, notes
- Empty batch fields keep current values

### Doctor Sign-Off
- Sign Off / Revoke Sign Off
- Metadata stored in `tests.raw_data.signoff`
- status, signedOffBy, signedOffRole, signedOffAt

### Audit Trail
- Actions tracked: case-study-updated, case-study-batch-updated, case-study-signed-off, case-study-sign-off-revoked

### CVF → Client Documents
- Attach CVF to patient documents
- Creates report entry in `reports` table
- Patient documents section shows all reports

---

## Archived: BAK Import — Implementation Summary

### Problem
Legacy `.bak` files from .NET/C# system were not in SQLite format, causing "SQLITE_NOTADB" errors.

### Solution
Multi-strategy Python conversion script:
- Strategy 1: Direct SQLite detection and copy
- Strategy 2: SQL dump file parsing
- Strategy 3: CSV/text format extraction
- Strategy 4: SQL Server backup restoration (optional)

### Data Flow
```
User clicks "Import External Intelligence"
  → File dialog opens
  → Python conversion script invoked
  → Converted file validated
  → Data imported via importExternalDatabase()
  → Tables mapped from legacy to clinic schema
  → User prompted to restart
```

---

## Archived: Production Readiness Report (Feb 20, 2026)

### Completed
- IPC handler stability hardening (idempotent registration)
- Preload unification (root preload → electron/preload.js bridge)
- Build verification passed (syntax checks + frontend build)

### Status
**Release Candidate (RC)** — Pending operational sign-off

### Required Sign-Off Checks
1. Startup/restart reliability (cold start 5x)
2. Role workflows (admin/doctor/assistant)
3. Messaging/notifications routing
4. Import stress test (real .bak file)
5. Installer + clean machine validation
6. Backup/rollback procedure

---

## Archived: Launch Ready Report (Jan 16, 2026)

### Fixed Issues
- Broken import paths in main.js
- SyncService initialization bug (singleton vs class instance)
- 30+ missing DatabaseService methods

### Build Status
```
Frontend Build: ✅ Complete (Vite - 3.60s)
Backend Build: ✅ Complete
Electron Package: ✅ Complete (unpacked version)
```

### Known Limitations
1. Report PDF generation currently saves as JSON placeholder
2. Installer creation may timeout on slow systems

---

*This README consolidates all documentation from the project into a single file. Last updated: April 18, 2026.*
