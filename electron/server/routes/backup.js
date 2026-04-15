// electron/server/routes/backup.js
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../database');
const { authenticated } = require('../auth');

function getBackupRoutes() {
    return [
        {
            method: 'get',
            path: '/api/backup/list',
            handler: authenticated(async (req, res) => {
                try {
                    const appDataPath = process.env.APPDATA || process.env.HOME || '';
                    const dbFolder = path.join(appDataPath, 'KORENE_EyeClinic');
                    const backupsFolder = path.join(dbFolder, 'backups');
                    
                    if (!fs.existsSync(backupsFolder)) {
                        return res.json({ success: true, backups: [] });
                    }
                    
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
                    
                    res.json({ success: true, backups: files });
                } catch (err) { res.status(500).json({ success: false, error: err.message }); }
            })
        },
        {
            method: 'post',
            path: '/api/backup/create',
            handler: authenticated(async (req, res) => {
                try {
                    const appDataPath = process.env.APPDATA || process.env.HOME || '';
                    const dbFolder = path.join(appDataPath, 'KORENE_EyeClinic');
                    const backupsFolder = path.join(dbFolder, 'backups');
                    
                    if (!fs.existsSync(backupsFolder)) {
                        fs.mkdirSync(backupsFolder, { recursive: true });
                    }
                    
                    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
                    const dbPath = path.join(dbFolder, 'eye_clinic.db');
                    const backupPath = path.join(backupsFolder, `eye_clinic_backup_${timestamp}.db`);
                    
                    if (!fs.existsSync(dbPath)) {
                        return res.status(404).json({ success: false, error: 'Database file not found' });
                    }
                    
                    fs.copyFileSync(dbPath, backupPath);
                    const stats = fs.statSync(backupPath);
                    
                    res.json({
                        success: true,
                        backup: {
                            file_name: `eye_clinic_backup_${timestamp}.db`,
                            file_path: backupPath,
                            size: stats.size,
                            created_at: new Date().toISOString()
                        }
                    });
                } catch (err) { res.status(500).json({ success: false, error: err.message }); }
            })
        },
        {
            method: 'post',
            path: '/api/backup/restore/:fileName',
            handler: authenticated(async (req, res) => {
                try {
                    const { fileName } = req.params;
                    const appDataPath = process.env.APPDATA || process.env.HOME || '';
                    const dbFolder = path.join(appDataPath, 'KORENE_EyeClinic');
                    const backupsFolder = path.join(dbFolder, 'backups');
                    const backupPath = path.join(backupsFolder, fileName);
                    
                    if (!fs.existsSync(backupPath)) {
                        return res.status(404).json({ success: false, error: 'Backup file not found' });
                    }
                    
                    // Backup current db first
                    const dbPath = path.join(dbFolder, 'eye_clinic.db');
                    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
                    if (fs.existsSync(dbPath)) {
                        fs.copyFileSync(dbPath, path.join(dbFolder, `eye_clinic_pre_restore_${timestamp}.db`));
                    }
                    
                    // Restore from backup
                    fs.copyFileSync(backupPath, dbPath);
                    
                    res.json({ success: true, message: 'Database restored successfully. Please restart the application.' });
                } catch (err) { res.status(500).json({ success: false, error: err.message }); }
            })
        }
    ];
}

module.exports = { getBackupRoutes };
