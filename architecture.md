# KORENE Eye Clinic Management System - Complete Architecture Documentation

**Version:** 1.0.0  
**Date:** April 18, 2026  
**Author:** Development Team

---

## Table of Contents

1. Executive Summary
2. Technology Stack
3. Application Modes
4. Layer Architecture
5. Data Flow & Processing
6. Database Schema
7. User Roles & Permissions
8. Frontend Architecture
9. Backend Architecture
10. Network Architecture
11. Build & Deployment
12. Current Status
13. History (from CONTEXT.md)

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

### 2.1 Runtime & Framework

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

### 2.2 Dependencies (package.json)

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

### 2.3 NPM Scripts

| Script | Command | Purpose |
|--------|---------|---------|
| dev | concurrently "vite" + electron | Development mode |
| build | vite build | Frontend production build |
| build:app | vite build + electron-builder | Package desktop app |
| setup-db | node scripts/setup-database.js | Initialize SQLite |
| setup:server | node scripts/setup-server.js | Setup server database |
| start:server | node scripts/start-server.js | Run server mode (port 3001) |

---

## 3. Application Modes

### 3.1 Three Running Modes

```
┌─────────────────────────────────────────────────────────────────┐
│                    APPLICATION MODES                              │
├─────────────────────────────────────────────────────────────────┤
│  MODE 1: STANDALONE (Default)                                   │
│  ┌─────────────────┐                                           │
│  │  This PC       │  →  Local SQLite Database               │
│  │  (Client)     │    (%APPDATA%/eye-clinic/)              │
│  └─────────────────┘                                           │
│                                                                  │
│  MODE 2: SERVER MODE (This PC runs backend)                       │
│  ┌─────────────────┐         ┌─────────────────┐             │
│  │  This PC       │ ←─────── │  Node.js API    │             │
│  │  (Server)     │  Port   │  Server        │             │
│  │               │  3001   │  + SQLite      │             │
│  └─────────────────┘         └─────────────────┘             │
│         │                                                      │
│         │  HTTP + WebSocket                                   │
│         ↓                                                     │
│  ┌─────────────────┐                                         │
│  │  Other PCs      │  (Networked clients)                   │
│  └─────────────────┘                                         │
│                                                                  │
│  MODE 3: CLIENT MODE (Connect to remote server)                  │
│  ┌─────────────────┐         ┌─────────────────┐             │
│  │  This PC      │ ──────── │  Remote Server │             │
│  │  (Client)     │  HTTP   │  (Server PC)  │             │
│  └─────────────────┘         └─────────────────┘             │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Setting Up Server Mode

**On the Server PC:**
```bash
# 1. Set up the database (one time only)
npm run setup:server

# 2. Start the server
npm run start:server

# Server runs on port 3001
```

**On Client PCs:**
1. Run the packaged app (KORENE.exe)
2. Go to Settings → Server Connection
3. Enter server IP (e.g., http://192.168.1.100:3001)
4. Save and restart
5. Login with server credentials

### 3.3 Configuration (config.json)

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

### 3.3 Configuration Flow

```javascript
// electron/main.js
function loadConfig() {
  const fs = require('fs');
  const cfgPath = path.join(app.getPath('userData'), 'config.json');
  try {
    if (fs.existsSync(cfgPath)) {
      return JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
    }
  } catch (e) {
    console.warn('[Config] Could not load config:', e.message);
  }
  return { isServerMode: false, serverUrl: '', serverPort: 3001 };
}

