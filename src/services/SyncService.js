const SupabaseService = require('./SupabaseService');
const Database = require('../../database');
const { v4: uuidv4 } = require('uuid');

class SyncService {
    constructor() {
        this.db = new Database();
        this.supabase = SupabaseService;
        this.syncInProgress = false;
        this.tables = ['users', 'patients', 'tests', 'reports', 'chat', 'inventory', 'activity_logs', 'settings', 'user_presence'];
        this.realtimeSubscriptions = [];
    }

    async initialize() {
        await this.db.initialize();
        await this.setupRealtimeSync();
    }

    // Check if online
    async isOnline() {
        try {
            const { data, error } = await this.supabase.client.from('settings').select('id').limit(1);
            return !error;
        } catch {
            return false;
        }
    }

    // Sync all tables
    async syncAll() {
        if (this.syncInProgress) return { success: false, message: 'Sync already in progress' };
        
        this.syncInProgress = true;
        const results = {};

        try {
            const online = await this.isOnline();
            if (!online) {
                return { success: false, message: 'Offline - cannot sync' };
            }

            for (const table of this.tables) {
                results[table] = await this.syncTable(table);
            }

            return { success: true, results };
        } catch (error) {
            return { success: false, error: error.message };
        } finally {
            this.syncInProgress = false;
        }
    }

    // Sync single table
    async syncTable(tableName) {
        try {
            // Get local records
            const localRecords = await this.db.all(`SELECT * FROM ${tableName}`);
            
            // Get remote records
            const { data: remoteRecords, error } = await this.supabase.client
                .from(tableName)
                .select('*');

            if (error) throw error;

            // Create maps for comparison
            const localMap = new Map(localRecords.map(r => [r.id, r]));
            const remoteMap = new Map((remoteRecords || []).map(r => [r.id, r]));

            let uploaded = 0, downloaded = 0, conflicts = 0;

            // Upload local records not in remote or newer
            for (const [id, localRecord] of localMap) {
                const remoteRecord = remoteMap.get(id);
                
                if (!remoteRecord) {
                    // Upload new record
                    await this.uploadRecord(tableName, localRecord);
                    uploaded++;
                } else if (new Date(localRecord.updated_at) > new Date(remoteRecord.updated_at)) {
                    // Update remote with newer local
                    await this.uploadRecord(tableName, localRecord, true);
                    uploaded++;
                } else if (new Date(remoteRecord.updated_at) > new Date(localRecord.updated_at)) {
                    // Download newer remote
                    await this.downloadRecord(tableName, remoteRecord);
                    downloaded++;
                }
            }

            // Download remote records not in local
            for (const [id, remoteRecord] of remoteMap) {
                if (!localMap.has(id)) {
                    await this.downloadRecord(tableName, remoteRecord);
                    downloaded++;
                }
            }

            // Update sync metadata
            await this.updateSyncMetadata(tableName);

            return { uploaded, downloaded, conflicts };
        } catch (error) {
            console.error(`Error syncing ${tableName}:`, error);
            return { error: error.message };
        }
    }

    // Upload record to Supabase
    async uploadRecord(tableName, record, isUpdate = false) {
        try {
            const cleanRecord = { ...record };
            
            // Remove SQLite-specific fields
            delete cleanRecord.total_value;

            if (isUpdate) {
                const { error } = await this.supabase.client
                    .from(tableName)
                    .update(cleanRecord)
                    .eq('id', record.id);
                if (error) throw error;
            } else {
                const { error } = await this.supabase.client
                    .from(tableName)
                    .insert(cleanRecord);
                if (error) throw error;
            }
        } catch (error) {
            console.error(`Error uploading to ${tableName}:`, error);
            throw error;
        }
    }

    // Download record from Supabase
    async downloadRecord(tableName, record) {
        try {
            const columns = Object.keys(record).join(', ');
            const placeholders = Object.keys(record).map(() => '?').join(', ');
            const values = Object.values(record);

            const query = `
                INSERT OR REPLACE INTO ${tableName} (${columns})
                VALUES (${placeholders})
            `;

            await this.db.run(query, values);
        } catch (error) {
            console.error(`Error downloading to ${tableName}:`, error);
            throw error;
        }
    }

