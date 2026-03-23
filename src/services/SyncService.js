const DatabaseService = require('./DatabaseService');
const SqlServerService = require('./SqlServerService');

class SyncService {
  constructor() {
    this.isSyncing = false;
  }

  buildTableConfig() {
    return {
      users: {
        key: 'id',
        columns: ['id', 'first_name', 'last_name', 'email', 'password_hash', 'gender', 'role', 'phone_number', 'status', 'created_at', 'updated_at']
      },
      patients: {
        key: 'id',
        columns: ['id', 'patient_id', 'first_name', 'last_name', 'dob', 'gender', 'contact', 'created_at', 'updated_at']
      },
      tests: {
        key: 'id',
        columns: ['id', 'patient_id', 'machine_type', 'eye', 'test_date', 'raw_data', 'created_at', 'updated_at']
      },
      inventory: {
        key: 'id',
        columns: [
          'id', 'item_code', 'item_name', 'category', 'description', 'manufacturer', 'model_number',
          'serial_number', 'current_quantity', 'minimum_quantity', 'maximum_quantity', 'unit_of_measure',
          'unit_cost', 'supplier_name', 'supplier_contact', 'purchase_date', 'expiry_date', 'location',
          'status', 'last_updated_by', 'notes', 'image_path', 'created_at', 'updated_at'
        ]
      },
      pharmacy_drugs: {
        key: 'id',
        columns: [
          'id', 'drug_code', 'drug_name', 'drug_form', 'strength', 'pack_size', 'unit_price',
          'current_quantity', 'minimum_quantity', 'status', 'supplier_name', 'supplier_contact',
          'expiry_date', 'last_updated_by', 'notes', 'created_at', 'updated_at'
        ]
      },
      prescriptions: {
        key: 'id',
        columns: ['id', 'patient_id', 'doctor_id', 'drug_id', 'quantity', 'instructions', 'status', 'created_at', 'updated_at']
      },
      chat: {
        key: 'id',
        columns: ['id', 'sender_id', 'receiver_id', 'message_text', 'attachment', 'timestamp', 'status', 'reply_to_id']
      },
      reports: {
        key: 'id',
        columns: ['id', 'patient_id', 'report_type', 'title', 'report_file', 'report_date', 'created_at', 'updated_at']
      },
      notifications: {
        key: 'id',
        columns: ['id', 'user_id', 'title', 'message', 'type', 'related_id', 'status', 'created_at']
      }
    };
  }

  async fetchQueue(limit = 200) {
    const db = await DatabaseService.getDatabase();
    return await db.all(
      `SELECT * FROM sync_queue WHERE status = 'pending' ORDER BY created_at ASC LIMIT ?`,
      [limit]
    );
  }

  async markQueueSuccess(id) {
    const db = await DatabaseService.getDatabase();
    await db.run('DELETE FROM sync_queue WHERE id = ?', [id]);
  }

  async markQueueFailure(id, error) {
    const db = await DatabaseService.getDatabase();
    await db.run(
      `UPDATE sync_queue
       SET status = 'failed', attempts = attempts + 1, last_error = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [String(error || 'Unknown error').slice(0, 500), id]
    );
  }

  buildMergeStatement(tableName, config) {
    const key = config.key;
    const cols = config.columns;
    const sourceSelect = cols.map((c) => `@${c} AS [${c}]`).join(', ');
    const insertCols = cols.map((c) => `[${c}]`).join(', ');
    const insertVals = cols.map((c) => `source.[${c}]`).join(', ');
    const updateSet = cols
      .filter((c) => c !== key)
      .map((c) => `target.[${c}] = source.[${c}]`)
      .join(', ');

    return `
      MERGE INTO [${tableName}] AS target
      USING (SELECT ${sourceSelect}) AS source
      ON target.[${key}] = source.[${key}]
      WHEN MATCHED THEN UPDATE SET ${updateSet}
      WHEN NOT MATCHED THEN INSERT (${insertCols}) VALUES (${insertVals});
    `;
  }

  async applyChange(row, tableConfigs) {
    const table = String(row.table_name || '').trim();
    const operation = String(row.operation || '').toLowerCase();
    const config = tableConfigs[table];
    if (!config) {
      throw new Error(`No SQL Server mapping configured for table: ${table}`);
    }

    let payload = row.payload ? JSON.parse(row.payload) : {};
    const recordId = row.record_id || payload[config.key];
    if (!recordId) {
      throw new Error(`Missing record id for ${table}`);
    }

    if (operation === 'delete') {
      await SqlServerService.query(`DELETE FROM [${table}] WHERE [${config.key}] = @id`, { id: recordId });
      return;
    }

    const missingCols = config.columns.some((col) => payload[col] === undefined);
    if (missingCols) {
      const db = await DatabaseService.getDatabase();
      try {
        const rowData = await db.get(`SELECT * FROM ${table} WHERE ${config.key} = ?`, [recordId]);
        if (rowData) {
          payload = { ...rowData, ...payload };
        }
      } catch (err) {
        console.warn('[SyncService] applyChange enrichment failed:', err?.message);
      }
    }

    const statement = this.buildMergeStatement(table, config);
    const params = {};
    config.columns.forEach((col) => {
      params[col] = payload[col] !== undefined ? payload[col] : null;
    });
    params[config.key] = recordId;
    await SqlServerService.query(statement, params);
  }

  async syncToSqlServer({ limit = 200, initiatedBy = null } = {}) {
    if (this.isSyncing) return { success: false, error: 'Sync already running' };
    this.isSyncing = true;

    try {
      const cfg = SqlServerService.getSqlServerConfig();
      if (!cfg.enabled) {
        return { success: false, error: 'SQL Server sync is disabled' };
      }
      await SqlServerService.testConnection(cfg);

      const tableConfigs = this.buildTableConfig();
      const queue = await this.fetchQueue(limit);

      let processed = 0;
      let failed = 0;
      for (const row of queue) {
        try {
          await this.applyChange(row, tableConfigs);
          await this.markQueueSuccess(row.id);
          processed += 1;
        } catch (err) {
          failed += 1;
          await this.markQueueFailure(row.id, err.message || err);
        }
      }

      const db = await DatabaseService.getDatabase();
      await db.run(
        `INSERT INTO sync_state (key, value)
         VALUES ('sqlserver_last_sync', ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
        [new Date().toISOString()]
      );

      const remaining = await db.get(
        `SELECT COUNT(*) as count FROM sync_queue WHERE status = 'pending'`
      );

      return {
        success: failed === 0,
        summary: {
          processed,
          failed,
          remaining: remaining?.count || 0
        },
        initiatedBy
      };
    } finally {
      this.isSyncing = false;
    }
  }
}

module.exports = new SyncService();
