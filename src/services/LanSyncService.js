const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const DatabaseService = require('./DatabaseService');

const ALLOWED_TABLE_NAMES = new Set([
    'users', 'patients', 'tests', 'inventory',
    'pharmacy_drugs', 'prescriptions', 'reports',
    'chat', 'notifications'
]);

const validateTableName = (tableName) => {
    if (!tableName || typeof tableName !== 'string') return null;
    const normalized = tableName.toLowerCase().trim();
    return ALLOWED_TABLE_NAMES.has(normalized) ? normalized : null;
};

const validateColumnName = (colName) => {
    if (!colName || typeof colName !== 'string') return null;
    return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(colName) ? colName : null;
};

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

  getSyncPath() {
    const cfg = this.readConfig();
    return String(cfg.lan_sync_path || '');
  }

  setSyncPath(syncPath) {
    const cfg = this.readConfig();
    this.writeConfig({ ...cfg, lan_sync_path: syncPath });
  }

  getTableConfig() {
    return {
      users: { key: 'id', updated: 'updated_at' },
      patients: { key: 'id', updated: 'updated_at' },
      tests: { key: 'id', updated: 'updated_at' },
      inventory: { key: 'id', updated: 'updated_at' },
      pharmacy_drugs: { key: 'id', updated: 'updated_at' },
      prescriptions: { key: 'id', updated: 'updated_at' },
      reports: { key: 'id', updated: 'updated_at' },
      chat: { key: 'id', updated: 'timestamp' },
      notifications: { key: 'id', updated: 'created_at' }
    };
  }

  async exportChanges() {
    const syncPath = this.getSyncPath();
    if (!syncPath) return { success: false, error: 'LAN sync folder not configured' };
    if (!fs.existsSync(syncPath)) return { success: false, error: 'LAN sync folder not found' };

    const db = await DatabaseService.getDatabase();
    const pending = await db.all(`SELECT * FROM sync_queue WHERE status = 'pending' ORDER BY created_at ASC`);
    if (!pending.length) return { success: true, exported: 0, file: null };

    const deviceId = this.getDeviceId();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `sync_${deviceId}_${timestamp}.json`;
    const filePath = path.join(syncPath, fileName);

    const changes = [];
    for (const row of pending) {
      let payload = row.payload ? JSON.parse(row.payload) : {};
      const rawTable = row.table_name;
      const safeTable = validateTableName(rawTable);
      if (!safeTable) {
        console.warn('[LanSyncService] Skipping export for invalid table:', rawTable);
        continue;
      }
      const config = this.getTableConfig()[safeTable];
      const key = config?.key || 'id';
      const recordId = row.record_id || payload[key];

      if (!payload || !recordId || Object.keys(payload || {}).length < 3) {
        try {
          const full = await db.get(`SELECT * FROM ${safeTable} WHERE ${key} = ?`, [recordId]);
          if (full) payload = { ...full, ...payload };
        } catch (err) {
          console.warn('[LanSyncService] exportChanges enrichment failed:', err?.message);
        }
      }

      changes.push({
        table: safeTable,
        operation: row.operation,
        record_id: recordId,
        payload,
        updated_at: payload?.updated_at || payload?.created_at || null
      });
    }

    const envelope = {
      device_id: deviceId,
      created_at: new Date().toISOString(),
      changes
    };

    fs.writeFileSync(filePath, JSON.stringify(envelope, null, 2));
    await db.run(`UPDATE sync_queue SET status = 'sent', updated_at = CURRENT_TIMESTAMP WHERE status = 'pending'`);

    return { success: true, exported: changes.length, file: filePath };
  }

  async getProcessedList() {
    const db = await DatabaseService.getDatabase();
    const row = await db.get(`SELECT value FROM sync_state WHERE key = 'lan_sync_processed'`);
    if (!row?.value) return [];
    try {
      return JSON.parse(row.value) || [];
    } catch {
      return [];
    }
  }

  async saveProcessedList(list) {
    const db = await DatabaseService.getDatabase();
    const trimmed = list.slice(-500);
    await db.run(
      `INSERT INTO sync_state (key, value)
       VALUES ('lan_sync_processed', ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      [JSON.stringify(trimmed)]
    );
  }

  async applyChange(change, tableConfig) {
    const db = await DatabaseService.getDatabase();
    const { table: rawTable, operation, record_id, payload = {}, updated_at } = change;
    const safeTable = validateTableName(rawTable);
    if (!safeTable) {
      return { skipped: true, reason: 'invalid_table' };
    }
    const config = tableConfig[safeTable];
    if (!config) return { skipped: true, reason: 'unsupported_table' };

    const safeKey = validateColumnName(config.key) || 'id';
    const local = await db.get(`SELECT * FROM ${safeTable} WHERE ${safeKey} = ?`, [record_id]);
    const localUpdated = local?.[config.updated] || local?.updated_at || local?.created_at || null;
    const remoteUpdated = updated_at || payload?.[config.updated] || payload?.updated_at || payload?.created_at || null;

    if (operation === 'delete') {
      await db.run(`DELETE FROM ${safeTable} WHERE ${safeKey} = ?`, [record_id]);
      return { applied: true };
    }

    if (local && localUpdated && remoteUpdated) {
      const localTs = new Date(localUpdated).getTime();
      const remoteTs = new Date(remoteUpdated).getTime();
      if (!Number.isNaN(localTs) && !Number.isNaN(remoteTs) && localTs > remoteTs) {
        await this.recordConflict(safeTable, record_id, local, payload, localUpdated, remoteUpdated);
        return { skipped: true, reason: 'local_newer' };
      }
    }

    if (payload[safeKey] === undefined) payload[safeKey] = record_id;
    const cols = Object.keys(payload).filter((c) => validateColumnName(c));
    if (!cols.length) return { skipped: true, reason: 'empty_payload' };

    const placeholders = cols.map(() => '?').join(', ');
    const updates = cols.filter((c) => c !== safeKey).map((c) => `${c} = excluded.${c}`).join(', ');
    const values = cols.map((c) => payload[c]);

    const sql = `INSERT INTO ${safeTable} (${cols.join(', ')}) VALUES (${placeholders})
                 ON CONFLICT(${safeKey}) DO UPDATE SET ${updates}`;
    await db.run(sql, values);
    return { applied: true };
  }

  async recordConflict(table, recordId, local, remote, localUpdated, remoteUpdated) {
    const db = await DatabaseService.getDatabase();
    const id = require('uuid').v4();
    await db.run(
      `INSERT INTO sync_conflicts (id, table_name, record_id, local_payload, remote_payload, local_updated_at, remote_updated_at, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        id,
        table,
        recordId,
        JSON.stringify(local || {}),
        JSON.stringify(remote || {}),
        localUpdated || null,
        remoteUpdated || null
      ]
    );
  }

  async importChanges() {
    const syncPath = this.getSyncPath();
    if (!syncPath) return { success: false, error: 'LAN sync folder not configured' };
    if (!fs.existsSync(syncPath)) return { success: false, error: 'LAN sync folder not found' };

    const deviceId = this.getDeviceId();
    const processed = await this.getProcessedList();

    const files = fs.readdirSync(syncPath)
      .filter((name) => name.endsWith('.json') && name.startsWith('sync_'))
      .sort();

    let applied = 0;
    let skipped = 0;

    const tableConfig = this.getTableConfig();

    for (const name of files) {
      if (processed.includes(name)) continue;
      if (name.includes(deviceId)) {
        processed.push(name);
        continue;
      }

      const filePath = path.join(syncPath, name);
      try {
        const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        const changes = Array.isArray(raw?.changes) ? raw.changes : [];
        for (const change of changes) {
          const res = await this.applyChange(change, tableConfig);
          if (res?.applied) applied += 1;
          else skipped += 1;
        }
        processed.push(name);
      } catch {
        // Ignore malformed files but mark as processed to avoid loops.
        processed.push(name);
      }
    }

    await this.saveProcessedList(processed);
    return { success: true, applied, skipped, files_processed: processed.length };
  }

  async getConflicts() {
    const db = await DatabaseService.getDatabase();
    const rows = await db.all(
      `SELECT * FROM sync_conflicts WHERE status = 'pending' ORDER BY created_at DESC`
    );
    return rows || [];
  }

  async resolveConflict(id, resolution = 'keep_local') {
    const db = await DatabaseService.getDatabase();
    const row = await db.get(`SELECT * FROM sync_conflicts WHERE id = ?`, [id]);
    if (!row) return { success: false, error: 'Conflict not found' };

    if (resolution === 'apply_remote') {
      const remote = row.remote_payload ? JSON.parse(row.remote_payload) : {};
      const change = {
        table: row.table_name,
        operation: 'upsert',
        record_id: row.record_id,
        payload: remote,
        updated_at: row.remote_updated_at
      };
      await this.applyChange(change, this.getTableConfig());
    }

    await db.run(
      `UPDATE sync_conflicts SET status = 'resolved', resolution = ?, resolved_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [resolution, id]
    );

    return { success: true };
  }
}

module.exports = new LanSyncService();
