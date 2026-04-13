const { ipcMain, BrowserWindow, app } = require('electron');
const path = require('path');
const fs = require('fs-extra');
const { v4: uuidv4 } = require('uuid');
const DatabaseService = require('../../src/services/DatabaseService');
const FileService = require('../../src/services/FileService');
const HensonImportService = require('../../src/services/HensonImportService');

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

    return { code: `constraint.unique.${table}.${column}`, table, column, raw: rawMessage, message: userMessage };
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
    return { code: 'constraint.foreign_key', table: null, column: null, raw: rawMessage, message: userMessage };
  }

  const notNullMatch = rawMessage.match(/NOT NULL constraint failed: ([\w_]+)\.([\w_]+)/i);
  if (notNullMatch) {
    table = notNullMatch[1];
    column = notNullMatch[2];
    const label = column.replace(/_/g, ' ');
    let userMessage = `The field "${label}" is required. Please fill it in before saving.`;
    if (column === 'item_name') userMessage = 'Description is required. Please fill it in before saving.';
    return { code: `constraint.not_null.${table}.${column}`, table, column, raw: rawMessage, message: userMessage };
  }

  if (rawMessage.includes('CHECK constraint failed')) {
    let userMessage = 'One of the values is not allowed. Please review the fields and try again.';
    if (rawMessage.includes('users.role')) userMessage = 'The selected role is not valid. Choose admin, doctor, or assistant.';
    return { code: 'constraint.check', table: null, column: null, raw: rawMessage, message: userMessage };
  }

  return base;
};

const buildErrorResponse = (error, context = {}, extra = {}) => {
  const mapped = mapDatabaseError(error, context);
  return { success: false, error: mapped.message, errorCode: mapped.code, errorDetails: mapped, ...extra };
};

let currentUser = null;

class IPCHandlers {
  constructor({ config = {}, saveConfig = null, loadConfig = null, serverManager = null } = {}) {
    this.appConfig = config;
    this.saveAppConfig = saveConfig;
    this.loadAppConfig = loadConfig;
    this.serverManager = serverManager;
    this.accessToken = null;
    this.refreshToken = null;
    this.http = null;
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
    this.registerCvfHandlers();
    this.registerWindowHandlers();
    this.registerDashboardHandlers();
    this.registerPrescriptionHandlers();
    this.registerNotificationHandlers();
    this.registerServerHandlers();
    this.registerServerConfigHandlers();
    console.log('IPC handlers - All registration methods called');
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // AUTH HANDLERS
  // ──────────────────────────────────────────────────────────────────────────────

  registerAuthHandlers() {
    ipcMain.handle('auth:getCurrentUser', async () => {
      return currentUser ? { success: true, user: currentUser, hasServerToken: !!this.accessToken } : { success: false, message: 'No user logged in' };
    });

    ipcMain.handle('auth:logout', async (event, { userId } = {}) => {
      try {
        const id = userId || currentUser?.id;
        if (id) await DatabaseService.logActivity(id, 'logout', 'user', id, 'User logged out');
        currentUser = null;
        this.accessToken = null;
        this.refreshToken = null;
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
        if (!email || !password) return { success: false, error: 'Email and password required' };

        const serverUrl = this.appConfig?.serverUrl;
        if (serverUrl) {
          const http = require('http');
          return new Promise((resolve) => {
            const body = JSON.stringify({ email, password });
            const url = new URL(`${serverUrl}/api/auth/login`);
            const options = {
              hostname: url.hostname,
              port: url.port || 80,
              path: url.pathname,
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
            };
            const req = http.request(options, (res) => {
              let data = '';
              res.on('data', chunk => data += chunk);
              res.on('end', () => {
                try {
                  const result = JSON.parse(data);
                  if (result.success) {
                    this.accessToken = result.accessToken;
                    this.refreshToken = result.refreshToken;
                    currentUser = result.user;
                  }
                  resolve(result);
                } catch {
                  resolve({ success: false, error: 'Invalid server response' });
                }
              });
            });
            req.on('error', (err) => resolve({ success: false, error: `Server unreachable: ${err.message}` }));
            req.write(body);
            req.end();
          });
        }

        const user = await DatabaseService.authenticateUser(email, password);
        if (!user) return { success: false, error: 'Invalid credentials' };

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
        if (!user) return { success: false, error: 'Failed to create admin user' };

        const userWithName = {
          ...user,
          name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
          phone: user.phone_number
        };

        currentUser = userWithName;
        await DatabaseService.setSetting('setup_complete', 'true');
        await DatabaseService.logActivity(user.id, 'setup', 'system', null, `Initial setup completed by ${userWithName.name} (${role})`);

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
      return !!currentUser;
    });
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
        return patient ? { success: true, patient } : { success: false, error: 'Patient not found' };
      } catch (error) {
        console.error('Get patient error:', error);
        return buildErrorResponse(error, { scope: 'patients', action: 'getById', entity: 'patient' });
      }
    });

    ipcMain.handle('patients:create', async (event, patientData) => {
      try {
        if (!currentUser) return { success: false, error: 'Authentication required' };
        const role = String(currentUser.role || '').toLowerCase();
        if (!['admin', 'doctor', 'assistant'].includes(role)) {
          return { success: false, error: 'Access denied. Only admin, doctor, or assistant can create patients.' };
        }
        const required = ['first_name', 'last_name', 'dob', 'gender'];
        for (const f of required) {
          if (!patientData[f]) return { success: false, error: `${f} required` };
        }

        const result = await DatabaseService.createPatient(patientData);
        if (result?.error) return result;
        const patient = result;
        if (currentUser?.id) {
          await DatabaseService.logActivity(currentUser.id, 'create', 'patient', patient.id, `Patient ${patient.first_name} ${patient.last_name} created`);
        }
        return { success: true, patient };
      } catch (error) {
        console.error('Create patient error:', error);
        return buildErrorResponse(error, { scope: 'patients', action: 'create', entity: 'patient' });
      }
    });

    ipcMain.handle('patients:update', async (event, { id, patientData }) => {
      try {
        if (!currentUser) return { success: false, error: 'Authentication required' };
        const role = String(currentUser.role || '').toLowerCase();
        if (!['admin', 'doctor', 'assistant'].includes(role)) {
          return { success: false, error: 'Access denied. Only admin, doctor, or assistant can update patients.' };
        }
        if (!id) return { success: false, error: 'Patient ID required' };
        const result = await DatabaseService.updatePatient(id, patientData);
        if (result?.error) return result;
        const patient = result;
        if (currentUser?.id) {
          await DatabaseService.logActivity(currentUser.id, 'update', 'patient', id, `Patient ${patient.first_name} ${patient.last_name} updated`);
        }
        return { success: true, patient };
      } catch (error) {
        console.error('Update patient error:', error);
        return buildErrorResponse(error, { scope: 'patients', action: 'update', entity: 'patient' });
      }
    });

