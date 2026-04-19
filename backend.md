# KORENE Eye Clinic - Backend Documentation

**Version:** 1.0.0  
**Date:** April 18, 2026

---

## Table of Contents

1. Overview
2. Main Process Architecture
3. IPC Handler System
4. Database Layer
5. Server Mode
6. API Endpoints
7. Security
8. Configuration

---

## 1. Overview

The backend of the KORENE Eye Clinic application is built on **Electron** and consists of:

- **Main Process** - Node.js runtime that manages the application lifecycle, windows, and system resources
- **IPC Handlers** - 40+ registered handlers for database operations and system features
- **Database** - SQLite via better-sqlite3 for local storage
- **Optional Server** - Express + WebSocket server for networked mode

---

## 2. Main Process Architecture

### 2.1 Entry Points

The application has two main entry points:

| File | Purpose |
|------|---------|
| `main.js` | Root main process (development) |
| `electron/main.js` | Packaged app entry (production) |

### 2.2 Main Process Structure

```javascript
// electron/main.js - Simplified structure
const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron');
const path = require('path');

let mainWindow = null;
let database = null;
let currentUser = null;

// Load configuration
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

// Save configuration
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

// Initialize database (standalone mode only)
async function initializeDatabase() {
  const config = loadConfig();
  if (config.serverUrl || config.isServerMode) {
    console.log('[Main] Server mode — skipping SQLite init');
    return;
  }
  const Database = require('../database');
  database = new Database();
  await database.initialize();
}

// Build IPC context
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

// App lifecycle
app.whenReady().then(async () => {
  await initializeDatabase();
  const IPCHandlers = require('./ipc/handlers');
  new IPCHandlers(buildContext());
  createMainWindow();
  createAppMenu();
});
```

### 2.3 Window Management

```javascript
function getWebPreferences() {
  return {
    nodeIntegration: false,
    contextIsolation: true,
    preload: path.join(__dirname, 'preload.js')
  };
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    webPreferences: getWebPreferences(),
    show: false
  });
  
  if (process.env.NODE_ENV === 'development') {
    win.loadURL('http://localhost:5173');
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }
  
  mainWindow.once('ready-to-show', () => mainWindow.show());
}
```

### 2.4 System Tray

```javascript
let tray = null;

function createTray() {
  const icon = nativeImage.createEmpty();
  tray = new Tray(icon.isEmpty() ? nativeImage.createFromBuffer(Buffer.alloc(0)) : icon);
  updateTrayMenu();
}

function updateTrayMenu() {
  if (!tray) return;
  const contextMenu = Menu.buildFromTemplate([
    { label: 'KORENE Eye Clinic', enabled: false },
    { type: 'separator' },
    { label: `Server Status: ${serverStatus}`, enabled: false },
    { label: `Port: ${PORT}`, enabled: false },
    { type: 'separator' },
    { label: 'Stop Server', click: () => stopServer() },
    { label: 'Exit', click: () => app.quit() }
  ]);
  tray.setContextMenu(contextMenu);
}
```

---

## 3. IPC Handler System

### 3.1 Handler Registration

Handlers are registered in `electron/ipc/handlers.js`:

```javascript
// electron/ipc/handlers.js
module.exports = function registerHandlers(ctx) {
  require('./handlers/auth').registerAuthHandlers(ctx);
  require('./handlers/patients').registerPatientsHandlers(ctx);
  require('./handlers/tests').registerTestsHandlers(ctx);
  require('./handlers/prescriptions').registerPrescriptionsHandlers(ctx);
  require('./handlers/pharmacy').registerPharmacyHandlers(ctx);
  require('./handlers/inventory').registerInventoryHandlers(ctx);
  require('./handlers/visits').registerVisitsHandlers(ctx);
  require('./handlers/caseNotes').registerCaseNotesHandlers(ctx);
  require('./handlers/reminders').registerRemindersHandlers(ctx);
  require('./handlers/chat').registerChatHandlers(ctx);
  require('./handlers/notifications').registerNotificationsHandlers(ctx);
  require('./handlers/admin').registerAdminHandlers(ctx);
  require('./handlers/file').registerFileHandlers(ctx);
  require('./handlers/dashboard').registerDashboardHandlers(ctx);
  require('./handlers/revenue').registerRevenueHandlers(ctx);
  require('./handlers/settings').registerSettingsHandlers(ctx);
  require('./handlers/server').registerServerHandlers(ctx);
  require('./handlers/backup').registerBackupHandlers(ctx);
  require('./handlers/presence').registerPresenceHandlers(ctx);
  require('./handlers/cvf').registerCvfHandlers(ctx);
  // ... more handlers
};
```

### 3.2 Handler Pattern

Each handler follows this pattern:

