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

    // Add more methods as needed...
}

module.exports = new DatabaseService();
