const { ipcMain, BrowserWindow } = require('electron');
const DatabaseService = require('../../../src/services/DatabaseService');
const { buildErrorResponse } = require('./utils');
const http = require('http');

let _currentUser = null;
let _accessToken = null;

function setCurrentUser(u) { _currentUser = u; }
function setAccessToken(t) { _accessToken = t; }

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

module.exports = function registerInventoryHandlers(ctx) {
    _currentUser = ctx.currentUser;
    if (ctx._setCurrentUser) {
        const orig = ctx._setCurrentUser;
        ctx._setCurrentUser = (u) => { _currentUser = u; orig(u); };
    } else {
        ctx._setCurrentUser = (u) => { _currentUser = u; };
    }
    if (ctx._authUtils) {
        const origSetTokens = ctx._authUtils.setTokens;
        ctx._authUtils.setTokens = (access) => { _accessToken = access; if (origSetTokens) origSetTokens(access); };
    }

    function getToken() {
        return _accessToken || ctx._authUtils?.getAccessToken?.() || null;
    }

    function broadcastUpdate(table, action, record, recordId) {
        const data = { table, action };
        if (record) data.record = record;
        if (recordId) data.recordId = recordId;
        BrowserWindow.getAllWindows().forEach(w => {
            w.webContents.send('data:update', data);
            w.webContents.send('server:dataUpdate', data);
        });
    }

    ipcMain.handle('inventory:getAll', async (event, filters = {}) => {
        try {
            const serverUrl = ctx.appConfig?.serverUrl;
            if (serverUrl) {
                const params = new URLSearchParams();
                if (filters.search) params.set('search', filters.search);
                if (filters.category) params.set('category', filters.category);
                const url = `/api/inventory${params.toString() ? '?' + params.toString() : ''}`;
                const result = await httpRequest(`${serverUrl}${url}`, 'GET', '', { 'Authorization': `Bearer ${getToken()}` });
                return result;
            }
            const items = await DatabaseService.getAllInventoryItems(filters);
            return { success: true, items };
        } catch (error) {
            return buildErrorResponse(error, { scope: 'inventory', action: 'getAll', entity: 'inventory' });
        }
    });

    ipcMain.handle('inventory:getById', async (event, id) => {
        try {
            if (!id) return { success: false, error: 'Item ID required' };
            const serverUrl = ctx.appConfig?.serverUrl;
            if (serverUrl) {
                const result = await httpRequest(`${serverUrl}/api/inventory/${id}`, 'GET', '', { 'Authorization': `Bearer ${getToken()}` });
                return result;
            }
            const item = await DatabaseService.getInventoryItemById(id);
            return item ? { success: true, item } : { success: false, error: 'Item not found' };
        } catch (error) {
            return buildErrorResponse(error, { scope: 'inventory', action: 'getById', entity: 'inventory' });
        }
    });

    ipcMain.handle('inventory:create', async (event, itemData) => {
        try {
            const serverUrl = ctx.appConfig?.serverUrl;
            if (serverUrl) {
                const result = await httpRequest(`${serverUrl}/api/inventory`, 'POST', JSON.stringify(itemData), { 'Authorization': `Bearer ${getToken()}` });
                if (result.success) broadcastUpdate('inventory', 'create', result.item);
                return result;
            }
            const item = await DatabaseService.createInventoryItem(itemData);
            if (_currentUser?.id) await DatabaseService.logActivity(_currentUser.id, 'create', 'inventory', item.id, `Inventory item ${item.item_name} created`);
            broadcastUpdate('inventory', 'create', item);
            return { success: true, item };
        } catch (error) {
            return buildErrorResponse(error, { scope: 'inventory', action: 'create', entity: 'inventory' });
        }
    });

    ipcMain.handle('inventory:update', async (event, { id, itemData }) => {
        try {
            if (!id) return { success: false, error: 'Item ID required' };
            const serverUrl = ctx.appConfig?.serverUrl;
            if (serverUrl) {
                const result = await httpRequest(`${serverUrl}/api/inventory/${id}`, 'PUT', JSON.stringify(itemData), { 'Authorization': `Bearer ${getToken()}` });
                if (result.success) broadcastUpdate('inventory', 'update', result.item);
                return result;
            }
            const item = await DatabaseService.updateInventoryItem(id, itemData);
            if (_currentUser?.id) await DatabaseService.logActivity(_currentUser.id, 'update', 'inventory', id, `Inventory item ${id} updated`);
            broadcastUpdate('inventory', 'update', item);
            return { success: true, item };
        } catch (error) {
            return buildErrorResponse(error, { scope: 'inventory', action: 'update', entity: 'inventory' });
        }
    });

    ipcMain.handle('inventory:delete', async (event, id) => {
        try {
            if (!id) return { success: false, error: 'Item ID required' };
            const serverUrl = ctx.appConfig?.serverUrl;
            if (serverUrl) {
                const result = await httpRequest(`${serverUrl}/api/inventory/${id}`, 'DELETE', '', { 'Authorization': `Bearer ${getToken()}` });
                if (result.success) broadcastUpdate('inventory', 'delete', null, id);
                return result;
            }
            const result = await DatabaseService.deleteInventoryItem(id);
            if (result.success && _currentUser?.id) await DatabaseService.logActivity(_currentUser.id, 'delete', 'inventory', id, `Inventory item ${id} deleted`);
            if (result.success) broadcastUpdate('inventory', 'delete', null, id);
            return result;
        } catch (error) {
            return buildErrorResponse(error, { scope: 'inventory', action: 'delete', entity: 'inventory' });
        }
    });

    ipcMain.handle('inventory:updateQuantity', async (event, { id, quantity, userId, notes }) => {
        try {
            if (!id || typeof quantity !== 'number') return { success: false, error: 'Item ID and quantity required' };
            const serverUrl = ctx.appConfig?.serverUrl;
            if (serverUrl) {
                const result = await httpRequest(`${serverUrl}/api/inventory/${id}/quantity`, 'PUT', JSON.stringify({ quantity, notes }), { 'Authorization': `Bearer ${getToken()}` });
                if (result.success) broadcastUpdate('inventory', 'update', result.item);
                return result;
            }
            const item = await DatabaseService.updateInventoryQuantity(id, quantity, userId, notes);
            if (userId) await DatabaseService.logActivity(userId, 'update', 'inventory', id, `Inventory quantity updated to ${quantity}`);
            broadcastUpdate('inventory', 'update', item);
            return { success: true, item };
        } catch (error) {
            return buildErrorResponse(error, { scope: 'inventory', action: 'updateQuantity', entity: 'inventory' });
        }
    });

    ipcMain.handle('inventory:getByCode', async (event, itemCode) => {
        try {
            if (!itemCode) return { success: false, error: 'Item code required' };
            const serverUrl = ctx.appConfig?.serverUrl;
            if (serverUrl) {
                const result = await httpRequest(`${serverUrl}/api/inventory/code/${encodeURIComponent(itemCode)}`, 'GET', '', { 'Authorization': `Bearer ${getToken()}` });
                return result;
            }
            const item = await DatabaseService.getInventoryItemByCode(itemCode);
            return item ? { success: true, item } : { success: false, error: 'Item not found' };
        } catch (error) {
            return buildErrorResponse(error, { scope: 'inventory', action: 'getByCode', entity: 'inventory' });
        }
    });

    ipcMain.handle('inventory:getStatistics', async () => {
        try {
            const serverUrl = ctx.appConfig?.serverUrl;
            if (serverUrl) {
                const result = await httpRequest(`${serverUrl}/api/inventory/statistics`, 'GET', '', { 'Authorization': `Bearer ${getToken()}` });
                return result;
            }
            const stats = await DatabaseService.getInventoryStatistics();
            return { success: true, stats };
        } catch (error) {
            return buildErrorResponse(error, { scope: 'inventory', action: 'getStatistics', entity: 'inventory' });
        }
    });

    ipcMain.handle('inventory:getLowStock', async () => {
        try {
            const serverUrl = ctx.appConfig?.serverUrl;
            if (serverUrl) {
                const result = await httpRequest(`${serverUrl}/api/inventory/low-stock`, 'GET', '', { 'Authorization': `Bearer ${getToken()}` });
                return result;
            }
            const items = await DatabaseService.getLowStockItems();
            return { success: true, items };
        } catch (error) {
            return buildErrorResponse(error, { scope: 'inventory', action: 'getLowStock', entity: 'inventory' });
        }
    });

    ipcMain.handle('inventory:getExpiring', async (event, days = 30) => {
        try {
            const serverUrl = ctx.appConfig?.serverUrl;
            if (serverUrl) {
                const result = await httpRequest(`${serverUrl}/api/inventory/expiring?days=${days}`, 'GET', '', { 'Authorization': `Bearer ${getToken()}` });
                return result;
            }
            const items = await DatabaseService.getExpiringItems(days);
            return { success: true, items };
        } catch (error) {
            return buildErrorResponse(error, { scope: 'inventory', action: 'getExpiring', entity: 'inventory' });
        }
    });

    ipcMain.handle('inventory:search', async (event, searchTerm) => {
        try {
            if (!searchTerm) return { success: false, error: 'Search term required' };
            const serverUrl = ctx.appConfig?.serverUrl;
            if (serverUrl) {
                const result = await httpRequest(`${serverUrl}/api/inventory?search=${encodeURIComponent(searchTerm)}`, 'GET', '', { 'Authorization': `Bearer ${getToken()}` });
                return result;
            }
            const items = await DatabaseService.searchInventory(searchTerm);
            return { success: true, items };
        } catch (error) {
            return buildErrorResponse(error, { scope: 'inventory', action: 'search', entity: 'inventory' });
        }
    });
};
