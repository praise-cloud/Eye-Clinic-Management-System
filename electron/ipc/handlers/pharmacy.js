const { ipcMain, BrowserWindow } = require('electron');
const DatabaseService = require('../../../src/services/DatabaseService');
const { buildErrorResponse } = require('./utils');

let _currentUser = null;
function setCurrentUser(u) { _currentUser = u; }

module.exports = function registerPharmacyHandlers(ctx) {
  _currentUser = ctx.currentUser;
  if (ctx._setCurrentUser) {
    const orig = ctx._setCurrentUser;
    ctx._setCurrentUser = (u) => { _currentUser = u; orig(u); };
  } else {
    ctx._setCurrentUser = (u) => { _currentUser = u; };
  }

  function requireAdminOrDoctor() {
    if (!_currentUser) return { success: false, error: 'Authentication required' };
    if (!['admin', 'doctor'].includes(String(_currentUser.role || '').toLowerCase())) return { success: false, error: 'Access denied. Only admin or doctor can perform this action.' };
    return null;
  }

  ipcMain.handle('pharmacy:getDrugs', async (event, filters = {}) => {
    try {
      const drugs = await DatabaseService.getAllPharmacyDrugs(filters);
      return { success: true, drugs };
    } catch (error) {
      return buildErrorResponse(error, { scope: 'pharmacy', action: 'getDrugs', entity: 'pharmacy_drug' });
    }
  });

  ipcMain.handle('pharmacy:getDrugById', async (event, id) => {
    try {
      if (!id) return { success: false, error: 'Drug ID required' };
      const drug = await DatabaseService.getPharmacyDrugById(id);
      return drug ? { success: true, drug } : { success: false, error: 'Drug not found' };
    } catch (error) {
      return buildErrorResponse(error, { scope: 'pharmacy', action: 'getDrugById', entity: 'pharmacy_drug' });
    }
  });

  ipcMain.handle('pharmacy:createDrug', async (event, drugData) => {
    try {
      const authErr = requireAdminOrDoctor(); if (authErr) return authErr;
      const required = ['drug_code', 'drug_name', 'drug_form', 'strength', 'pack_size', 'unit_price'];
      for (const f of required) { if (!drugData[f]) return { success: false, error: `${f} required` }; }

      const drug = await DatabaseService.createPharmacyDrug(drugData);
      if (_currentUser?.id) {
        await DatabaseService.logActivity(_currentUser.id, 'create', 'pharmacy_drug', drug.id, `Pharmacy drug ${drug.drug_name} created`);
      }
      BrowserWindow.getAllWindows().forEach(w => w.webContents.send('data:update', { table: 'pharmacy', action: 'create', record: drug }));
      return { success: true, drug };
    } catch (error) {
      return buildErrorResponse(error, { scope: 'pharmacy', action: 'createDrug', entity: 'pharmacy_drug' });
    }
  });

  ipcMain.handle('pharmacy:updateDrug', async (event, { id, drugData }) => {
    try {
      const authErr = requireAdminOrDoctor(); if (authErr) return authErr;
      if (!id) return { success: false, error: 'Drug ID required' };
      const drug = await DatabaseService.updatePharmacyDrug(id, drugData);
      if (_currentUser?.id) {
        await DatabaseService.logActivity(_currentUser.id, 'update', 'pharmacy_drug', id, `Pharmacy drug ${id} updated`);
      }
      BrowserWindow.getAllWindows().forEach(w => w.webContents.send('data:update', { table: 'pharmacy', action: 'update', record: drug }));
      return { success: true, drug };
    } catch (error) {
      return buildErrorResponse(error, { scope: 'pharmacy', action: 'updateDrug', entity: 'pharmacy_drug' });
    }
  });

  ipcMain.handle('pharmacy:deleteDrug', async (event, id) => {
    try {
      if (!_currentUser) return { success: false, error: 'Authentication required' };
      if (String(_currentUser.role || '').toLowerCase() !== 'admin') return { success: false, error: 'Access denied. Only admin can delete pharmacy drugs.' };
      if (!id) return { success: false, error: 'Drug ID required' };
      const result = await DatabaseService.deletePharmacyDrug(id);
      if (result.success && _currentUser?.id) {
        await DatabaseService.logActivity(_currentUser.id, 'delete', 'pharmacy_drug', id, `Pharmacy drug ${id} deleted`);
      }
      if (result.success) {
        BrowserWindow.getAllWindows().forEach(w => w.webContents.send('data:update', { table: 'pharmacy', action: 'delete', recordId: id }));
      }
      return result;
    } catch (error) {
      return buildErrorResponse(error, { scope: 'pharmacy', action: 'deleteDrug', entity: 'pharmacy_drug' });
    }
  });

  ipcMain.handle('pharmacy:dispense', async (event, { drugId, patientId, quantity, notes }) => {
    try {
      if (!_currentUser) return { success: false, error: 'Authentication required' };
      if (!['admin', 'assistant', 'doctor'].includes(String(_currentUser.role || '').toLowerCase())) {
        return { success: false, error: 'Access denied. Only admin, doctor, or assistant can dispense pharmacy drugs.' };
      }
      if (!drugId || !patientId) return { success: false, error: 'Drug and patient are required' };
      const qtyNumber = Number(quantity || 0);
      if (!Number.isFinite(qtyNumber) || qtyNumber <= 0) {
        return { success: false, error: 'Quantity must be greater than zero' };
      }

      const userId = _currentUser?.id || null;
      const result = await DatabaseService.createPharmacyDispensation({ drugId, patientId, quantity: qtyNumber, userId, notes: notes || null });

      if (userId) {
        await DatabaseService.logActivity(userId, 'create', 'pharmacy_dispensation', result.dispensation.id, `Pharmacy dispensation recorded for drug ${drugId}`);
      }

      BrowserWindow.getAllWindows().forEach(w => {
        w.webContents.send('data:update', { table: 'pharmacy', action: 'dispense', record: result.dispensation });
        w.webContents.send('data:update', { table: 'revenue', action: 'create', record: result.revenue });
        w.webContents.send('data:update', { table: 'dashboard', action: 'refresh' });
        if (result.linkedPrescriptionId) {
          w.webContents.send('data:update', { table: 'prescriptions', action: 'update', recordId: result.linkedPrescriptionId, status: 'dispensed' });
        }
      });

      return { success: true, dispensation: result.dispensation, revenue: result.revenue };
    } catch (error) {
      return buildErrorResponse(error, { scope: 'pharmacy', action: 'dispense', entity: 'pharmacy_dispensation' });
    }
  });
};
