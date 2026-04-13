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

module.exports = function registerPrescriptionHandlers(ctx) {
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

    function requireDoctor() {
        if (!_currentUser) return { success: false, error: 'Authentication required' };
        if (!['admin', 'doctor'].includes(String(_currentUser.role || '').toLowerCase())) return { success: false, error: 'Access denied. Only admin or doctor can create prescriptions.' };
        return null;
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

    ipcMain.handle('prescriptions:create', async (event, prescriptionData) => {
        try {
            const authErr = requireDoctor(); if (authErr) return authErr;
            const required = ['patientId', 'doctorId', 'drugId', 'quantity'];
            for (const f of required) { if (!prescriptionData[f]) return { success: false, error: `${f} required` }; }

            const serverUrl = ctx.appConfig?.serverUrl;
            if (serverUrl) {
                const result = await httpRequest(`${serverUrl}/api/prescriptions`, 'POST', JSON.stringify(prescriptionData), { 'Authorization': `Bearer ${getToken()}` });
                if (result.success) {
                    broadcastUpdate('prescriptions', 'create', result.prescription || result.data);
                    BrowserWindow.getAllWindows().forEach(w => w.webContents.send('notifications:new', {}));
                }
                return result;
            }

            const prescription = await DatabaseService.createPrescription(prescriptionData);
            const assistants = await DatabaseService.getAllUsers();
            const assistantUsers = assistants.filter(u => u.role === 'assistant');

            for (const assistant of assistantUsers) {
                await DatabaseService.createNotification({
                    userId: assistant.id,
                    title: 'New Prescription',
                    message: `New prescription for ${prescription.drug_name} has been created for a patient.`,
                    type: 'prescription_new',
                    relatedId: prescription.id
                });
                BrowserWindow.getAllWindows().forEach(w => w.webContents.send('notifications:new', { userId: assistant.id }));
            }

            broadcastUpdate('prescriptions', 'create', prescription);
            return { success: true, prescription };
        } catch (error) {
            return buildErrorResponse(error, { scope: 'prescriptions', action: 'create', entity: 'prescription' });
        }
    });

    ipcMain.handle('prescriptions:createMultiple', async (event, { patientId, doctorId, items }) => {
        try {
            const authErr = requireDoctor(); if (authErr) return authErr;
            if (!patientId || !doctorId || !items || !Array.isArray(items)) {
                return { success: false, error: 'patientId, doctorId and items array required' };
            }

            const serverUrl = ctx.appConfig?.serverUrl;
            if (serverUrl) {
                const result = await httpRequest(`${serverUrl}/api/prescriptions/multiple`, 'POST', JSON.stringify({ patientId, doctorId, items }), { 'Authorization': `Bearer ${getToken()}` });
                if (result.success) {
                    broadcastUpdate('prescriptions', 'createMultiple', null, result.prescriptions);
                    BrowserWindow.getAllWindows().forEach(w => w.webContents.send('notifications:new', {}));
                }
                return result;
            }

            const result = await DatabaseService.createMultiplePrescriptions(patientId, doctorId, items);
            const assistants = await DatabaseService.getAllUsers();
            const assistantUsers = assistants.filter(u => u.role === 'assistant');

            for (const prescription of result.prescriptions) {
                for (const assistant of assistantUsers) {
                    await DatabaseService.createNotification({
                        userId: assistant.id,
                        title: 'New Prescription',
                        message: `New prescription for ${prescription.drug_name} has been created.`,
                        type: 'prescription_new',
                        relatedId: prescription.id
                    });
                    BrowserWindow.getAllWindows().forEach(w => w.webContents.send('notifications:new', { userId: assistant.id }));
                }
            }

            broadcastUpdate('prescriptions', 'createMultiple', null, result.prescriptions);
            return result;
        } catch (error) {
            return buildErrorResponse(error, { scope: 'prescriptions', action: 'createMultiple', entity: 'prescription' });
        }
    });

    ipcMain.handle('prescriptions:getById', async (event, id) => {
        try {
            if (!id) return { success: false, error: 'Prescription ID required' };
            const serverUrl = ctx.appConfig?.serverUrl;
            if (serverUrl) {
                const result = await httpRequest(`${serverUrl}/api/prescriptions/${id}`, 'GET', '', { 'Authorization': `Bearer ${getToken()}` });
                return result;
            }
            const prescription = await DatabaseService.getPrescriptionById(id);
            return { success: true, prescription };
        } catch (error) {
            return buildErrorResponse(error, { scope: 'prescriptions', action: 'getById', entity: 'prescription' });
        }
    });

    ipcMain.handle('prescriptions:getByPatient', async (event, patientId) => {
        try {
            if (!patientId) return { success: false, error: 'Patient ID required' };
            const serverUrl = ctx.appConfig?.serverUrl;
            if (serverUrl) {
                const result = await httpRequest(`${serverUrl}/api/prescriptions/patient/${patientId}`, 'GET', '', { 'Authorization': `Bearer ${getToken()}` });
                return result;
            }
            const prescriptions = await DatabaseService.getPrescriptionsByPatient(patientId);
            return { success: true, prescriptions };
        } catch (error) {
            return buildErrorResponse(error, { scope: 'prescriptions', action: 'getByPatient', entity: 'prescription' });
        }
    });

    ipcMain.handle('prescriptions:getPending', async () => {
        try {
            const serverUrl = ctx.appConfig?.serverUrl;
            if (serverUrl) {
                const result = await httpRequest(`${serverUrl}/api/prescriptions/pending`, 'GET', '', { 'Authorization': `Bearer ${getToken()}` });
                return result;
            }
            const prescriptions = await DatabaseService.getPendingPrescriptions();
            return { success: true, prescriptions };
        } catch (error) {
            return buildErrorResponse(error, { scope: 'prescriptions', action: 'getPending', entity: 'prescription' });
        }
    });

    ipcMain.handle('prescriptions:updateStatus', async (event, { id, status, userId }) => {
        try {
            if (!id || !status) return { success: false, error: 'ID and status required' };

            const serverUrl = ctx.appConfig?.serverUrl;
            if (serverUrl) {
                const result = await httpRequest(`${serverUrl}/api/prescriptions/${id}/status`, 'PUT', JSON.stringify({ status }), { 'Authorization': `Bearer ${getToken()}` });
                if (result.success) {
                    broadcastUpdate('prescriptions', 'update', null, id);
                    if (status === 'dispensed') broadcastUpdate('pharmacy', 'update');
                }
                return result;
            }

            const result = await DatabaseService.updatePrescriptionStatus(id, status, userId);

            BrowserWindow.getAllWindows().forEach(w => {
                w.webContents.send('data:update', { table: 'prescriptions', action: 'update', recordId: id, status });
                if (status === 'dispensed') {
                    w.webContents.send('data:update', { table: 'pharmacy', action: 'update' });
                }
            });

            return { success: true, ...result };
        } catch (error) {
            return buildErrorResponse(error, { scope: 'prescriptions', action: 'updateStatus', entity: 'prescription' });
        }
    });
};
