// services/BackupService.js — just drop it in
const fs = require('fs-extra');
const path = require('path');
const { app } = require('electron');

class BackupService {
  static async createBackup() {
    const source = path.join(app.getPath('userData'), 'eye_clinic.db');
    const backupDir = path.join(app.getPath('userData'), 'backups');
    await fs.ensureDir(backupDir);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(backupDir, `backup_${timestamp}.db`);
    await fs.copy(source, backupPath);
    return backupPath;
  }

  static async restoreBackup(filePath) {
    const target = path.join(app.getPath('userData'), 'eye_clinic.db');
    await fs.copy(filePath, target);
  }
}

module.exports = BackupService;