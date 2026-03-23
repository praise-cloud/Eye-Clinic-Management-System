const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const LanSyncService = require('./LanSyncService');

class NetworkConfigService {
    constructor() {
        this.configPath = null;
        this.config = null;
        this.syncTimer = null;
        this.init();
    }

    init() {
        try {
            const userDataPath = app.getPath('userData');
            if (!fs.existsSync(userDataPath)) {
                fs.mkdirSync(userDataPath, { recursive: true });
            }
            this.configPath = path.join(userDataPath, 'network-config.json');
            this._loadConfigFromFile();
        } catch (error) {
            console.error('[NetworkConfig] Init error:', error.message);
            this.config = this.getDefaultConfig();
        }
    }

    getDefaultConfig() {
        return {
            isNetworkMode: false,
            serverPath: '',
            serverName: '',
            autoSync: true,
            syncInterval: 30000,
            lastSync: null,
            connectionStatus: 'disconnected',
            useLanSync: true
        };
    }

    _loadConfigFromFile() {
        try {
            if (fs.existsSync(this.configPath)) {
                const data = fs.readFileSync(this.configPath, 'utf-8');
                this.config = { ...this.getDefaultConfig(), ...JSON.parse(data) };
            } else {
                this.config = this.getDefaultConfig();
            }
            this.configureLanSync();
            this.startAutoSync();
        } catch (error) {
            console.warn('[NetworkConfig] Load error:', error.message);
            this.config = this.getDefaultConfig();
        }
    }

    configureLanSync() {
        if (this.config.isNetworkMode && this.config.serverPath) {
            LanSyncService.setSyncPath(this.config.serverPath);
        }
    }

    startAutoSync() {
        if (this.syncTimer) {
            clearInterval(this.syncTimer);
            this.syncTimer = null;
        }

        if (this.config.autoSync && this.config.isNetworkMode && this.config.serverPath) {
            const interval = this.config.syncInterval || 30000;
            console.log(`[NetworkConfig] Starting auto-sync every ${interval / 1000}s`);
            this.syncTimer = setInterval(() => {
                this.performSync().catch(err => {
                    console.warn('[NetworkConfig] Auto-sync failed:', err.message);
                });
            }, interval);
        }
    }

    stopAutoSync() {
        if (this.syncTimer) {
            clearInterval(this.syncTimer);
            this.syncTimer = null;
            console.log('[NetworkConfig] Auto-sync stopped');
        }
    }

    async performSync() {
        if (!this.config.isNetworkMode) {
            return { success: false, error: 'Network mode is disabled' };
        }

        try {
            const exportResult = await LanSyncService.exportChanges();
            const importResult = await LanSyncService.importChanges();

            this.updateLastSync();

            return {
                success: true,
                exported: exportResult.exported || 0,
                imported: importResult.applied || 0,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('[NetworkConfig] Sync error:', error.message);
            return { success: false, error: error.message };
        }
    }

    loadConfig() {
        this._loadConfigFromFile();
        return this.config;
    }

    saveConfig(config = null) {
        try {
            if (config) {
                const prevNetworkMode = this.config.isNetworkMode;
                this.config = { ...this.config, ...config };

                if (config.serverPath && config.serverPath !== this.config.serverPath) {
                    LanSyncService.setSyncPath(config.serverPath);
                }

                if (config.isNetworkMode !== undefined && config.isNetworkMode !== prevNetworkMode) {
                    if (config.isNetworkMode) {
                        this.startAutoSync();
                    } else {
                        this.stopAutoSync();
                    }
                }

                if (config.autoSync !== undefined || config.syncInterval !== undefined) {
                    this.startAutoSync();
                }
            }
            fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
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
        if (config.isNetworkMode && config.serverPath) {
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
                    resolve({ success: true, message: 'Network path accessible, database will be created', path: dbPath });
                }
            } catch (error) {
                resolve({ success: false, error: error.message });
            }
        });
    }

    async getSyncStatus() {
        try {
            const conflicts = await LanSyncService.getConflicts();
            const config = this.getConfig();

            return {
                isNetworkMode: config.isNetworkMode,
                serverPath: config.serverPath,
                autoSync: config.autoSync,
                syncInterval: config.syncInterval,
                lastSync: config.lastSync,
                connectionStatus: config.connectionStatus,
                pendingConflicts: conflicts.length,
                isAutoSyncRunning: this.syncTimer !== null
            };
        } catch (error) {
            console.error('[NetworkConfig] Get sync status error:', error.message);
            return { error: error.message };
        }
    }

    async getConflicts() {
        return await LanSyncService.getConflicts();
    }

    async resolveConflict(id, resolution) {
        return await LanSyncService.resolveConflict(id, resolution);
    }
}

module.exports = new NetworkConfigService();
