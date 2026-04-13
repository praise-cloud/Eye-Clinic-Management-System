const { ipcMain, BrowserWindow } = require('electron');
const DatabaseService = require('../../../src/services/DatabaseService');
const FileService = require('../../../src/services/FileService');
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

module.exports = function registerReportsHandlers(ctx) {
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

    function broadcastUpdate(table, action, record, recordId) {
        const data = { table, action };
        if (record) data.record = record;
        if (recordId) data.recordId = recordId;
        BrowserWindow.getAllWindows().forEach(w => {
            w.webContents.send('data:update', data);
            w.webContents.send('server:dataUpdate', data);
        });
    }

    ipcMain.handle('reports:getAll', async (event, filters = {}) => {
        try {
            const serverUrl = ctx.appConfig?.serverUrl;
            if (serverUrl) {
                const params = new URLSearchParams();
                if (filters.patient_id) params.set('patient_id', filters.patient_id);
                if (filters.report_type) params.set('report_type', filters.report_type);
                const url = `/api/reports${params.toString() ? '?' + params.toString() : ''}`;
                const result = await httpRequest(`${serverUrl}${url}`, 'GET', '', { 'Authorization': `Bearer ${getToken()}` });
                return result;
            }
            const reports = await DatabaseService.getAllReports(filters);
            return { success: true, reports };
        } catch (error) {
            return buildErrorResponse(error, { scope: 'reports', action: 'getAll', entity: 'report' });
        }
    });

    ipcMain.handle('reports:getById', async (event, id) => {
        try {
            if (!id) return { success: false, error: 'Report ID required' };
            const serverUrl = ctx.appConfig?.serverUrl;
            if (serverUrl) {
                const result = await httpRequest(`${serverUrl}/api/reports/${id}`, 'GET', '', { 'Authorization': `Bearer ${getToken()}` });
                return result;
            }
            const report = await DatabaseService.getReportById(id);
            return report ? { success: true, report } : { success: false, error: 'Report not found' };
        } catch (error) {
            return buildErrorResponse(error, { scope: 'reports', action: 'getById', entity: 'report' });
        }
    });

    ipcMain.handle('reports:generate', async (event, { patientId, testIds, title, reportType }) => {
        try {
            if (!patientId) return { success: false, error: 'Patient ID required' };
            const serverUrl = ctx.appConfig?.serverUrl;
            if (serverUrl) {
                const result = await httpRequest(`${serverUrl}/api/reports`, 'POST', JSON.stringify({ patientId, testIds, title, reportType }), { 'Authorization': `Bearer ${getToken()}` });
                if (result.success) broadcastUpdate('reports', 'create', result.report);
                return result;
            }

            const patient = await DatabaseService.getPatientById(patientId);
            if (!patient) return { success: false, error: 'Patient not found' };

            let testsData = [];
            if (testIds?.length) {
                for (const tid of testIds) {
                    const t = await DatabaseService.getTestById(tid);
                    if (t) testsData.push(t);
                }
            } else {
                testsData = await DatabaseService.getAllTests({ patientId });
            }

            const pdfResult = await FileService.generatePatientReport(patient, testsData);
            if (!pdfResult.success) return { success: false, error: pdfResult.error };

            const reportData = {
                patient_id: patientId,
                report_file: pdfResult.pdfData,
                report_type: reportType || 'visual_field_report',
                title: title || `Report for ${patient.first_name} ${patient.last_name}`
            };

            const report = await DatabaseService.createReport(reportData);
            return { success: true, report, fileName: pdfResult.fileName };
        } catch (error) {
            return buildErrorResponse(error, { scope: 'reports', action: 'generate', entity: 'report' });
        }
    });

    ipcMain.handle('reports:export', async (event, { reportId, format }) => {
        try {
            if (!reportId) return { success: false, error: 'Report ID required' };
            const report = await DatabaseService.getReportById(reportId);
            if (!report) return { success: false, error: 'Report not found' };

            const saveResult = await FileService.saveFile({
                title: 'Export Report',
                defaultPath: `${report.patient_identifier || 'report'}_report.pdf`,
                filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
                data: report.report_file
            });
            return saveResult;
        } catch (error) {
            return buildErrorResponse(error, { scope: 'reports', action: 'export', entity: 'report' });
        }
    });

    ipcMain.handle('reports:delete', async (event, id) => {
        try {
            if (!id) return { success: false, error: 'Report ID required' };
            const serverUrl = ctx.appConfig?.serverUrl;
            if (serverUrl) {
                const result = await httpRequest(`${serverUrl}/api/reports/${id}`, 'DELETE', '', { 'Authorization': `Bearer ${getToken()}` });
                if (result.success) broadcastUpdate('reports', 'delete', null, id);
                return result;
            }
            const result = await DatabaseService.deleteReport(id);
            return result;
        } catch (error) {
            return buildErrorResponse(error, { scope: 'reports', action: 'delete', entity: 'report' });
        }
    });
};
