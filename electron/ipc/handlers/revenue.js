const { ipcMain } = require('electron');
const DatabaseService = require('../../../src/services/DatabaseService');
const { buildErrorResponse } = require('./utils');
const http = require('http');

let _accessToken = null;

function getToken() {
    return _accessToken || null;
}

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

module.exports = function registerRevenueHandlers(ctx) {
    if (ctx._authUtils) {
        const origSetTokens = ctx._authUtils.setTokens;
        ctx._authUtils.setTokens = (access) => { _accessToken = access; if (origSetTokens) origSetTokens(access); };
    }

    ipcMain.handle('revenue:getLogs', async (event, filters = {}) => {
        try {
            const serverUrl = ctx.appConfig?.serverUrl;
            if (serverUrl) {
                const params = new URLSearchParams();
                if (filters.startDate) params.set('startDate', filters.startDate);
                if (filters.endDate) params.set('endDate', filters.endDate);
                if (filters.source) params.set('source', filters.source);
                const query = params.toString() ? `?${params.toString()}` : '';
                const result = await httpRequest(`${serverUrl}/api/revenue${query}`, 'GET', '', { 'Authorization': `Bearer ${getToken()}` });
                return result;
            }
            const logs = await DatabaseService.getRevenueLogs(filters);
            return { success: true, data: logs };
        } catch (error) {
            return buildErrorResponse(error, { scope: 'revenue', action: 'getLogs' });
        }
    });

    ipcMain.handle('revenue:getStats', async () => {
        try {
            const serverUrl = ctx.appConfig?.serverUrl;
            if (serverUrl) {
                const result = await httpRequest(`${serverUrl}/api/revenue/stats`, 'GET', '', { 'Authorization': `Bearer ${getToken()}` });
                return result;
            }
            const stats = await DatabaseService.getRevenueStats();
            return { success: true, stats };
        } catch (error) {
            return buildErrorResponse(error, { scope: 'revenue', action: 'getStats' });
        }
    });
};