function saveConfig(newConfig) {
  const fs = require('fs');
  const cfgPath = path.join(app.getPath('userData'), 'config.json');
  try {
    fs.writeFileSync(cfgPath, JSON.stringify(newConfig, null, 2));
    return true;
  } catch (e) {
    console.error('[Config] Save failed:', e.message);
    return false;
  }
}
```

---

## 4. Layer Architecture

### 4.1 High-Level Layer Diagram

```
┌──────────────────────────────────────────────��──────────────┐
│                     PRESENTATION LAYER                       │
│  ┌───────────────────────────────────────────────────┐     │
│  │  React Components (45+ components)              │     │
│  │  • Pages: Dashboard, Patients, Tests, Pharmacy  │     │
│  │  • Layouts: Header, Sidebar, Main App             │     │
│  │  • Modals: Add Patient, Prescribe, Dispense       │     │
│  │  • Forms: Admin, Doctor, Assistant Login          │     │
│  │  • UI: Button, Input, Modal, Select, Badge      │     │
│  └────────────────────────────────────────────��────┘     │
│                              │                           │
│                              │ React Hooks               │
│                              ↓                           │
│  ┌───────────────────────────────────────────────────┐     │
│  │  Service Layer (16 services)                   │     │
│  │  patientService, testService, etc.            │     │
│  └─────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
              │
              │ IPC Bridge (contextBridge)
              ↓
┌─────────────────────────────────────────────────────────────┐
│                     PRELOAD LAYER                         │
│  ┌───────────────────────────────────────────────────┐     │
│  │  electron/preload.js (290 lines)                  │     │
│  │  • Exposes 50+ safe APIs to renderer            │     │
│  │  • Validates and sanitizes inputs                │     │
│  └───────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
              │
              │ IPC Channels (40+ handlers)
              ↓
┌─────────────────────────────────────────────────────────────┐
│                     MAIN PROCESS LAYER                      │
│  ┌───────────────────────────────────────────────────┐     │
│  │  electron/main.js + IPC Handlers (modular)        │     │
│  │  • Database operations (SQLite)                 │     │
│  │  • File system access                          │     │
│  │  • 40+ IPC handlers split by feature domain   │     │
│  └───────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
              │
              ↓
