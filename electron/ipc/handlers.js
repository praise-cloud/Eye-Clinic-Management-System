const { ipcMain, BrowserWindow, app } = require('electron');
const path = require('path');
const fs = require('fs');

const { buildErrorResponse } = require('./handlers/utils');

// ── File Logging (lazy - only after app is ready) ───────────────────
function writeLog(message) {
  try {
    const logDir = path.join(app.getPath('userData'), 'logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    const logPath = path.join(logDir, 'handlers.log');
    const timestamp = new Date().toISOString();
    fs.appendFileSync(logPath, `${timestamp} - ${message}\n`);
  } catch (e) {
    // App not ready yet - use console only
    console.log('[Handlers] (log not ready):', message);
  }
}

const registerAuthHandlers = require('./handlers/auth');
console.log('[Handlers] Loading handler modules...');

const registerPatientHandlers = require('./handlers/patients');
const registerTestHandlers = require('./handlers/tests');
const registerReportsHandlers = require('./handlers/reports');
const registerInventoryHandlers = require('./handlers/inventory');
const registerPharmacyHandlers = require('./handlers/pharmacy');
const registerPrescriptionHandlers = require('./handlers/prescriptions');
const registerNotificationHandlers = require('./handlers/notifications');
const registerAdminHandlers = require('./handlers/admin');
const registerFileHandlers = require('./handlers/file');
const registerChatHandlers = require('./handlers/chat');
const registerPresenceHandlers = require('./handlers/presence');
const registerSettingsHandlers = require('./handlers/settings');
const registerSystemHandlers = require('./handlers/system');
const registerWindowHandlers = require('./handlers/window');
const registerDashboardHandlers = require('./handlers/dashboard');
const registerServerHandlers = require('./handlers/server');
const registerRevenueHandlers = require('./handlers/revenue');
const registerVisitHandlers = require('./handlers/visits');
const registerCaseNoteHandlers = require('./handlers/case-notes');
const registerReminderHandlers = require('./handlers/reminders');
const registerBackupHandlers = require('./handlers/backup');

let currentUser = null;
let accessToken = null;
let refreshToken = null;

const ctx = {
  get currentUser() { return currentUser; },
  set currentUser(u) { currentUser = u; },
  get appConfig() { return _appConfig; },
  set appConfig(c) { _appConfig = c; },
  _saveAppConfig: null,
  _setCurrentUser: null,
  _setTokens: null,
  _authUtils: null
};

let _appConfig = {};

class IPCHandlers {
  constructor(context = {}) {
    // Accept various property names for compatibility
    const config = context.config || context.appConfig || {};
    const saveConfigFn = context.saveConfig || context._saveAppConfig;
    const loadConfigFn = context.loadConfig;
    
    _appConfig = config;
    ctx._saveAppConfig = saveConfigFn;
    ctx.appConfig = config;

    ctx._setCurrentUser = (u) => { currentUser = u; };
    ctx._setTokens = (access, refresh) => { accessToken = access; refreshToken = refresh; };

    console.log('[IPC] Registering handlers with config:', !!config, 'saveConfig:', !!saveConfigFn);

    try {
      registerAuthHandlers(ctx);
      console.log('[IPC] auth handlers registered');
      writeLog('[Handlers] auth registered OK');
    } catch (e) { 
      console.error('[IPC] auth registration failed:', e.message);
      writeLog(`[Handlers] ERROR auth: ${e.message}`);
    }
    
    try {
      registerPatientHandlers(ctx);
      console.log('[IPC] patient handlers registered');
      writeLog('[Handlers] patient registered OK');
    } catch (e) { 
      console.error('[IPC] patient registration failed:', e.message);
      writeLog(`[Handlers] ERROR patient: ${e.message}`);
    }
    
    try {
      registerTestHandlers(ctx);
      registerReportsHandlers(ctx);
      registerInventoryHandlers(ctx);
      registerPharmacyHandlers(ctx);
      registerPrescriptionHandlers(ctx);
      registerNotificationHandlers(ctx);
      registerAdminHandlers(ctx);
      registerFileHandlers(ctx);
      registerChatHandlers(ctx);
      registerPresenceHandlers(ctx);
      registerSettingsHandlers(ctx);
      registerSystemHandlers(ctx);
      registerWindowHandlers(ctx);
      registerDashboardHandlers(ctx);
      registerServerHandlers(ctx);
      registerRevenueHandlers(ctx);
      registerVisitHandlers(ctx);
      registerCaseNoteHandlers(ctx);
      registerReminderHandlers(ctx);
      registerBackupHandlers(ctx);
    } catch (e) { 
      console.error('[IPC] Other handlers registration failed:', e.message);
      writeLog(`[Handlers] ERROR other: ${e.message}`);
    }

    try {
      writeLog('[Handlers] All registration complete');
    } catch (e) { writeLog(`[Handlers] ERROR final: ${e.message}`); }

    if (ctx._authUtils) {
      ctx._authUtils.setTokens = ctx._setTokens;
    }

    console.log('[IPC] All handlers registered successfully');
  }

  setCurrentUser(user) {
    currentUser = user;
    if (ctx._setCurrentUser) ctx._setCurrentUser(user);
  }

  getCurrentUser() {
    return currentUser;
  }
}

module.exports = IPCHandlers;
