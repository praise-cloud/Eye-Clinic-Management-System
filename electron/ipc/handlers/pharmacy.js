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

module.exports = function registerPharmacyHandlers(ctx) {
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

    function requireAdminOrDoctor() {
        if (!_currentUser) return { success: false, error: 'Authentication required' };
        if (!['admin', 'doctor'].includes(String(_currentUser.role || '').toLowerCase())) return { success: false, error: 'Access denied. Only admin or doctor can perform this action.' };
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

    safeHandle('pharmacy:getDrugs', async (event, filters = {}) => {
        try {
            const serverUrl = ctx.appConfig?.serverUrl;
            if (serverUrl) {
                const params = new URLSearchParams();
                if (filters.search) params.set('search', filters.search);
                const url = `/api/pharmacy/drugs${params.toString() ? '?' + params.toString() : ''}`;
                const result = await httpRequest(`${serverUrl}${url}`, 'GET', '', { 'Authorization': `Bearer ${getToken()}` });
                return result;
            }
            const drugs = await DatabaseService.getAllPharmacyDrugs(filters);
            return { success: true, drugs };
        } catch (error) {
            return buildErrorResponse(error, { scope: 'pharmacy', action: 'getDrugs', entity: 'pharmacy_drug' });
        }
    });

    safeHandle('pharmacy:getDrugById', async (event, id) => {
        try {
            if (!id) return { success: false, error: 'Drug ID required' };
            const serverUrl = ctx.appConfig?.serverUrl;
            if (serverUrl) {
                const result = await httpRequest(`${serverUrl}/api/pharmacy/drugs/${id}`, 'GET', '', { 'Authorization': `Bearer ${getToken()}` });
                return result;
            }
            const drug = await DatabaseService.getPharmacyDrugById(id);
            return drug ? { success: true, drug } : { success: false, error: 'Drug not found' };
        } catch (error) {
            return buildErrorResponse(error, { scope: 'pharmacy', action: 'getDrugById', entity: 'pharmacy_drug' });
        }
    });

    safeHandle('pharmacy:createDrug', async (event, drugData) => {
        try {
            const authErr = requireAdminOrDoctor(); if (authErr) return authErr;
            const required = ['drug_code', 'drug_name', 'drug_form', 'strength', 'pack_size', 'unit_price'];
            for (const f of required) { if (!drugData[f]) return { success: false, error: `${f} required` }; }

            const serverUrl = ctx.appConfig?.serverUrl;
            if (serverUrl) {
                const result = await httpRequest(`${serverUrl}/api/pharmacy/drugs`, 'POST', JSON.stringify(drugData), { 'Authorization': `Bearer ${getToken()}` });
                if (result.success) broadcastUpdate('pharmacy', 'create', result.drug);
                return result;
            }

            const drug = await DatabaseService.createPharmacyDrug(drugData);
            if (_currentUser?.id) await DatabaseService.logActivity(_currentUser.id, 'create', 'pharmacy_drug', drug.id, `Pharmacy drug ${drug.drug_name} created`);
            broadcastUpdate('pharmacy', 'create', drug);
            return { success: true, drug };
        } catch (error) {
            return buildErrorResponse(error, { scope: 'pharmacy', action: 'createDrug', entity: 'pharmacy_drug' });
        }
    });

    safeHandle('pharmacy:updateDrug', async (event, { id, drugData }) => {
        try {
            const authErr = requireAdminOrDoctor(); if (authErr) return authErr;
            if (!id) return { success: false, error: 'Drug ID required' };

            const serverUrl = ctx.appConfig?.serverUrl;
            if (serverUrl) {
                const result = await httpRequest(`${serverUrl}/api/pharmacy/drugs/${id}`, 'PUT', JSON.stringify(drugData), { 'Authorization': `Bearer ${getToken()}` });
                if (result.success) broadcastUpdate('pharmacy', 'update', result.drug);
                return result;
            }

            const drug = await DatabaseService.updatePharmacyDrug(id, drugData);
            if (_currentUser?.id) await DatabaseService.logActivity(_currentUser.id, 'update', 'pharmacy_drug', id, `Pharmacy drug ${id} updated`);
            broadcastUpdate('pharmacy', 'update', drug);
            return { success: true, drug };
        } catch (error) {
            return buildErrorResponse(error, { scope: 'pharmacy', action: 'updateDrug', entity: 'pharmacy_drug' });
        }
    });

    safeHandle('pharmacy:deleteDrug', async (event, id) => {
        try {
            if (!_currentUser) return { success: false, error: 'Authentication required' };
            if (String(_currentUser.role || '').toLowerCase() !== 'admin') return { success: false, error: 'Access denied. Only admin can delete pharmacy drugs.' };
            if (!id) return { success: false, error: 'Drug ID required' };

            const serverUrl = ctx.appConfig?.serverUrl;
            if (serverUrl) {
                const result = await httpRequest(`${serverUrl}/api/pharmacy/drugs/${id}`, 'DELETE', '', { 'Authorization': `Bearer ${getToken()}` });
                if (result.success) broadcastUpdate('pharmacy', 'delete', null, id);
                return result;
            }

            const result = await DatabaseService.deletePharmacyDrug(id);
            if (result.success && _currentUser?.id) await DatabaseService.logActivity(_currentUser.id, 'delete', 'pharmacy_drug', id, `Pharmacy drug ${id} deleted`);
            if (result.success) broadcastUpdate('pharmacy', 'delete', null, id);
            return result;
        } catch (error) {
            return buildErrorResponse(error, { scope: 'pharmacy', action: 'deleteDrug', entity: 'pharmacy_drug' });
        }
    });

    safeHandle('pharmacy:dispense', async (event, { drugId, patientId, quantity, notes }) => {
        try {
            if (!_currentUser) return { success: false, error: 'Authentication required' };
            if (!['assistant'].includes(String(_currentUser.role || '').toLowerCase())) {
                return { success: false, error: 'Access denied. Only assistant can dispense pharmacy drugs.' };
            }
            if (!drugId || !patientId) return { success: false, error: 'Drug and patient are required' };
            const qtyNumber = Number(quantity || 0);
            if (!Number.isFinite(qtyNumber) || qtyNumber <= 0) {
                return { success: false, error: 'Quantity must be greater than zero' };
            }

            const serverUrl = ctx.appConfig?.serverUrl;
            if (serverUrl) {
                const result = await httpRequest(`${serverUrl}/api/pharmacy/dispense`, 'POST', JSON.stringify({ drugId, patientId, quantity: qtyNumber, notes }), { 'Authorization': `Bearer ${getToken()}` });
                if (result.success) {
                    broadcastUpdate('pharmacy', 'dispense');
                    broadcastUpdate('revenue', 'create');
                    broadcastUpdate('dashboard', 'refresh');
                }
                return result;
            }

            const userId = _currentUser?.id || null;
            const result = await DatabaseService.createPharmacyDispensation({ drugId, patientId, quantity: qtyNumber, userId, notes: notes || null });

            if (userId) await DatabaseService.logActivity(userId, 'create', 'pharmacy_dispensation', result.dispensation.id, `Pharmacy dispensation recorded for drug ${drugId}`);

            BrowserWindow.getAllWindows().forEach(w => {
                w.webContents.send('data:update', { table: 'pharmacy', action: 'dispense', record: result.dispensation });
                w.webContents.send('data:update', { table: 'revenue', action: 'create', record: result.revenue });
                w.webContents.send('data:update', { table: 'dashboard', action: 'refresh' });
                if (result.linkedPrescriptionId) {
                    w.webContents.send('data:update', { table: 'prescriptions', action: 'update', recordId: result.linkedPrescriptionId, status: 'dispensed' });
                }
            });

            return { success: true, dispensation: result.dispensation, revenue: result.revenue };
        } catch (error) {
            return buildErrorResponse(error, { scope: 'pharmacy', action: 'dispense', entity: 'pharmacy_dispensation' });
        }
    });
};

