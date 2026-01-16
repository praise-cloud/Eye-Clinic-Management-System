const Database = require('../../database');

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

    async authenticateUser(email, password) {
        const db = await this.getDatabase();
        return await db.authenticateUser(email, password);
    }

    // Add other methods as needed
    async createUser(userData) {
        const db = await this.getDatabase();
        return await db.createUser(userData);
    }

    async getAllUsers() {
        const db = await this.getDatabase();
        return await db.getAllUsers();
    }

    async updateUser(userId, userData) {
        const db = await this.getDatabase();
        return await db.updateUser(userId, userData);
    }

    async updateUserStatus(userId, isActive) {
        const db = await this.getDatabase();
        return await db.updateUserStatus(userId, isActive);
    }

    async deleteUser(userId) {
        const db = await this.getDatabase();
        return await db.deleteUser(userId);
    }

    async getSetting(key) {
        const db = await this.getDatabase();
        return await db.getSetting(key);
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
        const { patient_id, first_name, last_name, dob, gender, contact } = patientData;
        const id = require('uuid').v4();

        const query = `
            INSERT INTO patients (id, patient_id, first_name, last_name, dob, gender, contact, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `;

        await db.run(query, [id, patient_id, first_name, last_name, dob, gender, contact]);
        return { id, patient_id, first_name, last_name, dob, gender, contact };
    }

    async updatePatient(id, patientData) {
        const db = await this.getDatabase();
        const { patient_id, first_name, last_name, dob, gender, contact } = patientData;

        const query = `
            UPDATE patients
            SET patient_id = ?, first_name = ?, last_name = ?, dob = ?, gender = ?, contact = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `;

        await db.run(query, [patient_id, first_name, last_name, dob, gender, contact, id]);
        return { id, patient_id, first_name, last_name, dob, gender, contact };
    }

    async deletePatient(id) {
        const db = await this.getDatabase();
        const query = 'DELETE FROM patients WHERE id = ?';
        const result = await db.run(query, [id]);
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
        return { id, ...testData };
    }

    async deleteTest(id) {
        const db = await this.getDatabase();
        const query = 'DELETE FROM tests WHERE id = ?';
        const result = await db.run(query, [id]);
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
        return { id, patient_id, report_type, title, report_file };
    }

    async deleteReport(id) {
        const db = await this.getDatabase();
        const query = 'DELETE FROM reports WHERE id = ?';
        const result = await db.run(query, [id]);
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
        return { id, ...itemData };
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
        return { id, ...itemData };
    }

    async updateInventoryQuantity(id, quantity, userId = null, notes = null) {
        const db = await this.getDatabase();
        const query = `
            UPDATE inventory
            SET current_quantity = ?, last_updated_by = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `;
        const params = [quantity, userId || null, notes || null, id];
        await db.run(query, params);
        return await this.getInventoryItemById(id);
    }

    async deleteInventoryItem(id) {
        const db = await this.getDatabase();
        const query = 'DELETE FROM inventory WHERE id = ?';
        const result = await db.run(query, [id]);
        return { success: result.changes > 0 };
    }

    // Activity Logging
    async logActivity(userId, actionType, entityType, entityId, description, ipAddress = null, userAgent = null) {
        const db = await this.getDatabase();
        const id = require('uuid').v4();

        const query = `
            INSERT INTO activity_logs (id, user_id, action_type, entity_type, entity_id, description, ip_address, user_agent, timestamp)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `;

        await db.run(query, [id, userId, actionType, entityType, entityId, description, ipAddress, userAgent]);
        return { id, userId, actionType, entityType, entityId, description };
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

        const pendingTestsRow = await db.get(
            "SELECT COUNT(*) as count FROM tests WHERE raw_data IS NULL OR TRIM(raw_data) = '' OR TRIM(raw_data) = '{}'"
        );

        return {
            totalUsers: usersRow?.count || 0,
            totalPatients: patientsRow?.count || 0,
            totalTests: testsRow?.count || 0,
            totalInventory: inventoryRow?.count || 0,
            todayAppointments: todayAppointmentsRow?.count || 0,
            pendingTests: pendingTestsRow?.count || 0
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
        return { id, sender_id: senderId, receiver_id: receiverId, message_text: messageText, attachment, reply_to_id: replyToId, timestamp: new Date().toISOString(), status: 'unread' };
    }
}

module.exports = new DatabaseService();
