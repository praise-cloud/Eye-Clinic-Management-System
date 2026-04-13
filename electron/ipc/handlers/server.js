const { ipcMain } = require('electron');
const { buildErrorResponse } = require('./utils');

let _currentUser = null;
function setCurrentUser(u) { _currentUser = u; }

module.exports = function registerServerHandlers(ctx) {
  _currentUser = ctx.currentUser;
  if (ctx._setCurrentUser) {
    const orig = ctx._setCurrentUser;
    ctx._setCurrentUser = (u) => { _currentUser = u; orig(u); };
  } else {
    ctx._setCurrentUser = (u) => { _currentUser = u; };
  }

  ipcMain.handle('server:start', async (event, serverConfig = {}) => {
    try {
      const ServerManager = require('../server/ServerManager');
      if (ServerManager.isRunning) {
        return { success: true, message: 'Server already running', status: ServerManager.getStatus() };
      }
      await ServerManager.start({ port: serverConfig.port || 3001 });
      if (ctx._saveAppConfig) {
        const newConfig = { ...ctx.appConfig, isServerMode: true, serverPort: serverConfig.port || 3001 };
        ctx._saveAppConfig(newConfig);
        ctx.appConfig = newConfig;
      }
      return { success: true, status: ServerManager.getStatus() };
    } catch (error) {
      console.error('[Server] Start error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('server:stop', async () => {
    try {
      const ServerManager = require('../server/ServerManager');
      if (!ServerManager.isRunning) {
        return { success: true, message: 'Server not running' };
      }
      await ServerManager.stop();
      if (ctx._saveAppConfig) {
        const newConfig = { ...ctx.appConfig, isServerMode: false };
        ctx._saveAppConfig(newConfig);
        ctx.appConfig = newConfig;
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('server:status', async () => {
    try {
      const ServerManager = require('../server/ServerManager');
      return {
        success: true,
        status: ServerManager.getStatus(),
        config: ctx.appConfig || {}
      };
    } catch (error) { return { success: false, error: error.message }; }
  });

  ipcMain.handle('server:connect', async (event, url) => {
    try {
      return { success: true, message: 'Server connection initiated', url };
    } catch (error) { return { success: false, error: error.message }; }
  });

  ipcMain.handle('server:disconnect', async () => {
    try { return { success: true }; } catch (error) { return { success: false, error: error.message }; }
  });

  ipcMain.handle('server:getStatus', async () => {
    try {
      const ServerManager = require('../server/ServerManager');
      const status = ServerManager.getStatus ? ServerManager.getStatus() : { running: false, port: 3001 };
      return { success: true, status, config: ctx.appConfig || {} };
    } catch (error) { return { success: false, error: error.message }; }
  });

  ipcMain.handle('serverConfig:get', async () => {
    try {
      return { success: true, config: ctx.appConfig || {} };
    } catch (error) { return { success: false, error: error.message }; }
  });

  ipcMain.handle('serverConfig:set', async (event, partialConfig) => {
    try {
      if (!ctx._saveAppConfig) return { success: false, error: 'Save not available' };
      const newConfig = { ...ctx.appConfig, ...partialConfig };
      const saved = ctx._saveAppConfig(newConfig);
      if (saved) { ctx.appConfig = newConfig; }
      return { success: saved, config: newConfig };
    } catch (error) { return { success: false, error: error.message }; }
  });

  ipcMain.handle('serverConfig:getSqlServer', async () => {
    try {
      return { success: true, config: ctx.appConfig?.sql_server || {} };
    } catch (error) { return { success: false, error: error.message }; }
  });

  ipcMain.handle('serverConfig:setSqlServer', async (event, sqlConfig) => {
    try {
      if (!ctx._saveAppConfig) return { success: false, error: 'Save not available' };
      const newConfig = { ...ctx.appConfig, sql_server: { ...ctx.appConfig?.sql_server, ...sqlConfig } };
      const saved = ctx._saveAppConfig(newConfig);
      if (saved) { ctx.appConfig = newConfig; }
      return { success: saved };
    } catch (error) { return { success: false, error: error.message }; }
  });
};