```javascript
// electron/ipc/handlers/patients.js
const { ipcMain } = require('electron');
const { v4: uuidv4 } = require('uuid');
const { buildErrorResponse, httpRequest } = require('./utils');

let _currentUser = null;

function getToken() {
  // Get JWT token from sessionStorage
  try {
    const tokens = sessionStorage.getItem('tokens');
    return tokens ? JSON.parse(tokens).accessToken : null;
  } catch {
    return null;
  }
}

module.exports = function registerPatientsHandlers(ctx) {
  _currentUser = ctx.currentUser;
  
  // Get all patients
  ipcMain.handle('patients:getAll', async (event, params = {}) => {
    try {
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
      const { sqlQuery } = ctx.getDatabase ? ctx.getDatabase() : require('./database');
      const patients = sqlQuery('SELECT * FROM patients ORDER BY created_at DESC');
      return { success: true, patients };
    } catch (err) {
      return buildErrorResponse(err);
    }
  });
  
  // Create patient
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
  
  // Update patient
  ipcMain.handle('patients:update', async (event, { id, data }) => {
    // Similar pattern...
  });
  
  // Delete patient
  ipcMain.handle('patients:delete', async (event, id) => {
    // Similar pattern...
  });
};
```

### 3.3 Utility Functions

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

function mapDatabaseError(err) {
  if (err.code === 'SQLITE_CONSTRAINT') return 'Duplicate entry';
  if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') return 'Record already exists';
  return err.message;
}

module.exports = { buildErrorResponse, httpRequest, mapDatabaseError };
```

---

## 4. Database Layer

### 4.1 Database Initialization

```javascript
// electron/server/database.js
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

let db = null;

function getDbPath() {
  const appDataPath = process.env.APPDATA || process.env.HOME || '';
  const dbFolder = path.join(appDataPath, 'KORENE_EyeClinic');
  if (!fs.existsSync(dbFolder)) {
    fs.mkdirSync(dbFolder, { recursive: true });
  }
  return path.join(dbFolder, 'eye_clinic.db');
}

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

function initializeTables() {
  const database = db;
  
  // Create all 20+ tables
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (...)
  `);
  database.exec(`
    CREATE TABLE IF NOT EXISTS patients (...)
  `);
  // ... etc
  
  console.log('[DB] All tables initialized.');
}
```

### 4.2 Query Helpers

```javascript
function sqlQuery(sql, params = []) {
  const database = getDb();
  try {
    const stmt = database.prepare(sql);
    if (params && params.length > 0) {
      return stmt.all(...params);
    }
    return stmt.all();
  } catch (err) {
    console.error('[DB] Query error:', err.message, 'SQL:', sql);
    throw err;
  }
}

function sqlRun(sql, params = []) {
  const database = getDb();
  try {
    const stmt = database.prepare(sql);
    if (params && params.length > 0) {
      return stmt.run(...params);
    }
    return stmt.run();
  } catch (err) {
    console.error('[DB] Run error:', err.message, 'SQL:', sql);
    throw err;
  }
}

function sqlGet(sql, params = []) {
  const database = getDb();
  try {
    const stmt = database.prepare(sql);
    if (params && params.length > 0) {
      return stmt.get(...params);
    }
    return stmt.get();
  } catch (err) {
    console.error('[DB] Get error:', err.message, 'SQL:', sql);
    throw err;
  }
}

function close() {
  if (db) {
    db.close();
    db = null;
  }
}

module.exports = { getDb, sqlQuery, sqlRun, sqlGet, sqlInsert, close, initialize };
```

### 4.3 Table Schemas

See **architecture.md** Section 6 for complete table schemas.

---

## 5. Server Mode

### 5.1 Server Architecture

When `isServerMode: true` or `serverUrl` is configured, the app can act as a server:

```
┌─────────────────────────────────────────┐
│         SERVER MODE                       │
├─────────────────────────────────────────┤
│  Port: 3001 (configurable)             │
│  Protocol: HTTP + WebSocket           │
│  Auth: JWT (access + refresh tokens)    │
│  Database: SQLite (local)            │
│  Optional: SQL Server               │
└─────────────────────────────────────────┘
```

### 5.2 Starting Server

```bash
# Via npm script
npm run start:server

# Or directly
node scripts/start-server-standalone.js
```

### 5.3 Express Server Setup

```javascript
// scripts/start-server-standalone.js
const express = require('express');
const cors = require('cors');
const http = require('http');
const WebSocket = require('ws');

const expressApp = express();
expressApp.use(cors({ origin: '*', credentials: true }));
expressApp.use(express.json({ limit: '50mb' }));

const server = http.createServer(expressApp);
const wss = new WebSocket.Server({ server });

// Register all API routes
registerRoutes(expressApp);

const PORT = process.env.SERVER_PORT || 3001;
server.listen(PORT, () => {
  console.log(`[Server] KORENE API running on port ${PORT}`);
});
```

### 5.4 JWT Authentication

```javascript
// Login - Generate tokens
const jwt = require('jsonwebtoken');

const accessToken = jwt.sign(
  { userId: user.id, role: user.role },
  'eye-clinic-secret-key',
  { expiresIn: '15m' }
);

const refreshToken = jwt.sign(
  { userId: user.id },
  'eye-clinic-refresh-secret',
  { expiresIn: '7d' }
);

// Middleware - Verify token
function verifyToken(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'No token' });
  
  const token = auth.replace('Bearer ', '');
  try {
    const decoded = jwt.verify(token, 'eye-clinic-secret-key');
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}
```

### 5.5 WebSocket Events

```javascript
// Broadcast to all clients
function broadcast(type, data) {
  const msg = JSON.stringify({ type, data });
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      try { client.send(msg); } catch {}
    }
  });
}

// Handle connections
wss.on('connection', (ws, req) => {
  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      if (msg.type === 'auth') {
        // Client authenticated
        clients.set(ws, msg);
        broadcast('presence', { ...msg, status: 'online' });
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

## 6. API Endpoints

### 6.1 Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/login | User login |
| POST | /api/auth/refresh | Refresh access token |
| GET | /api/auth/me | Get current user |

### 6.2 Patients

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/patients | Get all patients |
| GET | /api/patients/:id | Get patient by ID |
| POST | /api/patients | Create patient |
| PUT | /api/patients/:id | Update patient |
| DELETE | /api/patients/:id | Delete patient |

### 6.3 Tests

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/tests | Get all tests |
| GET | /api/tests/:id | Get test by ID |
| POST | /api/tests | Create test |
| PUT | /api/tests/:id | Update test |
| DELETE | /api/tests/:id | Delete test |

### 6.4 Prescriptions

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/prescriptions | Get all prescriptions |
| GET | /api/prescriptions/pending | Get pending prescriptions |
| POST | /api/prescriptions | Create prescription |
| PUT | /api/prescriptions/:id/status | Update status |

### 6.5 Pharmacy

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/pharmacy/drugs | Get all drugs |
| POST | /api/pharmacy/drugs | Create drug |
| POST | /api/pharmacy/dispense | Dispense drug |

### 6.6 Inventory

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/inventory | Get all items |
| POST | /api/inventory | Create item |
| PUT | /api/inventory/:id | Update item |
| DELETE | /api/inventory/:id | Delete item |

### 6.7 Chat

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/chat/:otherUserId | Get messages |
| POST | /api/chat | Send message |

### 6.8 Dashboard

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/dashboard/stats | Get dashboard statistics |
| GET | /api/revenue/stats | Get revenue statistics |

### 6.9 System

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/health | Health check |
| GET | /api/presence/online | Online users |

---

## 7. Security

### 7.1 Password Hashing

```javascript
const bcrypt = require('bcryptjs');

// Hash password (upon user creation)
const hash = await bcrypt.hash(password, 10);

// Verify password (upon login)
const match = await bcrypt.compare(password, user.password_hash);
```

### 7.2 JWT Secrets

| Secret | Purpose | Expiry |
|--------|----------|--------|
| eye-clinic-secret-key | Access tokens | 15 minutes |
| eye-clinic-refresh-secret | Refresh tokens | 7 days |

### 7.3 Preload Security

```javascript
// electron/preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Validate before exposing
  login: (credentials) => {
    if (!credentials?.email || !credentials?.password) {
      return { success: false, error: 'Invalid credentials' };
    }
    return ipcRenderer.invoke('auth:login', credentials);
  },
  // Additional validation for other APIs...
});
```

### 7.4 Role-Based Access

```javascript
function checkRole(allowedRoles) {
  const userRole = String(_currentUser?.role || '').toLowerCase();
  return allowedRoles.map(r => r.toLowerCase()).includes(userRole);
}

