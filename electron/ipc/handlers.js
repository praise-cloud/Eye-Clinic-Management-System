const { ipcMain, BrowserWindow } = require('electron');

const { buildErrorResponse } = require('./handlers/utils');

const registerAuthHandlers = require('./handlers/auth');
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
const registerCvfHandlers = require('./handlers/cvf');
const registerWindowHandlers = require('./handlers/window');
const registerDashboardHandlers = require('./handlers/dashboard');
const registerServerHandlers = require('./handlers/server');
const registerRevenueHandlers = require('./handlers/revenue');

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
  constructor({ config = {}, saveConfig = null, loadConfig = null, serverManager = null } = {}) {
    _appConfig = config;
    ctx._saveAppConfig = saveConfig;
    ctx.appConfig = config;

    ctx._setCurrentUser = (u) => { currentUser = u; };
    ctx._setTokens = (access, refresh) => { accessToken = access; refreshToken = refresh; };

    registerAuthHandlers(ctx);
    registerPatientHandlers(ctx);
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
    registerCvfHandlers(ctx);
    registerWindowHandlers(ctx);
    registerDashboardHandlers(ctx);
    registerServerHandlers(ctx);
    registerRevenueHandlers(ctx);

    if (ctx._authUtils) {
      ctx._authUtils.setTokens = ctx._setTokens;
    }

    console.log('IPC handlers - All modular registration methods called');
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
