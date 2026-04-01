const fs = require('fs');
const path = require('path');
const LanSyncService = require('./LanSyncService');
const { execSync } = require('child_process');

class NetworkConfigService {
    constructor() {
        this.configPath = null;
        this.config = null;
        this.presenceTimer = null;
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;
        try {
            const { app } = require('electron');
            const userDataPath = app.getPath('userData');
            if (!fs.existsSync(userDataPath)) {
                fs.mkdirSync(userDataPath, { recursive: true });
            }
            this.configPath = path.join(userDataPath, 'network-config.json');
            console.log('[NetworkConfig] Config path:', this.configPath);
            this._loadConfigFromFile();
            this.initialized = true;
        } catch (error) {
            console.error('[NetworkConfig] Init error:', error.message);
            this.config = this.getDefaultConfig();
            this.initialized = true;
        }
    }

    getDefaultConfig() {
        return {
            isNetworkMode: false,
            serverPath: '',
            serverName: '',
            deviceName: '',
            autoSync: true,
            presenceInterval: 5000,
            lastSync: null,
            connectionStatus: 'disconnected'
        };
    }

    _loadConfigFromFile() {
        try {
            console.log('[NetworkConfig] Loading config from:', this.configPath);
            if (fs.existsSync(this.configPath)) {
                const data = fs.readFileSync(this.configPath, 'utf-8');
                this.config = { ...this.getDefaultConfig(), ...JSON.parse(data) };
                console.log('[NetworkConfig] Loaded config:', JSON.stringify({
                    ...this.config,
                    serverPath: this.config.serverPath ? '(set)' : '(empty)'
                }));
            } else {
                console.log('[NetworkConfig] No config file, using defaults');
                this.config = this.getDefaultConfig();
            }
            this.configureLanSync();
            this.startPresenceBroadcast();
        } catch (error) {
            console.warn('[NetworkConfig] Load error:', error.message);
            this.config = this.getDefaultConfig();
        }
    }

    getAvailableDrives() {
        try {
            const { execSync } = require('child_process');
            const output = execSync('wmic logicaldisk get name,drivetype,volumename', { encoding: 'utf8', timeout: 5000 });
            const drives = [];
            const lines = output.trim().split('\n').slice(1);
            
            for (const line of lines) {
                const parts = line.trim().split(/\s+/);
                if (parts.length >= 2) {
                    const driveLetter = parts[0];
                    const driveType = parseInt(parts[1]) || 0;
                    const volumeName = parts.slice(2).join(' ') || '';
                    
                    const drivePath = driveLetter + '\\';
                    let driveTypeName = 'Unknown';
                    let isRemovable = false;
                    
                    switch (driveType) {
                        case 2:
                            driveTypeName = 'Removable (USB)';
                            isRemovable = true;
                            break;
                        case 3:
                            driveTypeName = 'Local Disk';
                            break;
                        case 4:
                            driveTypeName = 'Network Drive';
                            break;
                        case 5:
                            driveTypeName = 'CD/DVD';
                            break;
                    }
                    
                    drives.push({
                        letter: driveLetter,
                        path: drivePath,
                        type: driveTypeName,
                        isRemovable,
                        volumeName: volumeName.trim(),
                        exists: fs.existsSync(drivePath)
                    });
                }
            }
            
            return drives;
        } catch (error) {
            console.warn('[NetworkConfig] Could not get available drives:', error.message);
            return [];
        }
    }

    findRemovableDrive() {
        const drives = this.getAvailableDrives();
        const removable = drives.filter(d => d.isRemovable && d.exists);
        
        if (removable.length > 0) {
            return removable[0];
        }
        
        return null;
    }

    validateStoredPath() {
        const config = this.getConfig();
        
        if (!config.serverPath) {
            return { valid: false, needsSetup: true, message: 'No network path configured' };
        }
        
        if (!fs.existsSync(config.serverPath)) {
            console.warn(`[NetworkConfig] Stored path ${config.serverPath} not found.`);
            
            return {
                valid: false,
                needsSetup: false,
                pathChanged: true,
                oldPath: config.serverPath,
                suggestedPath: '',
                message: `Configured path ${config.serverPath} not found. Please select a new path.`
            };
        }
        
        return { valid: true, needsSetup: false };
    }