┌─────────────────────────────────────────────────────────────┐
│                     DATA LAYER                              │
│  ┌───────────────────────────────────────────────────┐     │
│  │  database.js (SQLite via better-sqlite3)            │     │
│  │  • 20+ tables                                   │     │
│  │  • WAL mode, Foreign keys                       │     │
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
┌─────────────────────────────────────────────────────────┐
│                  LOGIN FLOW                            │
│                                                  │
│  1. User visits /auth.html                         │
│         ↓                                         │
│  2. Enters email + password                       │
│         ↓                                         │
│  3. window.electronAPI.login({ email, password }) │
│         ↓                                         │
│  4. Preload forwards to IPC: "auth:login"          │
│         ↓                                         │
│  5. IPC Handler checks:                          │
│     • Standalone mode: local SQLite            │
│     • Server mode: HTTP proxy             │
│         ↓                                         │
│  6. Password verified with bcrypt.compare()    │
│         ↓                                         │
│  7. Returns user + JWT (server mode)         │
│         ↓                                         │
│  8. Main App loads with role-based access    │
│                                                  │
└─────────────────────────────────────────────────────────┘
```

### 5.2 Authentication Code Snippet

```javascript
// electron/ipc/handlers/auth.js
ipcMain.handle('auth:login', async (event, { email, password }) => {
  const serverUrl = ctx.appConfig?.serverUrl;
  
  if (serverUrl) {
    // Server mode: proxy to remote server
    const result = await httpRequest(`${serverUrl}/api/auth/login`, 'POST', 
      JSON.stringify({ email, password }));
    return result;
  }
  
  // Standalone mode: local SQLite
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
┌─────────────────────────────────────────────────────────┐
│              CREATE PATIENT FLOW                       │
│                                                  │
│  User Action                                       │
│      ↓                                             │
│  AddPatientModal.jsx                                │
│      • User fills form                            │
│      ↓                                             │
│  usePatients hook                                │
│      calls createPatient(data)                   │
│      ↓                                             │
│  patientService.js                             │
│      window.electronAPI.createPatient(data)      │
│      ↓                                             │
│  preload.js                                     │
│      ipcRenderer.invoke('patients:create')     │
│      ↓                                             │
│  IPC Handler (patients.js)                     │
│      Check serverUrl                             │
│         ├─ Server URL: HTTP POST              │
│         └─ No server: SQLite INSERT           │
│      ↓                                             │
│  Database.js                                  │
│      INSERT INTO patients                      │
│      ↓                                             │
│  WebSocket Broadcast (server mode)             │
│      broadcast('data:update', {...})          │
│      ↓                                             │
│  All Clients: useServerEvents re-fetches    │
│                                                  │
└─────────────────────────────────────────────────────────┘
```

### 5.4 Server Proxy Pattern

```javascript
// electron/ipc/handlers/patients.js
ipcMain.handle('patients:getAll', async (event, params = {}) => {
  const serverUrl = ctx.appConfig?.serverUrl;
  
  if (serverUrl) {
    // Proxy to remote server
    const url = `${serverUrl}/api/patients`;
    const result = await httpRequest(url, 'GET', '', { 
      'Authorization': `Bearer ${getToken()}` 
    });
    return result;
  }
  
  // Direct SQLite query
  const patients = Database.sqlQuery(
    'SELECT * FROM patients ORDER BY created_at DESC'
  );
  return { success: true, patients };
});
```

### 5.5 Real-Time Updates Flow (WebSocket)

```
┌─────────────────────────────────────────────────────────┐
│              WEBSOCKET UPDATE FLOW                     │
│                                                  │
│  Server Mode:                                     │
│  ┌──────────────┐         ┌──────────────┐       │
│  │ Server PC  │────────▶│ WebSocket │       │
│  │ Port 3001  │         │  Clients  │       │
│  └──────────────┘         └──────────────┘       │
│       │                                               │
│       │ Events:                                      │
│       │ • presence: { userId, status }               │
│       │ • chat:message: { message }                │
│       │ • data:update: { table, action }           │
│       │ • notifications:new: { notification }    │
│       │                                               │
│       ↓                                             │
│  Client: useServerEvents hook updates React state │
│                                                  │
└─────────────────────────────────────────────────────────┘
```

### 5.6 WebSocket Implementation (Server)

```javascript
// scripts/start-server-standalone.js
const WebSocket = require('ws');
const wss = new WebSocket.Server({ server });

const clients = new Map(); // ws → { userId, userName, userRole, deviceName }

function broadcast(type, data) {
  const msg = JSON.stringify({ type, data });
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      try { client.send(msg); } catch {}
    }
  });
}

wss.on('connection', (ws, req) => {
  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      if (msg.type === 'auth') {
        const clientInfo = {
          userId: msg.userId,
          userName: msg.userName,
          userRole: msg.userRole,
          deviceName: msg.deviceName || 'Unknown'
        };
        clients.set(ws, clientInfo);
        ws.send(JSON.stringify({ type: 'connected', timestamp: Date.now() }));
        broadcast('presence', { ...clientInfo, status: 'online' });
      }
    } catch {}
  });
  
  ws.on('close', () => {
    const info = clients.get(ws);
    clients.delete(ws);
    if (info) {
      broadcast('presence', { userId: info.userId, status: 'offline' });
    }
  });
});
```

---

## 6. Database Schema

### 6.1 Database Initialization

```javascript
// electron/server/database.js
function getDb() {
  if (!db) {
    const dbPath = getDbPath();
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    db.pragma('busy_timeout = 5000');
    initializeTables();
  }
  return db;
}
```

### 6.2 Complete Table Structure

| Table | Purpose | Key Fields |
|-------|---------|-----------|
| **users** | System users | id, first_name, last_name, email, password_hash, role, status |
| **patients** | Patient records | id, patient_id (P-XXXXXX), first_name, last_name, dob, gender, contact, email |
| **visits** | Patient visits | id, patient_id, visit_date, visit_type, payment_status, amount_paid |
| **tests** | Test results | id, patient_id, test_date, eye, machine_type, raw_data (JSON), report_status |
| **case_notes** | Doctor case notes | id, patient_id, doctor_id, diagnosis, recommendation, status |
| **prescriptions** | prescriptions | id, patient_id, doctor_id, drug_id, quantity, status |
| **prescription_dispensations** | Dispensed Rx | id, prescription_id, dispensed_by, payment_received |
| **pharmacy_drugs** | Pharmacy inventory | id, drug_code, drug_name, current_quantity, unit_price |
| **pharmacy_dispensations** | Drug issues | id, drug_id, patient_id, quantity, total_amount |
| **inventory** | Clinic inventory | id, item_code, item_name, category, current_quantity |
| **revenue** | Financial records | id, source, amount, patient_id, collected_by |
| **chat** | Internal messaging | id, sender_id, receiver_id, message_text, status |
| **notifications** | User notifications | id, user_id, title, message, type, status |
| **activity_logs** | Audit trail | id, user_id, action_type, entity_type, description |
| **settings** | App configuration | id, setting_key, setting_value |
| **user_presence** | Online status | user_id, is_online, last_seen |
| **appointment_reminders** | Patient reminders | id, patient_id, appointment_date, status |
| **case_note_attachments** | CVF attachments | id, case_note_id, test_id, file_path |
| **reports** | Generated reports | id, patient_id, report_type, title |

### 6.3 Users Table Schema

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

### 6.4 Patients Table Schema

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

### 6.5 Tests Table Schema

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

### 6.6 Case Notes Table Schema

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

### 6.7 Prescriptions Table Schema

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

### 6.8 Revenue Table Schema

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

### 6.9 Database Helper Functions

```javascript
// electron/server/database.js
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

