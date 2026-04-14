const { contextBridge, ipcRenderer } = require('electron');

const isMissingHandlerError = (err) =>
    String(err?.message || '').includes('No handler registered');

const importExternalWithFallback = async (filePath) => {
    try {
        return await ipcRenderer.invoke('database:importExternalWithSync', filePath);
    } catch (error) {
        if (!isMissingHandlerError(error)) throw error;
        const analysis = await ipcRenderer.invoke('file:analyzeBakFile', filePath);
        if (!analysis?.success) return analysis;
        const importPath = analysis?.converted_file || filePath;
        const legacy = await ipcRenderer.invoke('file:importDb', importPath);
        return {
            success: !!legacy?.success,
            analysis,
            import: legacy,
            summary: {
                file_analyzed: analysis?.file?.name || '',
                file_size_mb: analysis?.file?.size_mb || '',
                was_converted: analysis?.conversion_triggered ? 'YES (BAK → SQLite)' : 'NO',
                format_detected: analysis?.format_detected || 'Unknown'
            },
            error: legacy?.error
        };
    }
};

const importExternalBatchWithFallback = async (filePaths = []) => {
    try {
        return await ipcRenderer.invoke('database:importExternalBatchWithSync', filePaths);
    } catch (error) {
        if (!isMissingHandlerError(error)) throw error;
        const list = Array.isArray(filePaths) ? filePaths : [];
        const results = [];
        for (const p of list) {
            const res = await importExternalWithFallback(p);
            results.push({ filePath: p, success: !!res?.success, ...res });
        }
        const successCount = results.filter((r) => r.success).length;
        return {
            success: successCount === results.length,
            summary: {
                total_files: results.length,
                success_files: successCount,
                failed_files: results.length - successCount
            },
            results
        };
    }
};

const getDoctorCaseStudiesWithFallback = async (options = {}) => {
    try {
        return await ipcRenderer.invoke('database:getDoctorCaseStudies', options);
    } catch (error) {
        if (!isMissingHandlerError(error)) throw error;
        const { limit = 50, offset = 0 } = options || {};
        const fallback = await ipcRenderer.invoke('database:getTableData', {
            tableName: 'CaseHistory',
            limit,
            offset
        });
        if (!fallback?.success) {
            return { success: false, error: fallback?.error || 'CaseHistory table not available' };
        }
        const rows = Array.isArray(fallback.data) ? fallback.data : [];
        const data = rows.map((r, idx) => ({
            case_id: r.ID || `${offset}-${idx}`,
            patient_id: r.PatientID || '',
            patient_name: '',
            treatment_date: r.TreatmentDate || '',
            next_visit_date: r.NextVisitDate || '',
            doctor_name: r.DoctorName || '',
            doctor_user_name: '',
            diagnosis: r.DIAGNOSIS || '',
            case_history: r.CASEHISTORY || '',
            follow_up_exam: r.FOLLOWUPEXAM || '',
            final_rx_od: r.FINALRXOD || '',
            final_rx_os: r.FINALRXOS || '',
            user_id: r.USERID || '',
            stamp_date: r.STAMPDATE || ''
        }));
        const doctorSet = new Set(
            data
                .map((d) => String(d.doctor_name || d.user_id || '').trim())
                .filter((d) => d.length > 0)
        );
        return {
            success: true,
            data,
            total: Number(fallback.total || data.length || 0),
            doctors: Array.from(doctorSet).sort(),
            pagination: { limit, offset }
        };
    }
};

