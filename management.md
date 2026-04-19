# KORENE Eye Clinic - Application Management & Planning

**Version:** 1.0.0  
**Date:** April 18, 2026

---

## Table of Contents

1. Overview
2. Current Issues (Priority)
3. Planned Features
4. Architecture Decisions Needed
5. TODO Lists
6. Reference Documents

---

## 1. Overview

This document serves as the central planning hub for the KORENE Eye Clinic application. It tracks:

- Known issues and bugs requiring fixes
- Planned features and improvements
- Architecture decisions pending
- TODO items by component/layer
- Links to reference documentation
- Issue references (see issue.md for complete details)

---

## 2. Current Issues (Priority)

### 2.1 Server Connection Save Fix ✅ COMPLETED

| Issue | Description |
|-------|-------------|
| **Problem** | "Save not available" error when clicking "Save Connection" in Settings |
| **Root Cause** | `_saveAppConfig` function was missing in main.js context |
| **Fix Applied** | Added `saveConfig()` function and exposed via `_saveAppConfig` in buildContext() |
| **Files Modified** | `electron/main.js`, `main.js` |
| **Status** | ✅ FIXED - April 18, 2026 |
| **Verification** | Needs rebuild and testing on packaged app |

**Fix Details:**

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
    _saveAppConfig: saveConfig,  // NEW
  };
}
```

### 2.2 Packaging Build Issue

| Issue | Description |
|-------|-------------|
| **Problem** | Build fails with "Access is denied" error |
| **Root Cause** | App is running, files are locked |
| **Solution** | Close running app before rebuilding |

### 2.3 Known Minor Issues

| Issue | Priority | Description |
|-------|----------|-------------|
| No automated UI tests | Low | Manual testing required |
| SQL Server sync optional | Low | Requires mssql dependency |
| Large imports need staging | Low | Memory management for >1GB data |

---

## 3. Planned Features

### 3.1 Near Term (Next Sprint)

| Feature | Description | Status |
|---------|-------------|--------|
| Server Mode Testing | Test server-client across multiple PCs | Planned |
| App Rebuild | Rebuild after save config fix | ✅ COMPLETED |
| Multi-PC Demo | Demonstrate networked mode working | Pending |

### 3.2 Medium Term (Next Quarter)

| Feature | Description |
|---------|-------------|
| Automated UI Tests | Jest + React Testing Library setup |
| Batch Import Queue | Progress, retries, resume for large imports |
| Schema Migration Preview | Show diff before applying schema changes |
| Enhanced Reports | More PDF export options |

### 3.3 Long Term (Future)

| Feature | Description |
|---------|-------------|
| SQL Server Full Integration | Complete SQL Server support as primary DB |
| Mobile Companion App | Staff can view on mobile |
| Cloud Backup | Automatic cloud backup integration |
| Performance Optimization | Large dataset handling (>10,000 patients) |

---

## 4. Architecture Decisions Needed

### 4.1 Database Strategy

| Decision | Options | Recommendation |
|----------|---------|--------------|
| Primary DB | SQLite (current) / SQL Server | Stay SQLite for now |
| Sync Approach | Manual / Scheduled / Real-time | Real-time WebSocket (current) |

### 4.2 Server Deployment

| Decision | Options | Recommendation |
|----------|---------|--------------|
| Server Platform | This PC / Dedicated Server | This PC for small clinic |
| API Port | 3001 (default) / Custom | Keep 3001 |

### 4.3 Authentication

| Decision | Options | Recommendation |
|----------|---------|--------------|
| Token Expiry | 15min access / 7d refresh (current) | Keep current |
| Session Storage | sessionStorage / localStorage | sessionStorage (more secure) |

---

## 5. TODO Lists

### 5.1 Build & Deployment (Issue #001 Related)

- [x] Fix server connection save issue (Issue #001 in issue.md)
- [x] Rebuild the application (April 18, 2026)
- [ ] Test Save Connection button works
- [ ] Test server mode with multiple PCs
- [ ] Verify all CRUD operations work in server mode

### 5.2 Server Proxy Verification (Issue #003 Related)

- [ ] Test all IPC handlers proxy to server correctly
- [ ] Verify data saves to server, not local SQLite
- [ ] Test WebSocket real-time updates

### 5.3 Authentication Token Sync (Issue #004 Related)

- [ ] Test pharmacy dispensation in server mode
- [ ] Verify token syncs correctly after login

### 5.4 Profile Updates (Issue #006 Related)

- [ ] Test profile changes reflect immediately in UI

### 5.5 Build/Package Issues (Issue #005 Related)

- [ ] Test packaged app runs from release folder
- [ ] Verify database module resolution works

### 5.2 Frontend

- [ ] Add automated UI tests (Jest setup)
- [ ] Performance test with 1000+ patients
- [ ] Test responsive layout on different screen sizes
- [ ] Verify dark mode works correctly

### 5.3 Backend

- [ ] Test all 40+ IPC handlers
- [ ] Verify server proxy works for all CRUD operations
- [ ] Test WebSocket reconnection on network drop
- [ ] Performance test with concurrent users

### 5.4 Documentation

- [x] Create architecture.md
- [x] Create backend.md
- [x] Create frontend.md
- [x] Create management.md
- [ ] Create user manual (future)

### 5.5 Security

- [ ] Audit password requirements
- [ ] Verify JWT token handling
- [ ] Check role-based access for all features
- [ ] Review file upload security

---

## 6. Reference Documents

This application has the following documentation files:

| Document | Description | Location |
|----------|--------------|----------|
| **architecture.md** | Complete technical architecture | Project root |
| **backend.md** | Backend-specific documentation | Project root |
| **frontend.md** | Frontend-specific documentation | Project root |
| **management.md** | This planning document | Project root |
| **issue.md** | Issues, bugs & error references | Project root |

### 6.1 Using These Documents

**For New Developers:**
1. Read `architecture.md` for system overview
2. Read `backend.md` for main process and IPC handlers
3. Read `frontend.md` for React components and hooks
4. Check `management.md` for current priorities

**For Troubleshooting:**
1. Check `context.md` for historical fixes
2. Check `management.md` for known issues
3. Review `architecture.md` for data flow

**For Planning:**
1. Check `management.md` for TODO items
2. Check `context.md` for past decisions

---

## 7. Change Log

### 2026-04-18

- Created this management.md document
- Fixed server connection "Save not available" issue
- Updated main.js with saveConfig function

### 2026-04-14

- Completed ServerManager modular split
- Fixed pharmacy revenue tracking

### 2026-04-13

- Migrated to server-client architecture
- Split handlers.js into 19 modular files

---

## 8. Meeting Notes

### Last Meeting (April 18, 2026)

**Attendees:** Development Team

**Discussion Points:**
1. Server connection saving issue - FIXED
2. Need to create comprehensive documentation - COMPLETED
3. Testing server mode across multiple PCs - NEXT PRIORITY

**Action Items:**
- [ ] Rebuild application after fix
- [ ] Test server connection save works
- [ ] Schedule multi-PC testing

---

## 9. Quick Reference

### Key Commands

```bash
# Development
npm run dev

# Build frontend
npm run build

# Package app
npm run build:app

# Setup server
npm run setup:server

# Run server
npm run start:server

# Setup local database
npm run setup-db
```

### Key Paths

| Item | Path |
|------|------|
| Config | %APPDATA%/eye-clinic/config.json |
| Database | %APPDATA%/eye-clinic/eye_clinic.db |
| Logs | %APPDATA%/eye-clinic/logs/ |
| Backups | %APPDATA%/eye-clinic/backups/ |

### Default Credentials (after setup)

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@clinic.com | admin123 |
| Doctor | doctor@clinic.com | doctor123 |
| Assistant | assistant@clinic.com | assistant123 |

### Important Ports

| Port | Service |
|------|---------|
| 3001 | API Server |
| 5173 | Vite Dev Server |

---

**End of Management Document**

*Last Updated: April 18, 2026*