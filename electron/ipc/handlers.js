const { ipcMain } = require('electron');
const DatabaseService = require('../../services/DatabaseService');
const FileService = require('../../services/FileService');
const path = require('path');
const SyncService = require('../../services/SyncService');
const SupabaseService = require('../../src/lib/supabase');

let currentUser = null; // Centralized user state in the main process

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
        console.log('IPC handlers registered successfully');
    }

    registerAuthHandlers() {
        // Get current user (placeholder, replace with real session logic)
        ipcMain.handle('auth:getCurrentUser', async () => {
            return {
                success: true,
                user: currentUser // Return the actual currentUser from the main process
            };
        });

        // Logout user (clear session, log activity)
        ipcMain.handle('auth:logout', async (event, data = {}) => {
            try {
                // Fallback to currentUser if userId not provided
                const userId = (data && data.userId) ? data.userId : (currentUser ? currentUser.id : null);
                if (userId) {
                    try {
                        await DatabaseService.logActivity(userId, 'logout', 'user', userId, 'User logged out');
                    } catch (logErr) {
                        // Optional: log error
                    }
                }
                currentUser = null;
                return { success: true, message: 'Logged out successfully' };
            } catch (error) {
                console.error('Logout error:', error);
                return { error: error.message };
            }
        });

        // Always clear any existing handler first
        ipcMain.removeHandler('auth:isFirstRun');

        // Check if this is first run
        ipcMain.handle('auth:isFirstRun', async () => {
            try {
                const db = await DatabaseService.getDatabase();
                const result = await db.get('SELECT COUNT(*) as count FROM users');
                const isFirstRun = result.count === 0;  // If data exists (count > 0), false → login
                console.log('First run check: User count =', result.count, 'isFirstRun =', isFirstRun);  // Debug log
                return { success: true, isFirstRun };
            } catch (error) {
                console.error('Error checking first run:', error);
                return { error: error.message, isFirstRun: true };  // Fallback to setup on error
            }
            });


        // Login user
        ipcMain.handle('auth:login', async (event, email, password) => {
            try {
                console.log('Login attempt:', { email, password: '***' });

                if (!email || !password) {
                    return { error: 'Email and password are required' };
                }

                const user = await DatabaseService.authenticateUser(email, password);
                console.log('Authentication result:', user ? 'SUCCESS' : 'FAILED');

                if (user) {
                    // Add name field by combining first_name and last_name
                    const userWithName = {
                        ...user,
                        name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
                        phone: user.phone_number
                    };
                    currentUser = userWithName; // Set currentUser on successful login
                    SyncService.initializeRealtime(userWithName); // Start real-time services
                    return { success: true, user: userWithName };
                } else {
                    return { error: 'Invalid credentials' };
                }
            } catch (error) {
                console.error('Login error:', error);
                return { error: error.message };
            }
        });

       // Safe Mapping: Complete setup handler
        ipcMain.handle('auth:completeSetup', async (event, data = {}) => {
            const { clinicData, adminData } = data;
            try {
                // Validate core fields
                if (!adminData?.firstName || !adminData?.lastName || !adminData?.email || !adminData?.password || !adminData?.role) {
                return { error: 'Missing core fields: admin name/email/password/role' };
                }

                // Normalize role for DB
                let dbRole = adminData.role.toLowerCase().trim();
                if (dbRole === 'clinic assistant') {
                    dbRole = 'assistant';
                }

                // Build userData
                const userData = {
                first_name: adminData.firstName,
                last_name: adminData.lastName,
                email: adminData.email,
                password: adminData.password,
                role: dbRole,
                phone_number: adminData.phoneNumber || null,
                gender: adminData.gender || 'other'
                };

                // Create user
                const userResult = await DatabaseService.createUser(userData);
                if (!userResult) {
                return { error: 'Failed to create user' };
                }
                // Add name field by combining first_name and last_name
                const userWithName = {
                    ...userResult,
                    name: `${userResult.first_name || ''} ${userResult.last_name || ''}`.trim(),
                    phone: userResult.phone_number
                };
                currentUser = userWithName; // Set currentUser on successful setup
                SyncService.initializeRealtime(userWithName); // Start real-time services


                // Mark setup complete
                await DatabaseService.setSetting('setup_complete', 'true');

                // Log activity
                try {
                await DatabaseService.logActivity(userResult.id, 'setup', 'system', null, `Setup by ${userData.first_name} ${userData.last_name} (${dbRole})`);
                } catch (logErr) {
                console.warn('Log skipped:', logErr);
                }

                return { success: true, user: userWithName };
            } catch (error) {
                console.error('Setup handler error:', error);
                return { error: error.message };
            }
            });

        // Create user (setup)
        ipcMain.handle('auth:createUser', async (event, userData) => {
            try {
                // Map form fields to database fields
                const dbUserData = {
                    first_name: userData.firstName,
                    last_name: userData.lastName,
                    email: userData.email,
                    password: userData.password,
                    role: userData.role,
                    phone_number: userData.phoneNumber || null,
                    gender: userData.gender || 'other'
                };

                const requiredFields = ['first_name', 'last_name', 'email', 'password', 'role'];
                for (const field of requiredFields) {
                    if (!dbUserData[field]) {
                        return { error: `${field} is required` };
                    }
                }

                // Save to SQLite first
                const user = await DatabaseService.createUser(dbUserData);

                // Sync to Supabase if online
                try {
                    if (SupabaseService.isConfigured && await SyncService.isOnline()) {
                        await SyncService.uploadRecord('users', user);
                    }
                } catch (syncError) {
                    console.warn('User sync to Supabase failed:', syncError.message);
                    // Don't fail the operation if sync fails
                }

                // Add name field by combining first_name and last_name
                const userWithName = {
                    ...user,
                    name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
                    phone: user.phone_number
                };
                currentUser = userWithName; // Set currentUser on successful user creation
                return { success: true, user: userWithName };
            } catch (error) {
                console.error('Create user error:', error);
                return { error: error.message };
            }
        });

        // Get all users
        ipcMain.handle('auth:getAllUsers', async () => {
            try {
                const users = await DatabaseService.getAllUsers();
                return { success: true, users };
            } catch (error) {
                console.error('Get users error:', error);
                return { error: error.message };
            }
        });
    }

    registerPatientHandlers() {
        // Get all patients
        ipcMain.handle('patients:getAll', async (event, filters = {}) => {
            try {
                const patients = await DatabaseService.getAllPatients(filters);
                return { success: true, patients };
            } catch (error) {
                console.error('Get patients error:', error);
                return { error: error.message };
            }
        });

        // Get patient by ID
        ipcMain.handle('patients:getById', async (event, id) => {
            try {
                if (!id) {
                    return { error: 'Patient ID is required' };
                }

                const patient = await DatabaseService.getPatientById(id);
                if (patient) {
                    return { success: true, patient };
                } else {
                    return { error: 'Patient not found' };
                }
            } catch (error) {
                console.error('Get patient error:', error);
                return { error: error.message };
            }
        });

        // Create patient
        ipcMain.handle('patients:create', async (event, patientData) => {
            try {
                const requiredFields = ['patient_id', 'first_name', 'last_name', 'dob', 'gender'];
                for (const field of requiredFields) {
                    if (!patientData[field]) {
                        return { error: `${field} is required` };
                    }
                }

                // Save to SQLite first
                const patient = await DatabaseService.createPatient(patientData);

                // Sync to Supabase if online
                try {
                    if (SupabaseService.isConfigured && await SyncService.isOnline()) {
                        await SyncService.uploadRecord('patients', patient);
                    }
                } catch (syncError) {
                    console.warn('Patient sync to Supabase failed:', syncError.message);
                    // Don't fail the operation if sync fails
                }

                return { success: true, patient };
            } catch (error) {
                console.error('Create patient error:', error);
                return { error: error.message };
            }
        });

        // Update patient
        ipcMain.handle('patients:update', async (event, data = {}) => {
            const { id, patientData } = data;
            try {
                if (!id) {
                    return { error: 'Patient ID is required' };
                }

                // Update SQLite first
                const patient = await DatabaseService.updatePatient(id, patientData);

                // Sync to Supabase if online
                try {
                    if (SupabaseService.isConfigured && await SyncService.isOnline()) {
                        await SyncService.uploadRecord('patients', patient, true);
                    }
                } catch (syncError) {
                    console.warn('Patient update sync to Supabase failed:', syncError.message);
                    // Don't fail the operation if sync fails
                }

                return { success: true, patient };
            } catch (error) {
                console.error('Update patient error:', error);
                return { error: error.message };
            }
        });

        // Delete patient
        ipcMain.handle('patients:delete', async (event, id) => {
            try {
                if (!id) {
                    return { error: 'Patient ID is required' };
                }

                // Get patient data before deletion for sync
                const patient = await DatabaseService.getPatientById(id);

                // Delete from SQLite first
                const result = await DatabaseService.deletePatient(id);

                // Sync deletion to Supabase if online
                try {
                    if (SupabaseService.isConfigured && await SyncService.isOnline() && patient) {
                        await SupabaseService.client
                            .from('patients')
                            .delete()
                            .eq('id', id);
                    }
                } catch (syncError) {
                    console.warn('Patient deletion sync to Supabase failed:', syncError.message);
                    // Don't fail the operation if sync fails
                }

                return result;
            } catch (error) {
                console.error('Delete patient error:', error);
                return { error: error.message };
            }
        });

        // Search patients
        ipcMain.handle('patients:search', async (event, searchTerm) => {
            try {
                const patients = await DatabaseService.getAllPatients({
                    search: searchTerm
                });
                return { success: true, patients };
            } catch (error) {
                console.error('Search patients error:', error);
                return { error: error.message };
            }
        });
    }

    registerTestHandlers() {
        // Get all tests
        ipcMain.handle('tests:getAll', async (event, filters = {}) => {
            try {
                const tests = await DatabaseService.getAllTests(filters);
                return { success: true, tests };
            } catch (error) {
                console.error('Get tests error:', error);
                return { error: error.message };
            }
        });

        // Get test by ID
        ipcMain.handle('tests:getById', async (event, id) => {
            try {
                if (!id) {
                    return { error: 'Test ID is required' };
                }

                const test = await DatabaseService.getTestById(id);
                if (test) {
                    // Parse raw_data if it's a JSON string
                    if (test.raw_data && typeof test.raw_data === 'string') {
                        try {
                            test.raw_data = JSON.parse(test.raw_data);
                        } catch (e) {
                            // Leave as string if parsing fails
                        }
                    }
                    return { success: true, test };
                } else {
                    return { error: 'Test not found' };
                }
            } catch (error) {
                console.error('Get test error:', error);
                return { error: error.message };
            }
        });

        // Create test
        ipcMain.handle('tests:create', async (event, testData) => {
            try {
                const requiredFields = ['patient_id', 'eye', 'machine_type', 'raw_data'];
                for (const field of requiredFields) {
                    if (!testData[field]) {
                        return { error: `${field} is required` };
                    }
                }

                const test = await DatabaseService.createTest(testData);
                return { success: true, test };
            } catch (error) {
                console.error('Create test error:', error);
                return { error: error.message };
            }
        });

        // Update test
        ipcMain.handle('tests:update', async (event, data = {}) => {
            const { id, testData } = data;
            try {
                if (!id) {
                    return { error: 'Test ID is required' };
                }

                const test = await DatabaseService.updateTest(id, testData);
                return { success: true, test };
            } catch (error) {
                console.error('Update test error:', error);
                return { error: error.message };
            }
        });

        // Delete test
        ipcMain.handle('tests:delete', async (event, id) => {
            try {
                if (!id) {
                    return { error: 'Test ID is required' };
                }

                const result = await DatabaseService.deleteTest(id);
                return result;
            } catch (error) {
                console.error('Delete test error:', error);
                return { error: error.message };
            }
        });

        // Get tests for patient
        ipcMain.handle('tests:getByPatient', async (event, patientId) => {
            try {
                if (!patientId) {
                    return { error: 'Patient ID is required' };
                }

                const tests = await DatabaseService.getAllTests({ patientId });
                return { success: true, tests };
            } catch (error) {
                console.error('Get patient tests error:', error);
                return { error: error.message };
            }
        });
    }

    registerReportHandlers() {
        // Get all reports
        ipcMain.handle('reports:getAll', async (event, filters = {}) => {
            try {
                const reports = await DatabaseService.getAllReports(filters);
                return { success: true, reports };
            } catch (error) {
                console.error('Get reports error:', error);
                return { error: error.message };
            }
        });

        // Get report by ID
        ipcMain.handle('reports:getById', async (event, id) => {
            try {
                if (!id) {
                    return { error: 'Report ID is required' };
                }

                const report = await DatabaseService.getReportById(id);
                if (report) {
                    return { success: true, report };
                } else {
                    return { error: 'Report not found' };
                }
            } catch (error) {
                console.error('Get report error:', error);
                return { error: error.message };
            }
        });

        // Generate report
        ipcMain.handle('reports:generate', async (event, data = {}) => {
            const { patientId, testIds, title, reportType } = data;
            try {
                if (!patientId) {
                    return { error: 'Patient ID is required' };
                }

                // Get patient data
                const patient = await DatabaseService.getPatientById(patientId);
                if (!patient) {
                    return { error: 'Patient not found' };
                }

                // Get test data
                let testsData = [];
                if (testIds && testIds.length > 0) {
                    for (const testId of testIds) {
                        const test = await DatabaseService.getTestById(testId);
                        if (test) testsData.push(test);
                    }
                } else {
                    // Get all tests for patient
                    const allTests = await DatabaseService.getAllTests({ patientId });
                    testsData = allTests;
                }

                // Generate PDF
                const pdfResult = await FileService.generatePatientReport(patient, testsData);
                if (!pdfResult.success) {
                    return { error: pdfResult.error };
                }

                // Save report to database
                const reportData = {
                    patient_id: patientId,
                    report_file: pdfResult.pdfData,
                    report_type: reportType || 'visual_field_report',
                    title: title || `Report for ${patient.first_name} ${patient.last_name}`
                };

                const report = await DatabaseService.createReport(reportData);
                return {
                    success: true,
                    report,
                    fileName: pdfResult.fileName
                };
            } catch (error) {
                console.error('Generate report error:', error);
                return { error: error.message };
            }
        });

        // Export report
        ipcMain.handle('reports:export', async (event, data = {}) => {
            const { reportId, format } = data;
            try {
                if (!reportId) {
                    return { error: 'Report ID is required' };
                }

                const report = await DatabaseService.getReportById(reportId);
                if (!report) {
                    return { error: 'Report not found' };
                }

                // Show save dialog and save file
                const saveResult = await FileService.saveFile({
                    title: 'Export Report',
                    defaultPath: `${report.patient_identifier}_report.pdf`,
                    filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
                    data: report.report_file
                });

                return saveResult;
            } catch (error) {
                console.error('Export report error:', error);
                return { error: error.message };
            }
        });

        // Delete report
        ipcMain.handle('reports:delete', async (event, id) => {
            try {
                if (!id) {
                    return { error: 'Report ID is required' };
                }

                const result = await DatabaseService.deleteReport(id);
                return result;
            } catch (error) {
                console.error('Delete report error:', error);
                return { error: error.message };
            }
        });
    }

    registerInventoryHandlers() {
        // Get all inventory items
        ipcMain.handle('inventory:getAll', async (event, filters = {}) => {
            try {
                const items = await DatabaseService.getAllInventoryItems(filters);
                return { success: true, items };
            } catch (error) {
                console.error('Get inventory items error:', error);
                return { error: error.message };
            }
        });

        // Get inventory item by ID
        ipcMain.handle('inventory:getById', async (event, id) => {
            try {
                if (!id) {
                    return { error: 'Inventory item ID is required' };
                }

                const item = await DatabaseService.getInventoryItemById(id);
                if (item) {
                    return { success: true, item };
                } else {
                    return { error: 'Inventory item not found' };
                }
            } catch (error) {
                console.error('Get inventory item error:', error);
                return { error: error.message };
            }
        });

        // Get inventory item by code
        ipcMain.handle('inventory:getByCode', async (event, itemCode) => {
            try {
                if (!itemCode) {
                    return { error: 'Item code is required' };
                }

                const item = await DatabaseService.getInventoryItemByCode(itemCode);
                if (item) {
                    return { success: true, item };
                } else {
                    return { error: 'Inventory item not found' };
                }
            } catch (error) {
                console.error('Get inventory item by code error:', error);
                return { error: error.message };
            }
        });

        // Create inventory item
        ipcMain.handle('inventory:create', async (event, itemData) => {
            try {
                const requiredFields = ['item_code', 'item_name'];
                for (const field of requiredFields) {
                    if (!itemData[field]) {
                        return { error: `${field} is required` };
                    }
                }

                // Check if item code already exists
                const existing = await DatabaseService.getInventoryItemByCode(itemData.item_code);
                if (existing) {
                    return { error: 'Item code already exists' };
                }

                const item = await DatabaseService.createInventoryItem(itemData);
                return { success: true, item };
            } catch (error) {
                console.error('Create inventory item error:', error);
                return { error: error.message };
            }
        });

        // Update inventory item
        ipcMain.handle('inventory:update', async (event, data = {}) => {
            const { id, itemData } = data;
            try {
                if (!id) {
                    return { error: 'Inventory item ID is required' };
                }

                const item = await DatabaseService.updateInventoryItem(id, itemData);
                return { success: true, item };
            } catch (error) {
                console.error('Update inventory item error:', error);
                return { error: error.message };
            }
        });

        // Update inventory quantity
        ipcMain.handle('inventory:updateQuantity', async (event, data = {}) => {
            const { id, quantity, userId, notes } = data;
            try {
                if (!id || quantity === undefined || quantity === null) {
                    return { error: 'Item ID and quantity are required' };
                }

                if (quantity < 0) {
                    return { error: 'Quantity cannot be negative' };
                }

                const item = await DatabaseService.updateInventoryQuantity(id, quantity, userId, notes);
                return { success: true, item };
            } catch (error) {
                console.error('Update inventory quantity error:', error);
                return { error: error.message };
            }
        });

        // Delete inventory item
        ipcMain.handle('inventory:delete', async (event, id) => {
            try {
                if (!id) {
                    return { error: 'Inventory item ID is required' };
                }

                const result = await DatabaseService.deleteInventoryItem(id);
                return result;
            } catch (error) {
                console.error('Delete inventory item error:', error);
                return { error: error.message };
            }
        });

        // Get inventory statistics
        ipcMain.handle('inventory:getStatistics', async () => {
            try {
                const stats = await DatabaseService.getInventoryStatistics();
                return { success: true, stats };
            } catch (error) {
                console.error('Get inventory statistics error:', error);
                return { error: error.message };
            }
        });

        // Get low stock items
        ipcMain.handle('inventory:getLowStock', async () => {
            try {
                const items = await DatabaseService.getLowStockItems();
                return { success: true, items };
            } catch (error) {
                console.error('Get low stock items error:', error);
                return { error: error.message };
            }
        });

        // Get expiring items
        ipcMain.handle('inventory:getExpiring', async (event, days = 30) => {
            try {
                const items = await DatabaseService.getExpiringItems(days);
                return { success: true, items };
            } catch (error) {
                console.error('Get expiring items error:', error);
                return { error: error.message };
            }
        });

        // Search inventory
        ipcMain.handle('inventory:search', async (event, searchTerm) => {
            try {
                const items = await DatabaseService.getAllInventoryItems({ search: searchTerm });
                return { success: true, items };
            } catch (error) {
                console.error('Search inventory error:', error);
                return { error: error.message };
            }
        });
    }

    registerAdminHandlers() {
        // Get all users with detailed information
        ipcMain.handle('admin:getAllUsers', async (event) => {
            try {
                const users = await DatabaseService.getAllUsersDetailed();
                return { success: true, users };
            } catch (error) {
                console.error('Get all users error:', error);
                return { error: error.message };
            }
        });

        // Get user statistics
        ipcMain.handle('admin:getUserStats', async (event, userId) => {
            try {
                if (!userId) {
                    return { error: 'User ID is required' };
                }

                const stats = await DatabaseService.getUserStatistics(userId);
                return { success: true, stats };
            } catch (error) {
                console.error('Get user stats error:', error);
                return { error: error.message };
            }
        });

        // Update user status
        ipcMain.handle('admin:updateUserStatus', async (event, data = {}) => {
            const { userId, isActive, updatedBy } = data;
            try {
                if (!userId || updatedBy === undefined) {
                    return { error: 'User ID and updatedBy are required' };
                }

                const user = await DatabaseService.updateUserStatus(userId, isActive, updatedBy);
                return { success: true, user };
            } catch (error) {
                console.error('Update user status error:', error);
                return { error: error.message };
            }
        });

        // Update user details (admin function)
        ipcMain.handle('admin:updateUser', async (event, data = {}) => {
            const { userId, userData, updatedBy } = data;
            try {
                if (!userId || !userData || !updatedBy) {
                    return { error: 'User ID, user data, and updater ID are required' };
                }
                const user = await DatabaseService.updateUser(userId, userData, updatedBy);
                return { success: true, user };
            } catch (error) {
                console.error('Update user error:', error);
                return { error: error.message };
            }
        });

        // Delete user
        ipcMain.handle('admin:deleteUser', async (event, data = {}) => {
            const { userId, deletedBy } = data;
            try {
                if (!userId || !deletedBy) {
                    return { error: 'User ID and deletedBy are required' };
                }

                const result = await DatabaseService.deleteUser(userId, deletedBy);
                return result;
            } catch (error) {
                console.error('Delete user error:', error);
                return { error: error.message };
            }
        });

        // Get activity logs
        ipcMain.handle('admin:getActivityLogs', async (event, filters = {}) => {
            try {
                const logs = await DatabaseService.getActivityLogs(filters);
                return { success: true, logs };
            } catch (error) {
                console.error('Get activity logs error:', error);
                return { error: error.message };
            }
        });

        // Get activity statistics
        ipcMain.handle('admin:getActivityStats', async (event) => {
            try {
                const stats = await DatabaseService.getActivityStatistics();
                return { success: true, stats };
            } catch (error) {
                console.error('Get activity stats error:', error);
                return { error: error.message };
            }
        });

        // Log activity (for manual logging)
        ipcMain.handle('admin:logActivity', async (event, data = {}) => {
            const { userId, actionType, entityType, entityId, description, ipAddress, userAgent } = data;
            try {
                await DatabaseService.logActivity(userId, actionType, entityType, entityId, description, ipAddress, userAgent);
                return { success: true };
            } catch (error) {
                console.error('Log activity error:', error);
                return { error: error.message };
            }
        });

        // Create new user (Admin function)
        ipcMain.handle('admin:createUser', async (event, data = {}) => {
            const { userData, createdBy } = data;
            try {
                // Map frontend field names to database field names
                const dbUserData = {
                    first_name: userData.firstName || userData.first_name,
                    last_name: userData.lastName || userData.last_name,
                    email: userData.email,
                    password: userData.password,
                    role: userData.role,
                    phone_number: userData.phoneNumber || userData.phone_number || null,
                    gender: userData.gender || 'other'
                };

                const requiredFields = ['first_name', 'last_name', 'email', 'password', 'role'];
                for (const field of requiredFields) {
                    if (!dbUserData[field]) {
                        return { error: `${field} is required` };
                    }
                }

                // Check if email already exists
                const existingUsers = await DatabaseService.getAllUsers();
                const emailExists = existingUsers.find(user => user.email.toLowerCase() === dbUserData.email.toLowerCase());
                if (emailExists) {
                    return { error: 'Email already exists' };
                }

                // Save to SQLite first
                const user = await DatabaseService.createUser(dbUserData);

                // Sync to Supabase if online
                try {
                    if (SupabaseService.isConfigured && await SyncService.isOnline()) {
                        await SyncService.uploadRecord('users', user);
                    }
                } catch (syncError) {
                    console.warn('User sync to Supabase failed:', syncError.message);
                    // Don't fail the operation if sync fails
                }

                // Log the activity
                if (createdBy) {
                    await DatabaseService.logActivity(
                        createdBy,
                        'create',
                        'user',
                        user.id,
                        `Created new user: ${user.first_name} ${user.last_name} (${user.role})`
                    );
                }

                return { success: true, user };
            } catch (error) {
                console.error('Admin create user error:', error);
                return { error: error.message };
            }
        });
    }

    registerFileHandlers() {
        // Select file
        ipcMain.handle('file:select', async (event, options) => {
            try {
                const result = await FileService.selectFile(options);
                return result;
            } catch (error) {
                console.error('File select error:', error);
                return { error: error.message };
            }
        });

        // Save file
        ipcMain.handle('file:save', async (event, options) => {
            try {
                const result = await FileService.saveFile(options);
                return result;
            } catch (error) {
                console.error('File save error:', error);
                return { error: error.message };
            }
        });

        // Read file
        ipcMain.handle('file:read', async (event, data = {}) => {
            const { filePath, encoding } = data;
            try {
                const result = await FileService.readFile(filePath, encoding);
                return result;
            } catch (error) {
                console.error('File read error:', error);
                return { error: error.message };
            }
        });

        // Parse CSV test data
        ipcMain.handle('file:parseCSV', async (event, filePath) => {
            try {
                const result = await FileService.parseCSVTestData(filePath);
                return result;
            } catch (error) {
                console.error('CSV parse error:', error);
                return { error: error.message };
            }
        });

        // Open file
        ipcMain.handle('file:open', async (event, filePath) => {
            try {
                const result = await FileService.openFile(filePath);
                return result;
            } catch (error) {
                console.error('File open error:', error);
                return { error: error.message };
            }
        });
    }

    registerChatHandlers() {
        // Get messages
        ipcMain.handle('chat:getMessages', async (event, data = {}) => {
            const { userId, otherUserId = null, search = '', limit, offset } = data;
            try {
                if (!userId) {
                    return { error: 'User ID is required' };
                }
                const messages = await DatabaseService.getMessages(userId, otherUserId, search, limit, offset);
                return { success: true, messages };
            } catch (error) {
                console.error('Get messages error:', error);
                return { error: error.message };
            }
        });

        // Send message with real-time sync
        ipcMain.handle('chat:sendMessage', async (event, senderId, receiverId, messageText, attachment, replyToId) => {
            try {
                if (!senderId || !receiverId || !messageText) {
                    return { error: 'Sender ID, Receiver ID, and message text are required' };
                }

                // Create message directly using DatabaseService
                const { v4: uuidv4 } = require('uuid');
                const messageId = uuidv4();
                const timestamp = new Date().toISOString();
                
                const messageData = {
                    id: messageId,
                    sender_id: senderId,
                    receiver_id: receiverId,
                    message_text: messageText,
                    attachment: attachment || null,
                    timestamp: timestamp,
                    status: 'unread',
                    reply_to_id: replyToId || null
                };

                // Save to local database
                const db = await DatabaseService.getDatabase();
                await db.run(
                    `INSERT INTO chat (id, sender_id, receiver_id, message_text, attachment, timestamp, status) 
                     VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [messageId, senderId, receiverId, messageText, attachment, timestamp, 'unread']
                );

                // Broadcast to all windows
                const { BrowserWindow } = require('electron');
                BrowserWindow.getAllWindows().forEach(window => {
                    window.webContents.send('new-message', messageData);
                });

                return { success: true, message: messageData };
            } catch (error) {
                console.error('Send message error:', error);
                return { error: error.message };
            }
        });

        // Mark message as read
        ipcMain.handle('chat:markMessageRead', async (event, data = {}) => {
            const { messageId, userId } = data;
            try {
                if (!messageId || !userId) {
                    return { error: 'Message ID and User ID are required' };
                }
                const result = await DatabaseService.markMessageAsRead(messageId, userId);
                return result;
            } catch (error) {
                console.error('Mark message as read error:', error);
                return { error: error.message };
            }
        });

        // Get unread message count
        ipcMain.handle('chat:getUnreadCount', async (event, userId) => {
            try {
                if (!userId) {
                    return { error: 'User ID is required' };
                }
                const count = await DatabaseService.getUnreadMessageCount(userId);
                return { success: true, count };
            } catch (error) {
                console.error('Get unread count error:', error);
                return { error: error.message };
            }
        });

        // Delete message
        ipcMain.handle('chat:deleteMessage', async (event, messageId) => {
            try {
                if (!messageId) {
                    return { error: 'Message ID is required' };
                }
                const result = await DatabaseService.deleteMessage(messageId, currentUser?.id);
                return result;
            } catch (error) {
                console.error('Delete message error:', error);
                return { error: error.message };
            }
        });
    }

    registerPresenceHandlers() {
        // Set user online
        ipcMain.handle('presence:setOnline', async (event, data = {}) => {
            const { userId, sessionId } = data;
            try {
                if (!userId) {
                    return { error: 'User ID is required' };
                }
                await DatabaseService.setUserOnline(userId, sessionId);
                
                // Broadcast online status to all windows
                const onlineUsers = await DatabaseService.getOnlineUsers();
                const { BrowserWindow } = require('electron');
                BrowserWindow.getAllWindows().forEach(window => {
                    window.webContents.send('presence-update', onlineUsers.map(u => u.id));
                });
                
                return { success: true };
            } catch (error) {
                console.error('Set user online error:', error);
                return { error: error.message };
            }
        });

        // Set user offline
        ipcMain.handle('presence:setOffline', async (event, userId) => {
            try {
                if (!userId) {
                    return { error: 'User ID is required' };
                }
                await DatabaseService.setUserOffline(userId);
                
                // Broadcast online status to all windows
                const onlineUsers = await DatabaseService.getOnlineUsers();
                const { BrowserWindow } = require('electron');
                BrowserWindow.getAllWindows().forEach(window => {
                    window.webContents.send('presence-update', onlineUsers.map(u => u.id));
                });
                
                return { success: true };
            } catch (error) {
                console.error('Set user offline error:', error);
                return { error: error.message };
            }
        });

        // Get online users
        ipcMain.handle('presence:getOnlineUsers', async () => {
            try {
                const users = await DatabaseService.getOnlineUsers();
                return { success: true, users };
            } catch (error) {
                console.error('Get online users error:', error);
                return { error: error.message };
            }
        });

        // Get all users with presence status
        ipcMain.handle('presence:getUsersWithPresence', async () => {
            try {
                const users = await DatabaseService.getUsersWithPresence();
                return { success: true, users };
            } catch (error) {
                console.error('Get users with presence error:', error);
                return { error: error.message };
            }
        });

        // Manual sync trigger
        ipcMain.handle('presence:syncToSupabase', async () => {
            try {
                await SyncService.initialize();
                const result = await SyncService.syncAll();
                return result;
            } catch (error) {
                console.error('Sync to Supabase error:', error);
                return { error: error.message };
            }
        });
    }

    registerSettingsHandlers() {
        // Get setting
        ipcMain.handle('settings:get', async (event, key) => {
            try {
                if (!key) {
                    return { error: 'Setting key is required' };
                }

                const value = await DatabaseService.getSetting(key);
                return { success: true, value };
            } catch (error) {
                console.error('Get setting error:', error);
                return { error: error.message };
            }
        });

        // Set setting
        ipcMain.handle('settings:set', async (event, data = {}) => {
            const { key, value } = data;
            try {
                if (!key) {
                    return { error: 'Setting key is required' };
                }

                await DatabaseService.setSetting(key, value);
                return { success: true };
            } catch (error) {
                console.error('Set setting error:', error);
                return { error: error.message };
            }
        });

        // Get all settings
        ipcMain.handle('settings:getAll', async () => {
            try {
                const settings = await DatabaseService.getAllSettings();
                return { success: true, settings };
            } catch (error) {
                console.error('Get all settings error:', error);
                return { error: error.message };
            }
        });
    }

    registerSystemHandlers() {
        // Get dashboard statistics
        ipcMain.handle('system:getDashboardStats', async () => {
            try {
                const stats = await DatabaseService.getDashboardStats();
                return { success: true, stats };
            } catch (error) {
                console.error('Get dashboard stats error:', error);
                return { error: error.message };
            }
        });

        // Backup database
        ipcMain.handle('system:backup', async () => {
            try {
                const result = await DatabaseService.backupDatabase();
                return result;
            } catch (error) {
                console.error('Backup error:', error);
                return { error: error.message };
            }
        });

        // Health check
        ipcMain.handle('system:healthCheck', async () => {
            try {
                // Simple health check - try to query database
                await DatabaseService.getDashboardStats();
                return {
                    success: true,
                    status: 'healthy',
                    timestamp: new Date().toISOString()
                };
            } catch (error) {
                console.error('Health check error:', error);
                return {
                    success: false,
                    status: 'unhealthy',
                    error: error.message,
                    timestamp: new Date().toISOString()
                };
            }
        });

        // Check online status
        ipcMain.handle('system:checkOnline', async () => {
            try {
                const isOnline = await SyncService.isOnline();
                return { success: true, isOnline };
            } catch (error) {
                console.error('Check online error:', error);
                return { success: false, isOnline: false };
            }
        });
    }

    registerWindowHandlers() {
        // Open main window (post-auth)
        ipcMain.handle('window:openMain', async () => {
            try {
                console.log('Redirecting to main app...');
                const { BrowserWindow } = require('electron');

                // Get current window and redirect to main app
                const currentWindow = BrowserWindow.getFocusedWindow();
                if (currentWindow) {
                    const isDev = process.env.NODE_ENV === 'development';
                    if (isDev) {
                        await currentWindow.loadURL('http://localhost:3000/');
                    } else {
                        const indexPath = path.join(__dirname, '../dist/index.html');
                        await currentWindow.loadFile(indexPath);
                    }
                    console.log('Redirected to main app successfully');
                }

                return { success: true };
            } catch (error) {
                console.error('Window error:', error);
                return { error: error.message };
            }
        });
    }

    // Clean up handlers when app closes
    removeAllHandlers() {
        const handlers = [
            'auth:isFirstRun',
            'auth:login',
            'auth:createUser',
            'auth:getAllUsers',
            'auth:logout',
            'patients:getAll',
            'patients:getById',
            'patients:create',
            'patients:update',
            'patients:delete',
            'patients:search',
            'tests:getAll',
            'tests:getById',
            'tests:create',
            'tests:update',
            'tests:delete',
            'tests:getByPatient',
            'reports:getAll',
            'reports:getById',
            'reports:generate',
            'reports:export',
            'reports:delete',
            'inventory:getAll',
            'inventory:getById',
            'inventory:getByCode',
            'inventory:create',
            'inventory:update',
            'inventory:updateQuantity',
            'inventory:delete',
            'inventory:getStatistics',
            'inventory:getLowStock',
            'inventory:getExpiring',
            'inventory:search',
            'admin:getAllUsers',
            'admin:getUserStats',
            'admin:updateUserStatus',
            'admin:deleteUser',
            'admin:getActivityLogs',
            'admin:getActivityStats',
            'admin:logActivity',
            'admin:createUser',
            'file:select',
            'file:save',
            'file:read',
            'file:parseCSV',
            'file:open',
            'chat:getMessages',
            'chat:sendMessage',
            'chat:markAsRead',
            'chat:getUnreadCount',
            'settings:get',
            'settings:set',
            'settings:getAll',
            'system:getDashboardStats',
            'system:backup',
            'system:healthCheck',
            'window:openMain'
        ];

        handlers.forEach(handler => {
            ipcMain.removeAllListeners(handler);
        });
    }
}

module.exports = IPCHandlers;
