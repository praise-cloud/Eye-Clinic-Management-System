const { contextBridge, ipcRenderer } = require('electron');

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
    createUser: (userData) => ipcRenderer.invoke('auth:createUser', userData),
    completeSetup: (clinicData, adminData) => ipcRenderer.invoke('auth:completeSetup', { clinicData, adminData }),
    getAllUsers: () => ipcRenderer.invoke('auth:getAllUsers'),

    // Window management
    openMainWindow: () => ipcRenderer.invoke('window:openMain'),
    closeAuthWindow: () => ipcRenderer.invoke('window:closeAuth'),

    // Database APIs
    getSettings: () => ipcRenderer.invoke('db:getSettings'),
    setSetting: (key, value) => ipcRenderer.invoke('db:setSetting', { key, value }),

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

    // Report APIs
    getReports: (filters) => ipcRenderer.invoke('reports:getAll', filters),
    generateReport: (patientId, testIds) => ipcRenderer.invoke('reports:generate', { patientId, testIds }),
    exportReport: (reportId, format) => ipcRenderer.invoke('reports:export', { reportId, format }),

    // Chat APIs
    getMessages: (data) => ipcRenderer.invoke('chat:getMessages', data),
    sendMessage: (senderId, receiverId, messageText, attachment) => ipcRenderer.invoke('chat:sendMessage', senderId, receiverId, messageText, attachment),
    markMessageRead: (data) => ipcRenderer.invoke('chat:markAsRead', data),
    getUnreadCount: (userId) => ipcRenderer.invoke('chat:getUnreadCount', userId),
    deleteMessage: (messageId) => ipcRenderer.invoke('chat:deleteMessage', messageId),
    onNewMessage: (callback) => ipcRenderer.on('new-message', callback),
    removeNewMessageListener: (callback) => ipcRenderer.removeListener('new-message', callback),

    // Presence APIs
    setUserOnline: (userId, sessionId) => ipcRenderer.invoke('presence:setOnline', { userId, sessionId }),
    setUserOffline: (userId) => ipcRenderer.invoke('presence:setOffline', userId),
    getOnlineUsers: () => ipcRenderer.invoke('presence:getOnlineUsers'),
    getUsersWithPresence: () => ipcRenderer.invoke('presence:getUsersWithPresence'),
    syncToSupabase: () => ipcRenderer.invoke('presence:syncToSupabase'),

    // File APIs
    selectFile: (options) => ipcRenderer.invoke('file:select', options),
    saveFile: (options) => ipcRenderer.invoke('file:save', options),

    // Utility APIs
    getCurrentUser: () => ipcRenderer.invoke('auth:getCurrentUser'),
    checkUpdate: () => ipcRenderer.invoke('app:checkUpdate'),
    checkOnlineStatus: () => ipcRenderer.invoke('system:checkOnline'),

    // Generic IPC event listeners
    onIpcEvent: (channel, callback) => {
        const subscription = (event, data) => callback(data);
        ipcRenderer.on(channel, subscription);
        return () => ipcRenderer.removeListener(channel, subscription);
    }
});

// Listen for preload events
window.addEventListener('DOMContentLoaded', () => {
    console.log('Preload script loaded successfully');
});