const { ipcMain, BrowserWindow } = require('electron');
const DatabaseService = require('../../../src/services/DatabaseService');
const { buildErrorResponse } = require('./utils');
const http = require('http');

let _currentUser = null;
let _accessToken = null;

function setCurrentUser(u) { _currentUser = u; }

async function httpRequest(url, method, body, headers = {}) {
    return new Promise((resolve) => {
        const urlObj = new URL(url);
        const options = {
            hostname: urlObj.hostname,
            port: urlObj.port || 80,
            path: urlObj.pathname + urlObj.search,
            method,
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body || ''), ...headers }
        };
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try { resolve(JSON.parse(data)); }
                catch { resolve({ success: false, error: 'Invalid server response' }); }
            });
        });
        req.on('error', (err) => resolve({ success: false, error: `Server unreachable: ${err.message}` }));
        req.write(body || '');
        req.end();
    });
}

module.exports = function registerChatHandlers(ctx) {
    _currentUser = ctx.currentUser;
    if (ctx._setCurrentUser) {
        const orig = ctx._setCurrentUser;
        ctx._setCurrentUser = (u) => { _currentUser = u; orig(u); };
    } else {
        ctx._setCurrentUser = (u) => { _currentUser = u; };
    }
    if (ctx._authUtils) {
        ctx._authUtils.getAccessToken = () => _accessToken;
        const origSetTokens = ctx._authUtils.setTokens;
        ctx._authUtils.setTokens = (access) => { _accessToken = access; if (origSetTokens) origSetTokens(access); };
    }

    function getToken() {
        return _accessToken || ctx._authUtils?.getAccessToken?.() || null;
    }

    ipcMain.handle('chat:getMessages', async (event, data = {}) => {
        try {
            const { userId, otherUserId, search = '', limit = 50, offset = 0 } = data || {};
            if (!userId) return { success: false, error: 'User ID required' };
            const serverUrl = ctx.appConfig?.serverUrl;
            if (serverUrl) {
                const params = new URLSearchParams({ userId, search, limit, offset });
                if (otherUserId) params.set('otherUserId', otherUserId);
                const result = await httpRequest(`${serverUrl}/api/chat/${otherUserId || userId}?${params}`, 'GET', '', { 'Authorization': `Bearer ${getToken()}` });
                return result;
            }
            const messages = await DatabaseService.getMessages(userId, otherUserId, search, limit, offset);
            return { success: true, messages };
        } catch (error) {
            return buildErrorResponse(error, { scope: 'chat', action: 'getMessages', entity: 'message' });
        }
    });

    ipcMain.handle('chat:sendMessage', async (event, senderId, receiverId, messageText, attachment, replyToId) => {
        try {
            const serverUrl = ctx.appConfig?.serverUrl;
            if (serverUrl) {
                const result = await httpRequest(`${serverUrl}/api/chat`, 'POST', JSON.stringify({ senderId, receiverId, messageText, attachment, replyToId }), { 'Authorization': `Bearer ${getToken()}` });
                if (result.success) {
                    BrowserWindow.getAllWindows().forEach(w => w.webContents.send('new-message', result.message));
                    BrowserWindow.getAllWindows().forEach(w => w.webContents.send('server:chatMessage', result.message));
                }
                return result;
            }
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
            const serverUrl = ctx.appConfig?.serverUrl;
            if (serverUrl) {
                return await httpRequest(`${serverUrl}/api/chat/mark-read`, 'POST', JSON.stringify({ messageId, userId }), { 'Authorization': `Bearer ${getToken()}` });
            }
            return await DatabaseService.markMessageAsRead(messageId, userId);
        } catch (error) {
            return buildErrorResponse(error, { scope: 'chat', action: 'markMessageRead', entity: 'message' });
        }
    });

    ipcMain.handle('chat:markAllAsRead', async (event, data = {}) => {
        try {
            const { userId, otherUserId } = data || {};
            if (!userId || !otherUserId) return { success: false, error: 'userId and otherUserId required' };
            const serverUrl = ctx.appConfig?.serverUrl;
            if (serverUrl) {
                return await httpRequest(`${serverUrl}/api/chat/mark-read`, 'POST', JSON.stringify({ userId, otherUserId }), { 'Authorization': `Bearer ${getToken()}` });
            }
            return await DatabaseService.markAllMessagesAsRead(userId, otherUserId);
        } catch (error) {
            return buildErrorResponse(error, { scope: 'chat', action: 'markAllAsRead', entity: 'message' });
        }
    });

    ipcMain.handle('chat:getUnreadCount', async (event, userId) => {
        try {
            if (!userId) return { success: false, error: 'User ID required' };
            const serverUrl = ctx.appConfig?.serverUrl;
            if (serverUrl) {
                const result = await httpRequest(`${serverUrl}/api/chat/unread/${userId}`, 'GET', '', { 'Authorization': `Bearer ${getToken()}` });
                return result;
            }
            const count = await DatabaseService.getUnreadMessageCount(userId);
            return { success: true, count };
        } catch (error) {
            return buildErrorResponse(error, { scope: 'chat', action: 'getUnreadCount', entity: 'message' });
        }
    });

    ipcMain.handle('chat:deleteMessage', async (event, messageId) => {
        try {
            if (!messageId || !_currentUser?.id) return { success: false, error: 'messageId and current user required' };
            const serverUrl = ctx.appConfig?.serverUrl;
            if (serverUrl) {
                return await httpRequest(`${serverUrl}/api/chat/${messageId}`, 'DELETE', '', { 'Authorization': `Bearer ${getToken()}` });
            }
            return await DatabaseService.deleteMessage(messageId, _currentUser.id);
        } catch (error) {
            return buildErrorResponse(error, { scope: 'chat', action: 'deleteMessage', entity: 'message' });
        }
    });
};
