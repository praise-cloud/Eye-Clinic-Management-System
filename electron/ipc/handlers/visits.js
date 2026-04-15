const { ipcMain, BrowserWindow } = require('electron');
const DatabaseService = require('../../../src/services/DatabaseService');
const { buildErrorResponse } = require('./utils');
const http = require('http');

let _currentUser = null;
let _accessToken = null;

function httpRequest(url, method, body, headers = {}) {
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

module.exports = function registerVisitHandlers(ctx) {
    _currentUser = ctx.currentUser;
    if (ctx._setCurrentUser) {
        const orig = ctx._setCurrentUser;
        ctx._setCurrentUser = (u) => { _currentUser = u; orig(u); };
    } else {
        ctx._setCurrentUser = (u) => { _currentUser = u; };
    }

    function getToken() {
        return _accessToken || ctx._authUtils?.getAccessToken?.() || null;
    }

    function requireAuth(roleList = ['admin', 'doctor', 'assistant']) {
        if (!_currentUser) return { success: false, error: 'Authentication required' };
        if (!roleList.includes(String(_currentUser.role || '').toLowerCase())) return { success: false, error: 'Access denied' };
        return null;
    }

    ipcMain.handle('visits:getAll', async (event, filters = {}) => {
        try {
            const serverUrl = ctx.appConfig?.serverUrl;
            if (serverUrl) {
                const params = new URLSearchParams();
                if (filters.patient_id) params.set('patient_id', filters.patient_id);
                if (filters.page) params.set('page', filters.page);
                const url = `/api/visits${params.toString() ? '?' + params.toString() : ''}`;
                return await httpRequest(`${serverUrl}${url}`, 'GET', '', { 'Authorization': `Bearer ${getToken()}` });
            }
            const visits = await DatabaseService.getVisitsByPatient(filters.patient_id || '');
            return { success: true, visits };
        } catch (error) { return buildErrorResponse(error, { scope: 'visits', action: 'getAll' }); }
    });

    ipcMain.handle('visits:getById', async (event, id) => {
        try {
            if (!id) return { success: false, error: 'Visit ID required' };
            const serverUrl = ctx.appConfig?.serverUrl;
            if (serverUrl) {
                return await httpRequest(`${serverUrl}/api/visits/${id}`, 'GET', '', { 'Authorization': `Bearer ${getToken()}` });
            }
            const db = await DatabaseService.getDatabase();
            const visit = await db.get('SELECT * FROM visits WHERE id = ?', [id]);
            return visit ? { success: true, visit } : { success: false, error: 'Visit not found' };
        } catch (error) { return buildErrorResponse(error, { scope: 'visits', action: 'getById' }); }
    });

    ipcMain.handle('visits:create', async (event, visitData) => {
        try {
            const authErr = requireAuth(); if (authErr) return authErr;
            if (!visitData.patient_id) return { success: false, error: 'patient_id required' };
            if (!visitData.visit_date) return { success: false, error: 'visit_date required' };

            const serverUrl = ctx.appConfig?.serverUrl;
            if (serverUrl) {
                const result = await httpRequest(`${serverUrl}/api/visits`, 'POST', JSON.stringify(visitData), { 'Authorization': `Bearer ${getToken()}` });
                if (result.success) {
                    BrowserWindow.getAllWindows().forEach(w => w.webContents.send('data:update', { table: 'visits', action: 'create', record: result.visit }));
                }
                return result;
            }

            const result = await DatabaseService.createVisit({ ...visitData, created_by: _currentUser?.id });
            BrowserWindow.getAllWindows().forEach(w => w.webContents.send('data:update', { table: 'visits', action: 'create', record: result }));
            return { success: true, visit: result };
        } catch (error) { return buildErrorResponse(error, { scope: 'visits', action: 'create' }); }
    });

    ipcMain.handle('visits:getByPatient', async (event, patientId) => {
        try {
            if (!patientId) return { success: false, error: 'Patient ID required' };
            const serverUrl = ctx.appConfig?.serverUrl;
            if (serverUrl) {
                return await httpRequest(`${serverUrl}/api/visits?patient_id=${patientId}`, 'GET', '', { 'Authorization': `Bearer ${getToken()}` });
            }
            const visits = await DatabaseService.getVisitsByPatient(patientId);
            return { success: true, visits };
        } catch (error) { return buildErrorResponse(error, { scope: 'visits', action: 'getByPatient' }); }
    });
};
