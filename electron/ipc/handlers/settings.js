const { ipcMain } = require('electron');
const DatabaseService = require('../../../src/services/DatabaseService');
const { buildErrorResponse } = require('./utils');
const http = require('http');

let _currentUser = null;
function setCurrentUser(u) { _currentUser = u; }

async function serverApiCall(serverUrl, endpoint, method, body, token) {
    return new Promise((resolve) => {
        const url = new URL(`${serverUrl}${endpoint}`);
        const options = {
            hostname: url.hostname, port: url.port || 80,
            path: url.pathname + url.search, method,
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body || ''),
                'Authorization': `Bearer ${token}`
            }
        };
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => {
                try { resolve(JSON.parse(data)); }
                catch { resolve({ success: false, error: 'Invalid server response' }); }
            });
        });
        req.on('error', err => resolve({ success: false, error: err.message }));
        req.write(body || '');
        req.end();
    });
}

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
            const serverUrl = ctx.appConfig?.serverUrl;
            const token = ctx._authUtils?.getAccessToken?.();
            if (serverUrl && token) {
                const result = await serverApiCall(serverUrl, `/api/settings?key=${encodeURIComponent(key)}`, 'GET', '', token);
                return result;
            }
            const value = await DatabaseService.getSetting(key);
            return { success: true, value };
        } catch (error) {
            return buildErrorResponse(error, { scope: 'settings', action: 'get', entity: 'setting' });
        }
    });

    ipcMain.handle('settings:getAll', async () => {
        try {
            const serverUrl = ctx.appConfig?.serverUrl;
            const token = ctx._authUtils?.getAccessToken?.();
            if (serverUrl && token) {
                const result = await serverApiCall(serverUrl, '/api/settings', 'GET', '', token);
                return result;
            }
            const settings = await DatabaseService.getAllSettings();
            return { success: true, settings };
        } catch (error) {
            return buildErrorResponse(error, { scope: 'settings', action: 'getAll', entity: 'setting' });
        }
    });

    ipcMain.handle('settings:set', async (event, { key, value }) => {
        try {
            const serverUrl = ctx.appConfig?.serverUrl;
            const token = ctx._authUtils?.getAccessToken?.();
            if (serverUrl && token) {
                const result = await serverApiCall(serverUrl, '/api/settings', 'PUT', JSON.stringify({ key, value }), token);
                return result;
            }
            await DatabaseService.setSetting(key, value);
            return { success: true };
        } catch (error) {
            return buildErrorResponse(error, { scope: 'settings', action: 'set', entity: 'setting' });
        }
    });
};
