# KORENE Eye Clinic - Issues, Bugs & Error Log

**Version:** 1.0.0  
**Date:** April 18, 2026

---

## Table of Contents

1. Overview
2. Critical Issues (Blocking)
3. High Priority Issues
4. Medium Priority Issues
5. Low Priority Issues
6. Resolved Issues
7. Version/Package Issues
8. Error Code Reference
9. Related Tasks for management.md

---

## 1. Overview

This document tracks all known issues, bugs, and errors in the KORENE Eye Clinic application. It serves as the reference for creating tasks in management.md.

**Issue Severity Levels:**
- 🔴 **CRITICAL** - Application unusable, requires immediate fix
- 🟠 **HIGH** - Major functionality broken, affects daily operations
- 🟡 **MEDIUM** - Feature works but with issues, affects user experience
- 🟢 **LOW** - Minor inconvenience, cosmetic, or enhancement

**Issue Categories:**
- Authentication
- Database
- Network/Server
- UI/Frontend
- Build/Package
- Permissions

---

## 2. Critical Issues (Blocking)

### 🔴 Issue #001: Server Connection Save "Save not available"

| Field | Details |
|-------|---------|
| **Issue ID** | #001 |
| **Severity** | 🔴 CRITICAL |
| **Category** | Configuration |
| **Date Discovered** | April 18, 2026 |
| **Status** | ✅ RESOLVED |
| **Affected Versions** | All versions prior to fix |

**Description:**
When clicking "Save Connection" button in Settings → Server Connection, the application returns error: "Failed to save: Save not available"

**Root Cause:**
The `_saveAppConfig` function was not exposed in the IPC context in `main.js`. The config saving capability was implemented in SettingsContent.jsx and handlers, but the backend context never received the save function.

**Affected Files:**
- `electron/main.js`
- `main.js` (root)

**Fix Applied:**
```javascript
// electron/main.js - Added saveConfig function
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

// buildContext() - Added to IPC context
function buildContext() {
  const config = loadConfig();
  return {
    getDatabase: () => database,
    getCurrentUser: () => currentUser,
    setCurrentUser: (u) => { currentUser = u; },
    getConfig: () => config,
    getMainWindow: () => mainWindow,
    appConfig: config,
    _saveAppConfig: saveConfig,  // NEW - exposes save function
  };
}
```

**Tasks for management.md:**
- [x] Fix server connection save issue
- [ ] Rebuild application after fix
- [ ] Test Save Connection button

---

### 🔴 Issue #002: Handlers Not Registered

| Field | Details |
|-------|---------|
| **Issue ID** | #002 |
| **Severity** | 🔴 CRITICAL |
| **Category** | Backend |
| **Date Discovered** | January 2026 |
| **Status** | ✅ RESOLVED |

**Description:**
Application fails to start with error: "No handler registered for..."

**Root Cause:**
The monolithic `electron/ipc/handlers.js` was not registering handlers properly, or handlers were registered with wrong names.

**Fix Applied:**
Split handlers.js into 19 modular files, each registering its own handlers independently.

---

### 🔴 Issue #012: Packaged App - "No handler registered" Error

| Field | Details |
|-------|---------|
| **Issue ID** | #012 |
| **Severity** | 🔴 CRITICAL |
| **Category** | Build/Package |
| **Date Discovered** | April 18, 2026 |
| **Status** | 🔧 IN PROGRESS |

**Description:**
Application works perfectly in dev mode (`npm run electron-dev`) but fails in packaged app with error:
```
Error: No handler registered for 'auth:login'
Error: No handler registered for 'auth:completeSetup'
```
This happens when running the packaged `.exe` file from `release/KORENE_v2/win-unpacked/`.

**Root Cause Analysis:**
1. **Silent require failures**: Handler registration errors are caught by try-catch but only logged to console (invisible in packaged app)
2. **Path resolution difference**: Dev uses filesystem paths, packaged uses directory structure
3. **Context not passing**: The buildContext() may fail silently in packaged build
4. **Console logging invisible**: All console.log/error statements in handlers.js are swallowed in packaged app

**Key Observations:**
- ✅ Dev mode (`npm run electron-dev`): Works perfectly, handlers register successfully
- ❌ Packaged app (`KORENE.exe`): Fails with "No handler registered" errors
- The packaged app shows the same errors from different IPC channels

**Diagnosis Approach:**
Added file-based logging to capture errors in packaged app:
- `electron/main.js`: Logs startup sequence to `%APPDATA%/korene/logs/startup.log`
- `electron/ipc/handlers.js`: Logs handler registration to `%APPDATA%/korene/logs/handlers.log`

**Log File Location:**
```
%APPDATA%/korene/logs/startup.log
%APPDATA%/korene/logs/handlers.log
```

**Proposed Fixes (in order of preference):**

1. **Fix A: Add File Logging (Diagnostic)**
   - Added file-based logging to main.js and handlers.js
   - Will capture silent failures in packaged app

2. **Fix B: Inline Handler Registration (If Fix A fails)**
   - Inline all handler functions directly into handlers.js
   - Eliminates dynamic require() statements that may fail in packaged

