const { ipcMain, BrowserWindow } = require('electron');
const { buildErrorResponse } = require('./utils');
const http = require('http');
const path = require('path');
const fs = require('fs');
const { app } = require('electron');

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

function getToken() {
    return _accessToken || null;
}

module.exports = function registerBackupHandlers(ctx) {
    if (ctx._authUtils) {
        const origGetToken = ctx._authUtils.getAccessToken;
        ctx._authUtils.getAccessToken = () => _accessToken || origGetToken?.() || null;
        const origSetTokens = ctx._authUtils.setTokens;
        ctx._authUtils.setTokens = (access) => { _accessToken = access; if (origSetTokens) origSetTokens(access); };
    }

    ipcMain.handle('backup:create', async (event, options = {}) => {
        try {
            const serverUrl = ctx.appConfig?.serverUrl;
            if (serverUrl) {
                return await httpRequest(`${serverUrl}/api/backup/create`, 'POST',
                    JSON.stringify({ created_by: options.created_by }),
                    { 'Authorization': `Bearer ${getToken()}` });
            }

            // Local backup
            const dbFolder = path.join(app.getPath('userData'), 'KORENE_EyeClinic');
            const backupsFolder = path.join(dbFolder, 'backups');
            if (!fs.existsSync(backupsFolder)) fs.mkdirSync(backupsFolder, { recursive: true });

            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            const dbPath = path.join(dbFolder, 'eye_clinic.db');
            const backupPath = path.join(backupsFolder, `eye_clinic_backup_${timestamp}.db`);

            if (!fs.existsSync(dbPath)) return { success: false, error: 'Database file not found' };
            fs.copyFileSync(dbPath, backupPath);
            const stats = fs.statSync(backupPath);

            return {
                success: true,
                backup: {
                    file_name: `eye_clinic_backup_${timestamp}.db`,
                    file_path: backupPath,
                    size: stats.size,
                    created_at: new Date().toISOString()
                }
            };
        } catch (error) { return buildErrorResponse(error, { scope: 'backup', action: 'create' }); }
    });

    ipcMain.handle('backup:list', async (event) => {
        try {
            const serverUrl = ctx.appConfig?.serverUrl;
            if (serverUrl) {
                return await httpRequest(`${serverUrl}/api/backup/list`, 'GET', '', { 'Authorization': `Bearer ${getToken()}` });
            }

            const dbFolder = path.join(app.getPath('userData'), 'KORENE_EyeClinic');
            const backupsFolder = path.join(dbFolder, 'backups');
            if (!fs.existsSync(backupsFolder)) return { success: true, backups: [] };

            const files = fs.readdirSync(backupsFolder)
                .filter(f => f.endsWith('.db'))
                .map(f => {
                    const filePath = path.join(backupsFolder, f);
                    const stats = fs.statSync(filePath);
                    return {
                        file_name: f,
                        file_path: filePath,
                        size: stats.size,
                        created_at: stats.mtime.toISOString()
                    };
                })
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

            return { success: true, backups: files };
        } catch (error) { return buildErrorResponse(error, { scope: 'backup', action: 'list' }); }
    });

    ipcMain.handle('backup:restore', async (event, fileName) => {
        try {
            if (!fileName) return { success: false, error: 'Backup file name required' };

            const serverUrl = ctx.appConfig?.serverUrl;
            if (serverUrl) {
                return await httpRequest(`${serverUrl}/api/backup/restore/${encodeURIComponent(fileName)}`, 'POST', '{}',
                    { 'Authorization': `Bearer ${getToken()}` });
            }

            const dbFolder = path.join(app.getPath('userData'), 'KORENE_EyeClinic');
            const backupsFolder = path.join(dbFolder, 'backups');
            const backupPath = path.join(backupsFolder, fileName);

            if (!fs.existsSync(backupPath)) return { success: false, error: 'Backup file not found' };

            // Backup current db first
            const dbPath = path.join(dbFolder, 'eye_clinic.db');
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            if (fs.existsSync(dbPath)) {
                fs.copyFileSync(dbPath, path.join(dbFolder, `eye_clinic_pre_restore_${timestamp}.db`));
            }

            // Restore from backup
            fs.copyFileSync(backupPath, dbPath);

            return { success: true, message: 'Database restored successfully. Please restart the application.' };
        } catch (error) { return buildErrorResponse(error, { scope: 'backup', action: 'restore' }); }
    });
};
