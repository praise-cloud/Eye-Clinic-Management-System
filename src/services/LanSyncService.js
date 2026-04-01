const fs = require('fs');
const path = require('path');
const os = require('os');
const { app } = require('electron');
const DatabaseService = require('./DatabaseService');

class LanSyncService {
  getConfigPath() {
    const dir = app.getPath('userData');
    return path.join(dir, 'config.json');
  }

  readConfig() {
    const cfgPath = this.getConfigPath();
    if (!fs.existsSync(cfgPath)) return {};
    try {
      return JSON.parse(fs.readFileSync(cfgPath, 'utf-8'));
    } catch (err) {
      console.warn('[LanSyncService] readConfig failed:', err?.message);
      return {};
    }
  }

  writeConfig(next) {
    const cfgPath = this.getConfigPath();
    fs.writeFileSync(cfgPath, JSON.stringify(next));
  }

  getDeviceId() {
    const cfg = this.readConfig();
    if (cfg.device_id) return String(cfg.device_id);
    const id = require('uuid').v4();
    this.writeConfig({ ...cfg, device_id: id });
    return id;
  }

  getDeviceName() {
    const cfg = this.readConfig();
    return String(cfg.device_name || os.hostname() || 'Unknown Device').trim();
  }

  setDeviceName(name) {
    const cfg = this.readConfig();
    this.writeConfig({ ...cfg, device_name: name });
  }

  getSyncPath() {
    const cfg = this.readConfig();
    return String(cfg.lan_sync_path || '');
  }

  setSyncPath(syncPath) {
    const cfg = this.readConfig();
    this.writeConfig({ ...cfg, lan_sync_path: syncPath });
  }

  async broadcastPresence() {
    const syncPath = this.getSyncPath();
    if (!syncPath) {
      console.log('[LanSyncService] No sync path configured, skipping presence broadcast');
      return { success: false, error: 'No sync path configured' };
    }
    if (!fs.existsSync(syncPath)) {
      console.warn('[LanSyncService] Sync path not accessible:', syncPath);
      return { success: false, error: 'Sync path not found' };
    }

    try {
      const db = await DatabaseService.getDatabase();
      const deviceId = this.getDeviceId();
      const deviceName = this.getDeviceName();

      const onlineUsers = await db.all(`
        SELECT up.user_id, up.is_online, up.last_seen, up.session_id,
               u.first_name, u.last_name, u.email, u.role
        FROM user_presence up
        LEFT JOIN users u ON up.user_id = u.id
        WHERE up.is_online = 1
      `);

      const presenceData = {
        device_id: deviceId,
        device_name: deviceName,
        timestamp: new Date().toISOString(),
        online_users: onlineUsers.map(u => ({
          user_id: u.user_id,
          email: u.email,
          name: `${u.first_name || ''} ${u.last_name || ''}`.trim(),
          role: u.role,
          session_id: u.session_id,
          last_seen: u.last_seen
        }))
      };

      const filePath = path.join(syncPath, `presence_${deviceId}.json`);
      fs.writeFileSync(filePath, JSON.stringify(presenceData, null, 2));

      return { success: true, online_count: onlineUsers.length };
    } catch (error) {
      console.warn('[LanSyncService] broadcastPresence error:', error.message);
      return { success: false, error: error.message };
    }
  }

  async broadcastDataUpdate(tableName, action, recordId, record = null) {
    const syncPath = this.getSyncPath();
    if (!syncPath) {
      return { success: false, error: 'No sync path configured' };
    }
    if (!fs.existsSync(syncPath)) {
      return { success: false, error: 'Sync path not found' };
    }

    try {
      const deviceId = this.getDeviceId();
      const deviceName = this.getDeviceName();

      const updateNotification = {
        device_id: deviceId,
        device_name: deviceName,
        table: tableName,
        action: action,
        record_id: recordId,
        record: record,
        timestamp: new Date().toISOString()
      };

      const filePath = path.join(syncPath, `data_update_${Date.now()}_${deviceId}.json`);
      fs.writeFileSync(filePath, JSON.stringify(updateNotification, null, 2));

      return { success: true };
    } catch (error) {
      console.warn('[LanSyncService] broadcastDataUpdate error:', error.message);
      return { success: false, error: error.message };
    }
  }