    ipcMain.handle('patients:delete', async (event, id) => {
      try {
        if (!currentUser) return { success: false, error: 'Authentication required' };
        const role = String(currentUser.role || '').toLowerCase();
        if (role !== 'admin') return { success: false, error: 'Access denied. Only admin can delete patients.' };
        if (!id) return { success: false, error: 'Patient ID required' };
        const result = await DatabaseService.deletePatient(id);
        if (result.success && currentUser?.id) {
          await DatabaseService.logActivity(currentUser.id, 'delete', 'patient', id, `Patient ${id} deleted`);
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
  // TEST HANDLERS
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
        return test ? { success: true, test } : { success: false, error: 'Test not found' };
      } catch (error) {
        console.error('Get test error:', error);
        return buildErrorResponse(error, { scope: 'tests', action: 'getById', entity: 'test' });
      }
    });

    ipcMain.handle('tests:create', async (event, testData) => {
      try {
        if (!currentUser) return { success: false, error: 'Authentication required' };
        const role = String(currentUser.role || '').toLowerCase();
        if (!['admin', 'doctor'].includes(role)) {
          return { success: false, error: 'Access denied. Only admin or doctor can create tests.' };
        }
        const required = ['patient_name', 'machine_type', 'eye', 'raw_data'];
        for (const f of required) {
          if (!testData[f]) return { success: false, error: `${f} required` };
        }

        const test = await DatabaseService.createTest(testData);
        BrowserWindow.getAllWindows().forEach(w => w.webContents.send('data:update', { table: 'tests', action: 'create', record: test }));
        if (currentUser?.id) {
          await DatabaseService.logActivity(currentUser.id, 'create', 'test', test.id, `Test created for patient ${testData.patient_name}`);
        }
        return { success: true, test };
      } catch (error) {
        console.error('Create test error:', error);
        return buildErrorResponse(error, { scope: 'tests', action: 'create', entity: 'test' });
      }
    });

    ipcMain.handle('tests:update', async (event, { id, testData }) => {
      try {
        if (!currentUser) return { success: false, error: 'Authentication required' };
        const role = String(currentUser.role || '').toLowerCase();
        if (!['admin', 'doctor', 'assistant'].includes(role)) {
          return { success: false, error: 'Access denied. Only admin, doctor, or assistant can update tests.' };
        }
        if (!id) return { success: false, error: 'Test ID required' };
        const test = await DatabaseService.updateTest(id, testData);
        BrowserWindow.getAllWindows().forEach(w => w.webContents.send('data:update', { table: 'tests', action: 'update', record: test }));
        if (currentUser?.id) {
          await DatabaseService.logActivity(currentUser.id, 'update', 'test', id, `Test ${id} updated`);
        }
        return { success: true, test };
      } catch (error) {
        console.error('Update test error:', error);
        return buildErrorResponse(error, { scope: 'tests', action: 'update', entity: 'test' });
      }
    });

    ipcMain.handle('tests:delete', async (event, id) => {
      try {
        if (!currentUser) return { success: false, error: 'Authentication required' };
        const role = String(currentUser.role || '').toLowerCase();
        if (role !== 'admin' && role !== 'doctor') {
          return { success: false, error: 'Access denied. Only admin or doctor can delete tests.' };
        }
        if (!id) return { success: false, error: 'Test ID required' };
        const result = await DatabaseService.deleteTest(id);
        if (result?.success) {
          BrowserWindow.getAllWindows().forEach(w => w.webContents.send('data:update', { table: 'tests', action: 'delete', recordId: id }));
          if (currentUser?.id) {
            await DatabaseService.logActivity(currentUser.id, 'delete', 'test', id, `Test ${id} deleted`);
          }
        }
        return result;
      } catch (error) {
        console.error('Delete test error:', error);
        return buildErrorResponse(error, { scope: 'tests', action: 'delete', entity: 'test' });
      }
    });

    ipcMain.handle('tests:attachCvfToDocuments', async (event, { testId, options = {} } = {}) => {
      try {
        const role = String(currentUser?.role || '').toLowerCase();
        if (!['admin', 'doctor', 'assistant'].includes(role)) {
          return { success: false, error: 'Only admin, doctor, or assistant can attach CVF results to documents' };
        }
        if (!testId) return { success: false, error: 'Test ID required' };

        const test = await DatabaseService.getTestById(testId);
        if (!test) return { success: false, error: 'CVF test not found' };
        if (!test.patient_id) return { success: false, error: 'CVF test is not linked to a patient' };

        let raw = {};
        try {
          raw = typeof test.raw_data === 'string' ? JSON.parse(test.raw_data || '{}') : (test.raw_data || {});
        } catch {
          raw = {};
        }

        const isCvf = String(test.machine_type || '').toLowerCase() === 'henson_8000' || String(raw?.source || '').toLowerCase() === 'henson_8000';
        if (!isCvf) return { success: false, error: 'Only Henson 8000 CVF tests can be attached from this action' };

        const patient = await DatabaseService.getPatientById(test.patient_id);
        const patientName = patient ? `${patient.first_name || ''} ${patient.last_name || ''}`.trim() : 'Unknown Patient';

        const documentPayload = {
          source: 'henson_8000',
          kind: 'cvf_case_study_attachment',
          attached_from_test_id: test.id,
          attached_at: new Date().toISOString(),
          attached_by: currentUser?.id || null,
          attached_by_role: role || null,
          patient_id: test.patient_id,
          machine_type: test.machine_type || 'henson_8000',
          eye: test.eye || 'both',
          test_date: test.test_date || null,
          result: raw?.result || 'Pending',
          diagnosis: raw?.diagnosis || '',
          caseStudy: raw?.caseStudy || '',
          notes: raw?.notes || '',
          signoff: raw?.signoff || null,
          auditTrail: Array.isArray(raw?.auditTrail) ? raw.auditTrail : [],
          snapshot: raw
        };

        const report = await DatabaseService.createReport({
          patient_id: test.patient_id,
          report_type: 'cvf_case_study_attachment',
          title: String(options?.title || '').trim() || `CVF Case Study Attachment - ${patientName} - ${new Date(test.test_date || Date.now()).toLocaleDateString()}`,
          report_file: JSON.stringify(documentPayload)
        });

        BrowserWindow.getAllWindows().forEach((w) => w.webContents.send('data:update', { table: 'reports', action: 'create', record: report }));
        if (currentUser?.id) {
          await DatabaseService.logActivity(currentUser.id, 'create', 'report', report.id, `Attached CVF result ${test.id} to patient documents`);
        }
        return { success: true, report };
      } catch (error) {
        console.error('Attach CVF to documents error:', error);
        return buildErrorResponse(error, { scope: 'tests', action: 'attachCvfToDocuments', entity: 'report' });
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
  // REPORT HANDLERS
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
        return report ? { success: true, report } : { success: false, error: 'Report not found' };
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

  // ──────────────────────────────────────────────────────────────────────────────
  // INVENTORY HANDLERS
  // ──────────────────────────────────────────────────────────────────────────────

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
          await DatabaseService.logActivity(currentUser.id, 'create', 'inventory', item.id, `Inventory item ${item.item_name} created`);
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
          await DatabaseService.logActivity(currentUser.id, 'update', 'inventory', id, `Inventory item ${id} updated`);
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
          await DatabaseService.logActivity(currentUser.id, 'delete', 'inventory', id, `Inventory item ${id} deleted`);
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
          await DatabaseService.logActivity(userId, 'update', 'inventory', id, `Inventory quantity updated to ${quantity}`);
        }
        BrowserWindow.getAllWindows().forEach(w => w.webContents.send('data:update', { table: 'inventory', action: 'update', record: item }));
        return { success: true, item };
      } catch (error) {
        console.error('Update inventory quantity error:', error);
        return buildErrorResponse(error, { scope: 'inventory', action: 'updateQuantity', entity: 'inventory' });
      }
    });

    ipcMain.handle('inventory:getByCode', async (event, itemCode) => {
      try {
        if (!itemCode) return { success: false, error: 'Item code required' };
        const item = await DatabaseService.getInventoryItemByCode(itemCode);
        return item ? { success: true, item } : { success: false, error: 'Item not found' };
      } catch (error) {
        console.error('Get inventory by code error:', error);
        return buildErrorResponse(error, { scope: 'inventory', action: 'getByCode', entity: 'inventory' });
      }
    });

    ipcMain.handle('inventory:getStatistics', async () => {
      try {
        const stats = await DatabaseService.getInventoryStatistics();
        return { success: true, stats };
      } catch (error) {
        console.error('Get inventory statistics error:', error);
        return buildErrorResponse(error, { scope: 'inventory', action: 'getStatistics', entity: 'inventory' });
      }
    });

    ipcMain.handle('inventory:getLowStock', async () => {
      try {
        const items = await DatabaseService.getLowStockItems();
        return { success: true, items };
      } catch (error) {
        console.error('Get low stock items error:', error);
        return buildErrorResponse(error, { scope: 'inventory', action: 'getLowStock', entity: 'inventory' });
      }
    });

