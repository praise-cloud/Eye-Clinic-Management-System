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

module.exports = function registerTestHandlers(ctx) {
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
        if (!['admin', 'doctor'].includes(String(_currentUser.role || '').toLowerCase())) return { success: false, error: 'Only doctors can perform this action' };
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

    safeHandle('tests:getAll', async (event, filters = {}) => {
        try {
            const serverUrl = ctx.appConfig?.serverUrl;
            if (serverUrl) {
                const params = new URLSearchParams();
                if (filters.patient_id) params.set('patient_id', filters.patient_id);
                if (filters.limit) params.set('limit', filters.limit);
                const url = `/api/tests${params.toString() ? '?' + params.toString() : ''}`;
                const result = await httpRequest(`${serverUrl}${url}`, 'GET', '', { 'Authorization': `Bearer ${getToken()}` });
                return result;
            }
            const tests = await DatabaseService.getAllTests(filters);
            return { success: true, tests };
        } catch (error) { return buildErrorResponse(error, { scope: 'tests', action: 'getAll', entity: 'test' }); }
    });

    safeHandle('tests:getById', async (event, id) => {
        try {
            const serverUrl = ctx.appConfig?.serverUrl;
            if (serverUrl) {
                const result = await httpRequest(`${serverUrl}/api/tests/${id}`, 'GET', '', { 'Authorization': `Bearer ${getToken()}` });
                return result;
            }
            const test = await DatabaseService.getTestById(id);
            return test ? { success: true, test } : { success: false, error: 'Test not found' };
        } catch (error) { return buildErrorResponse(error, { scope: 'tests', action: 'getById', entity: 'test' }); }
    });

    safeHandle('tests:create', async (event, testData) => {
        try {
            const authErr = requireDoctor(); if (authErr) return authErr;
            if (!testData.patient_id) return { success: false, error: 'Patient ID required' };

            const serverUrl = ctx.appConfig?.serverUrl;
            if (serverUrl) {
                const result = await httpRequest(`${serverUrl}/api/tests`, 'POST', JSON.stringify(testData), { 'Authorization': `Bearer ${getToken()}` });
                if (result.success) broadcastUpdate('tests', 'create', result.data || result.test);
                return result;
            }

            const test = await DatabaseService.createTest(testData);
            if (_currentUser?.id) await DatabaseService.logActivity(_currentUser.id, 'create', 'test', test.id, `Test created for patient ${testData.patient_id}`);
            broadcastUpdate('tests', 'create', test);
            return { success: true, test };
        } catch (error) { return buildErrorResponse(error, { scope: 'tests', action: 'create', entity: 'test' }); }
    });

    safeHandle('tests:update', async (event, { id, testData }) => {
        try {
            const authErr = requireDoctor(); if (authErr) return authErr;
            if (!id) return { success: false, error: 'Test ID required' };

            const serverUrl = ctx.appConfig?.serverUrl;
            if (serverUrl) {
                const result = await httpRequest(`${serverUrl}/api/tests/${id}`, 'PUT', JSON.stringify(testData), { 'Authorization': `Bearer ${getToken()}` });
                if (result.success) broadcastUpdate('tests', 'update', result.data || result.test);
                return result;
            }

            const test = await DatabaseService.updateTest(id, testData);
            if (_currentUser?.id) await DatabaseService.logActivity(_currentUser.id, 'update', 'test', id, `Test ${id} updated`);
            broadcastUpdate('tests', 'update', test);
            return { success: true, test };
        } catch (error) { return buildErrorResponse(error, { scope: 'tests', action: 'update', entity: 'test' }); }
    });

    safeHandle('tests:delete', async (event, id) => {
        try {
            const authErr = requireDoctor(); if (authErr) return authErr;
            if (!id) return { success: false, error: 'Test ID required' };

            const serverUrl = ctx.appConfig?.serverUrl;
            if (serverUrl) {
                const result = await httpRequest(`${serverUrl}/api/tests/${id}`, 'DELETE', '', { 'Authorization': `Bearer ${getToken()}` });
                if (result.success) broadcastUpdate('tests', 'delete', null, id);
                return result;
            }

            const result = await DatabaseService.deleteTest(id);
            if (_currentUser?.id) await DatabaseService.logActivity(_currentUser.id, 'delete', 'test', id, `Test ${id} deleted`);
            return result;
        } catch (error) { return buildErrorResponse(error, { scope: 'tests', action: 'delete', entity: 'test' }); }
    });

    safeHandle('tests:attachCvfToDocuments', async (event, { testId, options }) => {
        try {
            if (!_currentUser) return { success: false, error: 'Authentication required' };

            const serverUrl = ctx.appConfig?.serverUrl;
            if (serverUrl) {
                const result = await httpRequest(`${serverUrl}/api/tests/attach-cvf`, 'POST', JSON.stringify({ testId, ...options }), { 'Authorization': `Bearer ${getToken()}` });
                return result;
            }

            const report = await DatabaseService.createReport({
                patient_id: options?.patient_id,
                report_type: 'cvf_case_study_attachment',
                title: `CVF Attachment - ${testId}`,
                report_file: JSON.stringify({ testId, ...options })
            });
            return { success: true, report };
        } catch (error) { return buildErrorResponse(error, { scope: 'tests', action: 'attachCvf', entity: 'test' }); }
    });
};

