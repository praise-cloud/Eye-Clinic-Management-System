const { ipcMain, BrowserWindow } = require('electron');
const DatabaseService = require('../../../src/services/DatabaseService');
const { buildErrorResponse } = require('./utils');

let _currentUser = null;
function setCurrentUser(u) { _currentUser = u; }

module.exports = function registerPatientHandlers(ctx) {
  _currentUser = ctx.currentUser;
  if (ctx._setCurrentUser) {
    const orig = ctx._setCurrentUser;
    ctx._setCurrentUser = (u) => { _currentUser = u; orig(u); };
  } else {
    ctx._setCurrentUser = (u) => { _currentUser = u; };
  }

  function requireAuth(roleList = ['admin', 'doctor', 'assistant']) {
    if (!_currentUser) return { success: false, error: 'Authentication required' };
    if (!roleList.includes(String(_currentUser.role || '').toLowerCase())) return { success: false, error: 'Access denied' };
    return null;
  }

  ipcMain.handle('patients:getAll', async (event, filters = {}) => {
    try { return { success: true, patients: await DatabaseService.getAllPatients(filters) }; }
    catch (error) { return buildErrorResponse(error, { scope: 'patients', action: 'getAll', entity: 'patient' }); }
  });

  ipcMain.handle('patients:getById', async (event, id) => {
    try {
      if (!id) return { success: false, error: 'Patient ID required' };
      const patient = await DatabaseService.getPatientById(id);
      return patient ? { success: true, patient } : { success: false, error: 'Patient not found' };
    } catch (error) { return buildErrorResponse(error, { scope: 'patients', action: 'getById', entity: 'patient' }); }
  });

  ipcMain.handle('patients:create', async (event, patientData) => {
    try {
      const authErr = requireAuth(); if (authErr) return authErr;
      const required = ['first_name', 'last_name'];
      for (const f of required) { if (!patientData[f]) return { success: false, error: `${f} required` }; }
      const result = await DatabaseService.createPatient(patientData);
      if (result?.error) return result;
      if (_currentUser?.id) await DatabaseService.logActivity(_currentUser.id, 'create', 'patient', result.id, `Patient ${result.first_name} ${result.last_name} created`);
      BrowserWindow.getAllWindows().forEach(w => w.webContents.send('data:update', { table: 'patients', action: 'create', record: result }));
      return { success: true, patient: result };
    } catch (error) { return buildErrorResponse(error, { scope: 'patients', action: 'create', entity: 'patient' }); }
  });

  ipcMain.handle('patients:update', async (event, { id, patientData }) => {
    try {
      const authErr = requireAuth(); if (authErr) return authErr;
      if (!id) return { success: false, error: 'Patient ID required' };
      const result = await DatabaseService.updatePatient(id, patientData);
      if (result?.error) return result;
      if (_currentUser?.id) await DatabaseService.logActivity(_currentUser.id, 'update', 'patient', id, `Patient ${result.first_name} ${result.last_name} updated`);
      BrowserWindow.getAllWindows().forEach(w => w.webContents.send('data:update', { table: 'patients', action: 'update', record: result }));
      return { success: true, patient: result };
    } catch (error) { return buildErrorResponse(error, { scope: 'patients', action: 'update', entity: 'patient' }); }
  });

  ipcMain.handle('patients:delete', async (event, id) => {
    try {
      const authErr = requireAuth(['admin']); if (authErr) return authErr;
      if (!id) return { success: false, error: 'Patient ID required' };
      const result = await DatabaseService.deletePatient(id);
      if (result.success && _currentUser?.id) await DatabaseService.logActivity(_currentUser.id, 'delete', 'patient', id, `Patient ${id} deleted`);
      return result;
    } catch (error) { return buildErrorResponse(error, { scope: 'patients', action: 'delete', entity: 'patient' }); }
  });

  ipcMain.handle('patients:search', async (event, searchTerm) => {
    try { return { success: true, patients: await DatabaseService.getAllPatients({ search: searchTerm }) }; }
    catch (error) { return buildErrorResponse(error, { scope: 'patients', action: 'search', entity: 'patient' }); }
  });
};
