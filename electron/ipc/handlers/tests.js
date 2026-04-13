const { ipcMain, BrowserWindow } = require('electron');
const DatabaseService = require('../../../src/services/DatabaseService');
const { buildErrorResponse } = require('./utils');

let _currentUser = null;
function setCurrentUser(u) { _currentUser = u; }

module.exports = function registerTestHandlers(ctx) {
  _currentUser = ctx.currentUser;
  if (ctx._setCurrentUser) {
    const orig = ctx._setCurrentUser;
    ctx._setCurrentUser = (u) => { _currentUser = u; orig(u); };
  } else {
    ctx._setCurrentUser = (u) => { _currentUser = u; };
  }

  function requireDoctor() {
    if (!_currentUser) return { success: false, error: 'Authentication required' };
    if (!['admin', 'doctor'].includes(String(_currentUser.role || '').toLowerCase())) return { success: false, error: 'Only doctors can perform this action' };
    return null;
  }

  ipcMain.handle('tests:getAll', async (event, filters = {}) => {
    try {
      const tests = await DatabaseService.getAllTests(filters);
      return { success: true, tests };
    } catch (error) { return buildErrorResponse(error, { scope: 'tests', action: 'getAll', entity: 'test' }); }
  });

  ipcMain.handle('tests:getById', async (event, id) => {
    try {
      const test = await DatabaseService.getTestById(id);
      return test ? { success: true, test } : { success: false, error: 'Test not found' };
    } catch (error) { return buildErrorResponse(error, { scope: 'tests', action: 'getById', entity: 'test' }); }
  });

  ipcMain.handle('tests:create', async (event, testData) => {
    try {
      const authErr = requireDoctor(); if (authErr) return authErr;
      if (!testData.patient_id) return { success: false, error: 'Patient ID required' };
      const test = await DatabaseService.createTest(testData);
      if (_currentUser?.id) await DatabaseService.logActivity(_currentUser.id, 'create', 'test', test.id, `Test created for patient ${testData.patient_id}`);
      BrowserWindow.getAllWindows().forEach(w => w.webContents.send('data:update', { table: 'tests', action: 'create', record: test }));
      return { success: true, test };
    } catch (error) { return buildErrorResponse(error, { scope: 'tests', action: 'create', entity: 'test' }); }
  });

  ipcMain.handle('tests:update', async (event, { id, testData }) => {
    try {
      const authErr = requireDoctor(); if (authErr) return authErr;
      if (!id) return { success: false, error: 'Test ID required' };
      const test = await DatabaseService.updateTest(id, testData);
      if (_currentUser?.id) await DatabaseService.logActivity(_currentUser.id, 'update', 'test', id, `Test ${id} updated`);
      BrowserWindow.getAllWindows().forEach(w => w.webContents.send('data:update', { table: 'tests', action: 'update', record: test }));
      return { success: true, test };
    } catch (error) { return buildErrorResponse(error, { scope: 'tests', action: 'update', entity: 'test' }); }
  });

  ipcMain.handle('tests:delete', async (event, id) => {
    try {
      const authErr = requireDoctor(); if (authErr) return authErr;
      if (!id) return { success: false, error: 'Test ID required' };
      const result = await DatabaseService.deleteTest(id);
      if (_currentUser?.id) await DatabaseService.logActivity(_currentUser.id, 'delete', 'test', id, `Test ${id} deleted`);
      return result;
    } catch (error) { return buildErrorResponse(error, { scope: 'tests', action: 'delete', entity: 'test' }); }
  });

  ipcMain.handle('tests:attachCvfToDocuments', async (event, { testId, options }) => {
    try {
      if (!_currentUser) return { success: false, error: 'Authentication required' };
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
