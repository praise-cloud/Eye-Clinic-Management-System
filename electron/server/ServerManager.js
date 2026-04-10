const express = require('express');
const cors = require('cors');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

class ServerManager {
    constructor() {
        this.app = null;
        this.server = null;
        this.wss = null;
        this.port = 3001;
        this.isRunning = false;
        this.connectedClients = new Map();
        this.db = null;
    }

    initialize(database) {
        this.db = database;
    }

    async start(config = {}) {
        if (this.isRunning) {
            console.log('[Server] Already running');
            return { success: true, message: 'Server already running' };
        }

        this.port = config.port || 3001;

        this.app = express();
        this.app.use(cors());
        this.app.use(express.json({ limit: '50mb' }));
        this.app.use(express.urlencoded({ extended: true, limit: '50mb' }));

        this.server = http.createServer(this.app);
        this.wss = new WebSocket.Server({ server: this.server });

        this.setupWebSocket();
        this.setupRoutes();

        return new Promise((resolve, reject) => {
            this.server.listen(this.port, '0.0.0.0', (err) => {
                if (err) {
                    console.error('[Server] Failed to start:', err);
                    reject(err);
                    return;
                }
                this.isRunning = true;
                console.log(`[Server] Started on port ${this.port}`);
                resolve({ success: true, port: this.port });
            });
        });
    }

    stop() {
        if (!this.isRunning) return Promise.resolve({ success: true });

        return new Promise((resolve) => {
            this.wss.clients.forEach(client => client.close());
            this.server.close(() => {
                this.isRunning = false;
                console.log('[Server] Stopped');
                resolve({ success: true });
            });
        });
    }

    getStatus() {
        return {
            running: this.isRunning,
            port: this.port,
            clients: this.connectedClients.size,
            clientList: Array.from(this.connectedClients.values())
        };
    }

    setupWebSocket() {
        this.wss.on('connection', (ws, req) => {
            const clientId = uuidv4();
            const clientIp = req.socket.remoteAddress;
            
            this.connectedClients.set(clientId, {
                id: clientId,
                ip: clientIp,
                ws: ws,
                connectedAt: new Date().toISOString(),
                userId: null,
                userName: null,
                userRole: null
            });

            console.log(`[WebSocket] Client connected: ${clientId} from ${clientIp}`);

            ws.on('message', (message) => {
                try {
                    const data = JSON.parse(message);
                    this.handleClientMessage(clientId, data);
                } catch (err) {
                    console.error('[WebSocket] Invalid message:', err);
                }
            });

            ws.on('close', () => {
                const client = this.connectedClients.get(clientId);
                if (client) {
                    console.log(`[WebSocket] Client disconnected: ${clientId}`);
                    this.broadcast('client:disconnect', { clientId, userId: client.userId });
                }
                this.connectedClients.delete(clientId);
            });

            ws.on('error', (err) => {
                console.error(`[WebSocket] Client error: ${clientId}`, err);
            });

            ws.send(JSON.stringify({ type: 'connected', clientId }));
        });
    }

    handleClientMessage(clientId, data) {
        const client = this.connectedClients.get(clientId);
        if (!client) return;

        switch (data.type) {
            case 'auth':
                client.userId = data.userId;
                client.userName = data.userName;
                client.userRole = data.userRole;
                this.broadcast('user:presence', {
                    userId: data.userId,
                    userName: data.userName,
                    role: data.userRole,
                    status: 'online',
                    deviceName: data.deviceName
                });
                break;

            case 'ping':
                client.ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
                break;

            default:
                console.log(`[WebSocket] Unknown message type: ${data.type}`);
        }
    }

