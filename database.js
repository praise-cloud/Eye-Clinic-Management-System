const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

class Database {
    constructor(dbPath = null) {
        if (dbPath) {
            this.dbPath = dbPath;
        } else {
            this.dbPath = this.resolveDbPath();
        }
        this.db = null;
    }

    resolveDbPath() {
        try {
            const { app } = require('electron');
            const userDataPath = app.getPath('userData');
            const configPath = path.join(userDataPath, 'network-config.json');

            console.log('[Database] Looking for config at:', configPath);

            if (fs.existsSync(configPath)) {
                try {
                    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
                    console.log('[Database] Config loaded:', JSON.stringify({ ...config, serverPath: config.serverPath ? '(set)' : '(empty)' }));
                    
                    const serverPath = config.serverPath || '';
                    if (config.isNetworkMode && serverPath && typeof serverPath === 'string' && serverPath.trim() !== '') {
                        const networkPath = path.join(serverPath, 'eye_clinic.db');
                        console.log('[Database] NETWORK MODE: Using shared database at:', networkPath);
                        console.log('[Database] Network path exists:', fs.existsSync(serverPath));
                        return networkPath;
                    } else {
                        console.log('[Database] LOCAL MODE: Using local database (network mode disabled or path empty)');
                    }
                } catch (e) {
                    console.warn('[Database] Could not read network config:', e.message);
                }
            } else {
                console.log('[Database] No config file found, using local database');
            }

            if (!fs.existsSync(userDataPath)) {
                fs.mkdirSync(userDataPath, { recursive: true });
            }
            return path.join(userDataPath, 'eye_clinic.db');
        } catch (error) {
            console.warn('[Database] Fallback to local path, error:', error.message);
            return path.join(__dirname, 'eye_clinic.db');
        }
    }

    async initialize() {
        return new Promise((resolve, reject) => {
            const dir = path.dirname(this.dbPath);
            try {
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true });
                }
            } catch (mkErr) {
                console.warn('[Database] Could not create directory:', mkErr.message);
            }

            const isNetworkPath = this.dbPath.startsWith('\\\\') || this.dbPath.includes('\\\\') || this.dbPath.includes(':');
            const isOnNetworkDrive = isNetworkPath && !this.dbPath.includes('\\AppData');
            
            console.log('[Database] Initializing database...');
            console.log('[Database] Path:', this.dbPath);
            console.log('[Database] Is network path:', isNetworkPath);
            
