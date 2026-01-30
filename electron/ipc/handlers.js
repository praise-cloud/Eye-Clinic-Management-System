// electron/ipc/handlers.js
const { ipcMain, BrowserWindow } = require('electron');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const DatabaseService = require('../../src/services/DatabaseService');
const FileService = require('../../src/services/FileService');

let currentUser = null; // Centralized user state in main process

class IPCHandlers {
  constructor() {
    this.registerAuthHandlers();
    this.registerPatientHandlers();
    this.registerTestHandlers();
    this.registerReportHandlers();
    this.registerInventoryHandlers();
    this.registerAdminHandlers();
    this.registerFileHandlers();
    this.registerChatHandlers();
    this.registerPresenceHandlers();
    this.registerSettingsHandlers();
    this.registerSystemHandlers();
    this.registerWindowHandlers();
    this.registerDashboardHandlers();
    console.log('IPC handlers registered successfully');
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // AUTH HANDLERS
  // ──────────────────────────────────────────────────────────────────────────────

  registerAuthHandlers() {
    ipcMain.handle('auth:getCurrentUser', async () => {
      return currentUser
        ? { success: true, user: currentUser }
        : { success: false, message: 'No user logged in' };
    });

    ipcMain.handle('auth:logout', async (event, { userId } = {}) => {
      try {
        const id = userId || currentUser?.id;
        if (id) {
          await DatabaseService.logActivity(id, 'logout', 'user', id, 'User logged out');
        }
        currentUser = null;
        return { success: true, message: 'Logged out successfully' };
      } catch (error) {
        console.error('Logout error:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('auth:isFirstRun', async () => {
      try {
        const db = await DatabaseService.getDatabase();
        const result = await db.get('SELECT COUNT(*) as count FROM users');
        const isFirstRun = result.count === 0;
        console.log(`First run check: users = ${result.count}, isFirstRun = ${isFirstRun}`);
        return { success: true, isFirstRun };
      } catch (error) {
        console.error('First run check error:', error);
        return { success: false, error: error.message, isFirstRun: true };
      }
    });

    ipcMain.handle('auth:login', async (event, email, password) => {
      try {
        if (!email || !password) {
          return { success: false, error: 'Email and password required' };
        }

        const user = await DatabaseService.authenticateUser(email, password);
        if (!user) {
          return { success: false, error: 'Invalid credentials' };
        }

        const userWithName = {
          ...user,
          role: (user.role || '').toLowerCase(),
          name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
          phone: user.phone_number
        };

        currentUser = userWithName;
        return { success: true, user: userWithName };
      } catch (error) {
        console.error('Login error:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('auth:completeSetup', async (event, { clinicData, adminData }) => {
      try {
        if (!adminData?.firstName || !adminData?.lastName || !adminData?.email || !adminData?.password || !adminData?.role) {
          return { success: false, error: 'Missing required admin fields' };
        }

        let role = adminData.role.toLowerCase().trim();
        if (role === 'clinic assistant') role = 'assistant';

        const userData = {
          first_name: adminData.firstName,
          last_name: adminData.lastName,
          email: adminData.email,
          password: adminData.password,
          role,
          phone_number: adminData.phoneNumber || null,
          gender: adminData.gender || 'other'
        };

        const user = await DatabaseService.createUser(userData);
        if (!user) {
          return { success: false, error: 'Failed to create admin user' };
        }

        const userWithName = {
          ...user,
          name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
          phone: user.phone_number
        };

        currentUser = userWithName;

        await DatabaseService.setSetting('setup_complete', 'true');

        await DatabaseService.logActivity(
          user.id,
          'setup',
          'system',
          null,
          `Initial setup completed by ${userWithName.name} (${role})`
        );

        return { success: true, user: userWithName };
      } catch (error) {
        console.error('Setup error:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('auth:createUser', async (event, userData) => {
      try {
        const dbUserData = {
          first_name: userData.firstName,
          last_name: userData.lastName,
          email: userData.email,
          password: userData.password,
          role: userData.role,
          phone_number: userData.phoneNumber || null,
          gender: userData.gender || 'other'
        };

        const required = ['first_name', 'last_name', 'email', 'password', 'role'];
        for (const field of required) {
          if (!dbUserData[field]) return { success: false, error: `${field} required` };
        }

        const user = await DatabaseService.createUser(dbUserData);
        return { success: true, user };
      } catch (error) {
        console.error('Create user error:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('auth:getAllUsers', async () => {
      try {
        const users = await DatabaseService.getAllUsers();
        return { success: true, users };
      } catch (error) {
        console.error('Get all users error:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('auth:isAuthenticated', async () => {
        return !!currentUser; // true if someone is logged in
    });

    // ipcMain.handle('auth:getCurrentUser', async () => {
    //     return currentUser ? { success: true, user: currentUser } : { success: false };
    // });
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // PATIENT HANDLERS
  // ──────────────────────────────────────────────────────────────────────────────

  registerPatientHandlers() {
    ipcMain.handle('patients:getAll', async (event, filters = {}) => {
      try {
        const patients = await DatabaseService.getAllPatients(filters);
        return { success: true, patients };
      } catch (error) {
        console.error('Get patients error:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('patients:getById', async (event, id) => {
      try {
        if (!id) return { success: false, error: 'Patient ID required' };
        const patient = await DatabaseService.getPatientById(id);
        return patient
          ? { success: true, patient }
          : { success: false, error: 'Patient not found' };
      } catch (error) {
        console.error('Get patient error:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('patients:create', async (event, patientData) => {
      try {
        const required = ['first_name', 'last_name', 'dob', 'gender'];
        for (const f of required) {
          if (!patientData[f]) return { success: false, error: `${f} required` };
        }

        const patient = await DatabaseService.createPatient(patientData);
        if (currentUser?.id) {
          await DatabaseService.logActivity(
            currentUser.id,
            'create',
            'patient',
            patient.id,
            `Patient ${patient.first_name} ${patient.last_name} created`
          );
        }
        return { success: true, patient };
      } catch (error) {
        console.error('Create patient error:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('patients:update', async (event, { id, patientData }) => {
      try {
        if (!id) return { success: false, error: 'Patient ID required' };
        const patient = await DatabaseService.updatePatient(id, patientData);
        if (currentUser?.id) {
          await DatabaseService.logActivity(
            currentUser.id,
            'update',
            'patient',
            id,
            `Patient ${patient.first_name} ${patient.last_name} updated`
          );
        }
        return { success: true, patient };
      } catch (error) {
        console.error('Update patient error:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('patients:delete', async (event, id) => {
      try {
        if (!id) return { success: false, error: 'Patient ID required' };
        const result = await DatabaseService.deletePatient(id);
        if (result.success && currentUser?.id) {
          await DatabaseService.logActivity(
            currentUser.id,
            'delete',
            'patient',
            id,
            `Patient ${id} deleted`
          );
        }
        return result;
      } catch (error) {
        console.error('Delete patient error:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('patients:search', async (event, searchTerm) => {
      try {
        const patients = await DatabaseService.getAllPatients({ search: searchTerm });
        return { success: true, patients };
      } catch (error) {
        console.error('Search patients error:', error);
        return { success: false, error: error.message };
      }
    });
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // TEST HANDLERS (THIS WAS YOUR ERROR SOURCE)
  // ──────────────────────────────────────────────────────────────────────────────

  registerTestHandlers() {
    ipcMain.handle('tests:getAll', async (event, filters = {}) => {
      try {
        const tests = await DatabaseService.getAllTests(filters);
        return { success: true, tests };
      } catch (error) {
        console.error('Get tests error:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('tests:getById', async (event, id) => {
      try {
        if (!id) return { success: false, error: 'Test ID required' };
        const test = await DatabaseService.getTestById(id);
        return test
          ? { success: true, test }
          : { success: false, error: 'Test not found' };
      } catch (error) {
        console.error('Get test error:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('tests:create', async (event, testData) => {
      try {
        const required = ['patient_name', 'machine_type', 'eye', 'raw_data'];
        for (const f of required) {
          if (!testData[f]) return { success: false, error: `${f} required` };
        }

        const test = await DatabaseService.createTest(testData);
        BrowserWindow.getAllWindows().forEach(w => w.webContents.send('data:update', { table: 'tests', action: 'create', record: test }));
        if (currentUser?.id) {
          await DatabaseService.logActivity(
            currentUser.id,
            'create',
            'test',
            test.id,
            `Test created for patient ${testData.patient_name}`
          );
        }
        return { success: true, test };
      } catch (error) {
        console.error('Create test error:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('tests:update', async (event, { id, testData }) => {
      try {
        if (!id) return { success: false, error: 'Test ID required' };
        const test = await DatabaseService.updateTest(id, testData);
        BrowserWindow.getAllWindows().forEach(w => w.webContents.send('data:update', { table: 'tests', action: 'update', record: test }));
        if (currentUser?.id) {
          await DatabaseService.logActivity(
            currentUser.id,
            'update',
            'test',
            id,
            `Test ${id} updated`
          );
        }
        return { success: true, test };
      } catch (error) {
        console.error('Update test error:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('tests:delete', async (event, id) => {
      try {
        if (!id) return { success: false, error: 'Test ID required' };
        const result = await DatabaseService.deleteTest(id);
        if (result?.success) {
          BrowserWindow.getAllWindows().forEach(w => w.webContents.send('data:update', { table: 'tests', action: 'delete', recordId: id }));
          if (currentUser?.id) {
            await DatabaseService.logActivity(
              currentUser.id,
              'delete',
              'test',
              id,
              `Test ${id} deleted`
            );
          }
        }
        return result;
      } catch (error) {
        console.error('Delete test error:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('tests:getByPatient', async (event, patientId) => {
      try {
        if (!patientId) return { success: false, error: 'Patient ID required' };
        const tests = await DatabaseService.getAllTests({ patientId });
        return { success: true, tests };
      } catch (error) {
        console.error('Get patient tests error:', error);
        return { success: false, error: error.message };
      }
    });
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // REPORT, INVENTORY, ADMIN, FILE, CHAT, PRESENCE, SETTINGS, SYSTEM, WINDOW
  // (Kept complete as per your original — no changes needed here)
  // ──────────────────────────────────────────────────────────────────────────────

  registerReportHandlers() {
    ipcMain.handle('reports:getAll', async (event, filters = {}) => {
      try {
        const reports = await DatabaseService.getAllReports(filters);
        return { success: true, reports };
      } catch (error) {
        console.error('Get reports error:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('reports:getById', async (event, id) => {
      try {
        if (!id) return { success: false, error: 'Report ID required' };
        const report = await DatabaseService.getReportById(id);
        return report
          ? { success: true, report }
          : { success: false, error: 'Report not found' };
      } catch (error) {
        console.error('Get report error:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('reports:generate', async (event, { patientId, testIds, title, reportType }) => {
      try {
        if (!patientId) return { success: false, error: 'Patient ID required' };

        const patient = await DatabaseService.getPatientById(patientId);
        if (!patient) return { success: false, error: 'Patient not found' };

        let testsData = [];
        if (testIds?.length) {
          for (const tid of testIds) {
            const t = await DatabaseService.getTestById(tid);
            if (t) testsData.push(t);
          }
        } else {
          testsData = await DatabaseService.getAllTests({ patientId });
        }

        const pdfResult = await FileService.generatePatientReport(patient, testsData);
        if (!pdfResult.success) return { success: false, error: pdfResult.error };

        const reportData = {
          patient_id: patientId,
          report_file: pdfResult.pdfData,
          report_type: reportType || 'visual_field_report',
          title: title || `Report for ${patient.first_name} ${patient.last_name}`
        };

        const report = await DatabaseService.createReport(reportData);
        return { success: true, report, fileName: pdfResult.fileName };
      } catch (error) {
        console.error('Generate report error:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('reports:export', async (event, { reportId, format }) => {
      try {
        if (!reportId) return { success: false, error: 'Report ID required' };
        const report = await DatabaseService.getReportById(reportId);
        if (!report) return { success: false, error: 'Report not found' };

        const saveResult = await FileService.saveFile({
          title: 'Export Report',
          defaultPath: `${report.patient_identifier || 'report'}_report.pdf`,
          filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
          data: report.report_file
        });

        return saveResult;
      } catch (error) {
        console.error('Export report error:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('reports:delete', async (event, id) => {
      try {
        if (!id) return { success: false, error: 'Report ID required' };
        return await DatabaseService.deleteReport(id);
      } catch (error) {
        console.error('Delete report error:', error);
        return { success: false, error: error.message };
      }
    });
  }

  registerInventoryHandlers() {
    ipcMain.handle('inventory:getAll', async (event, filters = {}) => {
      try {
        const items = await DatabaseService.getAllInventoryItems(filters);
        return { success: true, items };
      } catch (error) {
        console.error('Get inventory error:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('inventory:getById', async (event, id) => {
      try {
        if (!id) return { success: false, error: 'Item ID required' };
        const item = await DatabaseService.getInventoryItemById(id);
        return item ? { success: true, item } : { success: false, error: 'Item not found' };
      } catch (error) {
        console.error('Get inventory item error:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('inventory:create', async (event, itemData) => {
      try {
        const item = await DatabaseService.createInventoryItem(itemData);
        if (currentUser?.id) {
          await DatabaseService.logActivity(
            currentUser.id,
            'create',
            'inventory',
            item.id,
            `Inventory item ${item.item_name} created`
          );
        }
        BrowserWindow.getAllWindows().forEach(w => w.webContents.send('data:update', { table: 'inventory', action: 'create', record: item }));
        return { success: true, item };
      } catch (error) {
        console.error('Create inventory error:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('inventory:update', async (event, { id, itemData }) => {
      try {
        if (!id) return { success: false, error: 'Item ID required' };
        const item = await DatabaseService.updateInventoryItem(id, itemData);
        if (currentUser?.id) {
          await DatabaseService.logActivity(
            currentUser.id,
            'update',
            'inventory',
            id,
            `Inventory item ${id} updated`
          );
        }
        BrowserWindow.getAllWindows().forEach(w => w.webContents.send('data:update', { table: 'inventory', action: 'update', record: item }));
        return { success: true, item };
      } catch (error) {
        console.error('Update inventory error:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('inventory:delete', async (event, id) => {
      try {
        if (!id) return { success: false, error: 'Item ID required' };
        const result = await DatabaseService.deleteInventoryItem(id);
        if (result.success && currentUser?.id) {
          await DatabaseService.logActivity(
            currentUser.id,
            'delete',
            'inventory',
            id,
            `Inventory item ${id} deleted`
          );
        }
        if (result.success) {
          BrowserWindow.getAllWindows().forEach(w => w.webContents.send('data:update', { table: 'inventory', action: 'delete', recordId: id }));
        }
        return result;
      } catch (error) {
        console.error('Delete inventory error:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('inventory:updateQuantity', async (event, { id, quantity, userId, notes }) => {
      try {
        if (!id || typeof quantity !== 'number') return { success: false, error: 'Item ID and quantity required' };
        const item = await DatabaseService.updateInventoryQuantity(id, quantity, userId, notes);
        if (userId) {
          await DatabaseService.logActivity(
            userId,
            'update',
            'inventory',
            id,
            `Inventory quantity updated to ${quantity}`
          );
        }
        BrowserWindow.getAllWindows().forEach(w => w.webContents.send('data:update', { table: 'inventory', action: 'update', record: item }));
        return { success: true, item };
      } catch (error) {
        console.error('Update inventory quantity error:', error);
        return { success: false, error: error.message };
      }
    });
  }

  registerAdminHandlers() {
    ipcMain.handle('admin:getAllUsers', async () => {
      try {
        const users = await DatabaseService.getAllUsers();
        return { success: true, users };
      } catch (error) {
        console.error('Get all users error:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('admin:createUser', async (event, { userData, createdBy }) => {
      try {
        const dbUserData = {
          first_name: userData.firstName,
          last_name: userData.lastName,
          email: userData.email,
          password: userData.password,
          role: userData.role,
          phone_number: userData.phoneNumber || null,
          gender: userData.gender || 'other'
        };

        const required = ['first_name', 'last_name', 'email', 'password', 'role'];
        for (const field of required) {
          if (!dbUserData[field]) {
            return { success: false, error: `${field} required` };
          }
        }

        const user = await DatabaseService.createUser(dbUserData);

        if (createdBy) {
          await DatabaseService.logActivity(
            createdBy,
            'create',
            'user',
            user.id,
            `User ${user.email} created by admin`
          );
        }

        return { success: true, user };
      } catch (error) {
        console.error('Admin create user error:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('admin:updateUserStatus', async (event, { userId, isActive, updatedBy }) => {
      try {
        if (!userId) {
          return { success: false, error: 'User ID required' };
        }

        const result = await DatabaseService.updateUserStatus(userId, isActive);

        if (updatedBy) {
          await DatabaseService.logActivity(
            updatedBy,
            'update',
            'user',
            userId,
            `User status changed to ${isActive ? 'active' : 'inactive'}`
          );
        }

        return { success: true, ...result };
      } catch (error) {
        console.error('Admin update user status error:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('admin:updateUser', async (event, { userId, userData, updatedBy }) => {
      try {
        if (!userId) {
          return { success: false, error: 'User ID required' };
        }

        const dbUserData = {
          first_name: userData.first_name || userData.firstName,
          last_name: userData.last_name || userData.lastName,
          email: userData.email,
          role: userData.role,
          phone_number: userData.phone_number || userData.phoneNumber,
          gender: userData.gender,
          password: userData.password
        };

        const updatedUser = await DatabaseService.updateUser(userId, dbUserData);

        if (!updatedUser) {
          return { success: false, error: 'User not found or no changes applied' };
        }

        if (updatedBy) {
          await DatabaseService.logActivity(
            updatedBy,
            'update',
            'user',
            userId,
            `User ${updatedUser.email} updated by admin`
          );
        }

        return { success: true, user: updatedUser };
      } catch (error) {
        console.error('Admin update user error:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('admin:deleteUser', async (event, { userId, deletedBy }) => {
      try {
        if (!userId) {
          return { success: false, error: 'User ID required' };
        }

        const result = await DatabaseService.deleteUser(userId);

        if (result.success && deletedBy) {
          await DatabaseService.logActivity(
            deletedBy,
            'delete',
            'user',
            userId,
            `User ${userId} deleted by admin`
          );
        }

        return result;
      } catch (error) {
        console.error('Admin delete user error:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('admin:getActivityLogs', async (event, filters = {}) => {
      try {
        const logs = await DatabaseService.getActivityLogs(filters);
        return { success: true, logs };
      } catch (error) {
        console.error('Get activity logs error:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('admin:getActivityStats', async () => {
      try {
        const stats = await DatabaseService.getDashboardStats();
        return { success: true, stats };
      } catch (error) {
        console.error('Get activity stats error:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('admin:logActivity', async (event, { userId, actionType, entityType, entityId, description, ipAddress, userAgent }) => {
      try {
        if (!userId || !actionType || !entityType || !description) {
          return { success: false, error: 'Missing required activity fields' };
        }
        const activity = await DatabaseService.logActivity(userId, actionType, entityType, entityId, description, ipAddress, userAgent);
        return { success: true, activity };
      } catch (error) {
        console.error('Log activity error:', error);
        return { success: false, error: error.message };
      }
    });
  }

  registerFileHandlers() {
    ipcMain.handle('file:select', async (event, options) => {
      try {
        return await FileService.selectFile(options);
      } catch (error) {
        console.error('File select error:', error);
        return { success: false, error: error.message };
      }
    });
  }

  registerChatHandlers() {
    ipcMain.handle('chat:getMessages', async (event, data = {}) => {
      try {
        const { userId, otherUserId, search = '', limit = 50, offset = 0 } = data || {};
        if (!userId) return { success: false, error: 'User ID required' };
        const messages = await DatabaseService.getMessages(userId, otherUserId, search, limit, offset);
        return { success: true, messages };
      } catch (error) {
        console.error('Get messages error:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('chat:sendMessage', async (event, senderId, receiverId, messageText, attachment, replyToId) => {
      try {
        const msg = await DatabaseService.sendMessage(senderId, receiverId, messageText, attachment, replyToId);
        BrowserWindow.getAllWindows().forEach(w => w.webContents.send('new-message', msg));
        return { success: true, message: msg };
      } catch (error) {
        console.error('Send message error:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('chat:markMessageRead', async (event, data = {}) => {
      try {
        const { messageId, userId } = data || {};
        if (!messageId || !userId) return { success: false, error: 'messageId and userId required' };
        const res = await DatabaseService.markMessageAsRead(messageId, userId);
        return res;
      } catch (error) {
        console.error('Mark message read error:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('chat:markAllAsRead', async (event, data = {}) => {
      try {
        const { userId, otherUserId } = data || {};
        if (!userId || !otherUserId) return { success: false, error: 'userId and otherUserId required' };
        const res = await DatabaseService.markAllMessagesAsRead(userId, otherUserId);
        return res;
      } catch (error) {
        console.error('Mark all as read error:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('chat:getUnreadCount', async (event, userId) => {
      try {
        if (!userId) return { success: false, error: 'User ID required' };
        const count = await DatabaseService.getUnreadMessageCount(userId);
        return { success: true, count };
      } catch (error) {
        console.error('Get unread count error:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('chat:deleteMessage', async (event, messageId) => {
      try {
        const user = currentUser;
        if (!messageId || !user?.id) return { success: false, error: 'messageId and current user required' };
        const res = await DatabaseService.deleteMessage(messageId, user.id);
        return res;
      } catch (error) {
        console.error('Delete message error:', error);
        return { success: false, error: error.message };
      }
    });
  }

  registerPresenceHandlers() {
    ipcMain.handle('presence:setOnline', async (event, { userId }) => {
      try {
        await DatabaseService.setUserOnline(userId);
        return { success: true };
      } catch (error) {
        console.error('Set online error:', error);
        return { success: false, error: error.message };
      }
    });
    ipcMain.handle('presence:setOffline', async (event, userId) => {
      try {
        await DatabaseService.setUserOffline(userId);
        return { success: true };
      } catch (error) {
        console.error('Set offline error:', error);
        return { success: false, error: error.message };
      }
    });
    ipcMain.handle('presence:getOnlineUsers', async () => {
      try {
        const users = await DatabaseService.getOnlineUsers();
        return { success: true, users };
      } catch (error) {
        console.error('Get online users error:', error);
        return { success: false, error: error.message };
      }
    });
    ipcMain.handle('presence:getUsersWithPresence', async () => {
      try {
        const users = await DatabaseService.getUsersWithPresence();
        return { success: true, users };
      } catch (error) {
        console.error('Get users with presence error:', error);
        return { success: false, error: error.message };
      }
    });
    ipcMain.handle('presence:syncToSupabase', async () => {
      try {
        const result = await SyncService.syncAll();
        return result;
      } catch (error) {
        console.error('Sync to Supabase error:', error);
        return { success: false, error: error.message };
      }
    });
  }

  registerSettingsHandlers() {
    ipcMain.handle('settings:get', async (event, key) => {
      try {
        const value = await DatabaseService.getSetting(key);
        return { success: true, value };
      } catch (error) {
        console.error('Get setting error:', error);
        return { success: false, error: error.message };
      }
    });
  }

  registerSystemHandlers() {
    ipcMain.handle('system:healthCheck', async () => {
      return { success: true, status: 'healthy', timestamp: new Date().toISOString() };
    });
    ipcMain.handle('system:checkOnline', async () => {
      try {
        const db = await DatabaseService.getDatabase();
        await db.get('SELECT 1 as ok');

        const dns = require('dns');
        const checkConnection = new Promise(resolve => {
          dns.lookup('google.com', err => resolve(!err));
        });

        const timeout = new Promise(resolve => {
          setTimeout(() => resolve(false), 5000);
        });

        const online = await Promise.race([checkConnection, timeout]);
        return { success: true, online, timestamp: new Date().toISOString() };
      } catch (error) {
        return { success: false, online: false, error: error.message, timestamp: new Date().toISOString() };
      }
    });
  }

  registerWindowHandlers() {
    ipcMain.handle('window:openMain', async () => {
      try {
        const win = BrowserWindow.getFocusedWindow();
        if (win) {
          const isDev = process.env.NODE_ENV === 'development';
          if (isDev) {
            await win.loadURL('http://localhost:3000/');
          } else {
            await win.loadFile(path.join(__dirname, '../../dist/index.html'));
          }
        }
        return { success: true };
      } catch (error) {
        console.error('Open main window error:', error);
        return { success: false, error: error.message };
      }
    });
  }

  registerDashboardHandlers() {
    ipcMain.handle('dashboard:getStats', async () => {
      try {
        const stats = await DatabaseService.getDashboardStats();
        return { success: true, stats };
      } catch (error) {
        console.error('Get dashboard stats error:', error);
        return { success: false, error: error.message };
      }
    });
  }
}

module.exports = IPCHandlers;
