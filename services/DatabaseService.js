const Database = require('../database');

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
    async getMessages(userId, otherUserId = null, search = '') {
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
        return await db.all(query, params);
    }

    async markMessageAsRead(messageId, userId) {
        const db = await this.getDatabase();
        const query = `UPDATE chat SET status = 'read' WHERE id = ? AND receiver_id = ?`;
        await db.run(query, [messageId, userId]);
        return { success: true };
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

    // Add more methods as needed...
}

module.exports = new DatabaseService();