            this.db = new sqlite3.Database(this.dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
                if (err) {
                    console.error('[Database] Error opening database:', err);
                    reject(err);
                    return;
                }

                console.log('[Database] Connected successfully at:', this.dbPath);
                
                this.db.serialize(() => {
                    if (isNetworkPath) {
                        this.db.run('PRAGMA journal_mode=WAL', (err) => {
                            if (err) console.warn('[Database] WAL mode failed:', err.message);
                            else console.log('[Database] WAL mode enabled for network database');
                        });
                        this.db.run('PRAGMA locking_mode=NORMAL', (err) => {
                            if (err) console.warn('[Database] Locking mode failed:', err.message);
                            else console.log('[Database] NORMAL locking mode set');
                        });
                        this.db.run('PRAGMA synchronous=NORMAL', (err) => {
                            if (err) console.warn('[Database] Sync mode failed:', err.message);
                            else console.log('[Database] SYNCHRONOUS NORMAL set');
                        });
                        this.db.run('PRAGMA busy_timeout=30000', (err) => {
                            if (err) console.warn('[Database] Busy timeout failed:', err.message);
                            else console.log('[Database] BUSY TIMEOUT set to 30s');
                        });
                    } else {
                        this.db.run('PRAGMA journal_mode=DELETE', (err) => {
                            if (err) console.warn('[Database] Journal mode failed:', err.message);
                            else console.log('[Database] Journal mode set to DELETE for local');
                        });
                    }
                });

                this.createTables()
                    .then(() => {
                        console.log('[Database] Tables created/verified');
                        resolve();
                    })
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
                email TEXT,
                address TEXT,
                reason_for_visit TEXT,
                client_type TEXT,
                marital_status TEXT,
                intake_date DATE,
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
                reply_to_id TEXT,
                FOREIGN KEY (sender_id) REFERENCES users (id),
                FOREIGN KEY (receiver_id) REFERENCES users (id),
                FOREIGN KEY (reply_to_id) REFERENCES chat (id)
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

            `CREATE TABLE IF NOT EXISTS pharmacy_drugs (
                id TEXT PRIMARY KEY,
                drug_code TEXT UNIQUE NOT NULL,
                drug_name TEXT NOT NULL,
                drug_form TEXT NOT NULL CHECK (drug_form IN ('tablet', 'capsule', 'syrup', 'injection', 'cream', 'drops', 'other')),
                strength TEXT NOT NULL,
                pack_size INTEGER NOT NULL,
                unit_price DECIMAL(10, 2) NOT NULL,
                current_quantity INTEGER DEFAULT 0,
                minimum_quantity INTEGER DEFAULT 0,
                status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'out_of_stock')),
                supplier_name TEXT,
                supplier_contact TEXT,
                expiry_date DATE,
                last_updated_by TEXT,
                notes TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (last_updated_by) REFERENCES users (id)
            )`,

            `CREATE TABLE IF NOT EXISTS pharmacy_dispensations (
                id TEXT PRIMARY KEY,
                drug_id TEXT NOT NULL,
                patient_id TEXT NOT NULL,
                quantity INTEGER NOT NULL,
                total_amount DECIMAL(10, 2) NOT NULL,
                user_id TEXT NOT NULL,
                notes TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (drug_id) REFERENCES pharmacy_drugs (id),
                FOREIGN KEY (patient_id) REFERENCES patients (id),
                FOREIGN KEY (user_id) REFERENCES users (id)
            )`,

            // Revenue table for financial tracking
            `CREATE TABLE IF NOT EXISTS revenue (
                id TEXT PRIMARY KEY,
                source TEXT NOT NULL,
                source_id TEXT,
                amount REAL NOT NULL,
                currency TEXT DEFAULT 'NGN',
                user_id TEXT,
                description TEXT,
                meta TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
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
            )`,

            // Prescriptions table
            `CREATE TABLE IF NOT EXISTS prescriptions (
                id TEXT PRIMARY KEY,
                patient_id TEXT NOT NULL,
                doctor_id TEXT NOT NULL,
                drug_id TEXT NOT NULL,
                quantity INTEGER NOT NULL,
                instructions TEXT,
                status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'dispensed', 'cancelled')),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (patient_id) REFERENCES patients (id),
                FOREIGN KEY (doctor_id) REFERENCES users (id),
                FOREIGN KEY (drug_id) REFERENCES pharmacy_drugs (id)
            )`,

            // Notifications table
            `CREATE TABLE IF NOT EXISTS notifications (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                title TEXT NOT NULL,
                message TEXT NOT NULL,
                type TEXT NOT NULL,
                related_id TEXT,
                status TEXT DEFAULT 'unread' CHECK (status IN ('read', 'unread')),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
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
            const hasReplyToIdColumn = chatTableInfo.some(column => column.name === 'reply_to_id');

            if (!hasAttachmentColumn) {
                console.log('Adding attachment column to chat table...');
                await this.run('ALTER TABLE chat ADD COLUMN attachment TEXT');
                console.log('Migration completed: Added attachment column to chat table');
            }

            if (!hasReplyToIdColumn) {
                console.log('Adding reply_to_id column to chat table...');
                await this.run('ALTER TABLE chat ADD COLUMN reply_to_id TEXT');
                console.log('Migration completed: Added reply_to_id column to chat table');
            }

            // Create sync_queue table if not exists
            try {
                await this.run(`
                    CREATE TABLE IF NOT EXISTS sync_queue (
                        id TEXT PRIMARY KEY,
                        table_name TEXT NOT NULL,
                        operation TEXT NOT NULL,
                        record_id TEXT NOT NULL,
                        data TEXT,
                        status TEXT DEFAULT 'pending',
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        retry_count INTEGER DEFAULT 0
                    )
                `);
                console.log('Migration: Created sync_queue table');
            } catch (e) {
                console.warn('sync_queue table creation:', e.message);
            }

            // Add missing columns to patients table
            const patientsTableInfo = await this.all("PRAGMA table_info(patients)");
            const existingPatientCols = new Set(patientsTableInfo.map(c => c.name));
            
            const patientColsToAdd = [
                { name: 'email', type: 'TEXT' },
                { name: 'client_type', type: 'TEXT' },
                { name: 'marital_status', type: 'TEXT' },
                { name: 'address', type: 'TEXT' },
                { name: 'reason_for_visit', type: 'TEXT' },
                { name: 'intake_date', type: 'DATE' }
            ];
            
            for (const col of patientColsToAdd) {
                if (!existingPatientCols.has(col.name)) {
                    try {
                        await this.run(`ALTER TABLE patients ADD COLUMN ${col.name} ${col.type}`);
                        console.log(`Migration: Added column ${col.name} to patients`);
                    } catch (e) {
                        if (!e.message.includes('duplicate column name')) {
                            console.warn(`Patients col ${col.name} skipped:`, e.message);
                        }
                    }
                }
            }

            // Add all missing columns to inventory table
            const inventoryTableInfo = await this.all("PRAGMA table_info(inventory)");
            const existingInventoryCols = new Set(inventoryTableInfo.map(c => c.name));
            const inventoryColsToAdd = [
                { name: 'category', type: 'TEXT' },
                { name: 'description', type: 'TEXT' },
                { name: 'manufacturer', type: 'TEXT' },
                { name: 'model_number', type: 'TEXT' },
                { name: 'serial_number', type: 'TEXT' },
                { name: 'maximum_quantity', type: 'INTEGER DEFAULT 100' },
                { name: 'unit_of_measure', type: 'TEXT DEFAULT "pieces"' },
                { name: 'unit_cost', type: 'REAL DEFAULT 0' },
                { name: 'supplier_name', type: 'TEXT' },
                { name: 'supplier_contact', type: 'TEXT' },
                { name: 'purchase_date', type: 'TEXT' },
                { name: 'expiry_date', type: 'TEXT' },
                { name: 'location', type: 'TEXT' },
                { name: 'last_updated_by', type: 'TEXT' },
                { name: 'notes', type: 'TEXT' },
                { name: 'image_path', type: 'TEXT' }
            ];
            for (const col of inventoryColsToAdd) {
                if (!existingInventoryCols.has(col.name)) {
                    try {
                        await this.run(`ALTER TABLE inventory ADD COLUMN ${col.name} ${col.type}`);
                        console.log(`Migration: Added column ${col.name} to inventory`);
                    } catch (e) {
                        if (!e.message.includes('duplicate column name')) {
                            console.warn(`Inventory col ${col.name} skipped:`, e.message);
                        }
                    }
                }
            }

            // Add all missing columns to pharmacy_drugs table
            const drugsTableInfo = await this.all("PRAGMA table_info(pharmacy_drugs)");
            const existingDrugCols = new Set(drugsTableInfo.map(c => c.name));
            const drugColsToAdd = [
                { name: 'drug_form', type: 'TEXT' },
                { name: 'strength', type: 'TEXT' },
                { name: 'pack_size', type: 'TEXT' },
                { name: 'unit_price', type: 'REAL DEFAULT 0' },
                { name: 'supplier_name', type: 'TEXT' },
                { name: 'supplier_contact', type: 'TEXT' },
                { name: 'expiry_date', type: 'TEXT' },
                { name: 'last_updated_by', type: 'TEXT' },
                { name: 'notes', type: 'TEXT' }
            ];
            for (const col of drugColsToAdd) {
                if (!existingDrugCols.has(col.name)) {
                    try {
                        await this.run(`ALTER TABLE pharmacy_drugs ADD COLUMN ${col.name} ${col.type}`);
                        console.log(`Migration: Added column ${col.name} to pharmacy_drugs`);
                    } catch (e) {
                        if (!e.message.includes('duplicate column name')) {
                            console.warn(`Drug col ${col.name} skipped:`, e.message);
                        }
                    }
                }
            }

            // Add unit_price column to pharmacy_dispensations table if missing
            const dispTableInfo = await this.all("PRAGMA table_info(pharmacy_dispensations)");
            const hasUnitPrice = dispTableInfo.some(col => col.name === 'unit_price');
            if (!hasUnitPrice) {
                try {
                    await this.run('ALTER TABLE pharmacy_dispensations ADD COLUMN unit_price REAL DEFAULT 0');
                    console.log('Migration: Added unit_price column to pharmacy_dispensations');
                } catch (e) {
                    if (!e.message.includes('duplicate column name')) {
                        console.warn('unit_price migration skipped:', e.message);
                    }
                }
            }

            // Add patient_id column to revenue table if missing
            const revenueTableInfo = await this.all("PRAGMA table_info(revenue)");
            const hasPatientId = revenueTableInfo.some(col => col.name === 'patient_id');
            if (!hasPatientId) {
                try {
                    await this.run('ALTER TABLE revenue ADD COLUMN patient_id TEXT');
                    console.log('Migration: Added patient_id column to revenue');
                } catch (e) {
                    if (!e.message.includes('duplicate column name')) {
                        console.warn('patient_id migration skipped:', e.message);
                    }
                }
            }

            // Add payload column to sync_queue table if missing
            const syncTableInfo = await this.all("PRAGMA table_info(sync_queue)");
            const hasPayload = syncTableInfo.some(col => col.name === 'payload');
            if (!hasPayload) {
                try {
                    await this.run('ALTER TABLE sync_queue ADD COLUMN payload TEXT');
                    console.log('Migration: Added payload column to sync_queue');
                } catch (e) {
                    if (!e.message.includes('duplicate column name')) {
                        console.warn('payload migration skipped:', e.message);
                    }
                }
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
        const query = 'SELECT id, first_name, last_name, email, role, phone_number, status, gender, created_at FROM users ORDER BY created_at DESC';
        return await this.all(query);
    }

    async updateUser(userId, userData) {
        const { first_name, last_name, email, role, phone_number, gender, password } = userData;

        // Build dynamic query only for provided fields
        let setClauses = [];
        let params = [];

        if (first_name !== undefined) {
            setClauses.push('first_name = ?');
            params.push(first_name);
        }
        if (last_name !== undefined) {
            setClauses.push('last_name = ?');
            params.push(last_name);
        }
        if (email !== undefined) {
            setClauses.push('email = ?');
            params.push(email);
        }
        if (role !== undefined) {
            setClauses.push('role = ?');
            params.push(role);
        }
        if (phone_number !== undefined) {
            setClauses.push('phone_number = ?');
            params.push(phone_number || null);
        }
        if (gender !== undefined) {
            setClauses.push('gender = ?');
            params.push(gender || 'other');
        }

        if (password) {
            const saltRounds = 10;
            const passwordHash = await bcrypt.hash(password, saltRounds);
            setClauses.push('password_hash = ?');
            params.push(passwordHash);
        }

        if (setClauses.length === 0) {
            throw new Error('No fields to update');
        }

        setClauses.push('updated_at = CURRENT_TIMESTAMP');

        const query = `UPDATE users SET ${setClauses.join(', ')} WHERE id = ?`;
        params.push(userId);

        try {
            await this.run(query, params);
            // Return updated user without password
            return { id: userId, first_name, last_name, email, role, phone_number, gender };
        } catch (error) {
            console.error('Error updating user:', error);
            throw error;
        }
    }

    async updateUserStatus(userId, isActive) {
        const status = isActive ? 'active' : 'inactive';
        const query = `UPDATE users SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;

        try {
            await this.run(query, [status, userId]);
            return { id: userId, status };
        } catch (error) {
            console.error('Error updating user status:', error);
            throw error;
        }
    }

    async deleteUser(userId) {
        const query = `DELETE FROM users WHERE id = ?`;

        try {
            const result = await this.run(query, [userId]);
            return { success: result.changes > 0 };
        } catch (error) {
            console.error('Error deleting user:', error);
            throw error;
        }
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
            this.db.run(query, params, function (err) {
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

    // Role-based permissions for backup operations
    async validateBackupPermission(role) {
        if (role !== 'admin') {
            throw new Error('Only admins are allowed to perform backup operations.');
        }
    }

    // Example usage in backup restoration
    async restoreBackup(filePath, role) {
        await this.validateBackupPermission(role);

        if (!filePath.endsWith('.bak')) {
            throw new Error('Invalid file type. Only .bak files are supported.');
        }

        // Restore logic here
        console.log(`Restoring backup from ${filePath}...`);
        // ...existing restore logic...
    }
}

module.exports = Database;
