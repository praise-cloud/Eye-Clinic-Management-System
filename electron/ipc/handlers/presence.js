const { ipcMain } = require('electron');
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

module.exports = function registerPresenceHandlers(ctx) {
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

    safeHandle('presence:setOnline', async (event, { userId }) => {
        try {
            const serverUrl = ctx.appConfig?.serverUrl;
            if (serverUrl) {
                return await httpRequest(`${serverUrl}/api/presence/online`, 'POST', JSON.stringify({ userId }), { 'Authorization': `Bearer ${getToken()}` });
            }
            await DatabaseService.setUserOnline(userId);
            return { success: true };
        } catch (error) {
            return buildErrorResponse(error, { scope: 'presence', action: 'setOnline', entity: 'user' });
        }
    });

    safeHandle('presence:setOffline', async (event, { userId }) => {
        try {
            const serverUrl = ctx.appConfig?.serverUrl;
            if (serverUrl) {
                return await httpRequest(`${serverUrl}/api/presence/offline`, 'POST', JSON.stringify({ userId }), { 'Authorization': `Bearer ${getToken()}` });
            }
            await DatabaseService.setUserOffline(userId);
            return { success: true };
        } catch (error) {
            return buildErrorResponse(error, { scope: 'presence', action: 'setOffline', entity: 'user' });
        }
    });

    safeHandle('presence:getOnlineUsers', async () => {
        try {
            const serverUrl = ctx.appConfig?.serverUrl;
            if (serverUrl) {
                const result = await httpRequest(`${serverUrl}/api/presence/online`, 'GET', '', { 'Authorization': `Bearer ${getToken()}` });
                return result;
            }
            const users = await DatabaseService.getOnlineUsers();
            return { success: true, users };
        } catch (error) {
            return buildErrorResponse(error, { scope: 'presence', action: 'getOnlineUsers', entity: 'user' });
        }
    });

    safeHandle('presence:getUsersWithPresence', async () => {
        try {
            const serverUrl = ctx.appConfig?.serverUrl;
            if (serverUrl) {
                const result = await httpRequest(`${serverUrl}/api/presence/all`, 'GET', '', { 'Authorization': `Bearer ${getToken()}` });
                return result;
            }
            const users = await DatabaseService.getUsersWithPresence();
            return { success: true, users };
        } catch (error) {
            return buildErrorResponse(error, { scope: 'presence', action: 'getUsersWithPresence', entity: 'user' });
        }
    });
};