    ipcMain.handle('inventory:getExpiring', async (event, days = 30) => {
      try {
        const items = await DatabaseService.getExpiringItems(days);
        return { success: true, items };
      } catch (error) {
        console.error('Get expiring items error:', error);
        return buildErrorResponse(error, { scope: 'inventory', action: 'getExpiring', entity: 'inventory' });
      }
    });

    ipcMain.handle('inventory:search', async (event, searchTerm) => {
      try {
        if (!searchTerm) return { success: false, error: 'Search term required' };
        const items = await DatabaseService.searchInventory(searchTerm);
        return { success: true, items };
      } catch (error) {
        console.error('Search inventory error:', error);
        return buildErrorResponse(error, { scope: 'inventory', action: 'search', entity: 'inventory' });
      }
    });
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // PHARMACY HANDLERS
  // ──────────────────────────────────────────────────────────────────────────────

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
        return drug ? { success: true, drug } : { success: false, error: 'Drug not found' };
      } catch (error) {
        console.error('Get pharmacy drug error:', error);
        return buildErrorResponse(error, { scope: 'pharmacy', action: 'getDrugById', entity: 'pharmacy_drug' });
      }
    });

    ipcMain.handle('pharmacy:createDrug', async (event, drugData) => {
      try {
        if (!currentUser) return { success: false, error: 'Authentication required' };
        const role = String(currentUser.role || '').toLowerCase();
        if (!['admin', 'doctor'].includes(role)) {
          return { success: false, error: 'Access denied. Only admin or doctor can create pharmacy drugs.' };
        }
        const required = ['drug_code', 'drug_name', 'drug_form', 'strength', 'pack_size', 'unit_price'];
        for (const f of required) {
          if (!drugData[f]) return { success: false, error: `${f} required` };
        }

        const drug = await DatabaseService.createPharmacyDrug(drugData);
        if (currentUser?.id) {
          await DatabaseService.logActivity(currentUser.id, 'create', 'pharmacy_drug', drug.id, `Pharmacy drug ${drug.drug_name} created`);
        }
        BrowserWindow.getAllWindows().forEach(w => w.webContents.send('data:update', { table: 'pharmacy', action: 'create', record: drug }));
        return { success: true, drug };
      } catch (error) {
        console.error('Create pharmacy drug error:', error);
        return buildErrorResponse(error, { scope: 'pharmacy', action: 'createDrug', entity: 'pharmacy_drug' });
      }
    });

    ipcMain.handle('pharmacy:updateDrug', async (event, { id, drugData }) => {
      try {
        if (!currentUser) return { success: false, error: 'Authentication required' };
        const role = String(currentUser.role || '').toLowerCase();
        if (!['admin', 'doctor'].includes(role)) {
          return { success: false, error: 'Access denied. Only admin or doctor can update pharmacy drugs.' };
        }
        if (!id) return { success: false, error: 'Drug ID required' };
        const drug = await DatabaseService.updatePharmacyDrug(id, drugData);
        if (currentUser?.id) {
          await DatabaseService.logActivity(currentUser.id, 'update', 'pharmacy_drug', id, `Pharmacy drug ${id} updated`);
        }
        BrowserWindow.getAllWindows().forEach(w => w.webContents.send('data:update', { table: 'pharmacy', action: 'update', record: drug }));
        return { success: true, drug };
      } catch (error) {
        console.error('Update pharmacy drug error:', error);
        return buildErrorResponse(error, { scope: 'pharmacy', action: 'updateDrug', entity: 'pharmacy_drug' });
      }
    });

    ipcMain.handle('pharmacy:deleteDrug', async (event, id) => {
      try {
        if (!currentUser) return { success: false, error: 'Authentication required' };
        const role = String(currentUser.role || '').toLowerCase();
        if (role !== 'admin') return { success: false, error: 'Access denied. Only admin can delete pharmacy drugs.' };
        if (!id) return { success: false, error: 'Drug ID required' };
        const result = await DatabaseService.deletePharmacyDrug(id);
        if (result.success && currentUser?.id) {
          await DatabaseService.logActivity(currentUser.id, 'delete', 'pharmacy_drug', id, `Pharmacy drug ${id} deleted`);
        }
        if (result.success) {
          BrowserWindow.getAllWindows().forEach(w => w.webContents.send('data:update', { table: 'pharmacy', action: 'delete', recordId: id }));
        }
        return result;
      } catch (error) {
        console.error('Delete pharmacy drug error:', error);
        return buildErrorResponse(error, { scope: 'pharmacy', action: 'deleteDrug', entity: 'pharmacy_drug' });
      }
    });

    ipcMain.handle('pharmacy:dispense', async (event, { drugId, patientId, quantity, notes }) => {
      try {
        if (!currentUser) return { success: false, error: 'Authentication required' };
        const role = String(currentUser.role || '').toLowerCase();
        if (!['admin', 'assistant', 'doctor'].includes(role)) {
          return { success: false, error: 'Access denied. Only admin, doctor, or assistant can dispense pharmacy drugs.' };
        }
        if (!drugId || !patientId) return { success: false, error: 'Drug and patient are required' };
        const qtyNumber = Number(quantity || 0);
        if (!Number.isFinite(qtyNumber) || qtyNumber <= 0) {
          return { success: false, error: 'Quantity must be greater than zero' };
        }

        const userId = currentUser?.id || null;
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
        console.error('Pharmacy dispense error:', error);
        return buildErrorResponse(error, { scope: 'pharmacy', action: 'dispense', entity: 'pharmacy_dispensation' });
      }
    });
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // PRESCRIPTION HANDLERS
  // ──────────────────────────────────────────────────────────────────────────────

  registerPrescriptionHandlers() {
    ipcMain.handle('prescriptions:create', async (event, prescriptionData) => {
      try {
        if (!currentUser) return { success: false, error: 'Authentication required' };
        const role = String(currentUser.role || '').toLowerCase();
        if (!['admin', 'doctor'].includes(role)) {
          return { success: false, error: 'Access denied. Only admin or doctor can create prescriptions.' };
        }
        const required = ['patientId', 'doctorId', 'drugId', 'quantity'];
        for (const f of required) {
          if (!prescriptionData[f]) return { success: false, error: `${f} required` };
        }

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
        console.error('Create prescription error:', error);
        return buildErrorResponse(error, { scope: 'prescriptions', action: 'create', entity: 'prescription' });
      }
    });

    ipcMain.handle('prescriptions:createMultiple', async (event, { patientId, doctorId, items }) => {
      try {
        if (!currentUser) return { success: false, error: 'Authentication required' };
        const role = String(currentUser.role || '').toLowerCase();
        if (!['admin', 'doctor'].includes(role)) {
          return { success: false, error: 'Access denied. Only admin or doctor can create prescriptions.' };
        }
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

  // ──────────────────────────────────────────────────────────────────────────────
  // NOTIFICATION HANDLERS
  // ──────────────────────────────────────────────────────────────────────────────

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

  // ──────────────────────────────────────────────────────────────────────────────
  // ADMIN HANDLERS
  // ──────────────────────────────────────────────────────────────────────────────

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
          if (!dbUserData[field]) return { success: false, error: `${field} required` };
        }

        const user = await DatabaseService.createUser(dbUserData);

        if (createdBy) {
          await DatabaseService.logActivity(createdBy, 'create', 'user', user.id, `User ${user.email} created by admin`);
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
        if (!userId) return { success: false, error: 'User ID required' };

        const result = await DatabaseService.updateUserStatus(userId, isActive);

        if (updatedBy) {
          await DatabaseService.logActivity(updatedBy, 'update', 'user', userId, `User status changed to ${isActive ? 'active' : 'inactive'}`);
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
        if (!userId) return { success: false, error: 'User ID required' };

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
        if (!updatedUser) return { success: false, error: 'User not found or no changes applied' };

        if (updatedBy) {
          await DatabaseService.logActivity(updatedBy, 'update', 'user', userId, `User ${updatedUser.email} updated by admin`);
        }

        const userWithName = {
          ...currentUser,
          ...updatedUser,
          id: userId,
          role: updatedUser.role || currentUser?.role,
          name: `${updatedUser.first_name || ''} ${updatedUser.last_name || ''}`.trim() || currentUser?.name,
          phone: updatedUser.phone_number || currentUser?.phone,
          email: updatedUser.email || currentUser?.email,
          gender: updatedUser.gender || currentUser?.gender
        };

        if (currentUser?.id === userId) {
          currentUser = userWithName;
        }

        BrowserWindow.getAllWindows().forEach(w => w.webContents.send('data:update', { table: 'users', action: 'update', record: userWithName }));
        BrowserWindow.getAllWindows().forEach(w => w.webContents.send('user:profileUpdated', userWithName));
        return { success: true, user: userWithName };
      } catch (error) {
        console.error('Admin update user error:', error);
        return buildErrorResponse(error, { scope: 'admin', action: 'updateUser', entity: 'user' });
      }
    });

    ipcMain.handle('admin:deleteUser', async (event, { userId, deletedBy }) => {
      try {
        if (!userId) return { success: false, error: 'User ID required' };

        const result = await DatabaseService.deleteUser(userId);

        if (result.success && deletedBy) {
          await DatabaseService.logActivity(deletedBy, 'delete', 'user', userId, `User ${userId} deleted by admin`);
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

    ipcMain.handle('admin:getUserStats', async (event, userId) => {
      try {
        if (!currentUser || String(currentUser.role || '').toLowerCase() !== 'admin') {
          return { success: false, error: 'Admin access required' };
        }
        const stats = await DatabaseService.getUserStatistics(userId);
        return { success: true, stats };
      } catch (error) {
        console.error('Get user statistics error:', error);
        return buildErrorResponse(error, { scope: 'admin', action: 'getUserStats' });
      }
    });

    ipcMain.handle('admin:getActivityLogsFiltered', async (event, filters = {}) => {
      try {
        const { timeRange = '24h', userId = null, entityType = null, limit = 100 } = filters;
        const db = await DatabaseService.getDatabase();

        const allowedTimeRanges = ['5m', '1h', '24h', '7d', 'all'];
        const validatedTimeRange = allowedTimeRanges.includes(timeRange) ? timeRange : '24h';

        let timeCondition = '';
        switch (validatedTimeRange) {
          case '5m': timeCondition = `AND al.timestamp > datetime('now', '-5 minutes')`; break;
          case '1h': timeCondition = `AND al.timestamp > datetime('now', '-1 hour')`; break;
          case '24h': timeCondition = `AND al.timestamp > datetime('now', '-24 hours')`; break;
          case '7d': timeCondition = `AND al.timestamp > datetime('now', '-7 days')`; break;
          case 'all': timeCondition = ''; break;
          default: timeCondition = `AND al.timestamp > datetime('now', '-24 hours')`;
        }

        const sanitizedUserId = userId ? String(userId).replace(/[^a-zA-Z0-9-]/g, '') : null;
        const sanitizedEntityType = entityType ? String(entityType).replace(/[^a-zA-Z_]/g, '') : null;

        const userCondition = sanitizedUserId ? `AND al.user_id = ?` : '';
        const entityCondition = sanitizedEntityType ? `AND al.entity_type = ?` : '';

        const params = [];
        if (sanitizedUserId) params.push(sanitizedUserId);
        if (sanitizedEntityType) params.push(sanitizedEntityType);

        const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 1000);

        const logs = await db.all(`
          SELECT al.*, u.first_name, u.last_name, u.email, u.role
          FROM activity_logs al
          LEFT JOIN users u ON al.user_id = u.id
          WHERE 1=1 ${timeCondition} ${userCondition} ${entityCondition}
          ORDER BY al.timestamp DESC
          LIMIT ?
        `, [...params, safeLimit]);

        const formattedLogs = logs.map(log => ({
          id: log.id,
          user_id: log.user_id,
          user_name: `${log.first_name || ''} ${log.last_name || ''}`.trim(),
          user_email: log.email,
          user_role: log.role,
          action_type: log.action_type,
          entity_type: log.entity_type,
          entity_id: log.entity_id,
          description: log.description,
          timestamp: log.timestamp,
          time_ago: this.getTimeAgo(log.timestamp)
        }));

        const countResult = await db.get(`
          SELECT COUNT(*) as total FROM activity_logs al WHERE 1=1 ${timeCondition} ${userCondition} ${entityCondition}
        `, params);

        return { success: true, logs: formattedLogs, total: countResult?.total || 0, filters: { timeRange, userId, entityType } };
      } catch (error) {
        console.error('Get filtered activity logs error:', error);
        return buildErrorResponse(error, { scope: 'admin', action: 'getActivityLogsFiltered' });
      }
    });

    ipcMain.handle('admin:getDoctorCaseStudies', async (event, options = {}) => {
      try {
        if (!currentUser || String(currentUser.role || '').toLowerCase() !== 'admin') {
          return { success: false, error: 'Only admin can view case studies' };
        }

        const { search = '', doctor = 'all', limit = 50, offset = 0 } = options || {};
        const db = await DatabaseService.getDatabase();

        const hasCaseHistory = await db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='CaseHistory'");
        if (!hasCaseHistory?.name) {
          return { success: false, error: 'CaseHistory table not found. Import legacy data first.' };
        }
        const hasPatients = await db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='PatientRegister'");
        const hasUsers = await db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='MyUsers'");

        const baseFrom = `
          FROM "CaseHistory" ch
          ${hasPatients?.name ? 'LEFT JOIN "PatientRegister" pr ON TRIM(pr."PatientID") = TRIM(ch."PatientID")' : ''}
          ${hasUsers?.name ? 'LEFT JOIN "MyUsers" mu ON TRIM(mu."UserID") = TRIM(ch."USERID")' : ''}
        `;

        const where = [`TRIM(COALESCE(ch."PatientID", '')) NOT IN ('', '---------')`];
        const params = [];
        if (doctor && doctor !== 'all') {
          where.push(`(TRIM(COALESCE(ch."DoctorName", '')) = ? OR TRIM(COALESCE(mu."FullName", '')) = ? OR TRIM(COALESCE(ch."USERID", '')) = ?)`);
          params.push(doctor, doctor, doctor);
        }
        if (search && String(search).trim().length > 0) {
          const like = `%${String(search).trim()}%`;
          where.push(`(ch."PatientID" LIKE ? OR ch."DoctorName" LIKE ? OR ch."DIAGNOSIS" LIKE ? OR ch."CASEHISTORY" LIKE ? OR ch."FOLLOWUPEXAM" LIKE ? ${hasPatients?.name ? ' OR pr."Names" LIKE ?' : ''} ${hasUsers?.name ? ' OR mu."FullName" LIKE ?' : ''})`);
          params.push(like, like, like, like, like);
          if (hasPatients?.name) params.push(like);
          if (hasUsers?.name) params.push(like);
        }

        const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
        const safeLimit = Number.isFinite(Number(limit)) ? Math.max(1, Math.min(Number(limit), 500)) : 50;
        const safeOffset = Number.isFinite(Number(offset)) ? Math.max(0, Number(offset)) : 0;

        const rows = await db.all(`
          SELECT
            ch."ID" as case_id, ch."PatientID" as patient_id,
            ${hasPatients?.name ? 'pr."Names" as patient_name,' : "'' as patient_name,"}
            ch."TreatmentDate" as treatment_date, ch."NextVisitDate" as next_visit_date,
            ch."DoctorName" as doctor_name,
            ${hasUsers?.name ? 'mu."FullName" as doctor_user_name,' : "'' as doctor_user_name,"}
            ch."DIAGNOSIS" as diagnosis, ch."CASEHISTORY" as case_history,
            ch."FOLLOWUPEXAM" as follow_up_exam, ch."FINALRXOD" as final_rx_od,
            ch."FINALRXOS" as final_rx_os, ch."USERID" as user_id, ch."STAMPDATE" as stamp_date
          ${baseFrom}
          ${whereSql}
          ORDER BY COALESCE(ch."STAMPDATE", ch."TreatmentDate") DESC
          LIMIT ? OFFSET ?
        `, [...params, safeLimit, safeOffset]);

        const totalRow = await db.get(`SELECT COUNT(*) as total ${baseFrom} ${whereSql}`, params);

        const doctors = await db.all(`
          SELECT doctor FROM (
            SELECT DISTINCT TRIM("DoctorName") as doctor FROM "CaseHistory" WHERE TRIM(COALESCE("DoctorName", '')) <> ''
            ${hasUsers?.name ? 'UNION SELECT DISTINCT TRIM("FullName") as doctor FROM "MyUsers" WHERE TRIM(COALESCE("FullName", \'\')) <> \'\'' : ''}
            UNION SELECT DISTINCT TRIM("USERID") as doctor FROM "CaseHistory" WHERE TRIM(COALESCE("USERID", '')) <> ''
          ) d WHERE TRIM(COALESCE(doctor, '')) <> '' ORDER BY doctor ASC
        `);

        return { success: true, data: rows || [], total: totalRow?.total || 0, doctors: (doctors || []).map(d => d.doctor), pagination: { limit: safeLimit, offset: safeOffset } };
      } catch (error) {
        console.error('getDoctorCaseStudies error:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('admin:getTableData', async (event, options = {}) => {
      try {
        const { tableName, limit = 25, offset = 0 } = options;
        if (!tableName || typeof tableName !== 'string') return { success: false, error: 'Table name required' };

        const db = await DatabaseService.getDatabase();
        const safeTableName = String(tableName).replace(/"/g, '""');
        const exists = await db.get("SELECT name FROM sqlite_master WHERE type='table' AND name = ?", [tableName]);
        if (!exists?.name) return { success: false, error: 'Table not found' };

        const safeLimit = Number.isFinite(Number(limit)) ? Math.max(1, Math.min(Number(limit), 500)) : 25;
        const safeOffset = Number.isFinite(Number(offset)) ? Math.max(0, Number(offset)) : 0;

        const rows = await db.all(`SELECT * FROM "${safeTableName}" LIMIT ? OFFSET ?`, [safeLimit, safeOffset]);
        const countResult = await db.get(`SELECT COUNT(*) as total FROM "${safeTableName}"`);

        return { success: true, tableName, data: rows, count: rows.length, total: countResult?.total || 0 };
      } catch (error) {
        console.error('Get table data error:', error);
        return buildErrorResponse(error, { scope: 'admin', action: 'getTableData' });
      }
    });
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // FILE / DATABASE IMPORT HANDLERS
  // ──────────────────────────────────────────────────────────────────────────────

  registerFileHandlers() {
    const safeHandle = (channel, handler) => {
      try { ipcMain.removeHandler(channel); } catch (err) { console.warn('[IPC] removeHandler warning:', err?.message); }
      ipcMain.handle(channel, handler);
    };

    const analyzeBakFile = async (filePath) => {
      try {
        if (!filePath || typeof filePath !== 'string') return { success: false, error: 'File path required' };
        if (!fs.existsSync(filePath)) return { success: false, error: 'File does not exist' };

        const stat_info = fs.statSync(filePath);
        const analysis = { success: true, file: { path: filePath, name: path.basename(filePath), size_bytes: stat_info.size, size_mb: (stat_info.size / (1024 * 1024)).toFixed(2) }, format_detected: null, details: {}, conversion_triggered: false, converted_file: null };

        const fileExt = path.extname(filePath).toLowerCase();
        if (fileExt === '.bak') {
          const outputPath = filePath.replace(/\.bak$/i, '.sqlite');
          const pythonScript = path.join(__dirname, '../../scripts/restore_bak_to_sqlite.py');
          if (!fs.existsSync(pythonScript)) return { success: false, error: 'Conversion script not found' };

          const { spawn } = require('child_process');
          const result = await new Promise((resolve) => {
            const proc = spawn('python', [pythonScript, filePath, outputPath]);
            let stderr = '';
            proc.stderr.on('data', d => stderr += d.toString());
            proc.on('close', code => {
              if (code === 0 && fs.existsSync(outputPath)) {
                const sqlite3 = require('sqlite3').verbose();
                const db = new sqlite3.Database(outputPath, err => {
                  if (err) resolve({ success: false, error: 'Conversion failed: Invalid output file' });
                  else {
                    db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
                      db.close();
                      resolve(err || !tables?.length ? { success: false, error: 'Conversion produced empty database' } : { success: true, convertedPath: outputPath, tables: tables.map(t => t.name), message: `Converted ${path.basename(filePath)} to SQLite` });
                    });
                  }
                });
              } else {
                resolve({ success: false, error: stderr || `Conversion failed with code ${code}` });
              }
            });
            setTimeout(() => { try { proc.kill(); } catch {} resolve({ success: false, error: 'Conversion timeout' }); }, 600000);
          });

          if (result.success) {
            analysis.conversion_triggered = true;
            analysis.converted_file = result.convertedPath;
            analysis.format_detected = 'SQL Server Backup (Auto-converted to SQLite)';
            analysis.details.conversion = { status: 'success', converted_path: result.convertedPath, message: result.message, tables: result.tables || [] };
          } else {
            analysis.format_detected = 'SQL Server Backup (Conversion Failed)';
            analysis.details.conversion = { status: 'error', error: result.error };
          }
          return analysis;
        }

        try {
          const sqlite3 = require('sqlite3').verbose();
          await new Promise((resolve, reject) => {
            const db = new sqlite3.Database(filePath, err => {
              if (err) reject(err);
              else db.all("SELECT name FROM sqlite_master WHERE type='table';", (err, tables) => {
                if (err) reject(err);
                else {
                  analysis.format_detected = 'SQLite Database';
                  analysis.details.sqlite = { is_valid: true, tables: tables.map(t => t.name), table_count: tables.length };
                  db.close(); resolve();
                }
              });
            });
          });
          return analysis;
        } catch {}

        try {
          const content = fs.readFileSync(filePath, { encoding: 'utf-8', flag: 'r' }).substring(0, 5000);
          const lines = content.split('\n').slice(0, 50);
          analysis.details.text = { is_readable: true, line_count: lines.length, first_line: lines[0]?.substring(0, 200) || '', sample_lines: lines.slice(0, 5).map(l => l.substring(0, 150)) };

          if (content.includes('CREATE TABLE') || content.includes('INSERT INTO')) {
            analysis.format_detected = 'SQL Dump File';
            analysis.details.text.format_type = 'SQL';
          } else if (lines[0] && (lines[0].includes(',') || lines[0].includes('\t') || lines[0].includes('|'))) {
            analysis.format_detected = 'CSV or Delimited Text';
            analysis.details.text.format_type = 'CSV';
          } else if (lines[0]?.trim().startsWith('{')) {
            analysis.format_detected = 'JSON';
            analysis.details.text.format_type = 'JSON';
          }
          return analysis;
        } catch {
          const header = Buffer.alloc(16);
          const fd = fs.openSync(filePath, 'r');
          fs.readSync(fd, header, 0, 16, 0);
          fs.closeSync(fd);
          const hex = header.toString('hex').substring(0, 8);
          if (hex.startsWith('53514c69')) analysis.format_detected = 'SQLite Database (corrupted or locked)';
          else if (hex.startsWith('425a6832')) analysis.format_detected = 'Bzip2 Compressed Archive';
          else if (hex.startsWith('1f8b0808')) analysis.format_detected = 'Gzip Compressed Archive';
          else if (hex.startsWith('504b0304')) analysis.format_detected = 'ZIP Archive';
          else analysis.format_detected = 'Unknown Binary Format';
          analysis.details.binary_analysis = { header_hex: hex };
          return analysis;
        }
      } catch (error) {
        console.error('File analysis error:', error);
        return { success: false, error: error.message };
      }
    };

    safeHandle('file:select', async (event, options) => {
      try { return await FileService.selectFile(options); }
      catch (error) { return buildErrorResponse(error, { scope: 'file', action: 'select' }); }
    });

    safeHandle('file:importDb', async (event, dbPath) => {
      try {
        if (!currentUser || String(currentUser.role || '').toLowerCase() !== 'admin') return { success: false, error: 'Only admin can import databases' };
        if (!dbPath || typeof dbPath !== 'string') return { success: false, error: 'Database file path required' };
        return await DatabaseService.importExternalDatabase(dbPath);
      } catch (error) { return buildErrorResponse(error, { scope: 'file', action: 'importDb', entity: 'database' }); }
    });

    safeHandle('file:restoreBackup', async (event, filePath) => {
      try {
        if (!currentUser || String(currentUser.role || '').toLowerCase() !== 'admin') return { success: false, error: 'Only admin can restore backups' };
        if (!filePath || typeof filePath !== 'string') return { success: false, error: 'File path required' };
        return await DatabaseService.restoreBackup(filePath);
      } catch (error) { return buildErrorResponse(error, { scope: 'file', action: 'restoreBackup', entity: 'backup' }); }
    });

    safeHandle('file:runPythonScript', async (event, data) => {
      try {
        if (!currentUser || String(currentUser.role || '').toLowerCase() !== 'admin') return { success: false, error: 'Only admin can run scripts' };
        const { scriptPath, args = [] } = data || {};
        if (!scriptPath || typeof scriptPath !== 'string') return { success: false, error: 'Script path required' };

        const sanitizedPath = scriptPath.replace(/[;&|`$()]/g, '');
        if (!fs.existsSync(sanitizedPath)) return { success: false, error: 'Script file not found' };

        const sanitizedArgs = Array.isArray(args) ? args.map(a => String(a).replace(/[;&|`$()]/g, '')) : [];
        const { spawn } = require('child_process');

        return new Promise(resolve => {
          const proc = spawn('python', [sanitizedPath, ...sanitizedArgs]);
          let stdout = '', stderr = '';
          proc.stdout.on('data', d => stdout += d.toString());
          proc.stderr.on('data', d => stderr += d.toString());
          proc.on('close', code => {
            if (code !== 0) resolve({ success: false, error: stderr || `Script exited with code ${code}` });
            else resolve({ success: true, output: stdout });
          });
          proc.on('error', error => resolve({ success: false, error: error.message }));
        });
      } catch (error) { return buildErrorResponse(error, { scope: 'file', action: 'runPythonScript', entity: 'script' }); }
    });

    safeHandle('file:validateSQLiteFile', async (event, filePath) => {
      try {
        if (!fs.existsSync(filePath)) return { success: false, error: 'File not found' };
        return new Promise(resolve => {
          const sqlite3 = require('sqlite3').verbose();
          const db = new sqlite3.Database(filePath, err => {
            if (err) resolve({ success: false, error: 'Invalid SQLite database' });
            else db.all("SELECT name FROM sqlite_master LIMIT 1", (err, rows) => {
              db.close();
              resolve(err ? { success: false, error: 'Cannot read database' } : { success: true, valid: true });
            });
          });
        });
      } catch (error) { return { success: false, error: error.message }; }
    });

    safeHandle('file:analyzeBakFile', async (event, filePath) => analyzeBakFile(filePath));

    safeHandle('database:importExternalWithSync', async (event, filePath) => {
      try {
        if (!filePath || !fs.existsSync(filePath)) return { success: false, error: 'File not found' };
        const analysis = await analyzeBakFile(filePath);
        if (!analysis.success) return analysis;

        let importPath = filePath;
        if (analysis.conversion_triggered && analysis.converted_file) importPath = analysis.converted_file;

        const importResult = await DatabaseService.importExternalDatabase(importPath);
        if (!importResult.success) return importResult;

        return {
          success: true, analysis, import: importResult,
          summary: { file_analyzed: analysis.file.name, file_size_mb: analysis.file.size_mb, was_converted: analysis.conversion_triggered ? 'YES' : 'NO', format_detected: analysis.format_detected, records_imported: importResult.imported || {}, message: 'Database imported successfully' }
        };
      } catch (error) { return { success: false, error: error.message }; }
    });

    safeHandle('database:importExternalBatchWithSync', async (event, filePaths = []) => {
      try {
        if (!currentUser || String(currentUser.role || '').toLowerCase() !== 'admin') return { success: false, error: 'Only admin can import databases' };
        if (!Array.isArray(filePaths) || filePaths.length === 0) return { success: false, error: 'No files provided' };

        const uniqueFiles = Array.from(new Set(filePaths.map(p => String(p || '').trim()).filter(p => p.length > 0)));
        let totalBytes = 0;
        for (const p of uniqueFiles) { if (fs.existsSync(p)) totalBytes += fs.statSync(p).size; }

        const perFile = [];
        for (const filePath of uniqueFiles) {
          if (!fs.existsSync(filePath)) { perFile.push({ filePath, success: false, error: 'File not found' }); continue; }
          const analysis = await analyzeBakFile(filePath);
          if (!analysis?.success) { perFile.push({ filePath, success: false, error: analysis?.error || 'Analysis failed', analysis }); continue; }
          let importPath = analysis.conversion_triggered && analysis.converted_file ? analysis.converted_file : filePath;
          const importResult = await DatabaseService.importExternalDatabase(importPath);
          if (!importResult?.success) { perFile.push({ filePath, importPath, success: false, error: importResult?.error || 'Import failed', analysis, import: importResult }); continue; }
          perFile.push({ filePath, importPath, success: true, analysis, import: importResult });
        }

        const successCount = perFile.filter(r => r.success).length;
        return { success: successCount === perFile.length, summary: { total_files: perFile.length, success_files: successCount, failed_files: perFile.length - successCount, total_input_size_gb: Number((totalBytes / (1024 * 1024 * 1024)).toFixed(2)) }, results: perFile };
      } catch (error) { return { success: false, error: error.message }; }
    });

    safeHandle('henson:analyzeExport', async (event, filePath) => {
      try {
        const role = String(currentUser?.role || '').toLowerCase();
        if (!['admin', 'doctor', 'assistant'].includes(role)) return { success: false, error: 'Access denied' };
        return await HensonImportService.analyzeFile(filePath);
      } catch (error) { return { success: false, error: error.message }; }
    });

    safeHandle('henson:importExport', async (event, payload = {}) => {
      try {
        const role = String(currentUser?.role || '').toLowerCase();
        if (!['admin', 'doctor', 'assistant'].includes(role)) return { success: false, error: 'Access denied' };
        const filePath = String(payload?.filePath || '').trim();
        if (!filePath) return { success: false, error: 'filePath is required' };

        const analysis = await HensonImportService.analyzeFile(filePath);
        if (!analysis.success) return analysis;

        const db = await DatabaseService.getDatabase();
        const imported = await HensonImportService.importFromFile(db, filePath, { userId: currentUser?.id });

        if (imported.success && currentUser?.id) {
          await DatabaseService.logActivity(currentUser.id, 'import', 'tests', null, `Imported Henson 8000 export: ${path.basename(filePath)} (${imported.imported?.imported_tests || 0} tests)`);
        }

        return { success: imported.success, analysis, import: imported, summary: { file_name: analysis?.file?.name || path.basename(filePath), source_type: analysis?.source_type || imported?.source_type || 'unknown', imported_tests: imported?.imported?.imported_tests || 0, patients_created: imported?.imported?.patients_created || 0, skipped_duplicates: imported?.imported?.skipped_duplicates || 0, skipped_invalid: imported?.imported?.skipped_invalid || 0, warnings: imported?.imported?.warnings || [] }, error: imported.error };
      } catch (error) { return { success: false, error: error.message }; }
    });

    safeHandle('henson:importFolder', async (event, payload = {}) => {
      try {
        const role = String(currentUser?.role || '').toLowerCase();
        if (!['admin', 'doctor', 'assistant'].includes(role)) return { success: false, error: 'Access denied' };
        const folderPath = String(payload?.folderPath || '').trim();
        if (!folderPath || !fs.existsSync(folderPath)) return { success: false, error: 'Folder not found' };

        const entries = fs.readdirSync(folderPath, { withFileTypes: true });
        const files = entries.filter(e => e.isFile()).map(e => path.join(folderPath, e.name)).filter(p => ['.csv', '.txt', '.json', '.sqlite', '.db', '.pdf'].includes(path.extname(p).toLowerCase()));
        if (!files.length) return { success: false, error: 'No supported Henson export files found in folder' };

        const results = [];
        const aggregate = { imported_tests: 0, patients_created: 0, skipped_duplicates: 0, skipped_invalid: 0 };

        for (const filePath of files) {
          const analysis = await HensonImportService.analyzeFile(filePath);
          if (!analysis.success || !analysis.henson_compatible) { results.push({ filePath, success: false, error: !analysis.success ? analysis.error : 'Not Henson-compatible', analysis }); continue; }
          const db = await DatabaseService.getDatabase();
          const imported = await HensonImportService.importFromFile(db, filePath, { userId: currentUser?.id });
          if (imported.success) {
            aggregate.imported_tests += Number(imported.imported?.imported_tests || 0);
            aggregate.patients_created += Number(imported.imported?.patients_created || 0);
            aggregate.skipped_duplicates += Number(imported.imported?.skipped_duplicates || 0);
            aggregate.skipped_invalid += Number(imported.imported?.skipped_invalid || 0);
          }
          results.push({ filePath, success: imported.success, analysis, import: imported, error: imported.error });
        }

        const successFiles = results.filter(r => r.success).length;
        if (currentUser?.id) await DatabaseService.logActivity(currentUser.id, 'import', 'tests', null, `Imported Henson 8000 folder: ${path.basename(folderPath)} (${aggregate.imported_tests} tests)`);
        return { success: successFiles > 0, summary: { folder: folderPath, total_files: files.length, success_files: successFiles, failed_files: files.length - successFiles, ...aggregate }, results };
      } catch (error) { return { success: false, error: error.message }; }
    });

    safeHandle('db:delete', async () => {
      try {
        if (!currentUser || String(currentUser.role || '').toLowerCase() !== 'admin') return { success: false, error: 'Only admin can delete database' };
        return await DatabaseService.deleteDatabase();
      } catch (error) { return buildErrorResponse(error, { scope: 'system', action: 'deleteDatabase', entity: 'database' }); }
    });

    safeHandle('db:update', async (event, updates = {}) => {
      try {
        if (!currentUser || String(currentUser.role || '').toLowerCase() !== 'admin') return { success: false, error: 'Only admin can update database' };
        return await DatabaseService.updateDatabase(updates);
      } catch (error) { return buildErrorResponse(error, { scope: 'system', action: 'updateDatabase', entity: 'database' }); }
    });
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // CHAT HANDLERS
  // ──────────────────────────────────────────────────────────────────────────────

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
        return await DatabaseService.markMessageAsRead(messageId, userId);
      } catch (error) {
        console.error('Mark message read error:', error);
        return buildErrorResponse(error, { scope: 'chat', action: 'markMessageRead', entity: 'message' });
      }
    });

    ipcMain.handle('chat:markAllAsRead', async (event, data = {}) => {
      try {
        const { userId, otherUserId } = data || {};
        if (!userId || !otherUserId) return { success: false, error: 'userId and otherUserId required' };
        return await DatabaseService.markAllMessagesAsRead(userId, otherUserId);
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
        return await DatabaseService.deleteMessage(messageId, user.id);
      } catch (error) {
        console.error('Delete message error:', error);
        return buildErrorResponse(error, { scope: 'chat', action: 'deleteMessage', entity: 'message' });
      }
    });
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // PRESENCE HANDLERS
  // ──────────────────────────────────────────────────────────────────────────────

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

  // ──────────────────────────────────────────────────────────────────────────────
  // SETTINGS HANDLERS
  // ──────────────────────────────────────────────────────────────────────────────

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

  // ──────────────────────────────────────────────────────────────────────────────
  // SYSTEM HANDLERS
  // ──────────────────────────────────────────────────────────────────────────────

  registerSystemHandlers() {
    const safeHandle = (channel, handler) => {
      try { ipcMain.removeHandler(channel); } catch (err) { console.warn('[IPC] removeHandler warning:', err?.message); }
      ipcMain.handle(channel, handler);
    };

    safeHandle('system:healthCheck', async () => ({ success: true, status: 'healthy', timestamp: new Date().toISOString() }));

    safeHandle('system:checkOnline', async () => {
      try {
        const db = await DatabaseService.getDatabase();
        await db.get('SELECT 1 as ok');
        const dns = require('dns');
        const checkConnection = new Promise(resolve => { dns.lookup('google.com', err => resolve(!err)); });
        const timeout = new Promise(resolve => { setTimeout(() => resolve(false), 5000); });
        const online = await Promise.race([checkConnection, timeout]);
        return { success: true, online, timestamp: new Date().toISOString() };
      } catch (error) {
        return buildErrorResponse(error, { scope: 'system', action: 'checkOnline' }, { online: false, timestamp: new Date().toISOString() });
      }
    });

    safeHandle('system:setCvfWatchPath', async (event, payload = {}) => {
      try {
        if (!currentUser) return { success: false, error: 'Authentication required' };
        const dir = app.getPath('userData');
        const cfgPath = path.join(dir, 'config.json');
        let existing = {};
        if (fs.existsSync(cfgPath)) {
          try { existing = JSON.parse(fs.readFileSync(cfgPath, 'utf-8')); } catch {}
        }
        const data = { ...existing, cvf_watch_path: payload?.path || '' };
        fs.writeFileSync(cfgPath, JSON.stringify(data));
        return { success: true, path: data.cvf_watch_path };
      } catch (error) { return buildErrorResponse(error, { scope: 'system', action: 'setCvfWatchPath' }); }
    });

    safeHandle('system:getCvfWatchPath', async () => {
      try {
        const dir = app.getPath('userData');
        const cfgPath = path.join(dir, 'config.json');
        if (!fs.existsSync(cfgPath)) return { success: true, path: null };
        const data = JSON.parse(fs.readFileSync(cfgPath, 'utf-8'));
        return { success: true, path: data.cvf_watch_path || null };
      } catch (error) { return { success: false, error: error.message, path: null }; }
    });

    safeHandle('system:getNetworkDbPath', async () => {
      try {
        const dir = app.getPath('userData');
        const cfgPath = path.join(dir, 'config.json');
        if (!fs.existsSync(cfgPath)) return { success: true, path: null };
        const data = JSON.parse(fs.readFileSync(cfgPath, 'utf-8'));
        return { success: true, path: data.network_db_path || null };
      } catch (error) { return { success: false, error: error.message, path: null }; }
    });

    safeHandle('system:setNetworkDbPath', async (event, payload) => {
      try {
        if (!currentUser || String(currentUser.role || '').toLowerCase() !== 'admin') return { success: false, error: 'Only admin can change network database path' };
        const dir = app.getPath('userData');
        const cfgPath = path.join(dir, 'config.json');
        let existing = {};
        if (fs.existsSync(cfgPath)) {
          try { existing = JSON.parse(fs.readFileSync(cfgPath, 'utf-8')); } catch {}
        }
        const data = { ...existing, network_db_path: payload?.path || '' };
        fs.writeFileSync(cfgPath, JSON.stringify(data));
        return { success: true, path: data.network_db_path };
      } catch (error) { return buildErrorResponse(error, { scope: 'system', action: 'setNetworkDbPath' }); }
    });

    safeHandle('system:getServerConfig', async () => {
      try {
        const dir = app.getPath('userData');
        const cfgPath = path.join(dir, 'config.json');
        let config = { isServerMode: false, serverUrl: '', autoConnect: true, deviceName: '', serverPort: 3001 };
        if (fs.existsSync(cfgPath)) {
          try { config = { ...config, ...JSON.parse(fs.readFileSync(cfgPath, 'utf-8')) }; } catch {}
        }
        return { success: true, config };
      } catch (error) { return { success: false, error: error.message }; }
    });

    safeHandle('system:saveServerConfig', async (event, config = {}) => {
      try {
        if (!currentUser || String(currentUser.role || '').toLowerCase() !== 'admin') return { success: false, error: 'Only admin can change server settings' };
        const dir = app.getPath('userData');
        const cfgPath = path.join(dir, 'config.json');
        let existing = {};
        if (fs.existsSync(cfgPath)) {
          try { existing = JSON.parse(fs.readFileSync(cfgPath, 'utf-8')); } catch {}
        }
        const data = { ...existing, ...config };
        fs.writeFileSync(cfgPath, JSON.stringify(data));
        return { success: true, config: data };
      } catch (error) { return buildErrorResponse(error, { scope: 'system', action: 'saveServerConfig' }); }
    });
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // CVF HANDLERS
  // ──────────────────────────────────────────────────────────────────────────────

  registerCvfHandlers() {
    ipcMain.handle('cvf:listIncomingFiles', async (event, payload = {}) => {
      try {
        if (!currentUser) return { success: false, error: 'Authentication required' };
        const role = String(currentUser.role || '').toLowerCase();
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
        if (!currentUser) return { success: false, error: 'Authentication required' };
        const role = String(currentUser.role || '').toLowerCase();
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

        if (currentUser?.id) {
          await DatabaseService.logActivity(currentUser.id, 'create', 'report', report.id, `Attached CVF PDF: ${path.basename(filePath)}`);
        }

        return { success: true, report };
      } catch (error) { return buildErrorResponse(error, { scope: 'cvf', action: 'attachPdfToPatient' }); }
    });
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // WINDOW HANDLERS
  // ──────────────────────────────────────────────────────────────────────────────

  registerWindowHandlers() {
    ipcMain.handle('window:openMain', async () => {
      try {
        const win = BrowserWindow.getFocusedWindow();
        if (win) {
          const isDev = process.env.NODE_ENV === 'development';
          if (isDev) await win.loadURL('http://localhost:5173/');
          else await win.loadFile(path.join(__dirname, '../../dist/index.html'));
        }
        return { success: true };
      } catch (error) { return buildErrorResponse(error, { scope: 'window', action: 'openMain' }); }
    });

    ipcMain.handle('window:closeAuth', async () => {
      try {
        const win = BrowserWindow.getFocusedWindow();
        if (win) win.close();
        return { success: true };
      } catch (error) { return buildErrorResponse(error, { scope: 'window', action: 'closeAuth' }); }
    });

    ipcMain.handle('file:save', async (event, options = {}) => {
      try {
        const { content, filename, contentType } = options;
        if (!content) return { success: false, error: 'Content required' };
        const { dialog } = require('electron');
        const win = BrowserWindow.getFocusedWindow();
        const result = await dialog.showSaveDialog(win, {
          defaultPath: filename || 'export',
          filters: contentType === 'json' ? [{ name: 'JSON', extensions: ['json'] }] : [{ name: 'All Files', extensions: ['*'] }]
        });
        if (result.canceled || !result.filePath) return { success: false, error: 'Save cancelled' };
        const ffs = require('fs');
        if (contentType === 'json') ffs.writeFileSync(result.filePath, JSON.stringify(content, null, 2), 'utf-8');
        else ffs.writeFileSync(result.filePath, content);
        return { success: true, path: result.filePath };
      } catch (error) { return buildErrorResponse(error, { scope: 'file', action: 'save' }); }
    });

    ipcMain.handle('app:checkUpdate', async () => ({ success: true, updateAvailable: false, message: 'Auto-update not configured' }));
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // DASHBOARD HANDLERS
  // ──────────────────────────────────────────────────────────────────────────────

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

    ipcMain.handle('dashboard:getSalesRecords', async (event, filters = {}) => {
      try {
        const records = await DatabaseService.getSalesRecords(filters);
        return { success: true, records };
      } catch (error) {
        console.error('Get sales records error:', error);
        return buildErrorResponse(error, { scope: 'dashboard', action: 'getSalesRecords' });
      }
    });
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // SERVER CONNECTION HANDLERS (NEW - Phase 4/5)
  // ──────────────────────────────────────────────────────────────────────────────

  registerServerHandlers() {
    ipcMain.handle('server:start', async (event, serverConfig = {}) => {
      try {
        const ServerManager = require('../server/ServerManager');
        if (ServerManager.isRunning) {
          return { success: true, message: 'Server already running', status: ServerManager.getStatus() };
        }
        await ServerManager.start({ port: serverConfig.port || 3001 });
        const newConfig = { ...this.appConfig, isServerMode: true, serverPort: serverConfig.port || 3001 };
        if (this.saveAppConfig) this.saveAppConfig(newConfig);
        this.appConfig = newConfig;
        return { success: true, status: ServerManager.getStatus() };
      } catch (error) {
        console.error('[Server] Start error:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('server:stop', async () => {
      try {
        const ServerManager = require('../server/ServerManager');
        if (!ServerManager.isRunning) {
          return { success: true, message: 'Server not running' };
        }
        await ServerManager.stop();
        const newConfig = { ...this.appConfig, isServerMode: false };
        if (this.saveAppConfig) this.saveAppConfig(newConfig);
        this.appConfig = newConfig;
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('server:status', async () => {
      try {
        const ServerManager = require('../server/ServerManager');
        return {
          success: true,
          status: ServerManager.getStatus(),
          config: this.appConfig || {}
        };
      } catch (error) { return { success: false, error: error.message }; }
    });

    ipcMain.handle('server:connect', async (event, url) => {
      try {
        return { success: true, message: 'Server connection initiated', url };
      } catch (error) { return { success: false, error: error.message }; }
    });

    ipcMain.handle('server:disconnect', async () => {
      try { return { success: true }; } catch (error) { return { success: false, error: error.message }; }
    });

    ipcMain.handle('server:getStatus', async () => {
      try {
        const ServerManager = require('../server/ServerManager');
        const status = ServerManager.getStatus ? ServerManager.getStatus() : { running: false, port: 3001 };
        return { success: true, status, config: this.appConfig || {} };
      } catch (error) { return { success: false, error: error.message }; }
    });
  }

  registerServerConfigHandlers() {
    ipcMain.handle('serverConfig:get', async () => {
      try {
        return { success: true, config: this.appConfig || {} };
      } catch (error) { return { success: false, error: error.message }; }
    });

    ipcMain.handle('serverConfig:set', async (event, partialConfig) => {
      try {
        if (!this.saveAppConfig) return { success: false, error: 'Save not available' };
        const newConfig = { ...this.appConfig, ...partialConfig };
        const saved = this.saveAppConfig(newConfig);
        if (saved) { this.appConfig = newConfig; }
        return { success: saved, config: newConfig };
      } catch (error) { return { success: false, error: error.message }; }
    });

    ipcMain.handle('serverConfig:getSqlServer', async () => {
      try {
        return { success: true, config: this.appConfig?.sql_server || {} };
      } catch (error) { return { success: false, error: error.message }; }
    });

    ipcMain.handle('serverConfig:setSqlServer', async (event, sqlConfig) => {
      try {
        if (!this.saveAppConfig) return { success: false, error: 'Save not available' };
        const newConfig = { ...this.appConfig, sql_server: { ...this.appConfig?.sql_server, ...sqlConfig } };
        const saved = this.saveAppConfig(newConfig);
        if (saved) { this.appConfig = newConfig; }
        return { success: saved };
      } catch (error) { return { success: false, error: error.message }; }
    });
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // UTILITY
  // ──────────────────────────────────────────────────────────────────────────────

  getTimeAgo(timestamp) {
    if (!timestamp) return 'Unknown';
    const now = Date.now();
    const then = new Date(timestamp).getTime();
    const diff = now - then;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString();
  }
}

module.exports = IPCHandlers;
