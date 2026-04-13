const { ipcMain, app } = require('electron');
const path = require('path');
const fs = require('fs');
const DatabaseService = require('../../../src/services/DatabaseService');
const { buildErrorResponse } = require('./utils');

let _currentUser = null;
function setCurrentUser(u) { _currentUser = u; }

module.exports = function registerCvfHandlers(ctx) {
  _currentUser = ctx.currentUser;
  if (ctx._setCurrentUser) {
    const orig = ctx._setCurrentUser;
    ctx._setCurrentUser = (u) => { _currentUser = u; orig(u); };
  } else {
    ctx._setCurrentUser = (u) => { _currentUser = u; };
  }

  ipcMain.handle('cvf:listIncomingFiles', async (event, payload = {}) => {
    try {
      if (!_currentUser) return { success: false, error: 'Authentication required' };
      const role = String(_currentUser.role || '').toLowerCase();
      if (!['admin', 'doctor', 'assistant'].includes(role)) return { success: false, error: 'Access denied' };

      const dir = app.getPath('userData');
      const cfgPath = path.join(dir, 'config.json');
      let watchPath = '';
      if (fs.existsSync(cfgPath)) {
        try { const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf-8')); watchPath = String(cfg.cvf_watch_path || ''); } catch {}
      }
      const incomingPath = String(payload?.path || watchPath || '').trim();
      if (!incomingPath) return { success: false, error: 'No CVF watch folder configured' };
      if (!fs.existsSync(incomingPath)) return { success: false, error: 'CVF watch folder not found' };

      const entries = fs.readdirSync(incomingPath, { withFileTypes: true });
      const files = entries.filter(e => e.isFile()).map(e => {
        const fullPath = path.join(incomingPath, e.name);
        const stat = fs.statSync(fullPath);
        return { name: e.name, path: fullPath, size: stat.size, modified_at: stat.mtime?.toISOString ? stat.mtime.toISOString() : new Date(stat.mtime).toISOString() };
      }).filter(p => path.extname(p.path).toLowerCase() === '.pdf').sort((a, b) => new Date(b.modified_at).getTime() - new Date(a.modified_at).getTime());

      return { success: true, path: incomingPath, files };
    } catch (error) { return buildErrorResponse(error, { scope: 'cvf', action: 'listIncomingFiles' }); }
  });

  ipcMain.handle('cvf:attachPdfToPatient', async (event, payload = {}) => {
    try {
      if (!_currentUser) return { success: false, error: 'Authentication required' };
      const role = String(_currentUser.role || '').toLowerCase();
      if (!['admin', 'doctor', 'assistant'].includes(role)) return { success: false, error: 'Access denied' };

      const patientId = String(payload?.patientId || '').trim();
      const filePath = String(payload?.filePath || '').trim();
      if (!patientId) return { success: false, error: 'Patient ID required' };
      if (!filePath) return { success: false, error: 'File path required' };
      if (!fs.existsSync(filePath)) return { success: false, error: 'File not found' };
      if (path.extname(filePath).toLowerCase() !== '.pdf') return { success: false, error: 'Only PDF files are supported' };

      const buffer = fs.readFileSync(filePath);
      const title = String(payload?.title || `CVF PDF - ${path.basename(filePath)}`).trim();
      const report = await DatabaseService.createReport({ patient_id: patientId, report_type: 'cvf_external_pdf', title, report_file: buffer });

      if (_currentUser?.id) {
        await DatabaseService.logActivity(_currentUser.id, 'create', 'report', report.id, `Attached CVF PDF: ${path.basename(filePath)}`);
      }

      return { success: true, report };
    } catch (error) { return buildErrorResponse(error, { scope: 'cvf', action: 'attachPdfToPatient' }); }
  });
};