3. **Fix C: Check asar/Path Issues**
   - Verify electron-builder config handles paths correctly
   - Consider `asarUnpack` for problematic modules

**Affected Files:**
- `electron/main.js` - Added file logging
- `electron/ipc/handlers.js` - Added file logging
- `electron/preload.js` - May need logging too

**Build Output:**
```
release/KORENE_v2/win-unpacked/KORENE.exe
```

---

## 3. High Priority Issues

### 🟠 Issue #003: IPC Handlers Not Proxying to Server

| Field | Details |
|-------|---------|
| **Issue ID** | #003 |
| **Severity** | 🟠 HIGH |
| **Category** | Network/Server |
| **Date Discovered** | April 13, 2026 |
| **Status** | ✅ RESOLVED |

**Description:**
When server mode was configured, data was being saved to local SQLite instead of the remote SQL Server.

**Root Cause:**
All IPC handlers were calling DatabaseService directly (SQLite), bypassing the server even when server mode was configured.

**Fix Applied:**
Rewrote all IPC handlers to check `ctx.appConfig?.serverUrl` and proxy to server when available.

---

### 🟠 Issue #004: Dispensation Error Due to Missing Token

| Field | Details |
|-------|---------|
| **Issue ID** | #004 |
| **Severity** | 🟠 HIGH |
| **Category** | Authentication |
| **Date Discovered** | April 14, 2026 |
| **Status** | ✅ RESOLVED |

**Description:**
When frontend logged in via fetch() (server mode), the `_currentUser` and `_accessToken` in IPC handlers were never set. Dispense operation failed with "Failed to record dispensation".

**Root Cause:**
1. Frontend calls fetch('/api/auth/login') directly
2. IPC handlers' `_accessToken` remains null
3. Dispense IPC call had `Authorization: Bearer null`
4. Server rejects request

**Fix Applied:**
Added `auth:syncUser` IPC handler that syncs BOTH user AND tokens to IPC handler context.

---

## 4. Medium Priority Issues

### 🟡 Issue #005: Network Path Resolution in Package

| Field | Details |
|-------|---------|
| **Issue ID** | #005 |
| **Severity** | 🟡 MEDIUM |
| **Category** | Build/Package |
| **Date Discovered** | February 2026 |
| **Status** | ✅ RESOLVED |

**Description:**
Packaged app couldn't resolve database module: "Cannot find module './../database'".

**Root Cause:**
Main process database imports used wrong relative path.

**Fix Applied:**
Updated main-process database imports to use `database.js` at project root.

---

### 🟡 Issue #006: Patient Profile Update Not Reflecting

| Field | Details |
|-------|---------|
| **Issue ID** | #006 |
| **Severity** | 🟡 MEDIUM |
| **Category** | Frontend |
| **Date Discovered** | March 24, 2026 |
| **Status** | ✅ RESOLVED |

**Description:**
When user updated profile, changes didn't reflect in UI until page reload.

**Root Cause:**
Profile update was saving to database but not updating React state.

**Fix Applied:**
`updateProfile()` now dispatches `userProfileUpdated` custom event after successful update.

---

### 🟡 Issue #007: Console Statements in Production

| Field | Details |
|-------|---------|
| **Issue ID** | #007 |
| **Severity** | 🟡 MEDIUM |
| **Category** | Code Quality |
| **Date Discovered** | April 17, 2026 |
| **Status** | ✅ RESOLVED |

**Description:**
All `console.log/warn/error` statements in src/ need to be replaced with production logger utility.

**Fix Applied:**
Replaced console statements with production logger utility across all src/ files.

---

### 🟡 Issue #008: PatientDetailsPage JSX Syntax Error

| Field | Details |
|-------|---------|
| **Issue ID** | #008 |
| **Severity** | 🟡 MEDIUM |
| **Category** | Frontend |
| **Date Discovered** | April 14, 2026 |
| **Status** | ✅ RESOLVED |

**Description:**
Build failures due to malformed ternary expression and incorrect closing tag structure.

**Fix Applied:**
Fixed duplicate/malformed ternary expression and removed stray closing tags.

---

## 5. Low Priority Issues

### 🟢 Issue #009: Hot Reload Auto-Reload

| Field | Details |
|-------|---------|
| **Issue ID** | #009 |
| **Severity** | 🟢 LOW |
| **Category** | Build/Dev |
| **Date Discovered** | March 24, 2026 |
| **Status** | ✅ RESOLVED |

**Description:**
App automatically reloads when files are changed during development.

**Fix Applied:**
Removed `electron-reload` from `main.js`.

---

### 🟢 Issue #010: Settings Icon Import

| Field | Details |
|-------|---------|
| **Issue ID** | #010 |
| **Severity** | 🟢 LOW |
| **Category** | UI/Frontend |
| **Date Discovered** | February 2026 |
| **Status** | ✅ RESOLVED |

**Description:**
Settings icon wasn't rendering properly.

