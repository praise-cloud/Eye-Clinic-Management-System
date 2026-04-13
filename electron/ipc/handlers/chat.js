const { ipcMain, BrowserWindow } = require('electron');
const DatabaseService = require('../../../src/services/DatabaseService');
const { buildErrorResponse } = require('./utils');

let _currentUser = null;
function setCurrentUser(u) { _currentUser = u; }

module.exports = function registerChatHandlers(ctx) {
  _currentUser = ctx.currentUser;
  if (ctx._setCurrentUser) {
    const orig = ctx._setCurrentUser;
    ctx._setCurrentUser = (u) => { _currentUser = u; orig(u); };
  } else {
    ctx._setCurrentUser = (u) => { _currentUser = u; };
  }

  ipcMain.handle('chat:getMessages', async (event, data = {}) => {
    try {
      const { userId, otherUserId, search = '', limit = 50, offset = 0 } = data || {};
      if (!userId) return { success: false, error: 'User ID required' };
      const messages = await DatabaseService.getMessages(userId, otherUserId, search, limit, offset);
      return { success: true, messages };
    } catch (error) {
      return buildErrorResponse(error, { scope: 'chat', action: 'getMessages', entity: 'message' });
    }
  });

  ipcMain.handle('chat:sendMessage', async (event, senderId, receiverId, messageText, attachment, replyToId) => {
    try {
      const msg = await DatabaseService.sendMessage(senderId, receiverId, messageText, attachment, replyToId);
      BrowserWindow.getAllWindows().forEach(w => w.webContents.send('new-message', msg));
      return { success: true, message: msg };
    } catch (error) {
      return buildErrorResponse(error, { scope: 'chat', action: 'sendMessage', entity: 'message' });
    }
  });

  ipcMain.handle('chat:markMessageRead', async (event, data = {}) => {
    try {
      const { messageId, userId } = data || {};
      if (!messageId || !userId) return { success: false, error: 'messageId and userId required' };
      return await DatabaseService.markMessageAsRead(messageId, userId);
    } catch (error) {
      return buildErrorResponse(error, { scope: 'chat', action: 'markMessageRead', entity: 'message' });
    }
  });

  ipcMain.handle('chat:markAllAsRead', async (event, data = {}) => {
    try {
      const { userId, otherUserId } = data || {};
      if (!userId || !otherUserId) return { success: false, error: 'userId and otherUserId required' };
      return await DatabaseService.markAllMessagesAsRead(userId, otherUserId);
    } catch (error) {
      return buildErrorResponse(error, { scope: 'chat', action: 'markAllAsRead', entity: 'message' });
    }
  });

  ipcMain.handle('chat:getUnreadCount', async (event, userId) => {
    try {
      if (!userId) return { success: false, error: 'User ID required' };
      const count = await DatabaseService.getUnreadMessageCount(userId);
      return { success: true, count };
    } catch (error) {
      return buildErrorResponse(error, { scope: 'chat', action: 'getUnreadCount', entity: 'message' });
    }
  });

  ipcMain.handle('chat:deleteMessage', async (event, messageId) => {
    try {
      if (!messageId || !_currentUser?.id) return { success: false, error: 'messageId and current user required' };
      return await DatabaseService.deleteMessage(messageId, _currentUser.id);
    } catch (error) {
      return buildErrorResponse(error, { scope: 'chat', action: 'deleteMessage', entity: 'message' });
    }
  });
};