module.exports = { getDb, sqlQuery, sqlRun, sqlGet, sqlInsert, close, initialize };
```

---

## 7. User Roles & Permissions

### 7.1 Role Definitions

| Role | Dashboard | Primary Capabilities |
|------|-----------|----------------------|
| **admin** | Admin Dashboard | User management, imports, settings, all CRUD |
| **doctor** | Doctor Dashboard | Prescriptions, case notes, tests, view patients |
| **assistant** | Assistant Dashboard | Pharmacy dispensing, inventory, patient updates |

### 7.2 Role-Based Access Control (RBAC) Matrix

| Feature | Admin | Doctor | Assistant |
|---------|-------|--------|---------|
| User Management | ✓ | | |
| Patient CRUD | ✓ | ✓ | ✓ |
| View Patients | ✓ | ✓ | ✓ |
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

### 7.3 Role Implementation in Handlers

```javascript
// electron/ipc/handlers/auth.js
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

---

## 8. Frontend Architecture

### 8.1 Component Hierarchy

```
index.jsx (Entry Point)
    │
    ├── AuthApp (/auth.html)
    │     ├── LoginScreen
    │     ├── SetupScreen
    │     ├── AdminRegistrationForm
    │     ├── DoctorRegistrationForm
    │     └── AssistantRegistrationForm
    │
    └── MainApp (index.html)
          ├── ThemeProvider
          ├── BrowserRouter
          │     ├── /dashboard → DashboardContent
          │     ├── /patients → PatientsContent
          │     ├── /tests → TestsContent
          │     ├── /prescriptions → PrescriptionsContent
          │     ├── /pharmacy → PharmacyContent
          │     ├── /inventory → InventoryContent
          │     ├── /reports → ReportsContent
          │     ├── /settings → SettingsContent
          │     ├── /messages → MessagesContent
          │     ├── /case-notes → CaseNotesPage
          │     └── /cvf → CVFWorkspaceContent
          │
          ├── Layout
          │     ├── Header (Logo, SearchBar, NotificationBell, UserMenu)
          │     └── Sidebar (NavigationItems, RoleIndicator, OnlineUsers)
          │
          ├── LoadingScreen
          ├── DynamicTableView
          │
          └── Modals (Portal)
                ├── AddPatientModal
                ├── PrescribeModal
                ├── DispenseModal
                ├── UploadTestModal
                ├── EditTestModal
                ├── GenerateReportModal
                ├── PatientQuickViewModal
                └── NewMessageModal
```

