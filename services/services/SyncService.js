const SupabaseService = require('./SupabaseService');
const Database = require('../../database');
const { v4: uuidv4 } = require('uuid');

class SyncService {
    constructor() {
        this.db = new Database();
        this.supabase = SupabaseService;
        this.syncInProgress = false;
        // Sync order matters: users must be synced before chat/activity_logs (foreign key dependencies)
        this.tables = ['users', 'settings', 'patients', 'tests', 'reports', 'inventory', 'activity_logs', 'chat'];
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
            
            // Skip settings table sync (has UUID mismatch)
            if (tableName === 'settings') {
                return;
            }
            
            // For chat table, verify user IDs exist in Supabase before uploading
            if (tableName === 'chat') {
                // Check if sender exists
                const { data: senderExists } = await this.supabase.client
                    .from('users')
                    .select('id')
                    .eq('id', cleanRecord.sender_id)
                    .single();
                
                if (!senderExists) {
                    console.log(`Skipping chat message - sender ${cleanRecord.sender_id} not found in Supabase`);
                    return;
                }
                
                // Check if receiver exists
                const { data: receiverExists } = await this.supabase.client
                    .from('users')
                    .select('id')
                    .eq('id', cleanRecord.receiver_id)
                    .single();
                
                if (!receiverExists) {
                    console.log(`Skipping chat message - receiver ${cleanRecord.receiver_id} not found in Supabase`);
                    return;
                }
            }
            
            // Ensure id is always a UUID
            if (!cleanRecord.id || typeof cleanRecord.id === 'number') {
                cleanRecord.id = uuidv4();
            }
            
            // Convert integer IDs to UUIDs for Supabase
            if (cleanRecord.patient_id && typeof cleanRecord.patient_id === 'number') {
                cleanRecord.patient_id = uuidv4();
            }
            if (cleanRecord.sender_id && typeof cleanRecord.sender_id === 'number') {
                cleanRecord.sender_id = uuidv4();
            }
            if (cleanRecord.receiver_id && typeof cleanRecord.receiver_id === 'number') {
                cleanRecord.receiver_id = uuidv4();
            }
            if (cleanRecord.user_id && typeof cleanRecord.user_id === 'number') {
                cleanRecord.user_id = uuidv4();
            }
            if (cleanRecord.last_updated_by && typeof cleanRecord.last_updated_by === 'number') {
                cleanRecord.last_updated_by = uuidv4();
            }

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
            // Skip settings table sync (has UUID mismatch)
            if (tableName === 'settings') {
                return;
            }
            
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

    // Real-time sync for all relevant tables
    async setupRealtimeSync() {
        if (!this.supabase.isConfigured) return;

        try {
            const { BrowserWindow } = require('electron');
            
            const handleRealtimeChange = async (payload, channelName, eventType, broadcastChannel) => {
                console.log(`Realtime change in ${channelName} (${eventType}):`, payload.new || payload.old);
                const table = channelName.split('-')[0]; // Extract table name from channel name
                
                if (eventType !== 'DELETE') {
                    await this.downloadRecord(table, payload.new);
                } else {
                    // For deletes, remove from local DB
                    await this.db.run(`DELETE FROM ${table} WHERE id = ?`, [payload.old.id]);
                }

                if (table === 'chat') {
                    BrowserWindow.getAllWindows().forEach(window => {
                        window.webContents.send('new-message', payload.new || payload.old);
                    });
                } else {
                    // Broadcast to all windows
                    BrowserWindow.getAllWindows().forEach(window => {
                        window.webContents.send(broadcastChannel, {
                            table,
                            eventType, // 'INSERT', 'UPDATE', 'DELETE'
                            record: payload.new || payload.old // For DELETE, payload.old contains the record
                        });
                    });
                }
            };

            const tablesToMonitor = ['users', 'settings', 'patients', 'tests', 'reports', 'inventory', 'activity_logs', 'chat'];

            for (const table of tablesToMonitor) {
                const subscription = this.supabase.client
                    .channel(`${table}-changes`) // Unique channel for each table
                    .on('postgres_changes', 
                        { event: '*', schema: 'public', table: table }, // Listen to all events for this table
                        (payload) => handleRealtimeChange(payload, `${table}-changes`, payload.eventType, 'data:update')
                    )
                    .subscribe();
                this.realtimeSubscriptions.push(subscription);
            }
            
            console('Real-time sync enabled for all monitored tables');
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
                timestamp: new Date().toISOString(),
                reply_to_id: messageData.reply_to_id || null // Include reply_to_id
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
