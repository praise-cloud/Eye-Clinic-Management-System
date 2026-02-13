const { ipcMain, BrowserWindow, app } = require('electron');
const path = require('path');
const fs = require('fs');
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
        const dispensation = await DatabaseService.createPharmacyDispensation({
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
            dispensation.id,
            `Pharmacy dispensation recorded for drug ${drugId}`
          );
        }

        BrowserWindow.getAllWindows().forEach(w =>
          w.webContents.send('data:update', { table: 'pharmacy', action: 'dispense', record: dispensation })
        );

        return { success: true, dispensation };
      } catch (error) {
        console.error('Pharmacy dispense error:', error);
        return buildErrorResponse(error, { scope: 'pharmacy', action: 'dispense', entity: 'pharmacy_dispensation' });
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
            await win.loadURL('http://localhost:3000/');
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