    broadcast(event, data) {
        const message = JSON.stringify({ type: event, data, timestamp: Date.now() });
        this.wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        });
    }

    broadcastToOthers(excludeClientId, event, data) {
        const message = JSON.stringify({ type: event, data, timestamp: Date.now() });
        this.wss.clients.forEach(client => {
            const clientInfo = Array.from(this.connectedClients.values()).find(c => c.ws === client);
            if (client && client.readyState === WebSocket.OPEN && clientInfo?.id !== excludeClientId) {
                client.send(message);
            }
        });
    }

    setupRoutes() {
        if (!this.db) {
            console.error('[Server] Database not initialized');
            return;
        }

        const db = this.db;

        // Auth routes
        this.app.post('/api/auth/login', async (req, res) => {
            try {
                const { email, password } = req.body;
                const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);
                
                if (!user) {
                    return res.json({ success: false, error: 'User not found' });
                }

                const bcrypt = require('bcryptjs');
                const valid = await bcrypt.compare(password, user.password);
                
                if (!valid) {
                    return res.json({ success: false, error: 'Invalid password' });
                }

                res.json({
                    success: true,
                    user: {
                        id: user.id,
                        email: user.email,
                        name: user.name,
                        role: user.role,
                        phone: user.phone
                    }
                });
            } catch (err) {
                console.error('[API] Login error:', err);
                res.json({ success: false, error: err.message });
            }
        });

        // Patients routes
        this.app.get('/api/patients', async (req, res) => {
            try {
                const patients = await db.all('SELECT * FROM patients ORDER BY created_at DESC');
                res.json({ success: true, patients });
            } catch (err) {
                res.json({ success: false, error: err.message });
            }
        });

        this.app.get('/api/patients/:id', async (req, res) => {
            try {
                const patient = await db.get('SELECT * FROM patients WHERE id = ?', [req.params.id]);
                res.json({ success: true, patient });
            } catch (err) {
                res.json({ success: false, error: err.message });
            }
        });

        this.app.post('/api/patients', async (req, res) => {
            try {
                const { patient_id, first_name, last_name, dob, gender, contact, email, address, reason_for_visit, client_type, marital_status, intake_date } = req.body;
                const id = uuidv4();
                
                const tableInfo = await db.all("PRAGMA table_info(patients)");
                const existingCols = new Set(tableInfo.map(c => c.name));
                
                const columns = ['id', 'patient_id', 'first_name', 'last_name', 'dob', 'gender', 'contact'];
                const placeholders = ['?', '?', '?', '?', '?', '?', '?'];
                const values = [id, patient_id, first_name, last_name, dob, gender, contact];
                
                if (existingCols.has('email')) { columns.push('email'); placeholders.push('?'); values.push(email || null); }
                if (existingCols.has('address')) { columns.push('address'); placeholders.push('?'); values.push(address || null); }
                if (existingCols.has('reason_for_visit')) { columns.push('reason_for_visit'); placeholders.push('?'); values.push(reason_for_visit || null); }
                if (existingCols.has('client_type')) { columns.push('client_type'); placeholders.push('?'); values.push(client_type || null); }
                if (existingCols.has('marital_status')) { columns.push('marital_status'); placeholders.push('?'); values.push(marital_status || null); }
                if (existingCols.has('intake_date')) { columns.push('intake_date'); placeholders.push('?'); values.push(intake_date || null); }
                
                columns.push('created_at', 'updated_at');
                placeholders.push('CURRENT_TIMESTAMP', 'CURRENT_TIMESTAMP');
                
                const query = `INSERT INTO patients (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`;
                await db.run(query, values);
                
                const patient = await db.get('SELECT * FROM patients WHERE id = ?', [id]);
                this.broadcast('data:update', { table: 'patients', action: 'create', data: patient });
                res.json({ success: true, patient });
            } catch (err) {
                console.error('[API] Create patient error:', err);
                res.json({ success: false, error: err.message });
            }
        });

        this.app.put('/api/patients/:id', async (req, res) => {
            try {
                const { patient_id, first_name, last_name, dob, gender, contact, email, address, reason_for_visit, client_type, marital_status, intake_date } = req.body;
                const id = req.params.id;
                
                const tableInfo = await db.all("PRAGMA table_info(patients)");
                const existingCols = new Set(tableInfo.map(c => c.name));
                
                const setClauses = ['patient_id = ?', 'first_name = ?', 'last_name = ?', 'dob = ?', 'gender = ?', 'contact = ?', 'updated_at = CURRENT_TIMESTAMP'];
                const values = [patient_id, first_name, last_name, dob, gender, contact];
                
                if (existingCols.has('email')) { setClauses.push('email = ?'); values.push(email || null); }
                if (existingCols.has('address')) { setClauses.push('address = ?'); values.push(address || null); }
                if (existingCols.has('reason_for_visit')) { setClauses.push('reason_for_visit = ?'); values.push(reason_for_visit || null); }
                if (existingCols.has('client_type')) { setClauses.push('client_type = ?'); values.push(client_type || null); }
                if (existingCols.has('marital_status')) { setClauses.push('marital_status = ?'); values.push(marital_status || null); }
                if (existingCols.has('intake_date')) { setClauses.push('intake_date = ?'); values.push(intake_date || null); }
                
                values.push(id);
                const query = `UPDATE patients SET ${setClauses.join(', ')} WHERE id = ?`;
                await db.run(query, values);
                
                const patient = await db.get('SELECT * FROM patients WHERE id = ?', [id]);
                this.broadcast('data:update', { table: 'patients', action: 'update', data: patient });
                res.json({ success: true, patient });
            } catch (err) {
                console.error('[API] Update patient error:', err);
                res.json({ success: false, error: err.message });
            }
        });

        this.app.delete('/api/patients/:id', async (req, res) => {
            try {
                await db.run('DELETE FROM patients WHERE id = ?', [req.params.id]);
                this.broadcast('data:update', { table: 'patients', action: 'delete', id: req.params.id });
                res.json({ success: true });
            } catch (err) {
                res.json({ success: false, error: err.message });
            }
        });

        // Tests routes
        this.app.get('/api/tests', async (req, res) => {
            try {
                const { patientId } = req.query;
                let query = 'SELECT * FROM tests ORDER BY test_date DESC';
                let params = [];
                if (patientId) {
                    query = 'SELECT * FROM tests WHERE patient_id = ? ORDER BY test_date DESC';
                    params = [patientId];
                }
                const tests = await db.all(query, params);
                res.json({ success: true, tests });
            } catch (err) {
                res.json({ success: false, error: err.message });
            }
        });

        this.app.post('/api/tests', async (req, res) => {
            try {
                const { patient_id, machine_type, eye, test_date, raw_data } = req.body;
                const id = uuidv4();
                const rawDataStr = typeof raw_data === 'string' ? raw_data : JSON.stringify(raw_data || {});
                
                await db.run(
                    'INSERT INTO tests (id, patient_id, machine_type, eye, test_date, raw_data, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
                    [id, patient_id, machine_type, eye, test_date, rawDataStr]
                );
                
                const test = await db.get('SELECT * FROM tests WHERE id = ?', [id]);
                this.broadcast('data:update', { table: 'tests', action: 'create', data: test });
                res.json({ success: true, test });
            } catch (err) {
                res.json({ success: false, error: err.message });
            }
        });

        // Prescriptions routes
        this.app.get('/api/prescriptions', async (req, res) => {
            try {
                const { patientId, status } = req.query;
                let query = 'SELECT * FROM prescriptions';
                const conditions = [];
                const params = [];
                
                if (patientId) {
                    conditions.push('patient_id = ?');
                    params.push(patientId);
                }
                if (status) {
                    conditions.push('status = ?');
                    params.push(status);
                }
                
                if (conditions.length > 0) {
                    query += ' WHERE ' + conditions.join(' AND ');
                }
                query += ' ORDER BY created_at DESC';
                
                const prescriptions = await db.all(query, params);
                res.json({ success: true, prescriptions });
            } catch (err) {
                res.json({ success: false, error: err.message });
            }
        });

        this.app.post('/api/prescriptions', async (req, res) => {
            try {
                const { patient_id, doctor_id, drug_id, quantity, instructions, status } = req.body;
                const id = uuidv4();
                
                await db.run(
                    'INSERT INTO prescriptions (id, patient_id, doctor_id, drug_id, quantity, instructions, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)',
                    [id, patient_id, doctor_id, drug_id, quantity, instructions, status || 'pending']
                );
                
                const prescription = await db.get('SELECT * FROM prescriptions WHERE id = ?', [id]);
                this.broadcast('data:update', { table: 'prescriptions', action: 'create', data: prescription });
                res.json({ success: true, prescription });
            } catch (err) {
                res.json({ success: false, error: err.message });
            }
        });

        // Inventory routes
        this.app.get('/api/inventory', async (req, res) => {
            try {
                const inventory = await db.all('SELECT * FROM inventory ORDER BY drug_name ASC');
                res.json({ success: true, inventory });
            } catch (err) {
                res.json({ success: false, error: err.message });
            }
        });

        this.app.post('/api/inventory', async (req, res) => {
            try {
                const { drug_code, drug_name, drug_form, strength, pack_size, unit_price, current_quantity, minimum_quantity, status, supplier_name, supplier_contact, expiry_date, notes } = req.body;
                const id = uuidv4();
                
                await db.run(
                    'INSERT INTO inventory (id, drug_code, drug_name, drug_form, strength, pack_size, unit_price, current_quantity, minimum_quantity, status, supplier_name, supplier_contact, expiry_date, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
                    [id, drug_code, drug_name, drug_form, strength, pack_size, unit_price, current_quantity, minimum_quantity, status, supplier_name, supplier_contact, expiry_date, notes]
                );
                
                const item = await db.get('SELECT * FROM inventory WHERE id = ?', [id]);
                this.broadcast('data:update', { table: 'inventory', action: 'create', data: item });
                res.json({ success: true, inventory: item });
            } catch (err) {
                res.json({ success: false, error: err.message });
            }
        });

        // Users routes
        this.app.get('/api/users', async (req, res) => {
            try {
                const users = await db.all('SELECT id, email, name, role, phone, created_at FROM users ORDER BY name ASC');
                res.json({ success: true, users });
            } catch (err) {
                res.json({ success: false, error: err.message });
            }
        });

        this.app.post('/api/users', async (req, res) => {
            try {
                const { email, password, name, role, phone } = req.body;
                const bcrypt = require('bcryptjs');
                const hashedPassword = await bcrypt.hash(password, 10);
                const id = uuidv4();
                
                await db.run(
                    'INSERT INTO users (id, email, password, name, role, phone, created_at) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)',
                    [id, email, hashedPassword, name, role, phone]
                );
                
                const user = await db.get('SELECT id, email, name, role, phone FROM users WHERE id = ?', [id]);
                this.broadcast('data:update', { table: 'users', action: 'create', data: user });
                res.json({ success: true, user });
            } catch (err) {
                res.json({ success: false, error: err.message });
            }
        });

        // Reports routes
        this.app.get('/api/reports', async (req, res) => {
            try {
                const { patientId } = req.query;
                let query = 'SELECT * FROM reports';
                const params = [];
                if (patientId) {
                    query += ' WHERE patient_id = ?';
                    params.push(patientId);
                }
                query += ' ORDER BY created_at DESC';
                
                const reports = await db.all(query, params);
                res.json({ success: true, reports });
            } catch (err) {
                res.json({ success: false, error: err.message });
            }
        });

        this.app.post('/api/reports', async (req, res) => {
            try {
                const { patient_id, report_type, report_file, title } = req.body;
                const id = uuidv4();
                
                await db.run(
                    'INSERT INTO reports (id, patient_id, report_type, report_file, title, created_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)',
                    [id, patient_id, report_type, report_file, title]
                );
                
                const report = await db.get('SELECT * FROM reports WHERE id = ?', [id]);
                this.broadcast('data:update', { table: 'reports', action: 'create', data: report });
                res.json({ success: true, report });
            } catch (err) {
                res.json({ success: false, error: err.message });
            }
        });

        // Chat routes
        this.app.get('/api/chat', async (req, res) => {
            try {
                const messages = await db.all('SELECT * FROM chat ORDER BY created_at DESC LIMIT 100');
                res.json({ success: true, messages });
            } catch (err) {
                res.json({ success: false, error: err.message });
            }
        });

        this.app.post('/api/chat', async (req, res) => {
            try {
                const { sender_id, sender_name, message, recipient_id } = req.body;
                const id = uuidv4();
                
                await db.run(
                    'INSERT INTO chat (id, sender_id, sender_name, message, recipient_id, created_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)',
                    [id, sender_id, sender_name, message, recipient_id || null]
                );
                
                const chatMessage = await db.get('SELECT * FROM chat WHERE id = ?', [id]);
                this.broadcast('chat:message', chatMessage);
                res.json({ success: true, message: chatMessage });
            } catch (err) {
                res.json({ success: false, error: err.message });
            }
        });

        // Activity logs
        this.app.get('/api/activity-logs', async (req, res) => {
            try {
                const logs = await db.all('SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT 200');
                res.json({ success: true, logs });
            } catch (err) {
                res.json({ success: false, error: err.message });
            }
        });

        // Backup routes
        this.app.post('/api/backup', async (req, res) => {
            try {
                const configPath = this.getConfigPath();
                const backupDir = path.join(path.dirname(configPath), 'backups');
                
                if (!fs.existsSync(backupDir)) {
                    fs.mkdirSync(backupDir, { recursive: true });
                }
                
                const dbPath = this.getDatabasePath();
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const backupPath = path.join(backupDir, `backup_${timestamp}.db`);
                
                fs.copyFileSync(dbPath, backupPath);
                
                const backups = fs.readdirSync(backupDir)
                    .filter(f => f.startsWith('backup_') && f.endsWith('.db'))
                    .sort()
                    .reverse();
                
                const maxBackups = 10;
                while (backups.length > maxBackups) {
                    const oldBackup = backups.pop();
                    fs.unlinkSync(path.join(backupDir, oldBackup));
                }
                
                res.json({ success: true, backupPath, message: 'Backup created successfully' });
            } catch (err) {
                console.error('[API] Backup error:', err);
                res.json({ success: false, error: err.message });
            }
        });

        this.app.post('/api/restore', async (req, res) => {
            try {
                const { backupPath } = req.body;
                
                if (!backupPath || !fs.existsSync(backupPath)) {
                    return res.json({ success: false, error: 'Backup file not found' });
                }
                
                const dbPath = this.getDatabasePath();
                await db.close();
                
                fs.copyFileSync(backupPath, dbPath);
                
                // Reinitialize database
                const Database = require('better-sqlite3');
                this.db = new Database(dbPath);
                
                this.broadcast('database:restored', { timestamp: Date.now() });
                
                res.json({ success: true, message: 'Database restored successfully. Please restart the application.' });
            } catch (err) {
                console.error('[API] Restore error:', err);
                res.json({ success: false, error: err.message });
            }
        });

        this.app.get('/api/backups', async (req, res) => {
            try {
                const configPath = this.getConfigPath();
                const backupDir = path.join(path.dirname(configPath), 'backups');
                
                if (!fs.existsSync(backupDir)) {
                    return res.json({ success: true, backups: [] });
                }
                
                const backups = fs.readdirSync(backupDir)
                    .filter(f => f.startsWith('backup_') && f.endsWith('.db'))
                    .map(f => {
                        const filePath = path.join(backupDir, f);
                        const stats = fs.statSync(filePath);
                        return {
                            name: f,
                            path: filePath,
                            size: stats.size,
                            created: stats.mtime.toISOString()
                        };
                    })
                    .sort((a, b) => new Date(b.created) - new Date(a.created));
                
                res.json({ success: true, backups });
            } catch (err) {
                res.json({ success: false, error: err.message });
            }
        });

        // Config routes
        this.app.get('/api/config', async (req, res) => {
            try {
                const configPath = this.getConfigPath();
                let config = {};
                
                if (fs.existsSync(configPath)) {
                    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                }
                
                res.json({ success: true, config });
            } catch (err) {
                res.json({ success: false, error: err.message });
            }
        });

        this.app.put('/api/config', async (req, res) => {
            try {
                const configPath = this.getConfigPath();
                const configDir = path.dirname(configPath);
                
                if (!fs.existsSync(configDir)) {
                    fs.mkdirSync(configDir, { recursive: true });
                }
                
                const currentConfig = fs.existsSync(configPath) 
                    ? JSON.parse(fs.readFileSync(configPath, 'utf8')) 
                    : {};
                
                const newConfig = { ...currentConfig, ...req.body };
                fs.writeFileSync(configPath, JSON.stringify(newConfig, null, 2));
                
                res.json({ success: true, config: newConfig });
            } catch (err) {
                res.json({ success: false, error: err.message });
            }
        });

        // Dashboard stats
        this.app.get('/api/dashboard/stats', async (req, res) => {
            try {
                const today = new Date().toISOString().split('T')[0];
                
                const totalPatients = await db.get('SELECT COUNT(*) as count FROM patients');
                const todayPatients = await db.get('SELECT COUNT(*) as count FROM patients WHERE date(created_at) = ?', [today]);
                const totalTests = await db.get('SELECT COUNT(*) as count FROM tests');
                const todayTests = await db.get('SELECT COUNT(*) as count FROM tests WHERE date(test_date) = ?', [today]);
                const pendingPrescriptions = await db.get('SELECT COUNT(*) as count FROM prescriptions WHERE status = ?', ['pending']);
                
                res.json({
                    success: true,
                    stats: {
                        totalPatients: totalPatients?.count || 0,
                        todayPatients: todayPatients?.count || 0,
                        totalTests: totalTests?.count || 0,
                        todayTests: todayTests?.count || 0,
                        pendingPrescriptions: pendingPrescriptions?.count || 0
                    }
                });
            } catch (err) {
                res.json({ success: false, error: err.message });
            }
        });

        // Online users
        this.app.get('/api/online-users', async (req, res) => {
            try {
                const onlineUsers = Array.from(this.connectedClients.values())
                    .filter(c => c.userId)
                    .map(c => ({
                        userId: c.userId,
                        userName: c.userName,
                        role: c.userRole,
                        connectedAt: c.connectedAt
                    }));
                
                res.json({ success: true, users: onlineUsers });
            } catch (err) {
                res.json({ success: false, error: err.message });
            }
        });
    }

    getDatabasePath() {
        const basePath = process.env.USERPROFILE || process.env.HOME || '';
        return path.join(basePath, 'Documents', 'KORENE_EyeClinic', 'database.db');
    }

    getConfigPath() {
        const basePath = process.env.USERPROFILE || process.env.HOME || '';
        return path.join(basePath, 'Documents', 'KORENE_EyeClinic', 'config', 'server-config.json');
    }
}

module.exports = new ServerManager();