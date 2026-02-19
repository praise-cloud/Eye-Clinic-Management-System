const { ipcMain, BrowserWindow, app } = require('electron');
const path = require('path');
const fs = require('fs-extra');
const { v4: uuidv4 } = require('uuid');
const DatabaseService = require('../../src/services/DatabaseService');
const FileService = require('../../src/services/FileService');

const mapDatabaseError = (error, context = {}) => {
  const rawMessage = String(error && error.message ? error.message : '').trim();
  const base = {
    code: 'error.generic',
    table: null,
    column: null,
    raw: rawMessage,
    message: rawMessage || 'An unexpected error occurred while accessing the database.'
  };

  if (!rawMessage || !rawMessage.includes('SQLITE_CONSTRAINT')) {
    return base;
  }

  let table = null;
  let column = null;

  const uniqueMatch = rawMessage.match(/UNIQUE constraint failed: ([\w_]+)\.([\w_]+)/i);
  if (uniqueMatch) {
    table = uniqueMatch[1];
    column = uniqueMatch[2];
    const key = `${table}.${column}`;
    let userMessage = 'This value is already used. Please choose a different value.';

    if (key === 'users.email') {
      userMessage = 'A user with this email already exists. Please use a different email address.';
    } else if (key === 'patients.patient_id') {
      userMessage = 'A patient with this ID already exists. Please use a different patient ID.';
    } else if (key === 'inventory.item_code') {
      userMessage = 'An inventory item with this Unit Code already exists. Please use a different code.';
    } else if (key === 'pharmacy_drugs.drug_code') {
      userMessage = 'A drug with this code already exists in the pharmacy registry.';
    } else if (key === 'settings.key') {
      userMessage = 'A setting with this key already exists. Please use a different key name.';
    }

    return {
      code: `constraint.unique.${table}.${column}`,
      table,
      column,
      raw: rawMessage,
      message: userMessage
    };
  }

  if (/FOREIGN KEY constraint failed/i.test(rawMessage)) {
    let userMessage = 'This record is linked to other data and cannot be changed.';
    if (context && context.entity === 'patient' && context.action === 'delete') {
      userMessage = 'This patient has related tests or reports and cannot be deleted.';
    } else if (context && context.entity === 'user' && context.action === 'delete') {
      userMessage = 'This user is linked to other records and cannot be deleted.';
    } else if (context && context.entity === 'inventory' && context.action === 'delete') {
      userMessage = 'This inventory item is linked to other records and cannot be deleted.';
    }
    return {
      code: 'constraint.foreign_key',
      table: null,
      column: null,
      raw: rawMessage,
      message: userMessage
    };
  }

  const notNullMatch = rawMessage.match(/NOT NULL constraint failed: ([\w_]+)\.([\w_]+)/i);
  if (notNullMatch) {
    table = notNullMatch[1];
    column = notNullMatch[2];
    const label = column.replace(/_/g, ' ');
    const key = `${table}.${column}`;
    let userMessage = `The field "${label}" is required. Please fill it in before saving.`;

    if (key === 'inventory.item_name') {
      userMessage = 'Description is required. Please fill it in before saving.';
    }

    return {
      code: `constraint.not_null.${table}.${column}`,
      table,
      column,
      raw: rawMessage,
      message: userMessage
    };
  }

  const checkMatch = rawMessage.match(/CHECK constraint failed/i);
  if (checkMatch) {
    let userMessage = 'One of the values is not allowed. Please review the fields and try again.';
    if (rawMessage.includes('users.role')) {
      userMessage = 'The selected role is not valid. Choose admin, doctor, or assistant.';
    } else if (rawMessage.includes('inventory.category')) {
      userMessage = 'The selected category is not valid. Choose a valid inventory category.';
    } else if (rawMessage.includes('inventory.status')) {
      userMessage = 'The selected status is not valid. Choose a valid inventory status.';
    } else if (rawMessage.includes('patients.gender')) {
      userMessage = 'The selected gender is not valid.';
    } else if (rawMessage.includes('pharmacy_drugs.drug_form')) {
      userMessage = 'The selected presentation is not valid. Choose a valid drug form.';
    } else if (rawMessage.includes('pharmacy_drugs.status')) {
      userMessage = 'The selected status is not valid for this drug.';
    }
    return {
      code: 'constraint.check',
      table: null,
      column: null,
      raw: rawMessage,
      message: userMessage
    };
  }

  return base;
};

const buildErrorResponse = (error, context = {}, extra = {}) => {
  const mapped = mapDatabaseError(error, context);
  return {
    success: false,
    error: mapped.message,
    errorCode: mapped.code,
    errorDetails: mapped,
    ...extra
  };
};

let currentUser = null; // Centralized user state in main process

