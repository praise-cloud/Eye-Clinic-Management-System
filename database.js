const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

class Database {
    constructor(dbPath = null) {
        if (dbPath) {
            // Use provided path (for initialization script)
            this.dbPath = dbPath;
        } else {
            try {
                // Use app data directory for database storage (Electron context)
                const { app } = require('electron');
                const userDataPath = app.getPath('userData');

                // Ensure directory exists
                if (!fs.existsSync(userDataPath)) {
                    fs.mkdirSync(userDataPath, { recursive: true });
                }

                this.dbPath = path.join(userDataPath, 'eye_clinic.db');
            } catch (error) {
                // Fallback for non-Electron context
                this.dbPath = path.join(__dirname, 'eye_clinic.db');
            }
        }
        this.db = null;
    }

    // Initialize database connection and create tables
    async initialize() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) {
                    console.error('Error opening database:', err);
                    reject(err);
                    return;
                }

                console.log('Connected to SQLite database at:', this.dbPath);
                this.createTables()
                    .then(resolve)
                    .catch(reject);
            });
        });
    }

    // Create all required tables
    async createTables() {
        const queries = [
            // Users table
            `CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                first_name TEXT NOT NULL,
                last_name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                gender TEXT NOT NULL,
                role TEXT NOT NULL CHECK (role IN ('admin', 'doctor', 'assistant')),
                phone_number TEXT,
                status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,

            // Patients table
            `CREATE TABLE IF NOT EXISTS patients (
                id TEXT PRIMARY KEY,
                patient_id TEXT UNIQUE NOT NULL,
                first_name TEXT NOT NULL,
                last_name TEXT NOT NULL,
                dob DATE,
                gender TEXT CHECK (gender IN ('male', 'female', 'other')),
                contact TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,

            // Tests table
            `CREATE TABLE IF NOT EXISTS tests (
                id TEXT PRIMARY KEY,
                patient_id TEXT NOT NULL,
                test_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                eye TEXT CHECK (eye IN ('left', 'right', 'both')),
                machine_type TEXT,
                raw_data TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (patient_id) REFERENCES patients (id)
            )`,

            // Reports table
            `CREATE TABLE IF NOT EXISTS reports (
                id TEXT PRIMARY KEY,
                patient_id TEXT NOT NULL,
                report_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                report_type TEXT DEFAULT 'visual_field_report',
                title TEXT,
                report_file TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (patient_id) REFERENCES patients (id)
            )`,

            // Chat table
            `CREATE TABLE IF NOT EXISTS chat (
                id TEXT PRIMARY KEY,
                sender_id TEXT NOT NULL,
                receiver_id TEXT NOT NULL,
                message_text TEXT NOT NULL,
                attachment TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                status TEXT DEFAULT 'unread' CHECK (status IN ('read', 'unread')),
                FOREIGN KEY (sender_id) REFERENCES users (id),
                FOREIGN KEY (receiver_id) REFERENCES users (id)
            )`,

            // Inventory table for medical supplies and equipment
            `CREATE TABLE IF NOT EXISTS inventory (
                id TEXT PRIMARY KEY,
                item_code TEXT UNIQUE NOT NULL,
                item_name TEXT NOT NULL,
                category TEXT NOT NULL CHECK (category IN ('equipment', 'supplies', 'medication', 'consumables', 'other')),
                description TEXT,
                manufacturer TEXT,
                model_number TEXT,
                serial_number TEXT,
                current_quantity INTEGER DEFAULT 0,
                minimum_quantity INTEGER DEFAULT 0,
                maximum_quantity INTEGER DEFAULT 100,
                unit_of_measure TEXT DEFAULT 'pieces',
                unit_cost DECIMAL(10, 2) DEFAULT 0.00,
                supplier_name TEXT,
                supplier_contact TEXT,
                purchase_date DATE,
                expiry_date DATE,
                location TEXT,
                status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance', 'disposed')),
                last_updated_by TEXT,
                notes TEXT,
                image_path TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (last_updated_by) REFERENCES users (id)
            )`,

            // Activity logs table for tracking user actions
            `CREATE TABLE IF NOT EXISTS activity_logs (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                action_type TEXT NOT NULL,
                entity_type TEXT NOT NULL,
                entity_id TEXT,
                description TEXT NOT NULL,
                ip_address TEXT,
                user_agent TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )`,

            // Settings table for application configuration
            `CREATE TABLE IF NOT EXISTS settings (
                id TEXT PRIMARY KEY,
                key TEXT UNIQUE NOT NULL,
                value TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,

            // Sync metadata table
            `CREATE TABLE IF NOT EXISTS sync_metadata (
                id TEXT PRIMARY KEY,
                table_name TEXT NOT NULL,
                record_id TEXT NOT NULL,
                last_synced_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(table_name, record_id)
            )`,

            // User presence table for online status tracking
            `CREATE TABLE IF NOT EXISTS user_presence (
                user_id TEXT PRIMARY KEY,
                is_online BOOLEAN DEFAULT FALSE,
                last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
                session_id TEXT,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )`
        ];

        for (const query of queries) {
            await this.run(query);
        }

        // Run migrations for existing databases
        await this.runMigrations();

        console.log('Database tables created successfully');
    }

    // Run database migrations
    async runMigrations() {
        try {
            // Check if attachment column exists in chat table
            const chatTableInfo = await this.all("PRAGMA table_info(chat)");
            const hasAttachmentColumn = chatTableInfo.some(column => column.name === 'attachment');

            if (!hasAttachmentColumn) {
                console.log('Adding attachment column to chat table...');
                await this.run('ALTER TABLE chat ADD COLUMN attachment TEXT');
                console.log('Migration completed: Added attachment column to chat table');
            }

            // Check if image_path column exists in inventory table
            const inventoryTableInfo = await this.all("PRAGMA table_info(inventory)");
            const hasImagePathColumn = inventoryTableInfo.some(column => column.name === 'image_path');

            if (!hasImagePathColumn) {
                console.log('Adding image_path column to inventory table...');
                await this.run('ALTER TABLE inventory ADD COLUMN image_path TEXT');
                console.log('Migration completed: Added image_path column to inventory table');
            }

            // Check if phone_number column exists in users table
            const usersTableInfo = await this.all("PRAGMA table_info(users)");
            const hasPhoneNumberColumn = usersTableInfo.some(column => column.name === 'phone_number');

            if (!hasPhoneNumberColumn) {
                console.log('Adding phone_number column to users table...');
                await this.run('ALTER TABLE users ADD COLUMN phone_number TEXT');
                console.log('Migration completed: Added phone_number column to users table');
            }

            // Migrate name to first_name/last_name if needed
            const hasFirstNameColumn = usersTableInfo.some(column => column.name === 'first_name');
            const hasNameColumn = usersTableInfo.some(column => column.name === 'name');

            if (hasNameColumn && !hasFirstNameColumn) {
                console.log('Migrating name to first_name/last_name...');
                await this.run('ALTER TABLE users ADD COLUMN first_name TEXT');
                await this.run('ALTER TABLE users ADD COLUMN last_name TEXT');
                // Split existing names
                const users = await this.all('SELECT id, name FROM users');
                for (const user of users) {
                    const parts = user.name.split(' ');
                    const firstName = parts[0] || '';
                    const lastName = parts.slice(1).join(' ') || '';
                    await this.run('UPDATE users SET first_name = ?, last_name = ? WHERE id = ?', [firstName, lastName, user.id]);
                }
                console.log('Migration completed: Split name into first_name/last_name');
            }
        } catch (error) {
            console.error('Migration error:', error);
        }

        try {
        // Add gender column if missing (with default for existing rows)
        await this.run(`
            ALTER TABLE users ADD COLUMN gender TEXT NOT NULL DEFAULT 'other'
        `);
        console.log('Migration: added gender column with default');
        } catch (e) {
        // Ignore if column already exists
        if (!e.message.includes('duplicate column name')) {
            console.warn('Gender migration skipped:', e.message);
        }
        }
    }

    // Check if this is the first run (no users exist)
    async isFirstRun() {
        try {
            const users = await this.all('SELECT COUNT(*) as count FROM users');
            return users[0].count === 0;
        } catch (error) {
            console.error('Error checking first run:', error);
            return true; // Assume first run on error
        }
    }

    // User Management
    async createUser(userData) {
        const { first_name, last_name, email, password, role, gender, phone_number } = userData;

        // Hash password
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // Default gender if not provided (required by schema)
        const userGender = gender || 'other';
        const userId = uuidv4();

        const query = `
            INSERT INTO users (id, first_name, last_name, email, password_hash, gender, role, phone_number, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `;

        try {
            await this.run(query, [userId, first_name, last_name, email, passwordHash, userGender, role, phone_number || null]);
            console.log('User created successfully:', email);
            return { id: userId, first_name, last_name, email, role, gender: userGender, phone_number };
        } catch (error) {
            console.error('Error creating user:', error);
            throw error;
        }
    }

    async authenticateUser(email, password) {
        const query = 'SELECT * FROM users WHERE email = ?';

        try {
            const users = await this.all(query, [email]);

            if (users.length === 0) {
                return null; // User not found
            }

            const user = users[0];
            const isValid = await bcrypt.compare(password, user.password_hash);

            if (isValid) {
                // Don't return password hash
                const { password_hash, ...userWithoutPassword } = user;
                return userWithoutPassword;
            }

            return null; // Invalid password
        } catch (error) {
            console.error('Error authenticating user:', error);
            throw error;
        }
    }

    async getAllUsers() {
        const query = 'SELECT id, first_name, last_name, email, role, phone_number, created_at FROM users ORDER BY created_at DESC';
        return await this.all(query);
    }

    // Online Status Management
    async setUserOnline(userId, sessionId = null) {
        const query = `
            INSERT INTO user_presence (user_id, is_online, last_seen, session_id)
            VALUES (?, TRUE, CURRENT_TIMESTAMP, ?)
            ON CONFLICT(user_id) DO UPDATE SET
                is_online = TRUE,
                last_seen = CURRENT_TIMESTAMP,
                session_id = excluded.session_id
        `;
        return await this.run(query, [userId, sessionId]);
    }

    async setUserOffline(userId) {
        const query = `
            UPDATE user_presence 
            SET is_online = FALSE, last_seen = CURRENT_TIMESTAMP 
            WHERE user_id = ?
        `;
        return await this.run(query, [userId]);
    }

    async getOnlineUsers() {
        const query = `
            SELECT u.id, u.first_name, u.last_name, u.email, u.role, p.last_seen
            FROM users u
            JOIN user_presence p ON u.id = p.user_id
            WHERE p.is_online = TRUE
            ORDER BY u.first_name, u.last_name
        `;
        return await this.all(query);
    }

    async getUsersWithPresence() {
        const query = `
            SELECT u.id, u.first_name, u.last_name, u.email, u.role, u.phone_number,
                   COALESCE(p.is_online, FALSE) as is_online, p.last_seen
            FROM users u
            LEFT JOIN user_presence p ON u.id = p.user_id
            ORDER BY p.is_online DESC, u.first_name, u.last_name
        `;
        return await this.all(query);
    }

    // Settings Management
    async getSetting(key) {
        const query = 'SELECT value FROM settings WHERE key = ?';
        const rows = await this.all(query, [key]);
        return rows.length > 0 ? rows[0].value : null;
    }

    async setSetting(key, value) {
        const query = `
            INSERT INTO settings (id, key, value, updated_at)
            VALUES (?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(key) DO UPDATE SET
                value = excluded.value,
                updated_at = CURRENT_TIMESTAMP
        `;
        return await this.run(query, [uuidv4(), key, value]);
    }

    // Generic database operations
    async run(query, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(query, params, function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ lastID: this.lastID, changes: this.changes });
                }
            });
        });
    }

    async all(query, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(query, params, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    async get(query, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(query, params, (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    // Close database connection
    close() {
        if (this.db) {
            this.db.close((err) => {
                if (err) {
                    console.error('Error closing database:', err);
                } else {
                    console.log('Database connection closed.');
                }
            });
        }
    }
}

module.exports = Database;