const { ipcMain } = require('electron');
const DatabaseService = require('../../../src/services/DatabaseService');
const { buildErrorResponse } = require('./utils');

let _currentUser = null;
function setCurrentUser(u) { _currentUser = u; }

module.exports = function registerDashboardHandlers(ctx) {
  _currentUser = ctx.currentUser;
  if (ctx._setCurrentUser) {
    const orig = ctx._setCurrentUser;
    ctx._setCurrentUser = (u) => { _currentUser = u; orig(u); };
  } else {
    ctx._setCurrentUser = (u) => { _currentUser = u; };
  }

  ipcMain.handle('dashboard:getStats', async () => {
    try {
      const stats = await DatabaseService.getDashboardStats();
      return { success: true, stats };
    } catch (error) {
      return buildErrorResponse(error, { scope: 'dashboard', action: 'getStats' });
    }
  });

  ipcMain.handle('dashboard:getSalesRecords', async (event, filters = {}) => {
    try {
      const records = await DatabaseService.getSalesRecords(filters);
      return { success: true, records };
    } catch (error) {
      return buildErrorResponse(error, { scope: 'dashboard', action: 'getSalesRecords' });
    }
  });
};
