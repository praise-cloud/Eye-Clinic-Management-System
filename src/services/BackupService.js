// src/services/BackupService.js
const fs = require('fs-extra');
const path = require('path');
const { app } = require('electron');
const { dialog } = require('electron');
const DatabaseService = require('./DatabaseService');

class BackupService {
  static async createBackup(mainWindow) {
    try {
      const source = path.join(app.getPath('userData'), 'eye_clinic.db');
      const backupDir = path.join(app.getPath('documents'), 'Eye Clinic Backups');
      await fs.ensureDir(backupDir);

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.join(backupDir, `eye_clinic_backup_${timestamp}.db`);

      await fs.copy(source, backupPath);

      dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'Backup Successful',
        message: `Backup created successfully!\nSaved to: ${backupPath}`,
      });

      return { success: true, path: backupPath };
    } catch (err) {
      dialog.showErrorBox('Backup Failed', err.message);
      return { success: false, error: err.message };
    }
  }

  static async restoreBackup(mainWindow) {
    try {
      const result = await dialog.showOpenDialog(mainWindow, {
        title: 'Select Backup File',
        filters: [
          { name: 'Backup Files', extensions: ['sqlite', 'db', 'bak'] },
        ],
        properties: ['openFile']
      });

      if (result.canceled || !result.filePaths[0]) return;

      const filePath = result.filePaths[0];

      if (filePath.endsWith('.bak')) {
        // Use DatabaseService to restore .bak files
        const response = await DatabaseService.restoreBackup(filePath);
        if (response.success) {
          dialog.showMessageBox(mainWindow, {
            type: 'info',
            title: 'Restore Complete',
            message: 'Database restored successfully from .bak file.',
          });
        } else {
          throw new Error(response.message);
        }
      } else {
        // Handle .db file restoration
        const target = path.join(app.getPath('userData'), 'eye_clinic.db');
        await fs.copy(filePath, target);

        dialog.showMessageBox(mainWindow, {
          type: 'info',
          title: 'Restore Complete',
          message: 'Database restored successfully. Please restart the app.',
        });

        app.relaunch();
        app.exit();
      }
    } catch (err) {
      dialog.showErrorBox('Restore Failed', err.message);
    }
  }
}

module.exports = BackupService;