const { ipcMain, BrowserWindow } = require('electron');
const DatabaseService = require('../../../src/services/DatabaseService');
const { buildErrorResponse } = require('./utils');

let _currentUser = null;
function setCurrentUser(u) { _currentUser = u; }

module.exports = function registerInventoryHandlers(ctx) {
  _currentUser = ctx.currentUser;
  if (ctx._setCurrentUser) {
    const orig = ctx._setCurrentUser;
    ctx._setCurrentUser = (u) => { _currentUser = u; orig(u); };
  } else {
    ctx._setCurrentUser = (u) => { _currentUser = u; };
  }

  ipcMain.handle('inventory:getAll', async (event, filters = {}) => {
    try {
      const items = await DatabaseService.getAllInventoryItems(filters);
      return { success: true, items };
    } catch (error) {
      return buildErrorResponse(error, { scope: 'inventory', action: 'getAll', entity: 'inventory' });
    }
  });

  ipcMain.handle('inventory:getById', async (event, id) => {
    try {
      if (!id) return { success: false, error: 'Item ID required' };
      const item = await DatabaseService.getInventoryItemById(id);
      return item ? { success: true, item } : { success: false, error: 'Item not found' };
    } catch (error) {
      return buildErrorResponse(error, { scope: 'inventory', action: 'getById', entity: 'inventory' });
    }
  });

  ipcMain.handle('inventory:create', async (event, itemData) => {
    try {
      const item = await DatabaseService.createInventoryItem(itemData);
      if (_currentUser?.id) {
        await DatabaseService.logActivity(_currentUser.id, 'create', 'inventory', item.id, `Inventory item ${item.item_name} created`);
      }
      BrowserWindow.getAllWindows().forEach(w => w.webContents.send('data:update', { table: 'inventory', action: 'create', record: item }));
      return { success: true, item };
    } catch (error) {
      return buildErrorResponse(error, { scope: 'inventory', action: 'create', entity: 'inventory' });
    }
  });

  ipcMain.handle('inventory:update', async (event, { id, itemData }) => {
    try {
      if (!id) return { success: false, error: 'Item ID required' };
      const item = await DatabaseService.updateInventoryItem(id, itemData);
      if (_currentUser?.id) {
        await DatabaseService.logActivity(_currentUser.id, 'update', 'inventory', id, `Inventory item ${id} updated`);
      }
      BrowserWindow.getAllWindows().forEach(w => w.webContents.send('data:update', { table: 'inventory', action: 'update', record: item }));
      return { success: true, item };
    } catch (error) {
      return buildErrorResponse(error, { scope: 'inventory', action: 'update', entity: 'inventory' });
    }
  });

  ipcMain.handle('inventory:delete', async (event, id) => {
    try {
      if (!id) return { success: false, error: 'Item ID required' };
      const result = await DatabaseService.deleteInventoryItem(id);
      if (result.success && _currentUser?.id) {
        await DatabaseService.logActivity(_currentUser.id, 'delete', 'inventory', id, `Inventory item ${id} deleted`);
      }
      if (result.success) {
        BrowserWindow.getAllWindows().forEach(w => w.webContents.send('data:update', { table: 'inventory', action: 'delete', recordId: id }));
      }
      return result;
    } catch (error) {
      return buildErrorResponse(error, { scope: 'inventory', action: 'delete', entity: 'inventory' });
    }
  });

  ipcMain.handle('inventory:updateQuantity', async (event, { id, quantity, userId, notes }) => {
    try {
      if (!id || typeof quantity !== 'number') return { success: false, error: 'Item ID and quantity required' };
      const item = await DatabaseService.updateInventoryQuantity(id, quantity, userId, notes);
      if (userId) {
        await DatabaseService.logActivity(userId, 'update', 'inventory', id, `Inventory quantity updated to ${quantity}`);
      }
      BrowserWindow.getAllWindows().forEach(w => w.webContents.send('data:update', { table: 'inventory', action: 'update', record: item }));
      return { success: true, item };
    } catch (error) {
      return buildErrorResponse(error, { scope: 'inventory', action: 'updateQuantity', entity: 'inventory' });
    }
  });

  ipcMain.handle('inventory:getByCode', async (event, itemCode) => {
    try {
      if (!itemCode) return { success: false, error: 'Item code required' };
      const item = await DatabaseService.getInventoryItemByCode(itemCode);
      return item ? { success: true, item } : { success: false, error: 'Item not found' };
    } catch (error) {
      return buildErrorResponse(error, { scope: 'inventory', action: 'getByCode', entity: 'inventory' });
    }
  });

  ipcMain.handle('inventory:getStatistics', async () => {
    try {
      const stats = await DatabaseService.getInventoryStatistics();
      return { success: true, stats };
    } catch (error) {
      return buildErrorResponse(error, { scope: 'inventory', action: 'getStatistics', entity: 'inventory' });
    }
  });

  ipcMain.handle('inventory:getLowStock', async () => {
    try {
      const items = await DatabaseService.getLowStockItems();
      return { success: true, items };
    } catch (error) {
      return buildErrorResponse(error, { scope: 'inventory', action: 'getLowStock', entity: 'inventory' });
    }
  });

  ipcMain.handle('inventory:getExpiring', async (event, days = 30) => {
    try {
      const items = await DatabaseService.getExpiringItems(days);
      return { success: true, items };
    } catch (error) {
      return buildErrorResponse(error, { scope: 'inventory', action: 'getExpiring', entity: 'inventory' });
    }
  });

  ipcMain.handle('inventory:search', async (event, searchTerm) => {
    try {
      if (!searchTerm) return { success: false, error: 'Search term required' };
      const items = await DatabaseService.searchInventory(searchTerm);
      return { success: true, items };
    } catch (error) {
      return buildErrorResponse(error, { scope: 'inventory', action: 'search', entity: 'inventory' });
    }
  });
};