  async checkForDataUpdates() {
    const syncPath = this.getSyncPath();
    if (!syncPath) {
      return { hasUpdates: false, updates: [] };
    }
    if (!fs.existsSync(syncPath)) {
      return { hasUpdates: false, updates: [] };
    }

    try {
      const deviceId = this.getDeviceId();
      const files = fs.readdirSync(syncPath).filter(f => f.startsWith('data_update_') && f.endsWith('.json'));
      const updates = [];

      for (const file of files) {
        try {
          const filePath = path.join(syncPath, file);
          const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

          if (content.device_id !== deviceId) {
            const fileAge = Date.now() - new Date(content.timestamp).getTime();
            if (fileAge < 300000) {
              updates.push(content);
            }
          }

          fs.unlinkSync(filePath);
        } catch (e) {
          console.warn('[LanSyncService] Failed to process update file:', file, e.message);
        }
      }

      return { hasUpdates: updates.length > 0, updates };
    } catch (error) {
      console.warn('[LanSyncService] checkForDataUpdates error:', error.message);
      return { hasUpdates: false, updates: [] };
    }
  }

  async getAllOnlineUsers() {
    const syncPath = this.getSyncPath();
    if (!syncPath) {
      return { success: false, error: 'No sync path configured', users: [] };
    }
    if (!fs.existsSync(syncPath)) {
      return { success: false, error: 'Sync path not found', users: [] };
    }

    try {
      const db = await DatabaseService.getDatabase();
      const deviceId = this.getDeviceId();
      const myPresence = await db.all(`
        SELECT up.user_id, up.is_online, up.last_seen, up.session_id,
               u.first_name, u.last_name, u.email, u.role
        FROM user_presence up
        LEFT JOIN users u ON up.user_id = u.id
      `);

      const allOnlineUsers = [];
      const seenUserIds = new Set();

      for (const myUser of myPresence) {
        allOnlineUsers.push({
          user_id: myUser.user_id,
          email: myUser.email,
          name: `${myUser.first_name || ''} ${myUser.last_name || ''}`.trim(),
          role: myUser.role,
          is_online: myUser.is_online === 1,
          last_seen: myUser.last_seen,
          device_id: deviceId,
          device_name: this.getDeviceName(),
          is_current_device: true
        });
        if (myUser.user_id) seenUserIds.add(myUser.user_id);
      }

      const presenceFiles = fs.readdirSync(syncPath)
        .filter(name => name.startsWith('presence_') && name.endsWith('.json') && !name.includes(deviceId));

      for (const fileName of presenceFiles) {
        try {
          const filePath = path.join(syncPath, fileName);
          const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

          const fileAge = Date.now() - new Date(content.timestamp).getTime();
          const isStale = fileAge > 60000;

          for (const user of (content.online_users || [])) {
            if (!seenUserIds.has(user.user_id)) {
              allOnlineUsers.push({
                ...user,
                is_online: !isStale,
                last_seen: content.timestamp,
                device_id: content.device_id,
                device_name: content.device_name,
                is_current_device: false,
                is_stale: isStale
              });
              seenUserIds.add(user.user_id);
            }
          }
        } catch (err) {
          console.warn('[LanSyncService] Failed to read presence file:', fileName, err.message);
        }
      }

      return {
        success: true,
        users: allOnlineUsers,
        total_online: allOnlineUsers.filter(u => u.is_online && !u.is_current_device).length + myPresence.filter(u => u.is_online === 1).length
      };
    } catch (error) {
      console.warn('[LanSyncService] getAllOnlineUsers error:', error.message);
      return { success: false, error: error.message, users: [] };
    }
  }

  async getConflicts() {
    return [];
  }

  async resolveConflict() {
    return { success: true };
  }

  async exportChanges() {
    return { success: true, exported: 0 };
  }

  async importChanges() {
    return { success: true, applied: 0 };
  }

  async exportActivityLogs() {
    return { success: true, exported: 0 };
  }

  async importActivityLogs() {
    return { success: true, imported: 0 };
  }
}

module.exports = new LanSyncService();
