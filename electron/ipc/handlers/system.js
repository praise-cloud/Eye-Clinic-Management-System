const { ipcMain, app } = require('electron');
const path = require('path');
const fs = require('fs');
const dns = require('dns');
const DatabaseService = require('../../../src/services/DatabaseService');
const { buildErrorResponse } = require('./utils');

let _currentUser = null;
function setCurrentUser(u) { _currentUser = u; }

const safeHandle = (channel, handler) => {
  try { ipcMain.removeHandler(channel); } catch (err) { console.warn('[IPC] removeHandler warning:', err?.message); }
  ipcMain.handle(channel, handler);
};

module.exports = function registerSystemHandlers(ctx) {
  _currentUser = ctx.currentUser;
  if (ctx._setCurrentUser) {
    const orig = ctx._setCurrentUser;
    ctx._setCurrentUser = (u) => { _currentUser = u; orig(u); };
  } else {
    ctx._setCurrentUser = (u) => { _currentUser = u; };
  }

  safeHandle('system:healthCheck', async () => ({ success: true, status: 'healthy', timestamp: new Date().toISOString() }));

  safeHandle('system:checkOnline', async () => {
    try {
      const db = await DatabaseService.getDatabase();
      await db.get('SELECT 1 as ok');
      const checkConnection = new Promise(resolve => { dns.lookup('google.com', err => resolve(!err)); });
      const timeout = new Promise(resolve => { setTimeout(() => resolve(false), 5000); });
      const online = await Promise.race([checkConnection, timeout]);
      return { success: true, online, timestamp: new Date().toISOString() };
    } catch (error) {
      return buildErrorResponse(error, { scope: 'system', action: 'checkOnline' }, { online: false, timestamp: new Date().toISOString() });
    }
  });

  safeHandle('system:getNetworkDbPath', async () => {
    try {
      const dir = app.getPath('userData');
      const cfgPath = path.join(dir, 'config.json');
      if (!fs.existsSync(cfgPath)) return { success: true, path: null };
      const data = JSON.parse(fs.readFileSync(cfgPath, 'utf-8'));
      return { success: true, path: data.network_db_path || null };
    } catch (error) { return { success: false, error: error.message, path: null }; }
  });

  safeHandle('system:setNetworkDbPath', async (event, payload) => {
    try {
      if (!_currentUser || String(_currentUser.role || '').toLowerCase() !== 'admin') return { success: false, error: 'Only admin can change network database path' };
      const dir = app.getPath('userData');
      const cfgPath = path.join(dir, 'config.json');
      let existing = {};
      if (fs.existsSync(cfgPath)) {
        try { existing = JSON.parse(fs.readFileSync(cfgPath, 'utf-8')); } catch { }
      }
      const data = { ...existing, network_db_path: payload?.path || '' };
      fs.writeFileSync(cfgPath, JSON.stringify(data));
      return { success: true, path: data.network_db_path };
    } catch (error) { return buildErrorResponse(error, { scope: 'system', action: 'setNetworkDbPath' }); }
  });

  safeHandle('system:getServerConfig', async () => {
    try {
      const dir = app.getPath('userData');
      const cfgPath = path.join(dir, 'config.json');
      let config = { isServerMode: false, serverUrl: '', autoConnect: true, deviceName: '', serverPort: 3001 };
      if (fs.existsSync(cfgPath)) {
        try { config = { ...config, ...JSON.parse(fs.readFileSync(cfgPath, 'utf-8')) }; } catch { }
      }
      return { success: true, config };
    } catch (error) { return { success: false, error: error.message }; }
  });

  safeHandle('system:saveServerConfig', async (event, config = {}) => {
    try {
      if (!_currentUser || String(_currentUser.role || '').toLowerCase() !== 'admin') return { success: false, error: 'Only admin can change server settings' };
      const dir = app.getPath('userData');
      const cfgPath = path.join(dir, 'config.json');
      let existing = {};
      if (fs.existsSync(cfgPath)) {
        try { existing = JSON.parse(fs.readFileSync(cfgPath, 'utf-8')); } catch { }
      }
      const data = { ...existing, ...config };
      fs.writeFileSync(cfgPath, JSON.stringify(data));
      return { success: true, config: data };
    } catch (error) { return buildErrorResponse(error, { scope: 'system', action: 'saveServerConfig' }); }
  });
};