### 8.2 React Hooks (State Management)

| Hook | Purpose | Location |
|------|---------|----------|
| useUser | Current user state, login, logout | hooks/useUser.js |
| usePatients | Patient CRUD operations | hooks/usePatients.js |
| useTests | Test CRUD operations | hooks/useTests.js |
| usePrescriptions | prescription CRUD + pending queue | hooks/usePrescriptions.js |
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

### 8.3 Service Layer

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

### 8.4 Example Hook: usePatients

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
  
  // Subscribe to real-time updates
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
  
  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);
  
  return { patients, loading, error, refetch: fetchPatients };
}
```

---

## 9. Backend Architecture

### 9.1 IPC Handler Modules

The IPC handlers are modularized by feature domain in `electron/ipc/handlers/`:

| Handler Module | IPC Channels | Purpose |
|--------------|-------------|----------|
| auth.js | login, logout, isFirstRun | Authentication |
| patients.js | getAll, getById, create, update, delete | Patient CRUD |
| tests.js | getAll, getById, create, update, delete | Test management |
| prescriptions.js | create, getByPatient, getPending, updateStatus | prescription management |
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

### 9.2 Handler Registration Pattern

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

### 9.3 Example Handler: patients.js

```javascript
// electron/ipc/handlers/patients.js
const { ipcMain } = require('electron');
const { v4: uuidv4 } = require('uuid');
const { buildErrorResponse } = require('./utils');