**Fix Applied:**
Changed icon import to GearIcon instead of SettingsIcon.

---

### 🟢 Issue #011: Activity Logs Columns Missing

| Field | Details |
|-------|---------|
| **Issue ID** | #011 |
| **Severity** | 🟢 LOW |
| **Category** | Database |
| **Date Discovered** | February 2026 |
| **Status** | ✅ RESOLVED |

**Description:**
activity_logs table missing columns on fresh migration.

**Fix Applied:**
Added defensive migration for activity_logs columns.

---

## 6. Resolved Issues Summary

| Issue # | Description | Date Resolved | Status |
|---------|-------------|---------------|---------------|
| #001 | Server Connection Save | April 18, 2026 | ✅ |
| #002 | Handlers Not Registered | January 2026 | ✅ |
| #003 | IPC Not Proxying to Server | April 13, 2026 | ✅ |
| #004 | Dispensation Token Missing | April 14, 2026 | ✅ |
| #005 | Network Path Resolution | February 2026 | ✅ |
| #006 | Profile Update Not Reflecting | March 24, 2026 | ✅ |
| #007 | Console in Production | April 17, 2026 | ✅ |
| #008 | PatientDetailsPage JSX | April 14, 2026 | ✅ |
| #009 | Hot Reload | March 24, 2026 | ✅ |
| #010 | Settings Icon Import | February 2026 | ✅ |
| #011 | Activity Logs Columns | February 2026 | ✅ |
| #012 | Packaged App Handler Error | April 18, 2026 | 🔧 IN PROGRESS |

---

## 7. Version/Package Issues

### 7.1 Build Failures

| Issue | Error Message | Cause | Solution |
|-------|--------------|-------|----------|
| Access Denied | "Access is denied. d3dcompiler_47.dll" | App is running, files locked | Close app before rebuild |
| electron-builder error | "ERR_ELECTRON_BUILDER_CANNOT_EXECUTE" | Files in use | Stop app, then rebuild |
| native dependency rebuild | "better-sqlite3 rebuild failed" | Build tools missing | npm install |

### 7.2 Module Resolution Issues

| Issue | Error Message | Cause | Solution |
|-------|--------------|-------|----------|
| Cannot find module './../database' | Module not found | Wrong relative path | Use absolute path |
| Cannot find module 'mssql' | SQL Server dependency missing | Optional dependency | Install mssql if needed |

### 7.3 Version Compatibility

| Package | Version | Status |
|---------|---------|--------|
| Electron | 38.x | ✅ Stable |
| React | 19.x | ✅ Stable |
| Vite | 7.x | ✅ Stable |
| better-sqlite3 | 12.x | ✅ Stable |
| bcryptjs | 3.x | ✅ Stable |
| Tailwind CSS | 3.x | ✅ Stable |

---

## 8. Error Code Reference

### 8.1 Authentication Errors

| Error Code | Message | Cause |
|------------|---------|--------|
| AUTH001 | "Invalid credentials" | Wrong email/password |
| AUTH002 | "User not found" | User doesn't exist |
| AUTH003 | "User disabled" | User status is 'inactive' |
| AUTH004 | "Token expired" | JWT token expired |
| AUTH005 | "Invalid token" | Malformed JWT |

### 8.2 Database Errors

| Error Code | Message | Cause |
|------------|---------|--------|
| DB001 | "SQLITE_NOTADB" | Not a valid SQLite file |
| DB002 | "SQLITE_CONSTRAINT" | Duplicate entry |
| DB003 | "SQLITE_CONSTRAINT_UNIQUE" | Record already exists |
| DB004 | "SQLITE_BUSY" | Database locked |

### 8.3 Network Errors

| Error Code | Message | Cause |
|------------|---------|--------|
| NET001 | "ECONNREFUSED" | Server not running |
| NET002 | "ETIMEDOUT" | Connection timeout |
| NET003 | "Server unavailable" | Server down |
| NET004 | "Save not available" | Config save function missing |

### 8.4 Permission Errors

| Error Code | Message | Cause |
|------------|---------|--------|
| PERM001 | "Access denied" | Insufficient permissions |
| PERM002 | "Admin only" | Requires admin role |
| PERM003 | "Doctor only" | Requires doctor role |
| PERM004 | "Assistant only" | Requires assistant role |

---

## 9. Related Tasks for management.md

Based on this issue.md,以下是 tasks to add to management.md:

### High Priority Tasks

- [ ] Rebuild application after Issue #001 fix
- [ ] Test Save Connection button works (Issue #001)
- [ ] Verify server mode with Issue #003 fix
- [ ] Test pharmacy dispensation with Issue #004 fix

### Medium Priority Tasks

- [ ] Test all CRUD operations in server mode (Issue #003)
- [ ] Verify profile updates reflect immediately (Issue #006)
- [ ] Test network path in packaged app (Issue #005)

### Low Priority Tasks

- [ ] Set up automated UI tests (Issue #007 - related to code quality)
- [ ] Test hot reload disabled (Issue #009)

---

**End of Issues Document**

*Last Updated: April 18, 2026*