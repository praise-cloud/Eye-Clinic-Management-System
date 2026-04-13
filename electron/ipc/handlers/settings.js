const { ipcMain } = require('electron');
const DatabaseService = require('../../../src/services/DatabaseService');
const { buildErrorResponse } = require('./utils');

let _currentUser = null;
function setCurrentUser(u) { _currentUser = u; }

module.exports = function registerSettingsHandlers(ctx) {
  _currentUser = ctx.currentUser;
  if (ctx._setCurrentUser) {
    const orig = ctx._setCurrentUser;
    ctx._setCurrentUser = (u) => { _currentUser = u; orig(u); };
  } else {
    ctx._setCurrentUser = (u) => { _currentUser = u; };
  }

  ipcMain.handle('settings:get', async (event, key) => {
    try {
      const value = await DatabaseService.getSetting(key);
      return { success: true, value };
    } catch (error) {
      return buildErrorResponse(error, { scope: 'settings', action: 'get', entity: 'setting' });
    }
  });

  ipcMain.handle('settings:getAll', async () => {
    try {
      const settings = await DatabaseService.getAllSettings();
      return { success: true, settings };
    } catch (error) {
      return buildErrorResponse(error, { scope: 'settings', action: 'getAll', entity: 'setting' });
    }
  });

  ipcMain.handle('settings:set', async (event, { key, value }) => {
    try {
      await DatabaseService.setSetting(key, value);
      return { success: true };
    } catch (error) {
      return buildErrorResponse(error, { scope: 'settings', action: 'set', entity: 'setting' });
    }
  });
};
