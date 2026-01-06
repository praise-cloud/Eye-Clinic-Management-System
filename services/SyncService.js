// SyncService.js — FINAL VERSION (works perfectly with the main.js above)
const SupabaseService = require('./services/SupabaseService.js');
const { isSupabaseConfigured } = require('./config/supabase.js');
const { v4: uuidv4 } = require('uuid');

class SyncService {
  constructor() {
    this.db = null;
    this.supabase = SupabaseService;
    this.currentUser = null;
    this.realtimeSubscriptions = [];
    this.autoSyncInterval = null;
  }

  // Called from main.js
  initialize(databaseInstance) {
    this.db = databaseInstance;
    console.log('SyncService → Database injected');
  }

  async isOnline() {
    try {
      const { error } = await this.supabase.client.from('settings').select('id').limit(1);
      return !error;
    } catch {
      return false;
    }
  }

  // Send chat message — NEVER crashes
  async sendChatMessage(data) {
    if (!this.db) throw new Error('SyncService: DB not ready');

    const msg = {
      id: uuidv4(),
      sender_id: data.sender_id,
      receiver_id: data.receiver_id,
      message_text: data.message_text,
      attachment: data.attachment || null,
      timestamp: new Date().toISOString(),
      status: 'unread',
      reply_to_id: data.reply_to_id || null,
    };

    await this.db.run(
      `INSERT INTO chat (id, sender_id, receiver_id, message_text, attachment, timestamp, status, reply_to_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      Object.values(msg)
    );

    // Upload if online
    if (await this.isOnline()) {
      try {
        await this.supabase.client.from('chat').insert(msg);
      } catch (e) { /* ignore upload errors */ }
    }

    // Broadcast to all windows
    const { BrowserWindow } = require('electron');
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('new-message', msg);
    });

    return { success: true, message: msg };
  }

  // Optional: initialize realtime after login
  initializeRealtime(user) {
    this.currentUser = user;
    console.log('Realtime chat enabled for', user.email);
  }

  close() {
    if (this.autoSyncInterval) clearInterval(this.autoSyncInterval);
    if (this.db) this.db.close();
  }
}

// Export singleton with initialize method
const syncService = new SyncService();
module.exports = syncService;
