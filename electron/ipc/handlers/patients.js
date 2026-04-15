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

module.exports = function registerPatientHandlers(ctx) {
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

    function requireAuth(roleList = ['admin', 'doctor', 'assistant']) {
        if (!_currentUser) return { success: false, error: 'Authentication required' };
        if (!roleList.includes(String(_currentUser.role || '').toLowerCase())) return { success: false, error: 'Access denied' };
        return null;
    }

    function getToken() {
        return _accessToken || ctx._authUtils?.getAccessToken?.() || null;
    }

    ipcMain.handle('patients:getAll', async (event, filters = {}) => {
        try {
            const serverUrl = ctx.appConfig?.serverUrl;
            if (serverUrl) {
                const params = new URLSearchParams();
                if (filters.search) params.set('search', filters.search);
                if (filters.clientType) params.set('client_type', filters.clientType);
                const url = `/api/patients${params.toString() ? '?' + params.toString() : ''}`;
                const result = await httpRequest(`${serverUrl}${url}`, 'GET', '', { 'Authorization': `Bearer ${getToken()}` });
                return result;
            }
            return { success: true, patients: await DatabaseService.getAllPatients(filters) };
        }
        catch (error) { return buildErrorResponse(error, { scope: 'patients', action: 'getAll', entity: 'patient' }); }
    });

    ipcMain.handle('patients:getById', async (event, id) => {
        try {
            if (!id) return { success: false, error: 'Patient ID required' };
            const serverUrl = ctx.appConfig?.serverUrl;
            if (serverUrl) {
                const result = await httpRequest(`${serverUrl}/api/patients/${id}`, 'GET', '', { 'Authorization': `Bearer ${getToken()}` });
                return result;
            }
            const patient = await DatabaseService.getPatientById(id);
            return patient ? { success: true, patient } : { success: false, error: 'Patient not found' };
        } catch (error) { return buildErrorResponse(error, { scope: 'patients', action: 'getById', entity: 'patient' }); }
    });

    ipcMain.handle('patients:create', async (event, patientData) => {
        try {
            const authErr = requireAuth(); if (authErr) return authErr;
            const required = ['first_name', 'last_name'];
            for (const f of required) { if (!patientData[f]) return { success: false, error: `${f} required` }; }

            const serverUrl = ctx.appConfig?.serverUrl;
            if (serverUrl) {
                const result = await httpRequest(`${serverUrl}/api/patients`, 'POST', JSON.stringify(patientData), { 'Authorization': `Bearer ${getToken()}` });
                if (result.success) {
                    BrowserWindow.getAllWindows().forEach(w => w.webContents.send('data:update', { table: 'patients', action: 'create', record: result.patient }));
                    BrowserWindow.getAllWindows().forEach(w => w.webContents.send('server:dataUpdate', { table: 'patients', action: 'create', record: result.patient }));
                }
                return result;
            }

            const result = await DatabaseService.createPatient(patientData);
            if (result?.error) return result;
            if (_currentUser?.id) await DatabaseService.logActivity(_currentUser.id, 'create', 'patient', result.id, `Patient ${result.first_name} ${result.last_name} created`);
            BrowserWindow.getAllWindows().forEach(w => w.webContents.send('data:update', { table: 'patients', action: 'create', record: result }));
            return { success: true, patient: result };
        } catch (error) { return buildErrorResponse(error, { scope: 'patients', action: 'create', entity: 'patient' }); }
    });

    ipcMain.handle('patients:update', async (event, { id, patientData }) => {
        try {
            const authErr = requireAuth(); if (authErr) return authErr;
            if (!id) return { success: false, error: 'Patient ID required' };

            const serverUrl = ctx.appConfig?.serverUrl;
            if (serverUrl) {
                const result = await httpRequest(`${serverUrl}/api/patients/${id}`, 'PUT', JSON.stringify(patientData), { 'Authorization': `Bearer ${getToken()}` });
                if (result.success) {
                    BrowserWindow.getAllWindows().forEach(w => w.webContents.send('data:update', { table: 'patients', action: 'update', record: result.patient }));
                    BrowserWindow.getAllWindows().forEach(w => w.webContents.send('server:dataUpdate', { table: 'patients', action: 'update', record: result.patient }));
                }
                return result;
            }

            const result = await DatabaseService.updatePatient(id, patientData);
            if (result?.error) return result;
            if (_currentUser?.id) await DatabaseService.logActivity(_currentUser.id, 'update', 'patient', id, `Patient ${result.first_name} ${result.last_name} updated`);
            BrowserWindow.getAllWindows().forEach(w => w.webContents.send('data:update', { table: 'patients', action: 'update', record: result }));
            return { success: true, patient: result };
        } catch (error) { return buildErrorResponse(error, { scope: 'patients', action: 'update', entity: 'patient' }); }
    });

    ipcMain.handle('patients:delete', async (event, id) => {
        try {
            const authErr = requireAuth(['admin']); if (authErr) return authErr;
            if (!id) return { success: false, error: 'Patient ID required' };

            const serverUrl = ctx.appConfig?.serverUrl;
            if (serverUrl) {
                const result = await httpRequest(`${serverUrl}/api/patients/${id}`, 'DELETE', '', { 'Authorization': `Bearer ${getToken()}` });
                if (result.success) {
                    BrowserWindow.getAllWindows().forEach(w => w.webContents.send('data:update', { table: 'patients', action: 'delete', recordId: id }));
                    BrowserWindow.getAllWindows().forEach(w => w.webContents.send('server:dataUpdate', { table: 'patients', action: 'delete', recordId: id }));
                }
                return result;
            }

            const result = await DatabaseService.deletePatient(id);
            if (result.success && _currentUser?.id) await DatabaseService.logActivity(_currentUser.id, 'delete', 'patient', id, `Patient ${id} deleted`);
            return result;
        } catch (error) { return buildErrorResponse(error, { scope: 'patients', action: 'delete', entity: 'patient' }); }
    });

    ipcMain.handle('patients:search', async (event, searchTerm) => {
        try {
            const serverUrl = ctx.appConfig?.serverUrl;
            if (serverUrl) {
                const result = await httpRequest(`${serverUrl}/api/patients?search=${encodeURIComponent(searchTerm)}`, 'GET', '', { 'Authorization': `Bearer ${getToken()}` });
                return result;
            }
            return { success: true, patients: await DatabaseService.getAllPatients({ search: searchTerm }) };
        }
        catch (error) { return buildErrorResponse(error, { scope: 'patients', action: 'search', entity: 'patient' }); }
    });

    ipcMain.handle('patients:getHistory', async (event, patientId) => {
        try {
            if (!patientId) return { success: false, error: 'Patient ID required' };
            const serverUrl = ctx.appConfig?.serverUrl;
            if (serverUrl) {
                const result = await httpRequest(`${serverUrl}/api/patients/${patientId}/history`, 'GET', '', { 'Authorization': `Bearer ${getToken()}` });
                return result;
            }
            // Fallback: get all data for this patient
            const patient = await DatabaseService.getPatientById(patientId);
            if (!patient) return { success: false, error: 'Patient not found' };
            const visits = await DatabaseService.getVisitsByPatient(patientId);
            const tests = await DatabaseService.getTestsByPatient(patientId);
            const caseNotes = await DatabaseService.getCaseNotesByPatient(patientId);
            const prescriptions = await DatabaseService.getPrescriptionsByPatient(patientId);
            const revenue = await DatabaseService.getRevenueByPatient(patientId);
            const attachments = [];
            return { success: true, patient, visits, tests, caseNotes, prescriptions, revenue, attachments };
        } catch (error) { return buildErrorResponse(error, { scope: 'patients', action: 'getHistory', entity: 'patient' }); }
    });
};
