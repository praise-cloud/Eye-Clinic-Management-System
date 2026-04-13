const { ipcMain } = require('electron');
const DatabaseService = require('../../../src/services/DatabaseService');
const { buildErrorResponse } = require('./utils');

let _currentUser = null;
function setCurrentUser(u) { _currentUser = u; }

module.exports = function registerPresenceHandlers(ctx) {
  _currentUser = ctx.currentUser;
  if (ctx._setCurrentUser) {
    const orig = ctx._setCurrentUser;
    ctx._setCurrentUser = (u) => { _currentUser = u; orig(u); };
  } else {
    ctx._setCurrentUser = (u) => { _currentUser = u; };
  }

  ipcMain.handle('presence:setOnline', async (event, { userId }) => {
    try {
      await DatabaseService.setUserOnline(userId);
      return { success: true };
    } catch (error) {
      return buildErrorResponse(error, { scope: 'presence', action: 'setOnline', entity: 'user' });
    }
  });

  ipcMain.handle('presence:setOffline', async (event, { userId }) => {
    try {
      await DatabaseService.setUserOffline(userId);
      return { success: true };
    } catch (error) {
      return buildErrorResponse(error, { scope: 'presence', action: 'setOffline', entity: 'user' });
    }
  });

  ipcMain.handle('presence:getOnlineUsers', async () => {
    try {
      const users = await DatabaseService.getOnlineUsers();
      return { success: true, users };
    } catch (error) {
      return buildErrorResponse(error, { scope: 'presence', action: 'getOnlineUsers', entity: 'user' });
    }
  });

  ipcMain.handle('presence:getUsersWithPresence', async () => {
    try {
      const users = await DatabaseService.getUsersWithPresence();
      return { success: true, users };
    } catch (error) {
      return buildErrorResponse(error, { scope: 'presence', action: 'getUsersWithPresence', entity: 'user' });
    }
  });
};
