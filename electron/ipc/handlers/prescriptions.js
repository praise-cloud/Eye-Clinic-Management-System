const { ipcMain, BrowserWindow } = require('electron');
const DatabaseService = require('../../../src/services/DatabaseService');
const { buildErrorResponse } = require('./utils');

let _currentUser = null;
function setCurrentUser(u) { _currentUser = u; }

module.exports = function registerPrescriptionHandlers(ctx) {
  _currentUser = ctx.currentUser;
  if (ctx._setCurrentUser) {
    const orig = ctx._setCurrentUser;
    ctx._setCurrentUser = (u) => { _currentUser = u; orig(u); };
  } else {
    ctx._setCurrentUser = (u) => { _currentUser = u; };
  }

  function requireDoctor() {
    if (!_currentUser) return { success: false, error: 'Authentication required' };
    if (!['admin', 'doctor'].includes(String(_currentUser.role || '').toLowerCase())) return { success: false, error: 'Access denied. Only admin or doctor can create prescriptions.' };
    return null;
  }

  ipcMain.handle('prescriptions:create', async (event, prescriptionData) => {
    try {
      const authErr = requireDoctor(); if (authErr) return authErr;
      const required = ['patientId', 'doctorId', 'drugId', 'quantity'];
      for (const f of required) { if (!prescriptionData[f]) return { success: false, error: `${f} required` }; }

      const prescription = await DatabaseService.createPrescription(prescriptionData);
      const assistants = await DatabaseService.getAllUsers();
      const assistantUsers = assistants.filter(u => u.role === 'assistant');

      for (const assistant of assistantUsers) {
        await DatabaseService.createNotification({
          userId: assistant.id,
          title: 'New Prescription',
          message: `New prescription for ${prescription.drug_name} has been created for a patient.`,
          type: 'prescription_new',
          relatedId: prescription.id
        });
        BrowserWindow.getAllWindows().forEach(w => w.webContents.send('notifications:new', { userId: assistant.id }));
      }

      BrowserWindow.getAllWindows().forEach(w => w.webContents.send('data:update', { table: 'prescriptions', action: 'create', record: prescription }));
      return { success: true, prescription };
    } catch (error) {
      return buildErrorResponse(error, { scope: 'prescriptions', action: 'create', entity: 'prescription' });
    }
  });

  ipcMain.handle('prescriptions:createMultiple', async (event, { patientId, doctorId, items }) => {
    try {
      const authErr = requireDoctor(); if (authErr) return authErr;
      if (!patientId || !doctorId || !items || !Array.isArray(items)) {
        return { success: false, error: 'patientId, doctorId and items array required' };
      }

      const result = await DatabaseService.createMultiplePrescriptions(patientId, doctorId, items);
      const assistants = await DatabaseService.getAllUsers();
      const assistantUsers = assistants.filter(u => u.role === 'assistant');

      for (const prescription of result.prescriptions) {
        for (const assistant of assistantUsers) {
          await DatabaseService.createNotification({
            userId: assistant.id,
            title: 'New Prescription',
            message: `New prescription for ${prescription.drug_name} has been created.`,
            type: 'prescription_new',
            relatedId: prescription.id
          });
          BrowserWindow.getAllWindows().forEach(w => w.webContents.send('notifications:new', { userId: assistant.id }));
        }
      }

      BrowserWindow.getAllWindows().forEach(w => w.webContents.send('data:update', { table: 'prescriptions', action: 'createMultiple', records: result.prescriptions }));
      return result;
    } catch (error) {
      return buildErrorResponse(error, { scope: 'prescriptions', action: 'createMultiple', entity: 'prescription' });
    }
  });

  ipcMain.handle('prescriptions:getById', async (event, id) => {
    try {
      if (!id) return { success: false, error: 'Prescription ID required' };
      const prescription = await DatabaseService.getPrescriptionById(id);
      return { success: true, prescription };
    } catch (error) {
      return buildErrorResponse(error, { scope: 'prescriptions', action: 'getById', entity: 'prescription' });
    }
  });

  ipcMain.handle('prescriptions:getByPatient', async (event, patientId) => {
    try {
      if (!patientId) return { success: false, error: 'Patient ID required' };
      const prescriptions = await DatabaseService.getPrescriptionsByPatient(patientId);
      return { success: true, prescriptions };
    } catch (error) {
      return buildErrorResponse(error, { scope: 'prescriptions', action: 'getByPatient', entity: 'prescription' });
    }
  });

  ipcMain.handle('prescriptions:getPending', async () => {
    try {
      const prescriptions = await DatabaseService.getPendingPrescriptions();
      return { success: true, prescriptions };
    } catch (error) {
      return buildErrorResponse(error, { scope: 'prescriptions', action: 'getPending', entity: 'prescription' });
    }
  });

  ipcMain.handle('prescriptions:updateStatus', async (event, { id, status, userId }) => {
    try {
      if (!id || !status) return { success: false, error: 'ID and status required' };
      const result = await DatabaseService.updatePrescriptionStatus(id, status, userId);

      BrowserWindow.getAllWindows().forEach(w => {
        w.webContents.send('data:update', { table: 'prescriptions', action: 'update', recordId: id, status });
        if (status === 'dispensed') {
          w.webContents.send('data:update', { table: 'pharmacy', action: 'update' });
        }
      });

      return { success: true, ...result };
    } catch (error) {
      return buildErrorResponse(error, { scope: 'prescriptions', action: 'updateStatus', entity: 'prescription' });
    }
  });
};