// In handlers
ipcMain.handle('pharmacy:dispense', async (event, data) => {
  if (!checkRole(['assistant'])) {
    return { success: false, error: 'Access denied' };
  }
  // ... handle dispensing
});
```

---

## 8. Configuration

### 8.1 Configuration File

Location: `%APPDATA%/eye-clinic/config.json`

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

### 8.2 Loading Configuration

```javascript
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
```

### 8.3 Saving Configuration

```javascript
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

## Appendix A: IPC Handler Quick Reference

| Handler File | Channels |
|-------------|----------|
| auth.js | login, logout, isFirstRun, completeSetup |
| patients.js | getAll, getById, create, update, delete, search |
| tests.js | getAll, getById, create, update, delete |
| prescriptions.js | create, getPending, updateStatus |
| pharmacy.js | getDrugs, createDrug, dispense |
| inventory.js | getAll, create, update, delete |
| visits.js | getAll, getByPatient, create |
| caseNotes.js | getAll, create, update, signOff |
| reminders.js | getAll, create, update |
| chat.js | getMessages, sendMessage |
| notifications.js | getAll, markRead |
| admin.js | user management |
| file.js | select, import, backup |
| dashboard.js | getStats |
| revenue.js | getRevenue, getStats |
| settings.js | get, set |
| server.js | start, stop, config |
| backup.js | create, restore |
| presence.js | setOnline, getOnlineUsers |
| cvf.js | analyze, import |

---

## Appendix B: Error Codes

| Code | Description |
|------|-------------|
| auth:invalid | Invalid credentials |
| auth:expired | Token expired |
| auth:unauthorized | User not authenticated |
| db:query | Database query error |
| db:constraint | Constraint violation |
| server:unavailable | Server not available |
| network:timeout | Network timeout |

---

**End of Backend Documentation**

*Last Updated: April 18, 2026*