    configureLanSync() {
        if (this.config.isNetworkMode && this.config.serverPath) {
            if (fs.existsSync(this.config.serverPath)) {
                LanSyncService.setSyncPath(this.config.serverPath);
                console.log('[NetworkConfig] LAN sync path set to:', this.config.serverPath);
            }
        }
    }

    startPresenceBroadcast() {
        if (this.presenceTimer) {
            clearInterval(this.presenceTimer);
            this.presenceTimer = null;
        }
        if (this.dataUpdateTimer) {
            clearInterval(this.dataUpdateTimer);
            this.dataUpdateTimer = null;
        }

        if (this.config.autoSync && this.config.isNetworkMode && this.config.serverPath) {
            const interval = this.config.presenceInterval || 5000;
            console.log(`[NetworkConfig] Starting presence broadcast every ${interval / 1000}s`);
            
            LanSyncService.broadcastPresence().catch(err => {
                console.warn('[NetworkConfig] Initial presence broadcast failed:', err.message);
            });
            
            this.presenceTimer = setInterval(() => {
                LanSyncService.broadcastPresence().catch(err => {
                    console.warn('[NetworkConfig] Presence broadcast failed:', err.message);
                });
            }, interval);

            const dataCheckInterval = 3000;
            this.dataUpdateTimer = setInterval(async () => {
                try {
                    const updateCheck = await LanSyncService.checkForDataUpdates();
                    if (updateCheck.hasUpdates && updateCheck.updates.length > 0) {
                        console.log('[NetworkConfig] Detected data updates from other computers:', updateCheck.updates.length);
                        const { BrowserWindow } = require('electron');
                        BrowserWindow.getAllWindows().forEach(w => {
                            updateCheck.updates.forEach(update => {
                                w.webContents.send('data:update', { 
                                    table: update.table, 
                                    action: update.action, 
                                    record_id: update.record_id,
                                    record: update.record,
                                    fromNetwork: true
                                });
                            });
                        });
                    }
                } catch (err) {
                    console.warn('[NetworkConfig] Data update check failed:', err.message);
                }
            }, dataCheckInterval);
        } else {
            console.log('[NetworkConfig] Presence broadcast not started - network mode:', this.config.isNetworkMode, 'path:', this.config.serverPath ? 'set' : 'not set');
        }
    }

    stopPresenceBroadcast() {
        if (this.presenceTimer) {
            clearInterval(this.presenceTimer);
            this.presenceTimer = null;
            console.log('[NetworkConfig] Presence broadcast stopped');
        }
        if (this.dataUpdateTimer) {
            clearInterval(this.dataUpdateTimer);
            this.dataUpdateTimer = null;
            console.log('[NetworkConfig] Data update timer stopped');
        }
    }

    stopAllTimers() {
        this.stopPresenceBroadcast();
    }

    saveConfig(config = null) {
        try {
            if (config) {
                const prevNetworkMode = this.config?.isNetworkMode || false;
                const prevServerPath = this.config?.serverPath || '';
                
                this.config = { ...this.config, ...config };

                // Ensure serverPath is always a string
                if (this.config.serverPath === null || this.config.serverPath === undefined) {
                    this.config.serverPath = '';
                }

                const newServerPath = this.config.serverPath || '';
                
                if (newServerPath && newServerPath !== prevServerPath) {
                    if (fs.existsSync(newServerPath)) {
                        LanSyncService.setSyncPath(newServerPath);
                        console.log('[NetworkConfig] Sync path updated to:', newServerPath);
                    } else {
                        console.warn('[NetworkConfig] Attempting to save invalid path:', newServerPath);
                    }
                }

                if (config.isNetworkMode !== undefined && config.isNetworkMode !== prevNetworkMode) {
                    if (config.isNetworkMode) {
                        this.startPresenceBroadcast();
                    } else {
                        this.stopAllTimers();
                    }
                }

                if (config.deviceName) {
                    LanSyncService.setDeviceName(config.deviceName);
                }

                if (this.config.isNetworkMode && newServerPath && this.config.autoSync !== false) {
                    this.startPresenceBroadcast();
                }
            }
            
            console.log('[NetworkConfig] Saving config to:', this.configPath);
            fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
            console.log('[NetworkConfig] Config saved successfully');
            return { success: true };
        } catch (error) {
            console.error('[NetworkConfig] Save error:', error.message);
            return { success: false, error: error.message };
        }
    }