class IPCHandlers {
  constructor() {
    this.registerSettingsHandlers();
    this.registerAuthHandlers();
    this.registerPatientHandlers();
    this.registerTestHandlers();
    this.registerReportHandlers();
    this.registerInventoryHandlers();
    this.registerPharmacyHandlers();
    this.registerAdminHandlers();
    this.registerFileHandlers();
    this.registerChatHandlers();
    this.registerPresenceHandlers();
    this.registerSystemHandlers();
    this.registerWindowHandlers();
    this.registerDashboardHandlers();
    this.registerPrescriptionHandlers();
    this.registerNotificationHandlers();
    console.log('IPC handlers - All registration methods called');
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
        return buildErrorResponse(error, { scope: 'auth', action: 'logout' });
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
        return buildErrorResponse(error, { scope: 'auth', action: 'isFirstRun' }, { isFirstRun: true });
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
        return buildErrorResponse(error, { scope: 'auth', action: 'login', entity: 'user' });
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

        BrowserWindow.getAllWindows().forEach(w => w.webContents.send('data:update', { table: 'users', action: 'create', record: userWithName }));
        return { success: true, user: userWithName };
      } catch (error) {
        console.error('Setup error:', error);
        return buildErrorResponse(error, { scope: 'auth', action: 'completeSetup', entity: 'user' });
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
        BrowserWindow.getAllWindows().forEach(w => w.webContents.send('data:update', { table: 'users', action: 'create', record: user }));
        return { success: true, user };
      } catch (error) {
        console.error('Create user error:', error);
        return buildErrorResponse(error, { scope: 'auth', action: 'createUser', entity: 'user' });
      }
    });

    ipcMain.handle('auth:getAllUsers', async () => {
      try {
        const users = await DatabaseService.getAllUsers();
        return { success: true, users };
      } catch (error) {
        console.error('Get all users error:', error);
        return buildErrorResponse(error, { scope: 'auth', action: 'getAllUsers', entity: 'user' });
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
        return buildErrorResponse(error, { scope: 'patients', action: 'getAll', entity: 'patient' });
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
        return buildErrorResponse(error, { scope: 'patients', action: 'getById', entity: 'patient' });
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
        return buildErrorResponse(error, { scope: 'patients', action: 'create', entity: 'patient' });
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
        return buildErrorResponse(error, { scope: 'patients', action: 'update', entity: 'patient' });
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
        return buildErrorResponse(error, { scope: 'patients', action: 'delete', entity: 'patient' });
      }
    });

    ipcMain.handle('patients:search', async (event, searchTerm) => {
      try {
        const patients = await DatabaseService.getAllPatients({ search: searchTerm });
        return { success: true, patients };
      } catch (error) {
        console.error('Search patients error:', error);
        return buildErrorResponse(error, { scope: 'patients', action: 'search', entity: 'patient' });
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
        return buildErrorResponse(error, { scope: 'tests', action: 'getAll', entity: 'test' });
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
        return buildErrorResponse(error, { scope: 'tests', action: 'getById', entity: 'test' });
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
        return buildErrorResponse(error, { scope: 'tests', action: 'create', entity: 'test' });
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
        return buildErrorResponse(error, { scope: 'tests', action: 'update', entity: 'test' });
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
        return buildErrorResponse(error, { scope: 'tests', action: 'delete', entity: 'test' });
      }
    });

    ipcMain.handle('tests:getByPatient', async (event, patientId) => {
      try {
        if (!patientId) return { success: false, error: 'Patient ID required' };
        const tests = await DatabaseService.getAllTests({ patientId });
        return { success: true, tests };
      } catch (error) {
        console.error('Get patient tests error:', error);
        return buildErrorResponse(error, { scope: 'tests', action: 'getByPatient', entity: 'test' });
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
        return buildErrorResponse(error, { scope: 'reports', action: 'getAll', entity: 'report' });
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
        return buildErrorResponse(error, { scope: 'reports', action: 'getById', entity: 'report' });
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
        return buildErrorResponse(error, { scope: 'reports', action: 'generate', entity: 'report' });
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
        return buildErrorResponse(error, { scope: 'reports', action: 'export', entity: 'report' });
      }
    });

    ipcMain.handle('reports:delete', async (event, id) => {
      try {
        if (!id) return { success: false, error: 'Report ID required' };
        return await DatabaseService.deleteReport(id);
      } catch (error) {
        console.error('Delete report error:', error);
        return buildErrorResponse(error, { scope: 'reports', action: 'delete', entity: 'report' });
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
        return buildErrorResponse(error, { scope: 'inventory', action: 'getAll', entity: 'inventory' });
      }
    });

    ipcMain.handle('inventory:getById', async (event, id) => {
      try {
        if (!id) return { success: false, error: 'Item ID required' };
        const item = await DatabaseService.getInventoryItemById(id);
        return item ? { success: true, item } : { success: false, error: 'Item not found' };
      } catch (error) {
        console.error('Get inventory item error:', error);
        return buildErrorResponse(error, { scope: 'inventory', action: 'getById', entity: 'inventory' });
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
        return buildErrorResponse(error, { scope: 'inventory', action: 'create', entity: 'inventory' });
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
        return buildErrorResponse(error, { scope: 'inventory', action: 'update', entity: 'inventory' });
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
        return buildErrorResponse(error, { scope: 'inventory', action: 'delete', entity: 'inventory' });
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
        return buildErrorResponse(error, { scope: 'inventory', action: 'updateQuantity', entity: 'inventory' });
      }
    });
  }

  registerPharmacyHandlers() {
    ipcMain.handle('pharmacy:getDrugs', async (event, filters = {}) => {
      try {
        const drugs = await DatabaseService.getAllPharmacyDrugs(filters);
        return { success: true, drugs };
      } catch (error) {
        console.error('Get pharmacy drugs error:', error);
        return buildErrorResponse(error, { scope: 'pharmacy', action: 'getDrugs', entity: 'pharmacy_drug' });
      }
    });

    ipcMain.handle('pharmacy:getDrugById', async (event, id) => {
      try {
        if (!id) return { success: false, error: 'Drug ID required' };
        const drug = await DatabaseService.getPharmacyDrugById(id);
        return drug
          ? { success: true, drug }
          : { success: false, error: 'Drug not found' };
      } catch (error) {
        console.error('Get pharmacy drug error:', error);
        return buildErrorResponse(error, { scope: 'pharmacy', action: 'getDrugById', entity: 'pharmacy_drug' });
      }
    });

    ipcMain.handle('pharmacy:createDrug', async (event, drugData) => {
      try {
        const required = ['drug_code', 'drug_name', 'drug_form', 'strength', 'pack_size', 'unit_price'];
        for (const f of required) {
          if (!drugData[f]) return { success: false, error: `${f} required` };
        }

        const drug = await DatabaseService.createPharmacyDrug(drugData);
        if (currentUser?.id) {
          await DatabaseService.logActivity(
            currentUser.id,
            'create',
            'pharmacy_drug',
            drug.id,
            `Pharmacy drug ${drug.drug_name} created`
          );
        }
        BrowserWindow.getAllWindows().forEach(w =>
          w.webContents.send('data:update', { table: 'pharmacy', action: 'create', record: drug })
        );
        return { success: true, drug };
      } catch (error) {
        console.error('Create pharmacy drug error:', error);
        return buildErrorResponse(error, { scope: 'pharmacy', action: 'createDrug', entity: 'pharmacy_drug' });
      }
    });

    ipcMain.handle('pharmacy:updateDrug', async (event, { id, drugData }) => {
      try {
        if (!id) return { success: false, error: 'Drug ID required' };
        const drug = await DatabaseService.updatePharmacyDrug(id, drugData);
        if (currentUser?.id) {
          await DatabaseService.logActivity(
            currentUser.id,
            'update',
            'pharmacy_drug',
            id,
            `Pharmacy drug ${id} updated`
          );
        }
        BrowserWindow.getAllWindows().forEach(w =>
          w.webContents.send('data:update', { table: 'pharmacy', action: 'update', record: drug })
        );
        return { success: true, drug };
      } catch (error) {
        console.error('Update pharmacy drug error:', error);
        return buildErrorResponse(error, { scope: 'pharmacy', action: 'updateDrug', entity: 'pharmacy_drug' });
      }
    });

    ipcMain.handle('pharmacy:deleteDrug', async (event, id) => {
      try {
        if (!id) return { success: false, error: 'Drug ID required' };
        const result = await DatabaseService.deletePharmacyDrug(id);
        if (result.success && currentUser?.id) {
          await DatabaseService.logActivity(
            currentUser.id,
            'delete',
            'pharmacy_drug',
            id,
            `Pharmacy drug ${id} deleted`
          );
        }
        if (result.success) {
          BrowserWindow.getAllWindows().forEach(w =>
            w.webContents.send('data:update', { table: 'pharmacy', action: 'delete', recordId: id })
          );
        }
        return result;
      } catch (error) {
        console.error('Delete pharmacy drug error:', error);
        return buildErrorResponse(error, { scope: 'pharmacy', action: 'deleteDrug', entity: 'pharmacy_drug' });
      }
    });

    ipcMain.handle('pharmacy:dispense', async (event, { drugId, patientId, quantity, notes }) => {
      try {
        if (!drugId || !patientId) return { success: false, error: 'Drug and patient are required' };
        const qtyNumber = Number(quantity || 0);
        if (!Number.isFinite(qtyNumber) || qtyNumber <= 0) {
          return { success: false, error: 'Quantity must be greater than zero' };
        }

        const userId = currentUser?.id || null;
        const result = await DatabaseService.createPharmacyDispensation({
          drugId,
          patientId,
          quantity: qtyNumber,
          userId,
          notes: notes || null
        });

        if (userId) {
          await DatabaseService.logActivity(
            userId,
            'create',
            'pharmacy_dispensation',
            result.dispensation.id,
            `Pharmacy dispensation recorded for drug ${drugId}`
          );
        }

        BrowserWindow.getAllWindows().forEach(w => {
          w.webContents.send('data:update', { table: 'pharmacy', action: 'dispense', record: result.dispensation });
          if (result.linkedPrescriptionId) {
            w.webContents.send('data:update', { table: 'prescriptions', action: 'update', recordId: result.linkedPrescriptionId, status: 'dispensed' });
          }
        });

        return { success: true, dispensation: result.dispensation };
      } catch (error) {
        console.error('Pharmacy dispense error:', error);
        return buildErrorResponse(error, { scope: 'pharmacy', action: 'dispense', entity: 'pharmacy_dispensation' });
      }
    });
  }

  registerPrescriptionHandlers() {
    ipcMain.handle('prescriptions:create', async (event, prescriptionData) => {
      try {
        const required = ['patientId', 'doctorId', 'drugId', 'quantity'];
        for (const f of required) {
          if (!prescriptionData[f]) return { success: false, error: `${f} required` };
        }

        const prescription = await DatabaseService.createPrescription(prescriptionData);

        // Notify assistants about the new prescription
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

          // Trigger real-time notification
          BrowserWindow.getAllWindows().forEach(w =>
            w.webContents.send('notifications:new', { userId: assistant.id })
          );
        }

        BrowserWindow.getAllWindows().forEach(w =>
          w.webContents.send('data:update', { table: 'prescriptions', action: 'create', record: prescription })
        );

        return { success: true, prescription };
      } catch (error) {
        console.error('Create prescription error:', error);
        return buildErrorResponse(error, { scope: 'prescriptions', action: 'create', entity: 'prescription' });
      }
    });

    ipcMain.handle('prescriptions:createMultiple', async (event, { patientId, doctorId, items }) => {
      try {
        if (!patientId || !doctorId || !items || !Array.isArray(items)) {
          return { success: false, error: 'patientId, doctorId and items array required' };
        }

        const result = await DatabaseService.createMultiplePrescriptions(patientId, doctorId, items);

        // Notify assistants about the new prescriptions
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

            BrowserWindow.getAllWindows().forEach(w =>
              w.webContents.send('notifications:new', { userId: assistant.id })
            );
          }
        }

        BrowserWindow.getAllWindows().forEach(w =>
          w.webContents.send('data:update', { table: 'prescriptions', action: 'createMultiple', records: result.prescriptions })
        );

        return result;
      } catch (error) {
        console.error('Create multiple prescriptions error:', error);
        return buildErrorResponse(error, { scope: 'prescriptions', action: 'createMultiple', entity: 'prescription' });
      }
    });

    ipcMain.handle('prescriptions:getById', async (event, id) => {
      try {
        if (!id) return { success: false, error: 'Prescription ID required' };
        const prescription = await DatabaseService.getPrescriptionById(id);
        return { success: true, prescription };
      } catch (error) {
        console.error('Get prescription by ID error:', error);
        return buildErrorResponse(error, { scope: 'prescriptions', action: 'getById', entity: 'prescription' });
      }
    });

    ipcMain.handle('prescriptions:getByPatient', async (event, patientId) => {
      try {
        if (!patientId) return { success: false, error: 'Patient ID required' };
        const prescriptions = await DatabaseService.getPrescriptionsByPatient(patientId);
        return { success: true, prescriptions };
      } catch (error) {
        console.error('Get patient prescriptions error:', error);
        return buildErrorResponse(error, { scope: 'prescriptions', action: 'getByPatient', entity: 'prescription' });
      }
    });

    ipcMain.handle('prescriptions:getPending', async () => {
      try {
        const prescriptions = await DatabaseService.getPendingPrescriptions();
        return { success: true, prescriptions };
      } catch (error) {
        console.error('Get pending prescriptions error:', error);
        return buildErrorResponse(error, { scope: 'prescriptions', action: 'getPending', entity: 'prescription' });
      }
    });

    ipcMain.handle('prescriptions:updateStatus', async (event, { id, status, userId }) => {
      try {
        if (!id || !status) return { success: false, error: 'ID and status required' };
        const result = await DatabaseService.updatePrescriptionStatus(id, status, userId);

        BrowserWindow.getAllWindows().forEach(w => {
          w.webContents.send('data:update', { table: 'prescriptions', action: 'update', recordId: id, status });
          // If dispensed, also notify pharmacy listeners to refresh stock levels
          if (status === 'dispensed') {
            w.webContents.send('data:update', { table: 'pharmacy', action: 'update' });
          }
        });

        return { success: true, ...result };
      } catch (error) {
        console.error('Update prescription status error:', error);
        return buildErrorResponse(error, { scope: 'prescriptions', action: 'updateStatus', entity: 'prescription' });
      }
    });
  }

  registerNotificationHandlers() {
    ipcMain.handle('notifications:getAll', async (event, userId) => {
      try {
        const id = userId || currentUser?.id;
        if (!id) return { success: false, error: 'User ID required' };
        const notifications = await DatabaseService.getNotificationsByUser(id);
        return { success: true, notifications };
      } catch (error) {
        console.error('Get notifications error:', error);
        return buildErrorResponse(error, { scope: 'notifications', action: 'getAll', entity: 'notification' });
      }
    });

    ipcMain.handle('notifications:markRead', async (event, id) => {
      try {
        if (!id) return { success: false, error: 'Notification ID required' };
        const result = await DatabaseService.markNotificationRead(id);
        return { success: true, ...result };
      } catch (error) {
        console.error('Mark notification read error:', error);
        return buildErrorResponse(error, { scope: 'notifications', action: 'markRead', entity: 'notification' });
      }
    });

    ipcMain.handle('notifications:markAllRead', async (event, userId) => {
      try {
        const id = userId || currentUser?.id;
        if (!id) return { success: false, error: 'User ID required' };
        await DatabaseService.markAllNotificationsRead(id);
        return { success: true };
      } catch (error) {
        console.error('Mark all notifications read error:', error);
        return buildErrorResponse(error, { scope: 'notifications', action: 'markAllRead', entity: 'notification' });
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
        return buildErrorResponse(error, { scope: 'admin', action: 'getAllUsers', entity: 'user' });
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

        BrowserWindow.getAllWindows().forEach(w => w.webContents.send('data:update', { table: 'users', action: 'create', record: user }));
        return { success: true, user };
      } catch (error) {
        console.error('Admin create user error:', error);
        return buildErrorResponse(error, { scope: 'admin', action: 'createUser', entity: 'user' });
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

        BrowserWindow.getAllWindows().forEach(w => w.webContents.send('data:update', { table: 'users', action: 'update', userId }));
        return { success: true, ...result };
      } catch (error) {
        console.error('Admin update user status error:', error);
        return buildErrorResponse(error, { scope: 'admin', action: 'updateUserStatus', entity: 'user' });
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

        BrowserWindow.getAllWindows().forEach(w => w.webContents.send('data:update', { table: 'users', action: 'update', record: updatedUser }));
        return { success: true, user: updatedUser };
      } catch (error) {
        console.error('Admin update user error:', error);
        return buildErrorResponse(error, { scope: 'admin', action: 'updateUser', entity: 'user' });
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

        BrowserWindow.getAllWindows().forEach(w => w.webContents.send('data:update', { table: 'users', action: 'delete', userId }));
        return result;
      } catch (error) {
        console.error('Admin delete user error:', error);
        return buildErrorResponse(error, { scope: 'admin', action: 'deleteUser', entity: 'user' });
      }
    });

    ipcMain.handle('admin:getActivityLogs', async (event, filters = {}) => {
      try {
        const logs = await DatabaseService.getActivityLogs(filters);
        return { success: true, logs };
      } catch (error) {
        console.error('Get activity logs error:', error);
        return buildErrorResponse(error, { scope: 'admin', action: 'getActivityLogs' });
      }
    });

    ipcMain.handle('admin:getActivityStats', async () => {
      try {
        const stats = await DatabaseService.getDashboardStats();
        return { success: true, stats };
      } catch (error) {
        console.error('Get activity stats error:', error);
        return buildErrorResponse(error, { scope: 'admin', action: 'getActivityStats' });
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
        return buildErrorResponse(error, { scope: 'admin', action: 'logActivity' });
      }
    });
  }

  registerFileHandlers() {
    ipcMain.handle('file:select', async (event, options) => {
      try {
        return await FileService.selectFile(options);
      } catch (error) {
        console.error('File select error:', error);
        return buildErrorResponse(error, { scope: 'file', action: 'select' });
      }
    });
    ipcMain.handle('file:importDb', async (event, dbPath) => {
      try {
        if (!currentUser || String(currentUser.role || '').toLowerCase() !== 'admin') {
          return { success: false, error: 'Only admin can import databases' };
        }
        if (!dbPath || typeof dbPath !== 'string') {
          return { success: false, error: 'Database file path required' };
        }
        const result = await DatabaseService.importExternalDatabase(dbPath);
        return result;
      } catch (error) {
        console.error('Database import error:', error);
        return buildErrorResponse(error, { scope: 'file', action: 'importDb', entity: 'database' });
      }
    });

    ipcMain.handle('file:restoreBackup', async (event, filePath) => {
      try {
        if (!currentUser || String(currentUser.role || '').toLowerCase() !== 'admin') {
          return { success: false, error: 'Only admin can restore backups' };
        }
        if (!filePath || typeof filePath !== 'string') {
          return { success: false, error: 'File path required' };
        }
        const result = await DatabaseService.restoreBackup(filePath);
        return result;
      } catch (error) {
        console.error('Backup restore error:', error);
        return buildErrorResponse(error, { scope: 'file', action: 'restoreBackup', entity: 'backup' });
      }
    });

    ipcMain.handle('file:runPythonScript', async (event, data) => {
      try {
        if (!currentUser || String(currentUser.role || '').toLowerCase() !== 'admin') {
          return { success: false, error: 'Only admin can run scripts' };
        }
        const { scriptPath, args = [] } = data || {};
        if (!scriptPath || typeof scriptPath !== 'string') {
          return { success: false, error: 'Script path required' };
        }

        const { exec } = require('child_process');
        const command = `python "${scriptPath}" ${args.map(a => `"${a}"`).join(' ')}`;

        return new Promise((resolve) => {
          exec(command, (error, stdout, stderr) => {
            if (error) {
              console.error(`Python script error: ${stderr}`);
              resolve({ success: false, error: stderr || error.message });
            } else {
              console.log(`Python script output: ${stdout}`);
              resolve({ success: true, output: stdout });
            }
          });
        });
      } catch (error) {
        console.error('Python script execution error:', error);
        return buildErrorResponse(error, { scope: 'file', action: 'runPythonScript', entity: 'script' });
      }
    });

    ipcMain.handle('file:validateSQLiteFile', async (event, filePath) => {
      try {
        const fs = require('fs');
        const sqlite3 = require('sqlite3').verbose();

        if (!fs.existsSync(filePath)) {
          return { success: false, error: 'File not found' };
        }

        return new Promise((resolve) => {
          const db = new sqlite3.Database(filePath, (err) => {
            if (err) {
              resolve({ success: false, error: 'Invalid SQLite database' });
            } else {
              db.all("SELECT name FROM sqlite_master LIMIT 1", (err, rows) => {
                db.close();
                if (err) {
                  resolve({ success: false, error: 'Cannot read database' });
                } else {
                  resolve({ success: true, valid: true });
                }
              });
            }
          });
        });
      } catch (error) {
        console.error('SQLite validation error:', error);
        return { success: false, error: error.message };
      }
    });

    // Handler for automatic BAK to SQLite conversion
    ipcMain.handle('file:convertBakFileAutomatic', async (event, filePath) => {
      try {
        const { spawn } = require('child_process');
        const fs = require('fs');
        const path = require('path');

        if (!filePath || !fs.existsSync(filePath)) {
          return { success: false, error: 'File not found' };
        }

        // Generate output filename (replace .BAK with .sqlite)
        const outputPath = filePath.replace(/\.bak$/i, '.sqlite');

        // Find the Python script
        const pythonScript = path.join(__dirname, '../../scripts/restore_bak_to_sqlite.py');
        if (!fs.existsSync(pythonScript)) {
          return { success: false, error: 'Conversion script not found' };
        }

        return new Promise((resolve) => {
          const process = spawn('python', [pythonScript, filePath, outputPath]);
          let stdout = '';
          let stderr = '';

          process.stdout.on('data', (data) => {
            stdout += data.toString();
          });

          process.stderr.on('data', (data) => {
            stderr += data.toString();
          });

          process.on('close', (code) => {
            if (code === 0 && fs.existsSync(outputPath)) {
              // Verify the file is a valid SQLite database
              const sqlite3 = require('sqlite3').verbose();
              const db = new sqlite3.Database(outputPath, (err) => {
                if (err) {
                  resolve({ success: false, error: 'Conversion failed: Invalid output file' });
                } else {
                  db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
                    db.close();
                    if (err || !tables || tables.length === 0) {
                      resolve({ success: false, error: 'Conversion produced empty database' });
                    } else {
                      resolve({
                        success: true,
                        convertedPath: outputPath,
                        tables: tables.map(t => t.name),
                        message: `Successfully converted ${path.basename(filePath)} to SQLite`
                      });
                    }
                  });
                }
              });
            } else {
              resolve({ success: false, error: stderr || `Conversion failed with code ${code}` });
            }
          });

          // Timeout after 10 minutes
          setTimeout(() => {
            process.kill();
            resolve({ success: false, error: 'Conversion timeout' });
          }, 600000);
        });
      } catch (error) {
        console.error('BAK conversion error:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('file:analyzeBakFile', async (event, filePath) => {
      try {
        const fs = require('fs');
        const path = require('path');
        const sqlite3 = require('sqlite3').verbose();

        if (!filePath || typeof filePath !== 'string') {
          return { success: false, error: 'File path required' };
        }

        if (!fs.existsSync(filePath)) {
          return { success: false, error: 'File does not exist' };
        }

        // Get file info
        const stat_info = fs.statSync(filePath);
        const analysis = {
          success: true,
          file: {
            path: filePath,
            name: path.basename(filePath),
            size_bytes: stat_info.size,
            size_mb: (stat_info.size / (1024 * 1024)).toFixed(2)
          },
          format_detected: null,
          details: {},
          conversion_triggered: false,
          converted_file: null
        };

        // Check if this is a .bak file - if so, trigger automatic conversion
        const fileExt = path.extname(filePath).toLowerCase();
        if (fileExt === '.bak') {
          console.log(`BAK file detected: ${filePath}, triggering automatic conversion...`);
          try {
            const conversionResult = await event.sender.invoke('file:convertBakFileAutomatic', filePath);
            if (conversionResult.success) {
              analysis.conversion_triggered = true;
              analysis.converted_file = conversionResult.convertedPath;
              analysis.format_detected = 'SQL Server Backup (Auto-converted to SQLite)';
              analysis.details.conversion = {
                status: 'success',
                converted_path: conversionResult.convertedPath,
                message: conversionResult.message,
                tables: conversionResult.tables || []
              };
              return analysis;
            } else {
              analysis.format_detected = 'SQL Server Backup (Conversion Failed)';
              analysis.details.conversion = {
                status: 'error',
                error: conversionResult.error
              };
              return analysis;
            }
          } catch (conversionErr) {
            console.error('Conversion invocation error:', conversionErr);
            analysis.format_detected = 'SQL Server Backup (Conversion Error)';
            analysis.details.conversion = {
              status: 'error',
              error: conversionErr.message
            };
            return analysis;
          }
        }

        // Try SQLite first
        try {
          await new Promise((resolve, reject) => {
            const db = new sqlite3.Database(filePath, (err) => {
              if (err) {
                reject(err);
              } else {
                db.all("SELECT name FROM sqlite_master WHERE type='table';", (err, tables) => {
                  if (err) {
                    reject(err);
                  } else {
                    analysis.format_detected = 'SQLite Database';
                    analysis.details.sqlite = {
                      is_valid: true,
                      tables: tables.map(t => t.name),
                      table_count: tables.length
                    };
                    db.close();
                    resolve();
                  }
                });
              }
            });
          });
          return analysis;
        } catch (err) {
          // Not SQLite, try text analysis
        }

        // Try text analysis
        try {
          const content = fs.readFileSync(filePath, { encoding: 'utf-8', flag: 'r' }).substring(0, 5000);
          const lines = content.split('\n').slice(0, 50);

          analysis.details.text = {
            is_readable: true,
            line_count: lines.length,
            first_line: lines[0]?.substring(0, 200) || '',
            sample_lines: lines.slice(0, 5).map(l => l.substring(0, 150))
          };

          // Detect format
          if (content.includes('CREATE TABLE') || content.includes('INSERT INTO')) {
            analysis.format_detected = 'SQL Dump File';
            analysis.details.text.format_type = 'SQL';
          } else if (lines[0] && (lines[0].includes(',') || lines[0].includes('\t') || lines[0].includes('|'))) {
            analysis.format_detected = 'CSV or Delimited Text';
            analysis.details.text.format_type = 'CSV';

            // Detect separator
            for (const sep of [',', '\t', '|', ';']) {
              if (lines[0].includes(sep)) {
                analysis.details.text.separator = sep === '\t' ? 'TAB' : sep;
                analysis.details.text.columns = lines[0].split(sep).length;
                break;
              }
            }
          } else if (lines[0]?.trim().startsWith('{') || lines[0]?.trim().startsWith('[')) {
            analysis.format_detected = 'JSON';
            analysis.details.text.format_type = 'JSON';
          } else if (lines[0]?.includes('<?xml') || lines[0]?.includes('<root>')) {
            analysis.format_detected = 'XML';
            analysis.details.text.format_type = 'XML';
          }

          return analysis;
        } catch (err) {
          // File might be binary or unreadable
          analysis.details.binary_analysis = {
            error: 'Could not read as text',
            might_be_binary: true
          };

          // Try binary header analysis
          const header = Buffer.alloc(16);
          const fd = fs.openSync(filePath, 'r');
          fs.readSync(fd, header, 0, 16, 0);
          fs.closeSync(fd);

          const hex = header.toString('hex').substring(0, 8);
          if (hex.startsWith('53514c69')) { // 'SQLi' in hex
            analysis.format_detected = 'SQLite Database (corrupted or locked)';
          } else if (hex.startsWith('425a6832')) { // 'BZh2' - Bzip2
            analysis.format_detected = 'Bzip2 Compressed Archive';
          } else if (hex.startsWith('1f8b0808')) { // Gzip
            analysis.format_detected = 'Gzip Compressed Archive';
          } else if (hex.startsWith('504b0304')) { // ZIP
            analysis.format_detected = 'ZIP Archive';
          } else {
            analysis.format_detected = 'Unknown Binary Format';
          }

          analysis.details.binary_analysis.header_hex = hex;
          return analysis;
        }
      } catch (error) {
        console.error('File analysis error:', error);
        return { success: false, error: error.message };
      }
    });

    // Comprehensive handler for importing external database with full schema sync
    ipcMain.handle('database:importExternalWithSync', async (event, filePath) => {
      try {
        const path = require('path');
        const fs = require('fs');
        const DatabaseService = require('../src/services/DatabaseService');

        if (!filePath || !fs.existsSync(filePath)) {
          return { success: false, error: 'File not found' };
        }

        // Step 1: Analyze the file to detect format and trigger conversion if needed
        console.log('[IPC] Step 1: Analyzing file format...');
        const analysis = await ipcMain._invokeDefaultHandler('file:analyzeBakFile', filePath);

        if (!analysis.success) {
          return analysis;
        }

        // Step 2: If it's a BAK file and it was converted, use the converted file
        let importPath = filePath;
        if (analysis.conversion_triggered && analysis.converted_file) {
          console.log('[IPC] Step 2: Using auto-converted SQLite file:', analysis.converted_file);
          importPath = analysis.converted_file;
        } else {
          console.log('[IPC] Step 2: File is already compatible format');
        }

        // Step 3: Perform schema synchronization and data import
        console.log('[IPC] Step 3: Starting import with schema synchronization...');
        const dbService = new DatabaseService();
        const importResult = await dbService.importExternalDatabase(importPath);

        if (!importResult.success) {
          return importResult;
        }

        // Step 4: Compile comprehensive results
        const results = {
          success: true,
          analysis: analysis,
          import: importResult,
          summary: {
            file_analyzed: analysis.file.name,
            file_size_mb: analysis.file.size_mb,
            was_converted: analysis.conversion_triggered ? 'YES (BAK → SQLite)' : 'NO',
            format_detected: analysis.format_detected,
            tables_created: importResult.schemaSyncResult?.results?.created?.length || 0,
            tables_modified: importResult.schemaSyncResult?.results?.modified?.length || 0,
            sync_errors: importResult.schemaSyncResult?.results?.errors?.length || 0,
            records_imported: importResult.imported || {},
            message: 'Database imported successfully with automatic schema synchronization'
          }
        };

        console.log('[IPC] Step 4: Import complete', results.summary);
        return results;
      } catch (error) {
        console.error('[IPC] Import error:', error);
        return { success: false, error: error.message };
      }
    });

    // Handler for fetching table data for dynamic display
    ipcMain.handle('database:getTableData', async (event, options = {}) => {
      try {
        const { tableName, limit = 25, offset = 0 } = options;

        if (!tableName || typeof tableName !== 'string') {
          return { success: false, error: 'Table name required' };
        }

        const DatabaseService = require('../../src/services/DatabaseService');
        const dbService = new DatabaseService();
        const db = await dbService.getDatabase();

        // Safely query the table with limit and offset
        const rows = await new Promise((resolve, reject) => {
          db.all(
            `SELECT * FROM \`${tableName}\` LIMIT ? OFFSET ?`,
            [limit, offset],
            (err, rows) => {
              if (err) reject(err);
              else resolve(rows || []);
            }
          );
        });

        // Get row count
        const countResult = await new Promise((resolve, reject) => {
          db.get(`SELECT COUNT(*) as total FROM \`${tableName}\``, (err, row) => {
            if (err) reject(err);
            else resolve(row?.total || 0);
          });
        });

        return {
          success: true,
          tableName,
          data: rows,
          count: rows.length,
          total: countResult
        };
      } catch (error) {
        console.error('[IPC] Get table data error:', error);
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
        return buildErrorResponse(error, { scope: 'chat', action: 'getMessages', entity: 'message' });
      }
    });

    ipcMain.handle('chat:sendMessage', async (event, senderId, receiverId, messageText, attachment, replyToId) => {
      try {
        const msg = await DatabaseService.sendMessage(senderId, receiverId, messageText, attachment, replyToId);
        BrowserWindow.getAllWindows().forEach(w => w.webContents.send('new-message', msg));
        return { success: true, message: msg };
      } catch (error) {
        console.error('Send message error:', error);
        return buildErrorResponse(error, { scope: 'chat', action: 'sendMessage', entity: 'message' });
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
        return buildErrorResponse(error, { scope: 'chat', action: 'markMessageRead', entity: 'message' });
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
        return buildErrorResponse(error, { scope: 'chat', action: 'markAllAsRead', entity: 'message' });
      }
    });

    ipcMain.handle('chat:getUnreadCount', async (event, userId) => {
      try {
        if (!userId) return { success: false, error: 'User ID required' };
        const count = await DatabaseService.getUnreadMessageCount(userId);
        return { success: true, count };
      } catch (error) {
        console.error('Get unread count error:', error);
        return buildErrorResponse(error, { scope: 'chat', action: 'getUnreadCount', entity: 'message' });
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
        return buildErrorResponse(error, { scope: 'chat', action: 'deleteMessage', entity: 'message' });
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
        return buildErrorResponse(error, { scope: 'presence', action: 'setOnline', entity: 'user' });
      }
    });
    ipcMain.handle('presence:setOffline', async (event, { userId }) => {
      try {
        await DatabaseService.setUserOffline(userId);
        return { success: true };
      } catch (error) {
        console.error('Set offline error:', error);
        return buildErrorResponse(error, { scope: 'presence', action: 'setOffline', entity: 'user' });
      }
    });
    ipcMain.handle('presence:getOnlineUsers', async () => {
      try {
        const users = await DatabaseService.getOnlineUsers();
        return { success: true, users };
      } catch (error) {
        console.error('Get online users error:', error);
        return buildErrorResponse(error, { scope: 'presence', action: 'getOnlineUsers', entity: 'user' });
      }
    });
    ipcMain.handle('presence:getUsersWithPresence', async () => {
      try {
        const users = await DatabaseService.getUsersWithPresence();
        return { success: true, users };
      } catch (error) {
        console.error('Get users with presence error:', error);
        return buildErrorResponse(error, { scope: 'presence', action: 'getUsersWithPresence', entity: 'user' });
      }
    });
  }

  registerSettingsHandlers() {
    console.log('IPC handlers - Registering settings handlers');
    ipcMain.handle('settings:get', async (event, key) => {
      try {
        const value = await DatabaseService.getSetting(key);
        return { success: true, value };
      } catch (error) {
        console.error('Get setting error:', error);
        return buildErrorResponse(error, { scope: 'settings', action: 'get', entity: 'setting' });
      }
    });

    ipcMain.handle('settings:getAll', async () => {
      console.log('IPC handler called: settings:getAll');
      try {
        const settings = await DatabaseService.getAllSettings();
        return { success: true, settings };
      } catch (error) {
        console.error('Get settings error:', error);
        return buildErrorResponse(error, { scope: 'settings', action: 'getAll', entity: 'setting' });
      }
    });

    ipcMain.handle('settings:set', async (event, { key, value }) => {
      try {
        await DatabaseService.setSetting(key, value);
        return { success: true };
      } catch (error) {
        console.error('Set setting error:', error);
        return buildErrorResponse(error, { scope: 'settings', action: 'set', entity: 'setting' });
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
        return buildErrorResponse(error, { scope: 'system', action: 'checkOnline' }, { online: false, timestamp: new Date().toISOString() });
      }
    });
    ipcMain.handle('system:setNetworkDbPath', async (event, payload) => {
      try {
        if (!currentUser || String(currentUser.role || '').toLowerCase() !== 'admin') {
          return { success: false, error: 'Only admin can change network database path' };
        }
        const dir = app.getPath('userData');
        const cfgPath = path.join(dir, 'config.json');
        let existing = {};
        if (fs.existsSync(cfgPath)) {
          try {
            existing = JSON.parse(fs.readFileSync(cfgPath, 'utf-8'));
          } catch { }
        }
        const data = { ...existing, network_db_path: payload?.path || '' };
        fs.writeFileSync(cfgPath, JSON.stringify(data));
        return { success: true, path: data.network_db_path };
      } catch (error) {
        return buildErrorResponse(error, { scope: 'system', action: 'setNetworkDbPath' });
      }
    });
    ipcMain.handle('system:getNetworkDbPath', async () => {
      try {
        const dir = app.getPath('userData');
        const cfgPath = path.join(dir, 'config.json');
        if (!fs.existsSync(cfgPath)) return { success: true, path: null };
        const data = JSON.parse(fs.readFileSync(cfgPath, 'utf-8'));
        return { success: true, path: data.network_db_path || null };
      } catch (error) {
        return { success: false, error: error.message, path: null };
      }
    });
    ipcMain.handle('db:delete', async () => {
      try {
        if (!currentUser || String(currentUser.role || '').toLowerCase() !== 'admin') {
          return { success: false, error: 'Only admin can delete database' };
        }
        const res = await DatabaseService.deleteDatabase();
        return res;
      } catch (error) {
        return buildErrorResponse(error, { scope: 'system', action: 'deleteDatabase', entity: 'database' });
      }
    });
    ipcMain.handle('db:update', async (event, updates = {}) => {
      try {
        if (!currentUser || String(currentUser.role || '').toLowerCase() !== 'admin') {
          return { success: false, error: 'Only admin can update database' };
        }
        const res = await DatabaseService.updateDatabase(updates);
        return res;
      } catch (error) {
        return buildErrorResponse(error, { scope: 'system', action: 'updateDatabase', entity: 'database' });
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
            await win.loadURL('http://localhost:5173/');
          } else {
            await win.loadFile(path.join(__dirname, '../../dist/index.html'));
          }
        }
        return { success: true };
      } catch (error) {
        console.error('Open main window error:', error);
        return buildErrorResponse(error, { scope: 'window', action: 'openMain' });
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
        return buildErrorResponse(error, { scope: 'dashboard', action: 'getStats' });
      }
    });
  }
}

module.exports = IPCHandlers;