module.exports = function registerPatientsHandlers(ctx) {
  ipcMain.handle('patients:getAll', async (event, params = {}) => {
    try {
      const serverUrl = ctx.appConfig?.serverUrl;
      
      if (serverUrl) {
        const result = await httpRequest(`${serverUrl}/api/patients`, 'GET', '', { 
          'Authorization': `Bearer ${getToken()}` 
        });
        return result;
      }
      
      const { sqlQuery } = ctx.getDatabase ? ctx.getDatabase() : require('./database');
      const patients = sqlQuery('SELECT * FROM patients ORDER BY created_at DESC');
      return { success: true, patients };
    } catch (err) {
      return buildErrorResponse(err);
    }
  });
  
  ipcMain.handle('patients:create', async (event, patientData) => {
    try {
      const serverUrl = ctx.appConfig?.serverUrl;
      
      if (serverUrl) {
        const result = await httpRequest(
          `${serverUrl}/api/patients`, 
          'POST', 
          JSON.stringify(patientData), 
          { 'Authorization': `Bearer ${getToken()}` }
        );
        return result;
      }
      
      const { sqlRun, sqlGet } = ctx.getDatabase ? ctx.getDatabase() : require('./database');
      const id = uuidv4();
      const patient_id = 'P-' + Date.now().toString().slice(-6);
      
      sqlRun(
        `INSERT INTO patients (id, patient_id, first_name, last_name, dob, gender, contact, email, address, client_type, intake_date)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, patient_id, patientData.first_name, patientData.last_name, patientData.dob, patientData.gender, patientData.contact, patientData.email, patientData.address, patientData.client_type, patientData.intake_date || new Date().toISOString().slice(0, 10)]
      );
      
      const patient = sqlGet('SELECT * FROM patients WHERE id = ?', [id]);
      return { success: true, id, patient };
    } catch (err) {
      return buildErrorResponse(err);
    }
  });
};
```

### 9.4 Utility Functions

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
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve({ success: false, error: 'Invalid response' });
        }
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

## 10. Network Architecture

### 10.1 Server Mode Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│           SERVER MODE ARCHITECTURE                          │
│                                                          │
│  ┌─────────────────┐         ┌─────────────────┐         │
│  │  This PC       │         │  Other PCs      │         │
│  │  (Server)     │         │  (Clients)    │         │
│  │               │         │               │         │
│  │ API Server    │◀───────▶│ HTTP Client  │         │
│  │ Port: 3001   │  HTTP   │ Requests    │         │
│  │               │         │               │         │
│  │ WebSocket     │◀───────▶│ WebSocket   │         │
│  │ Real-time    │  WS     │ Real-time  │         │
│  │               │         │               │         │
│  │ SQLite DB    │         │ (No DB)     │         │
│  └─────────────────┘         └─────────────────┘         │
│       │                                               │
│       │ All data synced via HTTP/API                    │
│       ↓                                              │
│  ┌─────────────────┐                                 │
│  │ SQL Server    │  (Optional for enterprise)        │
│  │ (Optional)  │                                 │
│  └─────────────────┘                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 10.2 API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | /api/auth/login | User login |
| POST | /api/auth/refresh | Token refresh |
| GET | /api/auth/me | Current user |
| GET | /api/health | Server health |
| GET/POST/PUT/DELETE | /api/patients | Patient CRUD |
| GET/POST/PUT/DELETE | /api/tests | Test CRUD |
| GET/POST/PUT/DELETE | /api/prescriptions | prescription CRUD |
| GET/POST/PUT/DELETE | /api/pharmacy/drugs | Drug CRUD |
| POST | /api/pharmacy/dispense | Dispense drug |
| GET/POST/PUT/DELETE | /api/inventory | Inventory CRUD |
| GET | /api/revenue | Revenue records |
| GET | /api/revenue/stats | Revenue statistics |
| GET | /api/dashboard/stats | Dashboard statistics |
| GET/POST | /api/chat | Chat messages |
| GET | /api/notifications | User notifications |
| GET | /api/presence/online | Online users |

### 10.3 WebSocket Events

| Event | Payload | Purpose |
|-------|---------|---------|
| presence | `{ userId, userName, userRole, deviceName, status }` | User online/offline |
| chat:message | `{ message object }` | New chat message |
| data:update | `{ table, action, record }` | Data changes |
| notifications:new | `{ notification object }` | New notification |
| pong | `{ timestamp }` | Keepalive response |

---

## 11. Build & Deployment

### 11.1 Project Structure

```
eye-clinic/
├── electron/                 # Electron main process
│   ├── main.js              # App entry (packaged)
│   ├── preload.js           # IPC bridge
│   ├── ipc/handlers/       # IPC handler modules
│   └── server/              # Server modules
├── src/                    # React frontend
│   ├── components/          # React components
│   ├── hooks/             # React hooks
│   ├── services/           # Service layer
│   └── pages/             # Page components
├── scripts/                # Build/run scripts
├── database.js            # Root database module
├── main.js                # Root main process (dev)
├── package.json           # Dependencies
├── vite.config.js         # Vite config
├── electron-builder.yml   # App packaging
└── architecture.md      # This document
```

### 11.2 NPM Scripts

| Script | Command | Purpose |
|--------|---------|---------|
| npm run dev | vite + electron | Development mode |
| npm run build | vite build | Frontend build |
| npm run build:app | vite + electron-builder | Package app |
| npm run setup-db | node scripts/setup-database.js | Init SQLite |
| npm run setup:server | node scripts/setup-server.js | Setup server |
| npm run start:server | electron scripts/start-server-standalone.js | Run server |

### 11.3 electron-builder Configuration

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

### 11.4 Building

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

---

## 12. Current Status

### 12.1 What Is Implemented

✅ **Core Features:**
- Role-based authentication (Admin, Doctor, Assistant)
- Patient management with full CRUD
- Test/Results management
- prescription management with pending queue
- Pharmacy dispensing with revenue tracking
- Inventory management
- Internal chat/messaging
- Notifications system
- Activity logging/audit trail
- Dashboard statistics
- Database backup/restore

✅ **Advanced Features:**
- Case notes for doctors
- CVF/Henson 8000 workspace
- Real-time presence (WebSocket)
- Multi-computer networking (server-client mode)
- JWT authentication for server mode
- Auto-refresh tokens

✅ **Technical:**
- Production logging utility
- Proper IPC handler pattern
- Server proxy for networked mode
- WebSocket real-time updates
- Offline-first SQLite architecture

### 12.2 Known Limitations

- SQL Server sync is optional
- Very large imports require staged processing
- No automated UI tests

---

## 13. History (from CONTEXT.md)

### 13.1 Changes (April 18, 2026) - Phase 2.2: COMPLETE

**Status:** COMPLETED  
All console.log/warn/error statements in src/ have been replaced with the production logger utility.

### 13.2 Changes (April 14, 2026) - ServerManager Modular Split & Drug Dispense Revenue Fix

**ServerManager.js Modular Split:**
The monolithic electron/server/ServerManager.js (~810 lines) was split into 19 modular files for better maintainability.

**Drug Dispense → Revenue Flow:**
When assistant dispenses a drug:
1. Records dispensation in pharmacy_dispensations table
2. Reduces drug stock in pharmacy_drugs
3. Records revenue in revenue table (amount = unit_price × quantity)
4. Broadcasts data:update for pharmacy, revenue, dashboard

### 13.3 Changes (April 13, 2026) - Server-Client Architecture Migration

**Architecture Change: P2P → Server-Client**

**Before (P2P Shared Database):**
- All computers shared ONE SQLite database file on a network path
- Only presence broadcast remained
- Complex sync timers

**After (Server-Client):**
- Server PC runs Node.js backend + SQL Server/SQLite (port 3001)
- Clients connect via HTTP REST API + WebSocket
- JWT authentication (access token 15 min, refresh token 7 days)
- All data stored centrally

**Scripts Added:**
```bash
npm run setup:server  # Create SQL Server database + tables + admin user
npm run start:server # Start backend server (port 3001)
```

### 13.4 Changes (April 13, 2026) - handlers.js Modular Split

**The monolithic electron/ipc/handlers.js (~2234 lines) was split into 19 modular files, one per feature domain.**

### 13.5 Changes (March 24, 2026) - Network Architecture Simplification

**Simplified Multi-Computer Networking:**

**Before (Complex Sync):**
- Each computer had its own local database
- JSON sync files were exported/imported
- Complex conflict resolution

**After (Simple Shared Database):**
- All computers share ONE SQLite database file on network path
- NO data sync/export/import needed
- Only presence broadcast remains

### 13.6 Changes (March 24, 2026) - Pharmacy Revenue Fix

- Added unit_price column to pharmacy_dispensations table
- Added patient_id column to revenue table
- Revenue is now properly recorded when drugs are dispensed

### 13.7 Changes (March 24, 2026) - User Profile Update Fix

- updateProfile() now dispatches userProfileUpdated custom event
- Removed window.location.reload() from logout
- Components auto re-render with updated user data

### 13.8 Earlier Changes (Summary)

- Complete multi-computer network database synchronization
- Network Configuration Screen with sync features
- Activity Logs with time filters
- Online Users Panel with device names
- Today's Intake tracking
- CVF incoming PDF watch folder workflow
- Doctor Case Note workflow with full clinical form
- Case Notes tab in patient profiles
- Client type + marital status fields
- Role-restricted features (CVF Workspace, Test creation)

---

## Appendix A: Troubleshooting

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

---

## Appendix B: Quick Reference

### B.1 File Locations

| Item | Location |
|------|----------|
| Config | %APPDATA%/eye-clinic/config.json |
| Database | %APPDATA%/eye-clinic/eye_clinic.db |
| Logs | %APPDATA%/eye-clinic/logs/ |
| Backups | %APPDATA%/eye-clinic/backups/ |

### B.2 Default Credentials (after setup)

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@clinic.com | admin123 |
| Doctor | doctor@clinic.com | doctor123 |
| Assistant | assistant@clinic.com | assistant123 |

### B.3 Important Ports

| Port | Service |
|------|---------|
| 3001 | API Server (server mode) |
| 5173 | Vite Dev Server |

---

**End of Architecture Documentation**

*Last Updated: April 18, 2026*