    getConfig() {
        if (!this.config) {
            this.loadConfig();
        }
        return this.config;
    }

    loadConfig() {
        this._loadConfigFromFile();
        return this.config;
    }

    setNetworkMode(enabled, serverPath = '') {
        return this.saveConfig({
            isNetworkMode: enabled,
            serverPath: enabled ? serverPath : '',
            serverName: enabled ? this.extractServerName(serverPath) : ''
        });
    }

    extractServerName(serverPath) {
        if (!serverPath) return '';
        if (serverPath.startsWith('\\\\')) {
            const parts = serverPath.replace(/^\\\\/, '').split('\\');
            return parts[0] || '';
        }
        return '';
    }

    getDatabasePath() {
        const config = this.getConfig();
        if (config.isNetworkMode && config.serverPath && typeof config.serverPath === 'string' && config.serverPath.trim() !== '') {
            return path.join(config.serverPath, 'eye_clinic.db');
        }
        return null;
    }

    isNetworkMode() {
        return this.getConfig().isNetworkMode;
    }

    updateConnectionStatus(status) {
        return this.saveConfig({
            connectionStatus: status,
            lastStatusUpdate: new Date().toISOString()
        });
    }

    updateLastSync() {
        return this.saveConfig({
            lastSync: new Date().toISOString()
        });
    }

    testConnection(serverPath) {
        return new Promise((resolve) => {
            try {
                if (!serverPath) {
                    resolve({ success: false, error: 'Server path is required' });
                    return;
                }

                if (!fs.existsSync(serverPath)) {
                    resolve({ success: false, error: 'Network path not accessible' });
                    return;
                }

                const dbPath = path.join(serverPath, 'eye_clinic.db');
                if (fs.existsSync(dbPath)) {
                    resolve({ success: true, message: 'Database found', path: dbPath });
                } else {
                    resolve({ success: true, message: 'Network path accessible, database will be created here', path: dbPath });
                }
            } catch (error) {
                resolve({ success: false, error: error.message });
            }
        });
    }

    async getSyncStatus() {
        try {
            const config = this.getConfig();
            const pathValidation = this.validateStoredPath();
            const availableDrives = this.getAvailableDrives();
            const onlineUsersResult = await LanSyncService.getAllOnlineUsers();

            const serverPath = config.serverPath || '';

            return {
                isNetworkMode: config.isNetworkMode,
                serverPath: pathValidation.valid ? serverPath : (pathValidation.suggestedPath || serverPath),
                serverPathOriginal: serverPath,
                deviceName: config.deviceName || LanSyncService.getDeviceName(),
                autoSync: config.autoSync,
                presenceInterval: config.presenceInterval,
                lastSync: config.lastSync,
                connectionStatus: pathValidation.valid ? 'connected' : 'disconnected',
                isPresenceBroadcastRunning: this.presenceTimer !== null,
                pathNeedsUpdate: pathValidation.pathChanged,
                pathNeedsSetup: pathValidation.needsSetup,
                suggestedPath: pathValidation.suggestedPath || '',
                pathValidationMessage: pathValidation.message,
                availableDrives: availableDrives,
                onlineUsers: onlineUsersResult.users || [],
                totalOnlineUsers: onlineUsersResult.total_online || 0
            };
        } catch (error) {
            console.error('[NetworkConfig] Get sync status error:', error.message);
            return { error: error.message };
        }
    }

    async getOnlineUsers() {
        return await LanSyncService.getAllOnlineUsers();
    }

    async getConflicts() {
        return [];
    }

    async resolveConflict() {
        return { success: true };
    }
}

module.exports = new NetworkConfigService();
