const { ipcMain, BrowserWindow } = require('electron');
const DatabaseService = require('../../../src/services/DatabaseService');
const { buildErrorResponse, safeHandle } = require('./utils');
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

module.exports = function registerNotificationHandlers(ctx) {
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

    safeHandle('notifications:getAll', async (event, userId) => {
        try {
            const id = userId || _currentUser?.id;
            if (!id) return { success: false, error: 'User ID required' };
            const serverUrl = ctx.appConfig?.serverUrl;
            if (serverUrl) {
                const result = await httpRequest(`${serverUrl}/api/notifications?userId=${id}`, 'GET', '', { 'Authorization': `Bearer ${getToken()}` });
                return result;
            }
            const notifications = await DatabaseService.getNotificationsByUser(id);
            return { success: true, notifications };
        } catch (error) {
            return buildErrorResponse(error, { scope: 'notifications', action: 'getAll', entity: 'notification' });
        }
    });

    safeHandle('notifications:markRead', async (event, id) => {
        try {
            if (!id) return { success: false, error: 'Notification ID required' };
            const serverUrl = ctx.appConfig?.serverUrl;
            if (serverUrl) {
                return await httpRequest(`${serverUrl}/api/notifications/${id}/read`, 'PUT', '', { 'Authorization': `Bearer ${getToken()}` });
            }
            const result = await DatabaseService.markNotificationRead(id);
            return { success: true, ...result };
        } catch (error) {
            return buildErrorResponse(error, { scope: 'notifications', action: 'markRead', entity: 'notification' });
        }
    });

    safeHandle('notifications:markAllRead', async (event, userId) => {
        try {
            const id = userId || _currentUser?.id;
            if (!id) return { success: false, error: 'User ID required' };
            const serverUrl = ctx.appConfig?.serverUrl;
            if (serverUrl) {
                const result = await httpRequest(`${serverUrl}/api/notifications/read-all`, 'PUT', JSON.stringify({ userId: id }), { 'Authorization': `Bearer ${getToken()}` });
                return result;
            }
            await DatabaseService.markAllNotificationsRead(id);
            return { success: true };
        } catch (error) {
            return buildErrorResponse(error, { scope: 'notifications', action: 'markAllRead', entity: 'notification' });
        }
    });
};