// Expose safe APIs to renderer process
contextBridge.exposeInMainWorld('electronAPI', {
    // Authentication APIs
    isFirstRun: () => ipcRenderer.invoke('auth:isFirstRun'),
    login: (email, password) => {
        // Handle both single object parameter and separate parameters
        if (typeof email === 'object' && email.email) {
            return ipcRenderer.invoke('auth:login', email.email, email.password);
        }
        return ipcRenderer.invoke('auth:login', email, password);
    },
    logout: () => ipcRenderer.invoke('auth:logout'),
    isAuthenticated: () => ipcRenderer.invoke('auth:isAuthenticated'),
    createUser: (userData) => ipcRenderer.invoke('auth:createUser', userData),
    completeSetup: (clinicData, adminData) => ipcRenderer.invoke('auth:completeSetup', { clinicData, adminData }),
    getAllUsers: () => ipcRenderer.invoke('auth:getAllUsers'),

    // Window management
    openMainWindow: () => ipcRenderer.invoke('window:openMain'),
    closeAuthWindow: () => ipcRenderer.invoke('window:closeAuth'),

    // Database APIs
    getSettings: () => ipcRenderer.invoke('settings:getAll'),
    setSetting: (key, value) => ipcRenderer.invoke('settings:set', { key, value }),

    // Patient APIs
    getPatients: (filters) => ipcRenderer.invoke('patients:getAll', filters),
    getPatient: (id) => ipcRenderer.invoke('patients:getById', id),
    createPatient: (patientData) => ipcRenderer.invoke('patients:create', patientData),
    updatePatient: (id, patientData) => ipcRenderer.invoke('patients:update', { id, patientData }),
    deletePatient: (id) => ipcRenderer.invoke('patients:delete', id),

    // Test APIs
    getTests: (filters) => ipcRenderer.invoke('tests:getAll', filters),
    getTest: (id) => ipcRenderer.invoke('tests:getById', id),
    createTest: (testData) => ipcRenderer.invoke('tests:create', testData),
    updateTest: (id, testData) => ipcRenderer.invoke('tests:update', { id, testData }),
    deleteTest: (id) => ipcRenderer.invoke('tests:delete', id),
    attachCvfToPatientDocuments: (testId, options) => ipcRenderer.invoke('tests:attachCvfToDocuments', { testId, options }),

    // Inventory APIs
    getInventoryItems: (filters) => ipcRenderer.invoke('inventory:getAll', filters),
    getInventoryItem: (id) => ipcRenderer.invoke('inventory:getById', id),
    getInventoryItemByCode: (itemCode) => ipcRenderer.invoke('inventory:getByCode', itemCode),
    createInventoryItem: (itemData) => ipcRenderer.invoke('inventory:create', itemData),
    updateInventoryItem: (id, itemData) => ipcRenderer.invoke('inventory:update', { id, itemData }),
    updateInventoryQuantity: (id, quantity, userId, notes) => ipcRenderer.invoke('inventory:updateQuantity', { id, quantity, userId, notes }),
    deleteInventoryItem: (id) => ipcRenderer.invoke('inventory:delete', id),
    getInventoryStatistics: () => ipcRenderer.invoke('inventory:getStatistics'),
    getLowStockItems: () => ipcRenderer.invoke('inventory:getLowStock'),
    getExpiringItems: (days) => ipcRenderer.invoke('inventory:getExpiring', days),
    searchInventory: (searchTerm) => ipcRenderer.invoke('inventory:search', searchTerm),

    // Pharmacy APIs
    getPharmacyDrugs: (filters) => ipcRenderer.invoke('pharmacy:getDrugs', filters),
    getPharmacyDrug: (id) => ipcRenderer.invoke('pharmacy:getDrugById', id),
    createPharmacyDrug: (drugData) => ipcRenderer.invoke('pharmacy:createDrug', drugData),
    updatePharmacyDrug: (id, drugData) => ipcRenderer.invoke('pharmacy:updateDrug', { id, drugData }),
    deletePharmacyDrug: (id) => ipcRenderer.invoke('pharmacy:deleteDrug', id),
    dispensePharmacyDrug: (drugId, patientId, quantity, notes) => ipcRenderer.invoke('pharmacy:dispense', { drugId, patientId, quantity, notes }),

    // Admin APIs
    getAllUsersDetailed: () => ipcRenderer.invoke('admin:getAllUsers'),
    getUserStatistics: (userId) => ipcRenderer.invoke('admin:getUserStats', userId),
    updateUserStatus: (userId, isActive, updatedBy) => ipcRenderer.invoke('admin:updateUserStatus', { userId, isActive, updatedBy }),
    updateUser: (userId, userData, updatedBy) => ipcRenderer.invoke('admin:updateUser', { userId, userData, updatedBy }),
    deleteUser: (userId, deletedBy) => ipcRenderer.invoke('admin:deleteUser', { userId, deletedBy }),
    getActivityLogs: (filters) => ipcRenderer.invoke('admin:getActivityLogs', filters),
    getActivityStatistics: () => ipcRenderer.invoke('admin:getActivityStats'),
    logActivity: (userId, actionType, entityType, entityId, description, ipAddress, userAgent) => ipcRenderer.invoke('admin:logActivity', { userId, actionType, entityType, entityId, description, ipAddress, userAgent }),
    createUserAdmin: (userData, createdBy) => ipcRenderer.invoke('admin:createUser', { userData, createdBy }),
    getDashboardStats: () => ipcRenderer.invoke('dashboard:getStats'),
    getSalesRecords: (filters) => ipcRenderer.invoke('dashboard:getSalesRecords', filters),
    getRevenueLogs: (filters) => ipcRenderer.invoke('revenue:getLogs', filters),
    getRevenueStats: () => ipcRenderer.invoke('revenue:getStats'),

    // Report APIs
    getReports: (filters) => ipcRenderer.invoke('reports:getAll', filters),
    getReportById: (id) => ipcRenderer.invoke('reports:getById', id),
    generateReport: (patientId, testIds) => ipcRenderer.invoke('reports:generate', { patientId, testIds }),
    exportReport: (reportId, format) => ipcRenderer.invoke('reports:export', { reportId, format }),
    deleteReport: (id) => ipcRenderer.invoke('reports:delete', id),

    // Chat APIs
    getMessages: (data) => ipcRenderer.invoke('chat:getMessages', data),
    sendMessage: (senderId, receiverId, messageText, attachment, replyToId) => ipcRenderer.invoke('chat:sendMessage', senderId, receiverId, messageText, attachment, replyToId),
    markMessageRead: (data) => ipcRenderer.invoke('chat:markMessageRead', data),
    markAllAsRead: (userId, otherUserId) => ipcRenderer.invoke('chat:markAllAsRead', { userId, otherUserId }),
    getUnreadCount: (userId) => ipcRenderer.invoke('chat:getUnreadCount', userId),
    deleteMessage: (messageId) => ipcRenderer.invoke('chat:deleteMessage', messageId),
    onNewMessage: (callback) => ipcRenderer.on('new-message', callback),
    removeNewMessageListener: (callback) => ipcRenderer.removeListener('new-message', callback),

    // File APIs
    selectFile: (options) => ipcRenderer.invoke('file:select', options),
    saveFile: (options) => ipcRenderer.invoke('file:save', options),
    importDb: (path) => ipcRenderer.invoke('file:importDb', path),
    restoreBackup: (filePath) => ipcRenderer.invoke('file:restoreBackup', filePath),
    runPythonScript: (scriptPath, args) => ipcRenderer.invoke('file:runPythonScript', { scriptPath, args }),
    validateSQLiteFile: (filePath) => ipcRenderer.invoke('file:validateSQLiteFile', filePath),
    analyzeBakFile: (filePath) => ipcRenderer.invoke('file:analyzeBakFile', filePath),
    deleteDb: () => ipcRenderer.invoke('db:delete'),
    updateDb: (updates) => ipcRenderer.invoke('db:update', updates),

    // Comprehensive database import with auto-conversion and schema sync
    importExternalWithSync: (filePath) => importExternalWithFallback(filePath),
    importExternalBatchWithSync: (filePaths) => importExternalBatchWithFallback(filePaths),
    analyzeHensonExport: (filePath) => ipcRenderer.invoke('henson:analyzeExport', filePath),
    importHensonExport: (payload) => ipcRenderer.invoke('henson:importExport', payload),
    importHensonFolder: (payload) => ipcRenderer.invoke('henson:importFolder', payload),
    getTableData: (options) => ipcRenderer.invoke('database:getTableData', options),
    getDoctorCaseStudies: (options) => getDoctorCaseStudiesWithFallback(options),

    // Utility APIs
    getCurrentUser: () => ipcRenderer.invoke('auth:getCurrentUser'),
    checkUpdate: () => ipcRenderer.invoke('app:checkUpdate'),
    checkOnlineStatus: () => ipcRenderer.invoke('system:checkOnline'),
    setCvfWatchPath: (path) => ipcRenderer.invoke('system:setCvfWatchPath', { path }),
    getCvfWatchPath: () => ipcRenderer.invoke('system:getCvfWatchPath'),
    listCvfIncomingFiles: (payload) => ipcRenderer.invoke('cvf:listIncomingFiles', payload),
    attachCvfPdfToPatient: (payload) => ipcRenderer.invoke('cvf:attachPdfToPatient', payload),
    setUserOnline: (userId) => ipcRenderer.invoke('presence:setOnline', { userId }),
    setUserOffline: (userId) => ipcRenderer.invoke('presence:setOffline', { userId }),
    getOnlineUsers: () => ipcRenderer.invoke('presence:getOnlineUsers'),
    getUsersWithPresence: () => ipcRenderer.invoke('presence:getUsersWithPresence'),

    // Prescription APIs
    getPrescriptionsByPatient: (patientId) => ipcRenderer.invoke('prescriptions:getByPatient', patientId),
    getPrescriptionById: (id) => ipcRenderer.invoke('prescriptions:getById', id),
    getPendingPrescriptions: () => ipcRenderer.invoke('prescriptions:getPending'),
    createPrescription: (data) => ipcRenderer.invoke('prescriptions:create', data),
    createMultiplePrescriptions: (data) => ipcRenderer.invoke('prescriptions:createMultiple', data),
    updatePrescriptionStatus: (data) => ipcRenderer.invoke('prescriptions:updateStatus', data),

    // Notification APIs
    getNotifications: (userId) => ipcRenderer.invoke('notifications:getAll', userId),
    markNotificationRead: (id) => ipcRenderer.invoke('notifications:markRead', id),
    markAllNotificationsRead: (userId) => ipcRenderer.invoke('notifications:markAllRead', userId),
    onNewNotification: (callback) => {
        const subscription = (event, data) => callback(data);
        ipcRenderer.on('notifications:new', subscription);
        return () => ipcRenderer.removeListener('notifications:new', subscription);
    },

    // Generic IPC event listeners
    onIpcEvent: (channel, callback) => {
        const subscription = (event, data) => callback(data);
        ipcRenderer.on(channel, subscription);
        return () => ipcRenderer.removeListener(channel, subscription);
    },

    // Backup/Restore APIs
    backupCreate: () => ipcRenderer.invoke('backup:create'),
    backupList: () => ipcRenderer.invoke('backup:list'),
    backupRestore: (backupPath) => ipcRenderer.invoke('backup:restore', { backupPath }),

    // Presence listeners for real-time updates
    onPresenceUpdate: (callback) => {
        const subscription = (event, data) => callback(data);
        ipcRenderer.on('presence:update', subscription);
        return () => ipcRenderer.removeListener('presence:update', subscription);
    },
    onUserProfileUpdated: (callback) => {
        const subscription = (event, user) => callback(user);
        ipcRenderer.on('user:profileUpdated', subscription);
        return () => ipcRenderer.removeListener('user:profileUpdated', subscription);
    },

    // Server Configuration APIs
    getServerConfig: () => ipcRenderer.invoke('serverConfig:get'),
    setServerConfig: (config) => ipcRenderer.invoke('serverConfig:set', config),
    getSqlServerConfig: () => ipcRenderer.invoke('serverConfig:getSqlServer'),
    setSqlServerConfig: (config) => ipcRenderer.invoke('serverConfig:setSqlServer', config),
    serverStart: (config) => ipcRenderer.invoke('server:start', config),
    serverStop: () => ipcRenderer.invoke('server:stop'),
    serverStatus: () => ipcRenderer.invoke('server:status'),
});

// Listen for preload events
window.addEventListener('DOMContentLoaded', () => {
    console.log('Preload script loaded successfully');
    console.log('Preload script loaded: exposing electronAPI');
});
