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

module.exports = function registerCaseNoteHandlers(ctx) {
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

    function requireDoctor() {
        if (!_currentUser) return { success: false, error: 'Authentication required' };
        if (!['admin', 'doctor'].includes(String(_currentUser.role || '').toLowerCase())) return { success: false, error: 'Access denied. Only admin or doctor can manage case notes.' };
        return null;
    }

    safeHandle('caseNotes:getAll', async (event, filters = {}) => {
        try {
            const serverUrl = ctx.appConfig?.serverUrl;
            if (serverUrl) {
                const params = new URLSearchParams();
                if (filters.patient_id) params.set('patient_id', filters.patient_id);
                if (filters.doctor_id) params.set('doctor_id', filters.doctor_id);
                const url = `/api/case-notes${params.toString() ? '?' + params.toString() : ''}`;
                return await httpRequest(`${serverUrl}${url}`, 'GET', '', { 'Authorization': `Bearer ${getToken()}` });
            }
            const caseNotes = await DatabaseService.getCaseNotesByPatient(filters.patient_id || '');
            return { success: true, caseNotes };
        } catch (error) { return buildErrorResponse(error, { scope: 'caseNotes', action: 'getAll' }); }
    });

    safeHandle('caseNotes:getById', async (event, id) => {
        try {
            if (!id) return { success: false, error: 'Case note ID required' };
            const serverUrl = ctx.appConfig?.serverUrl;
            if (serverUrl) {
                return await httpRequest(`${serverUrl}/api/case-notes/${id}`, 'GET', '', { 'Authorization': `Bearer ${getToken()}` });
            }
            const db = await DatabaseService.getDatabase();
            const caseNote = await db.get('SELECT * FROM case_notes WHERE id = ?', [id]);
            const attachments = await db.all('SELECT * FROM case_note_attachments WHERE case_note_id = ?', [id]);
            return caseNote ? { success: true, caseNote, attachments } : { success: false, error: 'Case note not found' };
        } catch (error) { return buildErrorResponse(error, { scope: 'caseNotes', action: 'getById' }); }
    });

    safeHandle('caseNotes:create', async (event, caseNoteData) => {
        try {
            const authErr = requireDoctor(); if (authErr) return authErr;
            if (!caseNoteData.patient_id) return { success: false, error: 'patient_id required' };
            if (!caseNoteData.doctor_id) return { success: false, error: 'doctor_id required' };

            const serverUrl = ctx.appConfig?.serverUrl;
            if (serverUrl) {
                const result = await httpRequest(`${serverUrl}/api/case-notes`, 'POST', JSON.stringify(caseNoteData), { 'Authorization': `Bearer ${getToken()}` });
                if (result.success) {
                    BrowserWindow.getAllWindows().forEach(w => w.webContents.send('data:update', { table: 'case_notes', action: 'create', record: result.caseNote }));
                }
                return result;
            }

            const result = await DatabaseService.createCaseNote(caseNoteData);
            BrowserWindow.getAllWindows().forEach(w => w.webContents.send('data:update', { table: 'case_notes', action: 'create', record: result }));
            return { success: true, caseNote: result };
        } catch (error) { return buildErrorResponse(error, { scope: 'caseNotes', action: 'create' }); }
    });

    safeHandle('caseNotes:update', async (event, { id, caseNoteData }) => {
        try {
            const authErr = requireDoctor(); if (authErr) return authErr;
            if (!id) return { success: false, error: 'Case note ID required' };

            const serverUrl = ctx.appConfig?.serverUrl;
            if (serverUrl) {
                const result = await httpRequest(`${serverUrl}/api/case-notes/${id}`, 'PUT', JSON.stringify(caseNoteData), { 'Authorization': `Bearer ${getToken()}` });
                if (result.success) {
                    BrowserWindow.getAllWindows().forEach(w => w.webContents.send('data:update', { table: 'case_notes', action: 'update', record: result.caseNote }));
                }
                return result;
            }

            const db = await DatabaseService.getDatabase();
            const existing = await db.get('SELECT * FROM case_notes WHERE id = ?', [id]);
            if (!existing) return { success: false, error: 'Case note not found' };

            const fields = ['chief_complaint', 'visual_acuity_od', 'visual_acuity_os',
                'intraocular_pressure_od', 'intraocular_pressure_os',
                'cvf_analysis_od', 'cvf_analysis_os', 'diagnosis', 'recommendation',
                'next_appointment'];
            const sets = [];
            const params = [];

            // If case note was previously signed and is now being edited, reset sign-off
            let newStatus = caseNoteData.status !== undefined ? caseNoteData.status : existing.status;
            let newSignedOffBy = existing.signed_off_by;
            let newSignedOffAt = existing.signed_off_at;

            if (existing.signed_off_by && caseNoteData.status !== 'signed') {
                // Editing a signed note - reset to draft, require re-sign
                newStatus = 'draft';
                newSignedOffBy = null;
                newSignedOffAt = null;
            } else if (caseNoteData.status === 'signed' && !existing.signed_off_by) {
                // Signing for the first time
                newSignedOffBy = _currentUser?.id;
                newSignedOffAt = new Date().toISOString();
            }

            for (const field of fields) {
                if (caseNoteData[field] !== undefined) {
                    sets.push(`${field} = ?`);
                    params.push(caseNoteData[field]);
                }
            }

            sets.push('status = ?');
            params.push(newStatus);
            sets.push('signed_off_by = ?');
            params.push(newSignedOffBy);
            sets.push('signed_off_at = ?');
            params.push(newSignedOffAt);
            sets.push('updated_at = CURRENT_TIMESTAMP');
            params.push(id);

            await db.run(`UPDATE case_notes SET ${sets.join(', ')} WHERE id = ?`, params);
            const updated = await db.get('SELECT * FROM case_notes WHERE id = ?', [id]);
            BrowserWindow.getAllWindows().forEach(w => w.webContents.send('data:update', { table: 'case_notes', action: 'update', record: updated }));
            return { success: true, caseNote: updated, signOffReset: existing.signed_off_by && !newSignedOffBy };
        } catch (error) { return buildErrorResponse(error, { scope: 'caseNotes', action: 'update' }); }
    });

    safeHandle('caseNotes:sign', async (event, { id, signed_off_by }) => {
        try {
            const authErr = requireDoctor(); if (authErr) return authErr;
            if (!id) return { success: false, error: 'Case note ID required' };

            const serverUrl = ctx.appConfig?.serverUrl;
            if (serverUrl) {
                return await httpRequest(`${serverUrl}/api/case-notes/${id}`, 'PUT',
                    JSON.stringify({ status: 'signed', signed_off_by: signed_off_by || _currentUser?.id }),
                    { 'Authorization': `Bearer ${getToken()}` });
            }

            const db = await DatabaseService.getDatabase();
            await db.run(
                `UPDATE case_notes SET status = 'signed', signed_off_by = ?, signed_off_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
                [signed_off_by || _currentUser?.id, new Date().toISOString(), id]
            );
            const updated = await db.get('SELECT * FROM case_notes WHERE id = ?', [id]);
            BrowserWindow.getAllWindows().forEach(w => w.webContents.send('data:update', { table: 'case_notes', action: 'update', record: updated }));
            return { success: true, caseNote: updated };
        } catch (error) { return buildErrorResponse(error, { scope: 'caseNotes', action: 'sign' }); }
    });

    safeHandle('caseNotes:getByPatient', async (event, patientId) => {
        try {
            if (!patientId) return { success: false, error: 'Patient ID required' };
            const serverUrl = ctx.appConfig?.serverUrl;
            if (serverUrl) {
                return await httpRequest(`${serverUrl}/api/case-notes?patient_id=${patientId}`, 'GET', '', { 'Authorization': `Bearer ${getToken()}` });
            }
            const caseNotes = await DatabaseService.getCaseNotesByPatient(patientId);
            return { success: true, caseNotes };
        } catch (error) { return buildErrorResponse(error, { scope: 'caseNotes', action: 'getByPatient' }); }
    });
};