    // Update sync metadata
    async updateSyncMetadata(tableName) {
        const metadataId = uuidv4();
        const query = `
            INSERT OR REPLACE INTO sync_metadata (id, table_name, record_id, last_synced_at)
            VALUES (?, ?, ?, CURRENT_TIMESTAMP)
        `;
        await this.db.run(query, [metadataId, tableName, 'all']);
    }

    // Get last sync time
    async getLastSyncTime(tableName) {
        const query = `
            SELECT last_synced_at FROM sync_metadata
            WHERE table_name = ? AND record_id = 'all'
            ORDER BY last_synced_at DESC LIMIT 1
        `;
        const result = await this.db.get(query, [tableName]);
        return result ? result.last_synced_at : null;
    }

    // Auto-sync on interval
    startAutoSync(intervalMinutes = 5) {
        this.autoSyncInterval = setInterval(async () => {
            const online = await this.isOnline();
            if (online && !this.syncInProgress) {
                console.log('Auto-sync started...');
                const result = await this.syncAll();
                console.log('Auto-sync completed:', result);
            }
        }, intervalMinutes * 60 * 1000);
    }

    stopAutoSync() {
        if (this.autoSyncInterval) {
            clearInterval(this.autoSyncInterval);
            this.autoSyncInterval = null;
        }
    }

    // Real-time sync for chat
    async setupRealtimeSync() {
        if (!this.supabase.isConfigured) return;

        try {
            const { BrowserWindow } = require('electron');
            
            const subscription = this.supabase.client
                .channel('chat-realtime')
                .on('postgres_changes', 
                    { event: 'INSERT', schema: 'public', table: 'chat' },
                    async (payload) => {
                        console.log('New chat message received:', payload.new);
                        await this.downloadRecord('chat', payload.new);
                        
                        // Broadcast to all windows
                        BrowserWindow.getAllWindows().forEach(window => {
                            window.webContents.send('chat:newMessage', payload.new);
                        });
                    }
                )
                .on('postgres_changes',
                    { event: 'UPDATE', schema: 'public', table: 'chat' },
                    async (payload) => {
                        console.log('Chat message updated:', payload.new);
                        await this.downloadRecord('chat', payload.new);
                        
                        // Broadcast update to all windows
                        BrowserWindow.getAllWindows().forEach(window => {
                            window.webContents.send('chat:messageUpdate', payload.new);
                        });
                    }
                )
                .subscribe();

            this.realtimeSubscriptions.push(subscription);
            console.log('Real-time chat sync enabled');
        } catch (error) {
            console.error('Failed to setup real-time sync:', error);
        }
    }

    // Send chat message with instant sync
    async sendChatMessage(messageData) {
        try {
            const messageId = uuidv4();
            const message = {
                id: messageId,
                ...messageData,
                timestamp: new Date().toISOString()
            };

            // Save locally first
            const columns = Object.keys(message).join(', ');
            const placeholders = Object.keys(message).map(() => '?').join(', ');
            const values = Object.values(message);

            await this.db.run(
                `INSERT INTO chat (${columns}) VALUES (${placeholders})`,
                values
            );

            // Upload to Supabase immediately if online
            if (await this.isOnline()) {
                await this.uploadRecord('chat', message);
            }

            return { success: true, message };
        } catch (error) {
            console.error('Error sending chat message:', error);
            return { success: false, error: error.message };
        }
    }

    close() {
        this.stopAutoSync();
        
        // Unsubscribe from real-time channels
        this.realtimeSubscriptions.forEach(sub => {
            if (this.supabase.client) {
                this.supabase.client.removeChannel(sub);
            }
        });
        this.realtimeSubscriptions = [];
        
        this.db.close();
    }
}

module.exports = new SyncService();
