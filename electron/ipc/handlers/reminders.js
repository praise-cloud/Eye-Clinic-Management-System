const { ipcMain, BrowserWindow } = require('electron');
const DatabaseService = require('../../../src/services/DatabaseService');
const { buildErrorResponse, safeHandle } = require('./utils');
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

module.exports = function registerReminderHandlers(ctx) {
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

    safeHandle('reminders:getAll', async (event, filters = {}) => {
        try {
            const serverUrl = ctx.appConfig?.serverUrl;
            if (serverUrl) {
                const params = new URLSearchParams();
                if (filters.status) params.set('status', filters.status);
                const url = `/api/reminders${params.toString() ? '?' + params.toString() : ''}`;
                return await httpRequest(`${serverUrl}${url}`, 'GET', '', { 'Authorization': `Bearer ${getToken()}` });
            }
            const reminders = await DatabaseService.getAppointmentReminders(filters.status || null);
            return { success: true, reminders };
        } catch (error) { return buildErrorResponse(error, { scope: 'reminders', action: 'getAll' }); }
    });

    safeHandle('reminders:create', async (event, reminderData) => {
        try {
            if (!_currentUser) return { success: false, error: 'Authentication required' };
            if (!reminderData.patient_id) return { success: false, error: 'patient_id required' };
            if (!reminderData.appointment_date) return { success: false, error: 'appointment_date required' };
            if (!reminderData.notified_to) return { success: false, error: 'notified_to (assistant ID) required' };

            const serverUrl = ctx.appConfig?.serverUrl;
            if (serverUrl) {
                const result = await httpRequest(`${serverUrl}/api/reminders`, 'POST', JSON.stringify(reminderData), { 'Authorization': `Bearer ${getToken()}` });
                return result;
            }

            const result = await DatabaseService.createAppointmentReminder(reminderData);
            return { success: true, reminder: result };
        } catch (error) { return buildErrorResponse(error, { scope: 'reminders', action: 'create' }); }
    });

    safeHandle('reminders:getUpcoming', async (event) => {
        try {
            const serverUrl = ctx.appConfig?.serverUrl;
            if (serverUrl) {
                return await httpRequest(`${serverUrl}/api/reminders/upcoming`, 'GET', '', { 'Authorization': `Bearer ${getToken()}` });
            }
            const today = new Date().toISOString().slice(0, 10);
            const db = await DatabaseService.getDatabase();
            const reminders = await db.all(`
                SELECT ar.*, p.first_name || ' ' || p.last_name as patient_name,
                       p.contact as patient_contact,
                       cn.diagnosis as last_diagnosis
                FROM appointment_reminders ar
                JOIN patients p ON ar.patient_id = p.id
                LEFT JOIN case_notes cn ON cn.patient_id = ar.patient_id
                WHERE ar.appointment_date >= ? AND ar.status = 'pending'
                ORDER BY ar.appointment_date LIMIT 20
            `, [today]);
            return { success: true, reminders };
        } catch (error) { return buildErrorResponse(error, { scope: 'reminders', action: 'getUpcoming' }); }
    });
};

