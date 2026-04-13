const { ipcMain } = require('electron');
const DatabaseService = require('../../../src/services/DatabaseService');
const { buildErrorResponse } = require('./utils');

let _currentUser = null;
function setCurrentUser(u) { _currentUser = u; }

module.exports = function registerNotificationHandlers(ctx) {
  _currentUser = ctx.currentUser;
  if (ctx._setCurrentUser) {
    const orig = ctx._setCurrentUser;
    ctx._setCurrentUser = (u) => { _currentUser = u; orig(u); };
  } else {
    ctx._setCurrentUser = (u) => { _currentUser = u; };
  }

  ipcMain.handle('notifications:getAll', async (event, userId) => {
    try {
      const id = userId || _currentUser?.id;
      if (!id) return { success: false, error: 'User ID required' };
      const notifications = await DatabaseService.getNotificationsByUser(id);
      return { success: true, notifications };
    } catch (error) {
      return buildErrorResponse(error, { scope: 'notifications', action: 'getAll', entity: 'notification' });
    }
  });

  ipcMain.handle('notifications:markRead', async (event, id) => {
    try {
      if (!id) return { success: false, error: 'Notification ID required' };
      const result = await DatabaseService.markNotificationRead(id);
      return { success: true, ...result };
    } catch (error) {
      return buildErrorResponse(error, { scope: 'notifications', action: 'markRead', entity: 'notification' });
    }
  });

  ipcMain.handle('notifications:markAllRead', async (event, userId) => {
    try {
      const id = userId || _currentUser?.id;
      if (!id) return { success: false, error: 'User ID required' };
      await DatabaseService.markAllNotificationsRead(id);
      return { success: true };
    } catch (error) {
      return buildErrorResponse(error, { scope: 'notifications', action: 'markAllRead', entity: 'notification' });
    }
  });
};
