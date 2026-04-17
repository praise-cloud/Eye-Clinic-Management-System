const { ipcMain, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const { buildErrorResponse, safeHandle } = require('./utils');

let _currentUser = null;
function setCurrentUser(u) { _currentUser = u; }

module.exports = function registerWindowHandlers(ctx) {
  _currentUser = ctx.currentUser;
  if (ctx._setCurrentUser) {
    const orig = ctx._setCurrentUser;
    ctx._setCurrentUser = (u) => { _currentUser = u; orig(u); };
  } else {
    ctx._setCurrentUser = (u) => { _currentUser = u; };
  }

  safeHandle('window:openMain', async () => {
    try {
      const win = BrowserWindow.getFocusedWindow();
      if (win) {
        const isDev = process.env.NODE_ENV === 'development';
        if (isDev) await win.loadURL('http://localhost:5173/');
        else await win.loadFile(path.join(__dirname, '../../../dist/index.html'));
      }
      return { success: true };
    } catch (error) { return buildErrorResponse(error, { scope: 'window', action: 'openMain' }); }
  });

  safeHandle('window:closeAuth', async () => {
    try {
      const win = BrowserWindow.getFocusedWindow();
      if (win) win.close();
      return { success: true };
    } catch (error) { return buildErrorResponse(error, { scope: 'window', action: 'closeAuth' }); }
  });

  safeHandle('file:save', async (event, options = {}) => {
    try {
      const { content, filename, contentType } = options;
      if (!content) return { success: false, error: 'Content required' };
      const { dialog } = require('electron');
      const win = BrowserWindow.getFocusedWindow();
      const result = await dialog.showSaveDialog(win, {
        defaultPath: filename || 'export',
        filters: contentType === 'json' ? [{ name: 'JSON', extensions: ['json'] }] : [{ name: 'All Files', extensions: ['*'] }]
      });
      if (result.canceled || !result.filePath) return { success: false, error: 'Save cancelled' };
      if (contentType === 'json') fs.writeFileSync(result.filePath, JSON.stringify(content, null, 2), 'utf-8');
      else fs.writeFileSync(result.filePath, content);
      return { success: true, path: result.filePath };
    } catch (error) { return buildErrorResponse(error, { scope: 'file', action: 'save' }); }
  });

  safeHandle('app:checkUpdate', async () => ({ success: true, updateAvailable: false, message: 'Auto-update not configured' }));
};

