const Database = require('../../database.js');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { app } = require('electron');
const { exec } = require('child_process');
const SchemaSyncService = require('./SchemaSyncService');

const ALLOWED_TABLE_NAMES = new Set([
    'users', 'staff', 'admins', 'employees',
    'patients', 'clients', 'client', 'customer',
    'tests', 'exams', 'examinations',
    'inventory', 'items', 'stock',
    'chat', 'messages',
    'prescriptions', 'pharmacy_drugs', 'pharmacy_dispensations',
    'reports', 'revenue', 'activity_logs', 'notifications',
    'settings', 'sync_metadata', 'user_presence',
    'sync_queue', 'sync_state', 'sync_conflicts'
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

class DatabaseService {
    constructor() {
        this.database = null;
    }

    async getDatabase() {
        if (!this.database) {
            this.database = new Database();
            await this.database.initialize();
        }
        return this.database;
    }

    async enqueueSyncChange(tableName, operation, recordId, payload = {}) {
        try {
            const db = await this.getDatabase();
            const id = require('uuid').v4();
            await db.run(
                `INSERT INTO sync_queue (id, table_name, operation, record_id, payload, status)
                 VALUES (?, ?, ?, ?, ?, 'pending')`,
                [id, tableName, operation, recordId || null, JSON.stringify(payload || {})]
            );
            return true;
        } catch (error) {
            console.warn('[SyncQueue] enqueue failed:', error.message);
            return false;
        }
    }

    async authenticateUser(email, password) {
        const db = await this.getDatabase();
        return await db.authenticateUser(email, password);
    }

    // Add other methods as needed
    async createUser(userData) {
        const db = await this.getDatabase();
        const user = await db.createUser(userData);
        try {
            const stored = await db.get('SELECT * FROM users WHERE id = ?', [user.id]);
            if (stored) {
                await this.enqueueSyncChange('users', 'upsert', stored.id, stored);
            }
        } catch (err) {
            console.warn('[DatabaseService] createUser sync enqueue failed:', err?.message);
        }
        return user;
    }

    async getAllUsers() {
        const db = await this.getDatabase();
        return await db.getAllUsers();
    }

    async updateUser(userId, userData) {
        const db = await this.getDatabase();
        const result = await db.updateUser(userId, userData);
        try {
            const stored = await db.get('SELECT * FROM users WHERE id = ?', [userId]);
            if (stored) {
                await this.enqueueSyncChange('users', 'upsert', stored.id, stored);
            }
        } catch (err) {
            console.warn('[DatabaseService] updateUser sync enqueue failed:', err?.message);
        }
        return result;
    }

    async updateUserStatus(userId, isActive) {
        const db = await this.getDatabase();
        const result = await db.updateUserStatus(userId, isActive);
        try {
            const stored = await db.get('SELECT * FROM users WHERE id = ?', [userId]);
            if (stored) {
                await this.enqueueSyncChange('users', 'upsert', stored.id, stored);
            }
        } catch (err) {
            console.warn('[DatabaseService] updateUserStatus sync enqueue failed:', err?.message);
        }
        return result;
    }

    async deleteUser(userId) {
        const db = await this.getDatabase();
        const result = await db.deleteUser(userId);
        if (result?.success !== false) {
            await this.enqueueSyncChange('users', 'delete', userId, { id: userId });
        }
        return result;
    }

    async getUserStatistics(userId) {
        const db = await this.getDatabase();
        const stats = {
            user: null,
            activityCount: 0,
            patientsCreated: 0,
            testsCreated: 0,
            prescriptionsCreated: 0,
            lastActivity: null
        };

        const user = await db.get('SELECT * FROM users WHERE id = ?', [userId]);
        stats.user = user;

        if (user) {
            const activity = await db.get(
                'SELECT COUNT(*) as count FROM activity_logs WHERE user_id = ?',
                [userId]
            );
            stats.activityCount = Number(activity?.count || 0);

            const patients = await db.get(
                'SELECT COUNT(*) as count FROM activity_logs WHERE user_id = ? AND action_type = ?',
                [userId, 'create']
            );
            stats.patientsCreated = Number(patients?.count || 0);

            const tests = await db.get(
                'SELECT COUNT(*) as count FROM activity_logs WHERE user_id = ? AND entity_type = ?',
                [userId, 'test']
            );
            stats.testsCreated = Number(tests?.count || 0);

            const lastLog = await db.get(
                'SELECT created_at FROM activity_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
                [userId]
            );
            stats.lastActivity = lastLog?.created_at || null;
        }

        return stats;
    }

    async getSetting(key) {
        const db = await this.getDatabase();
        return await db.getSetting(key);
    }

    async getAllSettings() {
        const db = await this.getDatabase();
        const rows = await db.all('SELECT key, value FROM settings');
        return rows;
    }

    async setSetting(key, value) {
        const db = await this.getDatabase();
        return await db.setSetting(key, value);
    }

    // Online Status Management
    async setUserOnline(userId, sessionId = null) {
        const db = await this.getDatabase();
        return await db.setUserOnline(userId, sessionId);
    }

    async setUserOffline(userId) {
        const db = await this.getDatabase();
        return await db.setUserOffline(userId);
    }

    async getOnlineUsers() {
        const db = await this.getDatabase();
        return await db.getOnlineUsers();
    }

    async getUsersWithPresence() {
        const db = await this.getDatabase();
        return await db.getUsersWithPresence();
    }

    // Chat/Messages Management
    async getMessages(userId, otherUserId = null, search = '', limit = 50, offset = 0) {
        const db = await this.getDatabase();
        let query = `
            SELECT * FROM chat
            WHERE (sender_id = ? AND receiver_id = ?)
               OR (sender_id = ? AND receiver_id = ?)
        `;
        let params = [userId, otherUserId, otherUserId, userId];

        if (search) {
            query += ` AND message_text LIKE ?`;
            params.push(`%${search}%`);
        }

        query += ` ORDER BY timestamp ASC`;

        if (limit) {
            query += ` LIMIT ?`;
            params.push(limit);
        }

        if (offset) {
            query += ` OFFSET ?`;
            params.push(offset);
        }

        return await db.all(query, params);
    }

    async markMessageAsRead(messageId, userId) {
        const db = await this.getDatabase();
        const query = `UPDATE chat SET status = 'read' WHERE id = ? AND receiver_id = ?`;
        await db.run(query, [messageId, userId]);
        await this.enqueueSyncChange('chat', 'upsert', messageId, { id: messageId, status: 'read' });
        return { success: true };
    }

    async markAllMessagesAsRead(userId, otherUserId) {
        const db = await this.getDatabase();
        const query = `UPDATE chat SET status = 'read' WHERE receiver_id = ? AND sender_id = ? AND status = 'unread'`;
        const result = await db.run(query, [userId, otherUserId]);
        return { success: true, updated: result.changes };
    }

    async deleteMessage(messageId, userId) {
        const db = await this.getDatabase();
        const query = `DELETE FROM chat WHERE id = ? AND sender_id = ?`;
        const result = await db.run(query, [messageId, userId]);
        if (result.changes > 0) {
            await this.enqueueSyncChange('chat', 'delete', messageId, { id: messageId });
        }
        return { success: result.changes > 0 };
    }

    async getUnreadMessageCount(userId) {
        const db = await this.getDatabase();
        const query = `SELECT COUNT(*) as count FROM chat WHERE receiver_id = ? AND status = 'unread'`;
        const result = await db.get(query, [userId]);
        return result.count;
    }

    // Patient Management
    async getAllPatients(filters = {}) {
        const db = await this.getDatabase();
        let query = 'SELECT * FROM patients';
        let params = [];

        if (filters.search) {
            query += ' WHERE first_name LIKE ? OR last_name LIKE ? OR patient_id LIKE ?';
            const searchTerm = `%${filters.search}%`;
            params = [searchTerm, searchTerm, searchTerm];
        }

        query += ' ORDER BY created_at DESC';
        return await db.all(query, params);
    }

    async getPatientById(id) {
        const db = await this.getDatabase();
        const query = 'SELECT * FROM patients WHERE id = ?';
        return await db.get(query, [id]);
    }

    async createPatient(patientData) {
        const db = await this.getDatabase();
        const {
            patient_id,
            first_name,
            last_name,
            dob,
            gender,
            contact,
            email,
            address,
            reason_for_visit,
            client_type,
            marital_status
        } = patientData;
        const id = require('uuid').v4();

        // Duplicate checks (patient_id, email, contact)
        if (patient_id) {
            const existingById = await db.get('SELECT id FROM patients WHERE patient_id = ?', [patient_id]);
            if (existingById?.id) {
                return { success: false, error: 'A client with this Patient ID already exists.' };
            }
        }
        if (email) {
            const existingByEmail = await db.get('SELECT id FROM patients WHERE email = ?', [email]);
            if (existingByEmail?.id) {
                return { success: false, error: 'A client with this email already exists.' };
            }
        }
        if (contact) {
            const existingByContact = await db.get('SELECT id FROM patients WHERE contact = ?', [contact]);
            if (existingByContact?.id) {
                return { success: false, error: 'A client with this phone number already exists.' };
            }
        }

        const query = `
            INSERT INTO patients (
              id, patient_id, first_name, last_name, dob, gender, contact,
              email, address, reason_for_visit, client_type, marital_status,
              created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `;

        await db.run(query, [
            id,
            patient_id,
            first_name,
            last_name,
            dob,
            gender,
            contact,
            email || null,
            address || null,
            reason_for_visit || null,
            client_type || null,
            marital_status || null
        ]);
        const record = {
            id,
            patient_id,
            first_name,
            last_name,
            dob,
            gender,
            contact,
            email: email || null,
            address: address || null,
            reason_for_visit: reason_for_visit || null,
            client_type: client_type || null,
            marital_status: marital_status || null
        };
        await this.enqueueSyncChange('patients', 'upsert', id, record);
        return record;
    }

    async updatePatient(id, patientData) {
        const db = await this.getDatabase();
        const {
            patient_id,
            first_name,
            last_name,
            dob,
            gender,
            contact,
            email,
            address,
            reason_for_visit,
            client_type,
            marital_status
        } = patientData;

        if (patient_id) {
            const existingById = await db.get('SELECT id FROM patients WHERE patient_id = ? AND id != ?', [patient_id, id]);
            if (existingById?.id) {
                return { success: false, error: 'A client with this Patient ID already exists.' };
            }
        }
        if (email) {
            const existingByEmail = await db.get('SELECT id FROM patients WHERE email = ? AND id != ?', [email, id]);
            if (existingByEmail?.id) {
                return { success: false, error: 'A client with this email already exists.' };
            }
        }
        if (contact) {
            const existingByContact = await db.get('SELECT id FROM patients WHERE contact = ? AND id != ?', [contact, id]);
            if (existingByContact?.id) {
                return { success: false, error: 'A client with this phone number already exists.' };
            }
        }

        const query = `
            UPDATE patients
            SET patient_id = ?, first_name = ?, last_name = ?, dob = ?, gender = ?, contact = ?,
                email = ?, address = ?, reason_for_visit = ?, client_type = ?, marital_status = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `;

        await db.run(query, [
            patient_id,
            first_name,
            last_name,
            dob,
            gender,
            contact,
            email || null,
            address || null,
            reason_for_visit || null,
            client_type || null,
            marital_status || null,
            id
        ]);
        const record = {
            id,
            patient_id,
            first_name,
            last_name,
            dob,
            gender,
            contact,
            email: email || null,
            address: address || null,
            reason_for_visit: reason_for_visit || null,
            client_type: client_type || null,
            marital_status: marital_status || null
        };
        await this.enqueueSyncChange('patients', 'upsert', id, record);
        return record;
    }

    async deletePatient(id) {
        const db = await this.getDatabase();
        const query = 'DELETE FROM patients WHERE id = ?';
        const result = await db.run(query, [id]);
        if (result.changes > 0) {
            await this.enqueueSyncChange('patients', 'delete', id, { id });
        }
        return { success: result.changes > 0 };
    }


    async getAllTests(filters = {}) {
        const db = await this.getDatabase();
        let query = 'SELECT t.*, p.first_name, p.last_name FROM tests t LEFT JOIN patients p ON t.patient_id = p.id';
        let params = [];

        if (filters.patientName) {
            query += ' WHERE p.first_name LIKE ? OR p.last_name LIKE ?';
            const search = `%${filters.patientName}%`;
            params = [search, search];
        }
        if (filters.patientId) {
            query += params.length ? ' AND t.patient_id = ?' : ' WHERE t.patient_id = ?';
            params.push(filters.patientId);
        }

        query += ' ORDER BY t.test_date DESC';
        const rows = await db.all(query, params);

        return rows;
    }

    async createTest(testData) {
        const db = await this.getDatabase();
        const id = require('uuid').v4();

        const query = `
            INSERT INTO tests (
            id, patient_id, machine_type, eye, test_date, raw_data,
            created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `;

        let patientId = testData.patient_id;
        if (!patientId && testData.patient_name) {
            const parts = String(testData.patient_name).trim().split(/\s+/);
            const firstName = parts[0] || '';
            const lastName = parts.slice(1).join(' ') || '';
            const existing = await db.get(
                'SELECT id FROM patients WHERE first_name = ? AND last_name = ? ORDER BY created_at DESC',
                [firstName, lastName]
            );
            if (existing && existing.id) {
                patientId = existing.id;
            } else {
                const genId = 'P' + Date.now();
                const created = await this.createPatient({
                    patient_id: genId,
                    first_name: firstName,
                    last_name: lastName,
                    dob: null,
                    gender: 'other',
                    contact: null
                });
                patientId = created.id;
            }
        }

        const params = [
            id,
            patientId,
            testData.machine_type,
            testData.eye || 'both',
            testData.test_date || new Date().toISOString(),
            testData.raw_data || '{}'
        ];

        try {
            await db.run(query, params);
            const record = {
                id,
                patient_id: patientId,
                machine_type: testData.machine_type,
                eye: testData.eye || 'both',
                test_date: testData.test_date || new Date().toISOString(),
                raw_data: testData.raw_data || '{}'
            };
            await this.enqueueSyncChange('tests', 'upsert', id, record);
            return { id, ...testData, patient_id: patientId };
        } catch (error) {
            console.error('Database createTest error:', error);
            throw error;
        }
    }

    async getTestById(id) {
        const db = await this.getDatabase();
        const query = 'SELECT * FROM tests WHERE id = ?';
        return await db.get(query, [id]);
    }

    async updateTest(id, testData) {
        const db = await this.getDatabase();
        const { machine_type, eye, test_date, raw_data } = testData;

        const query = `
            UPDATE tests
            SET machine_type = ?, eye = ?, test_date = ?, raw_data = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `;

        await db.run(query, [machine_type, eye, test_date, raw_data, id]);
        const record = { id, machine_type, eye, test_date, raw_data };
        await this.enqueueSyncChange('tests', 'upsert', id, record);
        return { id, ...testData };
    }

    async deleteTest(id) {
        const db = await this.getDatabase();
        const query = 'DELETE FROM tests WHERE id = ?';
        const result = await db.run(query, [id]);
        if (result.changes > 0) {
            await this.enqueueSyncChange('tests', 'delete', id, { id });
        }
        return { success: result.changes > 0 };
    }

    // Report Management
    async getAllReports(filters = {}) {
        const db = await this.getDatabase();
        let query = 'SELECT r.*, p.first_name, p.last_name FROM reports r LEFT JOIN patients p ON r.patient_id = p.id';
        let params = [];

        if (filters.patientId) {
            query += ' WHERE r.patient_id = ?';
            params = [filters.patientId];
        }

        query += ' ORDER BY r.report_date DESC';
        return await db.all(query, params);
    }

    async getReportById(id) {
        const db = await this.getDatabase();
        const query = 'SELECT * FROM reports WHERE id = ?';
        return await db.get(query, [id]);
    }

    async createReport(reportData) {
        const db = await this.getDatabase();
        const { patient_id, report_file, report_type, title } = reportData;
        const id = require('uuid').v4();

        const query = `
            INSERT INTO reports (id, patient_id, report_type, title, report_file, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `;

        await db.run(query, [id, patient_id, report_type, title, report_file]);
        const record = { id, patient_id, report_type, title, report_file };
        await this.enqueueSyncChange('reports', 'upsert', id, record);
        return record;
    }

    async deleteReport(id) {
        const db = await this.getDatabase();
        const query = 'DELETE FROM reports WHERE id = ?';
        const result = await db.run(query, [id]);
        if (result.changes > 0) {
            await this.enqueueSyncChange('reports', 'delete', id, { id });
        }
        return { success: result.changes > 0 };
    }

    // Inventory Management
    async getAllInventoryItems(filters = {}) {
        const db = await this.getDatabase();
        let query = 'SELECT * FROM inventory';
        let params = [];

        if (filters.category) {
            query += ' WHERE category = ?';
            params = [filters.category];
        }

        query += ' ORDER BY item_name ASC';
        return await db.all(query, params);
    }

    async getInventoryItemById(id) {
        const db = await this.getDatabase();
        const query = 'SELECT * FROM inventory WHERE id = ?';
        return await db.get(query, [id]);
    }

    async getInventoryItemByCode(itemCode) {
        const db = await this.getDatabase();
        const query = 'SELECT * FROM inventory WHERE item_code = ?';
        return await db.get(query, [itemCode]);
    }

    async createInventoryItem(itemData) {
        const db = await this.getDatabase();
        const id = require('uuid').v4();

        const query = `
            INSERT INTO inventory (
                id, item_code, item_name, category, description, manufacturer,
                model_number, serial_number, current_quantity, minimum_quantity,
                maximum_quantity, unit_of_measure, unit_cost, supplier_name,
                supplier_contact, purchase_date, expiry_date, location, status,
                last_updated_by, notes, image_path, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `;

        const params = [
            id,
            itemData.item_code,
            itemData.item_name,
            itemData.category,
            itemData.description || null,
            itemData.manufacturer || null,
            itemData.model_number || null,
            itemData.serial_number || null,
            itemData.current_quantity || 0,
            itemData.minimum_quantity || 0,
            itemData.maximum_quantity || 100,
            itemData.unit_of_measure || 'pieces',
            itemData.unit_cost || 0,
            itemData.supplier_name || null,
            itemData.supplier_contact || null,
            itemData.purchase_date || null,
            itemData.expiry_date || null,
            itemData.location || null,
            itemData.status || 'active',
            itemData.last_updated_by || null,
            itemData.notes || null,
            itemData.image_path || null
        ];

        await db.run(query, params);
        const record = { id, ...itemData };
        await this.enqueueSyncChange('inventory', 'upsert', id, record);
        return record;
    }

    async updateInventoryItem(id, itemData) {
        const db = await this.getDatabase();

        const query = `
            UPDATE inventory
            SET item_name = ?, category = ?, description = ?, manufacturer = ?,
                model_number = ?, serial_number = ?, current_quantity = ?,
                minimum_quantity = ?, maximum_quantity = ?, unit_of_measure = ?,
                unit_cost = ?, supplier_name = ?, supplier_contact = ?,
                purchase_date = ?, expiry_date = ?, location = ?, status = ?,
                last_updated_by = ?, notes = ?, image_path = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `;

        const params = [
            itemData.item_name,
            itemData.category,
            itemData.description,
            itemData.manufacturer,
            itemData.model_number,
            itemData.serial_number,
            itemData.current_quantity,
            itemData.minimum_quantity,
            itemData.maximum_quantity,
            itemData.unit_of_measure,
            itemData.unit_cost,
            itemData.supplier_name,
            itemData.supplier_contact,
            itemData.purchase_date,
            itemData.expiry_date,
            itemData.location,
            itemData.status,
            itemData.last_updated_by,
            itemData.notes,
            itemData.image_path,
            id
        ];

        await db.run(query, params);
        const record = { id, ...itemData };
        await this.enqueueSyncChange('inventory', 'upsert', id, record);
        return record;
    }

    async updateInventoryQuantity(id, quantity, userId = null, notes = null) {
        const db = await this.getDatabase();

        const existing = await db.get('SELECT current_quantity, unit_cost FROM inventory WHERE id = ?', [id]);
        let revenueAmount = 0;
        let dispensedQuantity = 0;

        if (existing) {
            const prevQty = Number(existing.current_quantity || 0);
            const newQty = Number(quantity || 0);
            const delta = prevQty - newQty;
            if (delta > 0) {
                const unitCost = Number(existing.unit_cost || 0);
                if (!isNaN(unitCost) && unitCost > 0) {
                    dispensedQuantity = delta;
                    revenueAmount = delta * unitCost;
                }
            }
        }

        const query = `
            UPDATE inventory
            SET current_quantity = ?, last_updated_by = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `;
        const params = [quantity, userId || null, notes || null, id];
        await db.run(query, params);

        if (revenueAmount > 0) {
            const description = notes || `Inventory dispensed: ${dispensedQuantity} units`;
            await this.recordRevenue({
                source: 'inventory',
                source_id: id,
                amount: revenueAmount,
                userId,
                description,
                meta: { dispensedQuantity }
            });
        }

        const updated = await this.getInventoryItemById(id);
        if (updated) {
            await this.enqueueSyncChange('inventory', 'upsert', id, updated);
        }
        return updated;
    }

    async deleteInventoryItem(id) {
        const db = await this.getDatabase();
        const query = 'DELETE FROM inventory WHERE id = ?';
        const result = await db.run(query, [id]);
        if (result.changes > 0) {
            await this.enqueueSyncChange('inventory', 'delete', id, { id });
        }
        return { success: result.changes > 0 };
    }

    async getInventoryItemByCode(itemCode) {
        const db = await this.getDatabase();
        const query = 'SELECT * FROM inventory WHERE item_code = ?';
        return await db.get(query, [itemCode]);
    }

    async getInventoryStatistics() {
        const db = await this.getDatabase();
        const stats = {
            total: 0,
            totalValue: 0,
            lowStock: 0,
            expiring: 0,
            categories: {}
        };

        const items = await db.all('SELECT current_quantity, minimum_quantity, unit_cost, expiry_date, category FROM inventory');
        
        for (const item of items) {
            stats.total++;
            const qty = Number(item.current_quantity || 0);
            const minQty = Number(item.minimum_quantity || 0);
            const cost = Number(item.unit_cost || 0);
            
            stats.totalValue += qty * cost;
            
            if (minQty > 0 && qty <= minQty) {
                stats.lowStock++;
            }
            
            if (item.expiry_date) {
                const expiry = new Date(item.expiry_date);
                const now = new Date();
                const daysUntilExpiry = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
                if (daysUntilExpiry <= 30 && daysUntilExpiry > 0) {
                    stats.expiring++;
                }
            }
            
            const cat = item.category || 'Uncategorized';
            stats.categories[cat] = (stats.categories[cat] || 0) + 1;
        }

        return stats;
    }

    async getLowStockItems() {
        const db = await this.getDatabase();
        const query = `
            SELECT * FROM inventory 
            WHERE minimum_quantity > 0 AND current_quantity <= minimum_quantity
            ORDER BY (current_quantity * 1.0 / NULLIF(minimum_quantity, 0)) ASC
        `;
        return await db.all(query);
    }

    async getExpiringItems(days = 30) {
        const db = await this.getDatabase();
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + days);
        
        const query = `
            SELECT * FROM inventory 
            WHERE expiry_date IS NOT NULL AND expiry_date != '' AND expiry_date <= ?
            ORDER BY expiry_date ASC
        `;
        return await db.all(query, [futureDate.toISOString().split('T')[0]]);
    }

    async searchInventory(searchTerm) {
        const db = await this.getDatabase();
        const term = `%${String(searchTerm).trim()}%`;
        const query = `
            SELECT * FROM inventory 
            WHERE item_code LIKE ? OR item_name LIKE ? OR category LIKE ? OR description LIKE ?
            ORDER BY item_name ASC
        `;
        return await db.all(query, [term, term, term, term]);
    }

    async getAllPharmacyDrugs(filters = {}) {
        const db = await this.getDatabase();
        let query = 'SELECT * FROM pharmacy_drugs';
        const params = [];

        if (filters.status) {
            query += ' WHERE status = ?';
            params.push(filters.status);
        }

        if (filters.search) {
            const term = `%${filters.search}%`;
            query += params.length ? ' AND' : ' WHERE';
            query += ' (drug_name LIKE ? OR drug_code LIKE ? OR strength LIKE ?)';
            params.push(term, term, term);
        }

        query += ' ORDER BY drug_name ASC';
        return await db.all(query, params);
    }

    async getPharmacyDrugById(id) {
        const db = await this.getDatabase();
        const query = 'SELECT * FROM pharmacy_drugs WHERE id = ?';
        return await db.get(query, [id]);
    }

    async getPharmacyDrugByCode(drugCode) {
        const db = await this.getDatabase();
        const query = 'SELECT * FROM pharmacy_drugs WHERE drug_code = ?';
        return await db.get(query, [drugCode]);
    }

    async createPharmacyDrug(drugData) {
        const db = await this.getDatabase();
        const id = require('uuid').v4();

        const query = `
            INSERT INTO pharmacy_drugs (
                id, drug_code, drug_name, drug_form, strength, pack_size,
                unit_price, current_quantity, minimum_quantity, status,
                supplier_name, supplier_contact, expiry_date, last_updated_by,
                notes, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `;

        const params = [
            id,
            drugData.drug_code,
            drugData.drug_name,
            drugData.drug_form,
            drugData.strength,
            drugData.pack_size,
            drugData.unit_price,
            drugData.current_quantity || 0,
            drugData.minimum_quantity || 0,
            drugData.status || 'active',
            drugData.supplier_name || null,
            drugData.supplier_contact || null,
            drugData.expiry_date || null,
            drugData.last_updated_by || null,
            drugData.notes || null
        ];

        await db.run(query, params);
        const record = { id, ...drugData };
        await this.enqueueSyncChange('pharmacy_drugs', 'upsert', id, record);
        return record;
    }

    async updatePharmacyDrug(id, drugData) {
        const db = await this.getDatabase();

        const query = `
            UPDATE pharmacy_drugs
            SET drug_code = ?, drug_name = ?, drug_form = ?, strength = ?,
                pack_size = ?, unit_price = ?, current_quantity = ?,
                minimum_quantity = ?, status = ?, supplier_name = ?,
                supplier_contact = ?, expiry_date = ?, last_updated_by = ?,
                notes = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `;

        const params = [
            drugData.drug_code,
            drugData.drug_name,
            drugData.drug_form,
            drugData.strength,
            drugData.pack_size,
            drugData.unit_price,
            drugData.current_quantity,
            drugData.minimum_quantity,
            drugData.status,
            drugData.supplier_name,
            drugData.supplier_contact,
            drugData.expiry_date,
            drugData.last_updated_by,
            drugData.notes,
            id
        ];

        await db.run(query, params);
        const record = { id, ...drugData };
        await this.enqueueSyncChange('pharmacy_drugs', 'upsert', id, record);
        return record;
    }

    async deletePharmacyDrug(id) {
        const db = await this.getDatabase();
        const query = 'DELETE FROM pharmacy_drugs WHERE id = ?';
        const result = await db.run(query, [id]);
        if (result.changes > 0) {
            await this.enqueueSyncChange('pharmacy_drugs', 'delete', id, { id });
        }
        return { success: result.changes > 0 };
    }

    async createPharmacyDispensation({ drugId, patientId, quantity, userId, notes = null }) {
        const db = await this.getDatabase();

        await db.run('BEGIN TRANSACTION');
        try {
            const drug = await db.get('SELECT id, drug_name, current_quantity, unit_price FROM pharmacy_drugs WHERE id = ?', [drugId]);
            if (!drug) {
                throw new Error('Drug not found');
            }

            const numericQuantity = Number(quantity || 0);
            if (!Number.isFinite(numericQuantity) || numericQuantity <= 0) {
                throw new Error('Quantity must be greater than zero');
            }

            const currentQty = Number(drug.current_quantity || 0);
            if (numericQuantity > currentQty) {
                throw new Error('Insufficient stock for this dispensation');
            }

            const unitPrice = Number(drug.unit_price || 0);
            const totalAmount = Math.max(0, numericQuantity * (isNaN(unitPrice) ? 0 : unitPrice));

            const id = require('uuid').v4();

            await db.run(
                `INSERT INTO pharmacy_dispensations (id, drug_id, patient_id, quantity, total_amount, user_id, notes, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
                [id, drugId, patientId, numericQuantity, totalAmount, userId, notes || null]
            );

            const newQuantity = currentQty - numericQuantity;
            await db.run(
                `UPDATE pharmacy_drugs
                 SET current_quantity = ?, last_updated_by = ?, updated_at = CURRENT_TIMESTAMP
                 WHERE id = ?`,
                [newQuantity, userId || null, drugId]
            );

            if (totalAmount > 0) {
                const description = notes || `Pharmacy dispensation: ${numericQuantity} units of ${drug.drug_name}`;
                await this.recordRevenue({
                    source: 'pharmacy',
                    source_id: id,
                    amount: totalAmount,
                    userId,
                    description,
                    meta: {
                        drugId,
                        patientId,
                        quantity: numericQuantity
                    }
                });
            }

            // Check for any pending prescriptions for this patient and drug
            let linkedPrescriptionId = null;
            const pendingPrescription = await db.get(
                "SELECT id FROM prescriptions WHERE patient_id = ? AND drug_id = ? AND status = 'pending' ORDER BY created_at ASC LIMIT 1",
                [patientId, drugId]
            );

            if (pendingPrescription) {
                linkedPrescriptionId = pendingPrescription.id;
                await db.run(
                    "UPDATE prescriptions SET status = 'dispensed', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                    [linkedPrescriptionId]
                );
            }

            await db.run('COMMIT');

            const updatedDrug = await db.get('SELECT * FROM pharmacy_drugs WHERE id = ?', [drugId]);

            return {
                id,
                dispensation: { id, drug_id: drugId, patient_id: patientId, quantity: numericQuantity, total_amount: totalAmount, user_id: userId, notes: notes || null, created_at: new Date().toISOString() },
                linkedPrescriptionId,
                success: true,
                drug: updatedDrug,
                total_amount: totalAmount,
                quantity: numericQuantity
            };
        } catch (error) {
            try {
                await db.run('ROLLBACK');
            } catch (err) {
                console.warn('[DatabaseService] dispense rollback failed:', err?.message);
            }
            throw error;
        }
    }

    async getPharmacyDispensationsByPatient(patientId) {
        const db = await this.getDatabase();
        const query = `
            SELECT d.*, pd.drug_name, pd.drug_code, pd.strength
            FROM pharmacy_dispensations d
            JOIN pharmacy_drugs pd ON d.drug_id = pd.id
            WHERE d.patient_id = ?
            ORDER BY d.created_at DESC
        `;
        return await db.all(query, [patientId]);
    }

    // Prescription Management
    async createPrescription({ patientId, doctorId, drugId, quantity, instructions }) {
        const db = await this.getDatabase();
        const id = require('uuid').v4();
        const query = `
            INSERT INTO prescriptions (id, patient_id, doctor_id, drug_id, quantity, instructions, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `;
        await db.run(query, [id, patientId, doctorId, drugId, quantity, instructions || null]);

        // Fetch the created prescription with drug details
        const result = await db.get(`
            SELECT p.*, d.drug_name, d.drug_code, d.strength, u.first_name as doctor_first_name, u.last_name as doctor_last_name
            FROM prescriptions p
            JOIN pharmacy_drugs d ON p.drug_id = d.id
            JOIN users u ON p.doctor_id = u.id
            WHERE p.id = ?
        `, [id]);

        await this.enqueueSyncChange('prescriptions', 'upsert', id, {
            id,
            patient_id: patientId,
            doctor_id: doctorId,
            drug_id: drugId,
            quantity,
            instructions: instructions || null,
            status: 'pending'
        });

        return result;
    }

    async createMultiplePrescriptions(patientId, doctorId, items) {
        const db = await this.getDatabase();
        await db.run('BEGIN TRANSACTION');
        try {
            const results = [];
            for (const item of items) {
                const id = require('uuid').v4();
                await db.run(
                    `INSERT INTO prescriptions (id, patient_id, doctor_id, drug_id, quantity, instructions, status, created_at, updated_at)
                     VALUES (?, ?, ?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
                    [id, patientId, doctorId, item.drugId, item.quantity, item.instructions || null]
                );

                const created = await db.get(`
                    SELECT p.*, d.drug_name, d.drug_code, d.strength, u.first_name as doctor_first_name, u.last_name as doctor_last_name
                    FROM prescriptions p
                    JOIN pharmacy_drugs d ON p.drug_id = d.id
                    JOIN users u ON p.doctor_id = u.id
                    WHERE p.id = ?
                `, [id]);
                results.push(created);
                await this.enqueueSyncChange('prescriptions', 'upsert', id, {
                    id,
                    patient_id: patientId,
                    doctor_id: doctorId,
                    drug_id: item.drugId,
                    quantity: item.quantity,
                    instructions: item.instructions || null,
                    status: 'pending'
                });
            }
            await db.run('COMMIT');
            return { success: true, prescriptions: results };
        } catch (error) {
            await db.run('ROLLBACK');
            throw error;
        }
    }

    async getPrescriptionsByPatient(patientId) {
        const db = await this.getDatabase();
        const query = `
            SELECT p.*, d.drug_name, d.drug_code, d.strength, u.first_name as doctor_first_name, u.last_name as doctor_last_name
            FROM prescriptions p
            JOIN pharmacy_drugs d ON p.drug_id = d.id
            JOIN users u ON p.doctor_id = u.id
            WHERE p.patient_id = ?
            ORDER BY p.created_at DESC
        `;
        return await db.all(query, [patientId]);
    }

    async getPendingPrescriptions() {
        const db = await this.getDatabase();
        const query = `
            SELECT p.*, d.drug_name, d.drug_code, d.strength,
                   u.first_name as doctor_first_name, u.last_name as doctor_last_name,
                   pat.first_name as patient_first_name, pat.last_name as patient_last_name
            FROM prescriptions p
            JOIN pharmacy_drugs d ON p.drug_id = d.id
            JOIN users u ON p.doctor_id = u.id
            JOIN patients pat ON p.patient_id = pat.id
            WHERE p.status = 'pending'
            ORDER BY p.created_at DESC
        `;
        return await db.all(query);
    }

    async getPrescriptionById(id) {
        const db = await this.getDatabase();
        const query = `
            SELECT p.*, d.drug_name, d.drug_code, d.strength, d.unit_price, d.current_quantity,
                   u.first_name as doctor_first_name, u.last_name as doctor_last_name,
                   pat.first_name as patient_first_name, pat.last_name as patient_last_name
            FROM prescriptions p
            JOIN pharmacy_drugs d ON p.drug_id = d.id
            JOIN users u ON p.doctor_id = u.id
            JOIN patients pat ON p.patient_id = pat.id
            WHERE p.id = ?
        `;
        return await db.get(query, [id]);
    }

    async updatePrescriptionStatus(id, status, userId) {
        const db = await this.getDatabase();

        if (status === 'dispensed') {
            await db.run('BEGIN TRANSACTION');
            try {
                // Fetch prescription detail with drug and patient info
                const presc = await db.get(`
                    SELECT p.*, d.drug_name, d.unit_price, d.current_quantity,
                           pat.first_name as pat_fname, pat.last_name as pat_lname
                    FROM prescriptions p
                    JOIN pharmacy_drugs d ON p.drug_id = d.id
                    JOIN patients pat ON p.patient_id = pat.id
                    WHERE p.id = ?
                `, [id]);

                if (!presc) throw new Error('Prescription not found');
                if (presc.status === 'dispensed') throw new Error('Prescription already dispensed');

                const prescQty = Number(presc.quantity || 0);
                const currentStock = Number(presc.current_quantity || 0);

                if (prescQty > currentStock) {
                    throw new Error(`Insufficient stock. Available: ${currentStock}, Required: ${prescQty}`);
                }

                // 1. Update Prescription Status
                await db.run('UPDATE prescriptions SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [status, id]);
                await this.enqueueSyncChange('prescriptions', 'upsert', id, { id, status });

                // 2. Deduct Stock
                const newStock = currentStock - prescQty;
                await db.run('UPDATE pharmacy_drugs SET current_quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [newStock, presc.drug_id]);
                await this.enqueueSyncChange('pharmacy_drugs', 'upsert', presc.drug_id, { id: presc.drug_id, current_quantity: newStock });

                // 3. Record Dispensation
                const dispId = require('uuid').v4();
                const totalAmount = prescQty * (Number(presc.unit_price) || 0);
                await db.run(
                    `INSERT INTO pharmacy_dispensations (id, drug_id, patient_id, quantity, total_amount, user_id, notes, created_at, updated_at)
                     VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
                    [dispId, presc.drug_id, presc.patient_id, prescQty, totalAmount, userId, `Fulfillment for prescription ${id}`]
                );

                // 4. Record Revenue
                if (totalAmount > 0) {
                    await this.recordRevenue({
                        source: 'pharmacy',
                        source_id: dispId,
                        amount: totalAmount,
                        userId,
                        description: `Fulfillment: ${prescQty} units of ${presc.drug_name} for ${presc.pat_fname} ${presc.pat_lname}`,
                        meta: { prescriptionId: id, drugId: presc.drug_id, patientId: presc.patient_id }
                    });
                }

                // 5. Log Activity
                await this.logActivity(
                    userId,
                    'dispense',
                    'prescription',
                    id,
                    `Dispensed ${prescQty} units of ${presc.drug_name} to ${presc.pat_fname} ${presc.pat_lname}`
                );

                await db.run('COMMIT');
                return { id, status, success: true };
            } catch (error) {
                console.error('Dispensing transaction failed:', error);
                try {
                    await db.run('ROLLBACK');
                } catch (rbError) {
                    console.error('Rollback failed:', rbError);
                }
                throw error;
            }
        } else {
            const query = `
                UPDATE prescriptions
                SET status = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `;
            await db.run(query, [status, id]);
            await this.enqueueSyncChange('prescriptions', 'upsert', id, { id, status });

            await this.logActivity(
                userId,
                'update',
                'prescription',
                id,
                `Updated prescription status to ${status}`
            );

            return { id, status, success: true };
        }
    }

    // Notification Management
    async createNotification({ userId, title, message, type, relatedId }) {
        const db = await this.getDatabase();
        const id = require('uuid').v4();
        const query = `
            INSERT INTO notifications (id, user_id, title, message, type, related_id, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, 'unread', CURRENT_TIMESTAMP)
        `;
        await db.run(query, [id, userId, title, message, type, relatedId || null]);
        await this.enqueueSyncChange('notifications', 'upsert', id, {
            id,
            user_id: userId,
            title,
            message,
            type,
            related_id: relatedId || null,
            status: 'unread'
        });
        return { id, userId, title, message, type, relatedId };
    }

    async getNotificationsByUser(userId) {
        const db = await this.getDatabase();
        const query = `
            SELECT * FROM notifications
            WHERE user_id = ?
            ORDER BY created_at DESC
            LIMIT 50
        `;
        try {
            return await db.all(query, [userId]);
        } catch (error) {
            if (String(error?.message || '').includes('no such table: notifications')) {
                await db.run(
                    `CREATE TABLE IF NOT EXISTS notifications (
                        id TEXT PRIMARY KEY,
                        user_id TEXT NOT NULL,
                        title TEXT NOT NULL,
                        message TEXT NOT NULL,
                        type TEXT,
                        related_id TEXT,
                        status TEXT DEFAULT 'unread',
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    )`
                );
                return await db.all(query, [userId]);
            }
            throw error;
        }
    }

    async markNotificationRead(id) {
        const db = await this.getDatabase();
        const query = `UPDATE notifications SET status = 'read' WHERE id = ?`;
        await db.run(query, [id]);
        await this.enqueueSyncChange('notifications', 'upsert', id, { id, status: 'read' });
        return { id, status: 'read' };
    }

    async markAllNotificationsRead(userId) {
        const db = await this.getDatabase();
        const query = `UPDATE notifications SET status = 'read' WHERE user_id = ?`;
        await db.run(query, [userId]);
        return { success: true };
    }

    async logActivity(userId, actionType, entityType, entityId, description, ipAddress = null, userAgent = null) {
        const db = await this.getDatabase();
        const id = require('uuid').v4();

        const query = `
            INSERT INTO activity_logs (id, user_id, action_type, entity_type, entity_id, description, ip_address, user_agent, timestamp)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `;

        try {
            await db.run(query, [id, userId, actionType, entityType, entityId, description, ipAddress, userAgent]);
        } catch (error) {
            if (String(error?.message || '').includes('no column named entity_id')) {
                try {
                    await db.run('ALTER TABLE activity_logs ADD COLUMN entity_id TEXT');
                    await db.run('ALTER TABLE activity_logs ADD COLUMN ip_address TEXT');
                    await db.run('ALTER TABLE activity_logs ADD COLUMN user_agent TEXT');
                } catch (err) {
                    console.warn('[DatabaseService] logActivity migration failed:', err?.message);
                }
                await db.run(query, [id, userId, actionType, entityType, entityId, description, ipAddress, userAgent]);
            } else {
                throw error;
            }
        }
        return { id, userId, actionType, entityType, entityId, description };
    }

    async recordRevenue({ source, source_id, amount, userId = null, description = null, meta = null }) {
        const db = await this.getDatabase();
        const id = require('uuid').v4();
        const query = `
            INSERT INTO revenue (id, source, source_id, amount, currency, user_id, description, meta, timestamp)
            VALUES (?, ?, ?, ?, 'NGN', ?, ?, ?, CURRENT_TIMESTAMP)
        `;
        const metaJson = meta ? JSON.stringify(meta) : null;
        await db.run(query, [id, source, source_id || null, amount, userId || null, description || null, metaJson]);
        return { id, source, source_id, amount };
    }

    async getActivityLogs(filters = {}) {
        const db = await this.getDatabase();
        let query = 'SELECT a.*, u.first_name, u.last_name, u.email FROM activity_logs a LEFT JOIN users u ON a.user_id = u.id';
        let params = [];

        if (filters.userId) {
            query += ' WHERE a.user_id = ?';
            params = [filters.userId];
        }

        query += ' ORDER BY a.timestamp DESC LIMIT 100';
        return await db.all(query, params);
    }

    async getDashboardStats() {
        const db = await this.getDatabase();

        const usersRow = await db.get('SELECT COUNT(*) as count FROM users');
        const patientsRow = await db.get('SELECT COUNT(*) as count FROM patients');
        const testsRow = await db.get('SELECT COUNT(*) as count FROM tests');
        const inventoryRow = await db.get('SELECT COUNT(*) as count FROM inventory');

        const todayAppointmentsRow = await db.get(
            "SELECT COUNT(*) as count FROM tests WHERE date(test_date) = date('now','localtime')"
        );

        const todayPatientIntakeRow = await db.get(
            "SELECT COUNT(*) as count FROM patients WHERE date(created_at) = date('now','localtime')"
        );

        const yesterdayPatientIntakeRow = await db.get(
            "SELECT COUNT(*) as count FROM patients WHERE date(created_at) = date('now','localtime', '-1 day')"
        );

        const pendingTestsRow = await db.get(
            "SELECT COUNT(*) as count FROM tests WHERE raw_data IS NULL OR TRIM(raw_data) = '' OR TRIM(raw_data) = '{}'"
        );

        let fulfilledPrescriptionsRow = { count: 0 };
        try {
            fulfilledPrescriptionsRow = await db.get(
                "SELECT COUNT(*) as count FROM prescriptions WHERE status = 'dispensed'"
            );
        } catch (error) {
            if (String(error?.message || '').includes('no such table: prescriptions')) {
                await db.run(
                    `CREATE TABLE IF NOT EXISTS prescriptions (
                        id TEXT PRIMARY KEY,
                        patient_id TEXT NOT NULL,
                        doctor_id TEXT NOT NULL,
                        drug_id TEXT NOT NULL,
                        quantity INTEGER DEFAULT 0,
                        instructions TEXT,
                        status TEXT DEFAULT 'pending',
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    )`
                );
                fulfilledPrescriptionsRow = await db.get(
                    "SELECT COUNT(*) as count FROM prescriptions WHERE status = 'dispensed'"
                );
            } else {
                throw error;
            }
        }

        const monthTests = await db.all(
            "SELECT test_date, raw_data FROM tests WHERE strftime('%Y-%m', test_date) = strftime('%Y-%m','now','localtime')"
        );
        let monthlyRevenue = 0;
        for (const t of monthTests) {
            try {
                const data = JSON.parse(t.raw_data || '{}');
                const amount = Number(data.amount || data.fee || 0);
                if (!isNaN(amount)) monthlyRevenue += amount;
            } catch (err) {
                console.warn('[DatabaseService] getDashboardStats JSON parse failed:', err?.message);
            }
        }

        const revenueRow = await db.get(
            "SELECT COALESCE(SUM(amount), 0) as total FROM revenue WHERE strftime('%Y-%m', timestamp) = strftime('%Y-%m','now','localtime')"
        );
        const revenueTotal = revenueRow && typeof revenueRow.total === 'number'
            ? revenueRow.total
            : Number(revenueRow?.total || 0);
        if (!isNaN(revenueTotal)) {
            monthlyRevenue += revenueTotal;
        }

        const upcomingTests = await db.all(
            "SELECT test_date, raw_data FROM tests WHERE date(test_date) >= date('now','localtime')"
        );
        let pendingAppointments = 0;
        for (const t of upcomingTests) {
            try {
                const data = JSON.parse(t.raw_data || '{}');
                const status = String(data.result || '').toLowerCase();
                if (status === 'scheduled') pendingAppointments += 1;
            } catch { }
        }

        return {
            totalUsers: usersRow?.count || 0,
            totalPatients: patientsRow?.count || 0,
            totalTests: testsRow?.count || 0,
            totalInventory: inventoryRow?.count || 0,
            todayAppointments: todayAppointmentsRow?.count || 0,
            todayPatientIntake: todayPatientIntakeRow?.count || 0,
            yesterdayPatientIntake: yesterdayPatientIntakeRow?.count || 0,
            pendingTests: pendingTestsRow?.count || 0,
            totalFulfilledPrescriptions: fulfilledPrescriptionsRow?.count || 0,
            pendingAppointments,
            monthlyRevenue
        };
    }

    // Chat/Message Methods
    async sendMessage(senderId, receiverId, messageText, attachment = null, replyToId = null) {
        const db = await this.getDatabase();
        const id = require('uuid').v4();

        const query = `
            INSERT INTO chat (id, sender_id, receiver_id, message_text, attachment, timestamp, status, reply_to_id)
            VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, 'unread', ?)
        `;

        await db.run(query, [id, senderId, receiverId, messageText, attachment, replyToId]);
        const record = { id, sender_id: senderId, receiver_id: receiverId, message_text: messageText, attachment, reply_to_id: replyToId, timestamp: new Date().toISOString(), status: 'unread' };
        await this.enqueueSyncChange('chat', 'upsert', id, record);
        return record;
    }

    async importExternalDatabase(externalPath) {
        try {
            if (!externalPath || typeof externalPath !== 'string') {
                return { success: false, error: 'Invalid database path' };
            }
            if (!fs.existsSync(externalPath)) {
                return { success: false, error: 'File not found' };
            }
            const ext = String(path.extname(externalPath) || '').toLowerCase();
            if (ext === '.csv' || ext === '.json' || ext === '.bat') {
                const appDb = await this.getDatabase();
                await appDb.run('BEGIN');
                try {
                    let rows = [];
                    if (ext === '.csv') {
                        const text = fs.readFileSync(externalPath, 'utf-8');
                        const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
                        if (lines.length < 2) {
                            await appDb.run('ROLLBACK');
                            return { success: false, error: 'CSV has no data' };
                        }
                        const headerLine = lines[0];
                        const headers = headerLine.split(',').map(h => h.trim());
                        for (let i = 1; i < lines.length; i++) {
                            const parts = lines[i].split(',').map(p => p.trim());
                            const obj = {};
                            for (let j = 0; j < headers.length; j++) {
                                obj[headers[j]] = parts[j] ?? '';
                            }
                            rows.push(obj);
                        }
                    } else if (ext === '.json') {
                        const text = fs.readFileSync(externalPath, 'utf-8');
                        const data = JSON.parse(text);
                        if (Array.isArray(data)) {
                            rows = data;
                        } else if (data && typeof data === 'object') {
                            const keys = Object.keys(data);
                            for (const k of keys) {
                                if (Array.isArray(data[k])) rows = rows.concat(data[k]);
                            }
                        }
                    } else if (ext === '.bat') {
                        // Legacy .bat files from .NET/C systems often contain space-separated or custom formatted data
                        // We will attempt to parse them as text lines and look for data patterns
                        const text = fs.readFileSync(externalPath, 'utf-8');
                        const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0 && !l.trim().startsWith('@') && !l.trim().startsWith('rem'));

                        if (lines.length > 0) {
                            // Detect if it's a tab-separated or pipe-separated legacy dump
                            const separator = lines[0].includes('|') ? '|' : (lines[0].includes('\t') ? '\t' : ',');
                            const headers = lines[0].split(separator).map(h => h.trim().replace(/^"|"$/g, ''));

                            for (let i = 1; i < lines.length; i++) {
                                const parts = lines[i].split(separator).map(p => p.trim().replace(/^"|"$/g, ''));
                                const obj = {};
                                headers.forEach((h, idx) => {
                                    if (h) obj[h] = parts[idx] ?? '';
                                });
                                rows.push(obj);
                            }
                        }
                    }
                    if (!rows.length) {
                        await appDb.run('ROLLBACK');
                        return { success: false, error: 'No rows to import' };
                    }
                    const headers = new Set(Object.keys(rows[0] || {}));
                    const score = (need) => need.reduce((s, k) => s + (headers.has(k) ? 1 : 0), 0);
                    let target = 'patients';
                    const candidates = [
                        { table: 'users', keys: ['email', 'first_name', 'last_name'] },
                        { table: 'patients', keys: ['patient_id', 'first_name', 'last_name'] },
                        { table: 'tests', keys: ['patient_id', 'raw_data'] },
                        { table: 'inventory', keys: ['item_code', 'item_name'] },
                        { table: 'chat', keys: ['message_text', 'sender_id', 'receiver_id'] },
                    ];
                    let best = { table: 'patients', score: 0 };
                    for (const c of candidates) {
                        const sc = score(c.keys);
                        if (sc > best.score) best = { table: c.table, score: sc };
                    }
                    target = best.table;
                    const imported = { users: 0, patients: 0, tests: 0, inventory: 0, chat: 0 };
                    if (target === 'users') {
                        for (const u of rows) {
                            const email = String(u.email || '').toLowerCase();
                            if (!email) continue;
                            const exists = await appDb.get('SELECT id FROM users WHERE email = ?', [email]);
                            if (exists?.id) continue;
                            let hash = u.password_hash;
                            if (!hash && u.password) {
                                hash = await bcrypt.hash(String(u.password), 10);
                            }
                            if (!hash || typeof hash !== 'string' || hash.length < 20) {
                                hash = await bcrypt.hash('Temp123!', 10);
                            }
                            const id = require('uuid').v4();
                            await appDb.run(
                                `INSERT INTO users (id, first_name, last_name, email, password_hash, gender, role, phone_number, status, created_at, updated_at)
                                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
                                [
                                    id,
                                    u.first_name || u.firstname || u.name || '',
                                    u.last_name || u.lastname || '',
                                    email,
                                    hash,
                                    u.gender || 'other',
                                    (u.role || 'assistant'),
                                    u.phone_number || u.phone || null
                                ]
                            );
                            imported.users += 1;
                        }
                    } else if (target === 'patients') {
                        for (const p of rows) {
                            const pid = p.patient_id || p.patientId || p.code || `P${Date.now()}${Math.floor(Math.random() * 1000)}`;
                            const exists = await appDb.get('SELECT id FROM patients WHERE patient_id = ?', [pid]);
                            if (exists?.id) continue;
                            const id = require('uuid').v4();
                            await appDb.run(
                                `INSERT INTO patients (id, patient_id, first_name, last_name, dob, gender, contact, created_at, updated_at)
                                 VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
                                [
                                    id,
                                    pid,
                                    p.first_name || p.firstname || p.name || '',
                                    p.last_name || p.lastname || '',
                                    p.dob || p.birth_date || null,
                                    p.gender || 'other',
                                    p.contact || p.phone || null
                                ]
                            );
                            imported.patients += 1;
                        }
                    } else if (target === 'tests') {
                        for (const t of rows) {
                            let patientId = t.patient_id || t.patientId || null;
                            if (!patientId && (t.patient_name || t.name)) {
                                const parts = String(t.patient_name || t.name).trim().split(/\s+/);
                                const firstName = parts[0] || '';
                                const lastName = parts.slice(1).join(' ') || '';
                                const found = await appDb.get('SELECT id FROM patients WHERE first_name = ? AND last_name = ? ORDER BY created_at DESC', [firstName, lastName]);
                                if (found?.id) patientId = found.id;
                            }
                            if (!patientId) continue;
                            const id = require('uuid').v4();
                            await appDb.run(
                                `INSERT INTO tests (id, patient_id, machine_type, eye, test_date, raw_data, created_at, updated_at)
                                 VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
                                [
                                    id,
                                    patientId,
                                    t.machine_type || t.machine || null,
                                    t.eye || 'both',
                                    t.test_date || t.date || new Date().toISOString(),
                                    typeof t.raw_data === 'string' ? t.raw_data : JSON.stringify(t.raw_data || {})
                                ]
                            );
                            imported.tests += 1;
                        }
                    } else if (target === 'inventory') {
                        for (const it of rows) {
                            const code = it.item_code || it.code || null;
                            if (code) {
                                const exists = await appDb.get('SELECT id FROM inventory WHERE item_code = ?', [code]);
                                if (exists?.id) continue;
                            }
                            const id = require('uuid').v4();
                            await appDb.run(
                                `INSERT INTO inventory (id, item_code, item_name, category, description, manufacturer, model_number, serial_number,
                                 current_quantity, minimum_quantity, maximum_quantity, unit_of_measure, unit_cost, supplier_name, supplier_contact,
                                 purchase_date, expiry_date, location, status, last_updated_by, notes, image_path, created_at, updated_at)
                                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
                                [
                                    id,
                                    code,
                                    it.item_name || it.name || '',
                                    it.category || 'other',
                                    it.description || null,
                                    it.manufacturer || null,
                                    it.model_number || null,
                                    it.serial_number || null,
                                    it.current_quantity || it.quantity || 0,
                                    it.minimum_quantity || 0,
                                    it.maximum_quantity || 100,
                                    it.unit_of_measure || 'pieces',
                                    it.unit_cost || 0,
                                    it.supplier_name || null,
                                    it.supplier_contact || null,
                                    it.purchase_date || null,
                                    it.expiry_date || null,
                                    it.location || null,
                                    it.status || 'active',
                                    null,
                                    it.notes || null,
                                    it.image_path || null
                                ]
                            );
                            imported.inventory += 1;
                        }
                    } else if (target === 'chat') {
                        for (const m of rows) {
                            const id = require('uuid').v4();
                            await appDb.run(
                                `INSERT INTO chat (id, sender_id, receiver_id, message_text, attachment, timestamp, status, reply_to_id)
                                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                                [
                                    id,
                                    m.sender_id || m.sender || null,
                                    m.receiver_id || m.receiver || null,
                                    m.message_text || m.text || '',
                                    m.attachment || null,
                                    m.timestamp || new Date().toISOString(),
                                    m.status || 'unread',
                                    m.reply_to_id || null
                                ]
                            );
                            imported.chat += 1;
                        }
                    }
                    await appDb.run('COMMIT');
                    return { success: true, mode: 'import', imported, target };
                } catch (e) {
                    try {
                        const db = await this.getDatabase();
                        await db.run('ROLLBACK');
                    } catch (err) {
                        console.warn('[DatabaseService] importExternalDatabase rollback failed:', err?.message);
                    }
                    return { success: false, error: e.message };
                }
            }
            const extDb = await new Promise((resolve, reject) => {
                const db = new sqlite3.Database(externalPath, (err) => {
                    if (err) reject(err);
                    else resolve(db);
                });
            });

            const appDb = await this.getDatabase();

            // Perform automatic schema synchronization
            console.log('[DatabaseService] Starting schema synchronization with imported database...');
            const syncService = SchemaSyncService;
            let syncResult = null;
            try {
                syncResult = await syncService.synchronizeSchema(appDb, externalPath);
                console.log('[DatabaseService] Schema sync completed:', {
                  created: syncResult.results.created.length,
                  modified: syncResult.results.modified.length,
                  errors: syncResult.results.errors.length
                });

                // Log any errors but don't fail
                if (syncResult.results.errors.length > 0) {
                  console.warn('[DatabaseService] Schema sync had errors:', syncResult.results.errors);
                }
            } catch (syncErr) {
                console.error('[DatabaseService] Schema synchronization warning (non-fatal):', syncErr.message);
                // Continue with import even if sync partially fails
                syncResult = { results: { created: [], modified: [], errors: [syncErr.message] }, analysis: {} };
            }

            const getAll = (sql, params = []) => new Promise((resolve, reject) => {
                extDb.all(sql, params, (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows || []);
                });
            });
            const getOne = (sql, params = []) => new Promise((resolve, reject) => {
                extDb.get(sql, params, (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                });
            });

            const tables = await getAll("SELECT name FROM sqlite_master WHERE type='table'");
            const tableNames = new Set(tables.map(t => String(t.name).toLowerCase()));

            const hasUsers = tableNames.has('users');
            const hasPatients = tableNames.has('patients') || tableNames.has('clients') || tableNames.has('customer') || tableNames.has('client');
            const hasTests = tableNames.has('tests') || tableNames.has('exams') || tableNames.has('examinations');
            const hasInventory = tableNames.has('inventory') || tableNames.has('items') || tableNames.has('stock');
            const hasChat = tableNames.has('chat') || tableNames.has('messages');

            let schemaCompatible = false;
            if (hasUsers && hasPatients && hasTests) {
                const usersCols = await getAll("PRAGMA table_info(users)");
                const patientsCols = await getAll(`PRAGMA table_info(${hasPatients ? (tableNames.has('patients') ? 'patients' : (tableNames.has('clients') ? 'clients' : (tableNames.has('client') ? 'client' : 'customer'))) : 'patients'})`);
                const testsCols = await getAll(`PRAGMA table_info(${tableNames.has('tests') ? 'tests' : (tableNames.has('exams') ? 'exams' : 'examinations')})`);
                const colSet = cols => new Set(cols.map(c => c.name));
                const u = colSet(usersCols);
                const p = colSet(patientsCols);
                const t = colSet(testsCols);
                schemaCompatible = u.has('password_hash') && u.has('first_name') && u.has('last_name') && u.has('email')
                    && p.has('patient_id') && p.has('first_name') && p.has('last_name')
                    && t.has('patient_id') && t.has('raw_data');
            }

            if (schemaCompatible) {
                const dir = app.getPath('userData');
                const cfgPath = path.join(dir, 'config.json');
                let existing = {};
                if (fs.existsSync(cfgPath)) {
                    try {
                        existing = JSON.parse(fs.readFileSync(cfgPath, 'utf-8'));
                    } catch (err) {
                        console.warn('[DatabaseService] Config parse failed:', err?.message);
                    }
                }
                const data = { ...existing, network_db_path: externalPath };
                fs.writeFileSync(cfgPath, JSON.stringify(data));
                try { extDb.close(); } catch (err) {
                    console.warn('[DatabaseService] extDb.close() failed:', err?.message);
                }
                return { success: true, mode: 'switch', path: externalPath };
            }

            await appDb.run('BEGIN');

            let imported = { users: 0, patients: 0, tests: 0, inventory: 0, chat: 0, reports: 0 };
            const dynamicImports = [];

            if (hasUsers) {
                const users = await getAll('SELECT * FROM users');
                for (const u of users) {
                    const email = String(u.email || '').toLowerCase();
                    if (!email) continue;
                    const exists = await appDb.get('SELECT id FROM users WHERE email = ?', [email]);
                    if (exists?.id) continue;
                    let hash = u.password_hash;
                    if (!hash && u.password) {
                        hash = await bcrypt.hash(String(u.password), 10);
                    }
                    if (!hash || typeof hash !== 'string' || hash.length < 20) {
                        hash = await bcrypt.hash('Temp123!', 10);
                    }
                    const id = require('uuid').v4();
                    await appDb.run(
                        `INSERT INTO users (id, first_name, last_name, email, password_hash, gender, role, phone_number, status, created_at, updated_at)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
                        [
                            id,
                            u.first_name || u.firstname || u.name || '',
                            u.last_name || u.lastname || '',
                            email,
                            hash,
                            u.gender || 'other',
                            (u.role || 'assistant'),
                            u.phone_number || u.phone || null
                        ]
                    );
                    imported.users += 1;
                }
            }

            if (hasPatients) {
                const rawTable = tableNames.has('patients') ? 'patients' : (tableNames.has('clients') ? 'clients' : (tableNames.has('client') ? 'client' : 'customer'));
                const pTable = validateTableName(rawTable);
                if (pTable) {
                    const patients = await getAll(`SELECT * FROM ${pTable}`);
                    for (const p of patients) {
                        const pid = p.patient_id || p.patientId || p.code || `P${Date.now()}${Math.floor(Math.random() * 1000)}`;
                        const exists = await appDb.get('SELECT id FROM patients WHERE patient_id = ?', [pid]);
                        if (exists?.id) continue;
                        const id = require('uuid').v4();
                        await appDb.run(
                            `INSERT INTO patients (id, patient_id, first_name, last_name, dob, gender, contact, created_at, updated_at)
                             VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
                            [
                                id,
                                pid,
                                p.first_name || p.firstname || p.name || '',
                                p.last_name || p.lastname || '',
                                p.dob || p.birth_date || null,
                                p.gender || 'other',
                                p.contact || p.phone || null
                            ]
                        );
                        imported.patients += 1;
                    }
                }
            }

            if (hasTests) {
                const rawTable = tableNames.has('tests') ? 'tests' : (tableNames.has('exams') ? 'exams' : 'examinations');
                const tTable = validateTableName(rawTable);
                if (tTable) {
                    const tests = await getAll(`SELECT * FROM ${tTable}`);
                    for (const t of tests) {
                        let patientId = t.patient_id || t.patientId || null;
                        if (!patientId && (t.patient_name || t.name)) {
                            const parts = String(t.patient_name || t.name).trim().split(/\s+/);
                            const firstName = parts[0] || '';
                            const lastName = parts.slice(1).join(' ') || '';
                            const found = await appDb.get('SELECT id FROM patients WHERE first_name = ? AND last_name = ? ORDER BY created_at DESC', [firstName, lastName]);
                            if (found?.id) patientId = found.id;
                        }
                        if (!patientId) continue;
                        const id = require('uuid').v4();
                        await appDb.run(
                            `INSERT INTO tests (id, patient_id, machine_type, eye, test_date, raw_data, created_at, updated_at)
                             VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
                            [
                                id,
                                patientId,
                                t.machine_type || t.machine || null,
                                t.eye || 'both',
                                t.test_date || t.date || new Date().toISOString(),
                                typeof t.raw_data === 'string' ? t.raw_data : JSON.stringify(t.raw_data || {})
                            ]
                        );
                        imported.tests += 1;
                    }
                }
            }

            if (hasInventory) {
                const rawTable = tableNames.has('inventory') ? 'inventory' : (tableNames.has('items') ? 'items' : 'stock');
                const iTable = validateTableName(rawTable);
                if (iTable) {
                    const items = await getAll(`SELECT * FROM ${iTable}`);
                    for (const it of items) {
                        const code = it.item_code || it.code || null;
                        if (code) {
                            const exists = await appDb.get('SELECT id FROM inventory WHERE item_code = ?', [code]);
                            if (exists?.id) continue;
                        }
                        const id = require('uuid').v4();
                        await appDb.run(
                            `INSERT INTO inventory (id, item_code, item_name, category, description, manufacturer, model_number, serial_number,
                             current_quantity, minimum_quantity, maximum_quantity, unit_of_measure, unit_cost, supplier_name, supplier_contact,
                             purchase_date, expiry_date, location, status, last_updated_by, notes, image_path, created_at, updated_at)
                             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
                            [
                                id,
                                code,
                                it.item_name || it.name || '',
                                it.category || 'other',
                                it.description || null,
                                it.manufacturer || null,
                                it.model_number || null,
                                it.serial_number || null,
                                it.current_quantity || it.quantity || 0,
                                it.minimum_quantity || 0,
                                it.maximum_quantity || 100,
                                it.unit_of_measure || 'pieces',
                                it.unit_cost || 0,
                                it.supplier_name || null,
                                it.supplier_contact || null,
                                it.purchase_date || null,
                                it.expiry_date || null,
                                it.location || null,
                                it.status || 'active',
                                null,
                                it.notes || null,
                                it.image_path || null
                            ]
                        );
                        imported.inventory += 1;
                    }
                }
            }

            if (hasChat) {
                const rawTable = tableNames.has('chat') ? 'chat' : 'messages';
                const cTable = validateTableName(rawTable);
                if (cTable) {
                    const msgs = await getAll(`SELECT * FROM ${cTable}`);
                    for (const m of msgs) {
                        const id = require('uuid').v4();
                        await appDb.run(
                            `INSERT INTO chat (id, sender_id, receiver_id, message_text, attachment, timestamp, status, reply_to_id)
                             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                            [
                                id,
                                m.sender_id || m.sender || null,
                                m.receiver_id || m.receiver || null,
                                m.message_text || m.text || '',
                                m.attachment || null,
                                m.timestamp || new Date().toISOString(),
                                m.status || 'unread',
                                m.reply_to_id || null
                            ]
                        );
                        imported.chat += 1;
                    }
                }
            }

            const mappedSourceTables = new Set([
                'users', 'staff', 'admins', 'employees',
                'patients', 'clients', 'client', 'customer',
                'tests', 'exams', 'examinations',
                'inventory', 'items', 'stock',
                'chat', 'messages'
            ]);

            const analyzedTables = syncResult?.analysis?.tables || [];
            for (const tableMeta of analyzedTables) {
                const sourceTableName = String(tableMeta?.tableName || '');
                if (!sourceTableName) continue;
                if (mappedSourceTables.has(sourceTableName.toLowerCase())) continue;
                try {
                    const importTableResult = await syncService.importTableData(appDb, externalPath, sourceTableName);
                    dynamicImports.push({
                        tableName: sourceTableName,
                        rowsImported: importTableResult?.rowsImported || 0
                    });
                } catch (tableErr) {
                    dynamicImports.push({
                        tableName: sourceTableName,
                        error: tableErr.message
                    });
                }
            }

            await appDb.run('COMMIT');
            try { extDb.close(); } catch (err) {
                console.warn('[DatabaseService] extDb.close() failed:', err?.message);
            }
            return {
                success: true,
                mode: 'import',
                imported,
                dynamicImports,
                schemaSyncResult: syncResult
            };
        } catch (error) {
            try {
                const db = await this.getDatabase();
                await db.run('ROLLBACK');
            } catch (err) {
                console.warn('[DatabaseService] ROLLBACK failed:', err?.message);
            }
            return { success: false, error: error.message };
        }
    }

    async deleteDatabase() {
        const db = await this.getDatabase();
        const dbPath = db.dbPath;
        db.close();
        this.database = null;
        if (fs.existsSync(dbPath)) {
            try {
                fs.unlinkSync(dbPath);
                return { success: true, path: dbPath };
            } catch (error) {
                return { success: false, error: error.message };
            }
        }
        return { success: true, path: dbPath };
    }

    async updateDatabase(updates = {}) {
        const db = await this.getDatabase();
        try {
            await db.run('PRAGMA journal_mode=WAL');
            await db.run('VACUUM');
            await db.run('PRAGMA optimize');
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async restoreBackup(filePath) {
        const db = await this.getDatabase();

        // Validate file extension
        if (!filePath.endsWith('.bak')) {
            throw new Error('Invalid file type. Please upload a .bak file.');
        }

        const { exec } = require('child_process');
        const path = require('path');
        const { app } = require('electron');

        // Resolve script path from app root
        const appRoot = path.dirname(path.dirname(path.dirname(__dirname))); // Navigate to app root
        const pythonScript = path.join(appRoot, 'scripts', 'convert_bak_to_sqlite.py');
        const outputFilePath = filePath.replace('.bak', '.sqlite');

        console.log(`Running Python script to convert .bak file: ${filePath}`);
        console.log(`App root: ${appRoot}`);
        console.log(`Python script path: ${pythonScript}`);
        console.log(`Output file path: ${outputFilePath}`);

        const command = `python "${pythonScript}" "${filePath}" "${outputFilePath}"`;
        console.log(`Command: ${command}`);

        return new Promise((resolve, reject) => {
            exec(command, (error, stdout, stderr) => {
                if (error) {
                    console.error(`Error running Python script: ${stderr}`);
                    console.error(`Error message: ${error.message}`);
                    return reject(new Error(`Failed to convert .bak file: ${stderr || error.message}`));
                }
                console.log(`Python script output: ${stdout}`);
                console.log(`Restored file path: ${outputFilePath}`);
                resolve({ success: true, restoredFilePath: outputFilePath });
            });
        });
    }

    async performSchemaValidation() {
        const db = await this.getDatabase();

        // Example: Check and add missing columns or tables
        const schemaUpdates = [
            `ALTER TABLE patients ADD COLUMN IF NOT EXISTS additional_info TEXT;`,
            `CREATE TABLE IF NOT EXISTS new_table (id TEXT PRIMARY KEY, data TEXT);`
        ];

        for (const query of schemaUpdates) {
            try {
                await db.run(query);
            } catch (error) {
                console.error('Schema validation error:', error);
            }
        }

        console.log('Schema validation and updates completed.');
    }
}

module.exports = new DatabaseService();
