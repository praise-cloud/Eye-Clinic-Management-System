const express = require('express');
const cors = require('cors');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs');
const mssql = require('mssql');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'eye-clinic-secret-key';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'eye-clinic-refresh-secret';
const ACCESS_TTL = '15m';
const REFRESH_TTL = '7d';

class ServerManager {
    constructor() {
        this.app = null;
        this.server = null;
        this.wss = null;
        this.port = 3001;
        this.isRunning = false;
        this.connectedClients = new Map();
        this.pool = null;
        this.sqlConfig = null;
    }

    getDefaultSqlConfig() {
        return {
            server: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT || '1433'),
            database: process.env.DB_NAME || 'eye_clinic_db',
            user: process.env.DB_USER || '',
            password: process.env.DB_PASSWORD || '',
            options: {
                encrypt: true,
                trustServerCertificate: true,
                enableArithAbort: true
            }
        };
    }

    loadSqlConfig() {
        const configPath = path.join(process.env.APPDATA || process.env.HOME || '', 'KORENE_EyeClinic', 'server-config.json');
        try {
            if (fs.existsSync(configPath)) {
                const loaded = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
                this.sqlConfig = {
                    server: loaded.sql_host || this.getDefaultSqlConfig().server,
                    port: parseInt(loaded.sql_port || this.getDefaultSqlConfig().port),
                    database: loaded.sql_database || this.getDefaultSqlConfig().database,
                    user: loaded.sql_user || this.getDefaultSqlConfig().user,
                    password: loaded.sql_password || this.getDefaultSqlConfig().password,
                    options: { encrypt: true, trustServerCertificate: true, enableArithAbort: true }
                };
            }
        } catch {}
        if (!this.sqlConfig) this.sqlConfig = this.getDefaultSqlConfig();
    }

    async sqlQuery(query, params = []) {
        if (!this.pool) throw new Error('Database not connected');
        const req = this.pool.request();
        for (const p of params) req.input(p.name, p.type, p.value);
        return req.query(query);
    }

    generateTokens(user) {
        const accessToken = jwt.sign(
            { userId: user.id, email: user.email, role: user.role },
            JWT_SECRET, { expiresIn: ACCESS_TTL }
        );
        const refreshToken = jwt.sign(
            { userId: user.id, type: 'refresh' },
            JWT_REFRESH_SECRET, { expiresIn: REFRESH_TTL }
        );
        return { accessToken, refreshToken };
    }

    verifyAccess(token) {
        try { return jwt.verify(token, JWT_SECRET); }
        catch { return null; }
    }

    verifyRefresh(token) {
        try { return jwt.verify(token, JWT_REFRESH_SECRET); }
        catch { return null; }
    }

    authMiddleware(req, res, next) {
        const header = req.headers.authorization;
        if (!header || !header.startsWith('Bearer ')) {
            return res.status(401).json({ success: false, error: 'No token provided' });
        }
        const decoded = this.verifyAccess(header.split(' ')[1]);
        if (!decoded) return res.status(401).json({ success: false, error: 'Invalid or expired token' });
        req.user = decoded;
        next();
    }

    adminOnly(req, res, next) {
        if (req.user.role !== 'admin') return res.status(403).json({ success: false, error: 'Admin access required' });
        next();
    }

    doctorOnly(req, res, next) {
        if (!['admin', 'doctor'].includes(req.user.role)) return res.status(403).json({ success: false, error: 'Doctor access required' });
        next();
    }

    async initialize() {
        this.loadSqlConfig();
        this.pool = await mssql.connect(this.sqlConfig);
        console.log(`[Server] Connected to SQL Server: ${this.sqlConfig.server}:${this.sqlConfig.port}/${this.sqlConfig.database}`);
    }

    async start(config = {}) {
        if (this.isRunning) return { success: true, message: 'Server already running' };

        this.port = config.port || 3001;

        try {
            await this.initialize();
        } catch (err) {
            console.error('[Server] Database connection failed:', err.message);
            throw err;
        }

        this.app = express();
        this.app.use(cors({ origin: true, credentials: true }));
        this.app.use(express.json({ limit: '50mb' }));
        this.app.use(express.urlencoded({ extended: true, limit: '50mb' }));

        this.server = http.createServer(this.app);
        this.wss = new WebSocket.Server({ server: this.server });

        this.setupWebSocket();
        this.setupRoutes();

        return new Promise((resolve, reject) => {
            this.server.listen(this.port, '0.0.0.0', (err) => {
                if (err) { reject(err); return; }
                this.isRunning = true;
                console.log(`[Server] Listening on port ${this.port}`);
                resolve({ success: true, port: this.port });
            });
        });
    }

    stop() {
        if (!this.isRunning) return Promise.resolve({ success: true });
        return new Promise((resolve) => {
            this.wss.clients.forEach(c => c.close());
            this.server.close(async () => {
                if (this.pool) await mssql.close();
                this.isRunning = false;
                console.log('[Server] Stopped');
                resolve({ success: true });
            });
        });
    }

    getStatus() {
        const os = require('os');
        const ifs = os.networkInterfaces();
        const ips = Object.values(ifs).flat().filter(i => i.family === 'IPv4' && !i.internal).map(i => i.address);
        return {
            running: this.isRunning,
            port: this.port,
            clients: this.connectedClients.size,
            serverIp: ips[0] || '127.0.0.1',
            serverIps: ips
        };
    }

    broadcast(event, data) {
        const msg = JSON.stringify({ type: event, data, timestamp: Date.now() });
        this.wss.clients.forEach(c => {
            if (c.readyState === WebSocket.OPEN) c.send(msg);
        });
    }

    sendToUser(userId, event, data) {
        const msg = JSON.stringify({ type: event, data, timestamp: Date.now() });
        this.connectedClients.forEach(client => {
            if (client.userId === userId && client.ws.readyState === WebSocket.OPEN) {
                client.ws.send(msg);
            }
        });
    }

    setupWebSocket() {
        this.wss.on('connection', (ws, req) => {
            const clientId = uuidv4();
            const ip = req.socket.remoteAddress;
            this.connectedClients.set(clientId, { id: clientId, ip, ws, userId: null });

            ws.on('message', (message) => {
                try {
                    const data = JSON.parse(message);
                    switch (data.type) {
                        case 'auth':
                            this.connectedClients.get(clientId).userId = data.userId;
                            this.broadcast('presence', { userId: data.userId, status: 'online', deviceName: data.deviceName });
                            break;
                        case 'ping':
                            ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
                            break;
                    }
                } catch {}
            });

            ws.on('close', () => {
                const client = this.connectedClients.get(clientId);
                if (client?.userId) this.broadcast('presence', { userId: client.userId, status: 'offline' });
                this.connectedClients.delete(clientId);
            });
        });
    }

    setupRoutes() {
        const sq = (q, p) => this.sqlQuery(q, p);
        const am = (r, e, n) => this.authMiddleware(r, e, n);
        const ao = (r, e, n) => this.adminOnly(r, e, n);
        const doc = (r, e, n) => this.doctorOnly(r, e, n);
        const V = mssql.VarChar;

        // Health
        this.app.get('/api/health', (req, res) => {
            const os = require('os');
            const ifs = os.networkInterfaces();
            const ips = Object.values(ifs).flat().filter(i => i.family === 'IPv4' && !i.internal).map(i => i.address);
            res.json({ status: 'ok', serverIp: ips[0] || '127.0.0.1', serverIps: ips });
        });

        // Auth
        this.app.post('/api/auth/login', async (req, res) => {
            try {
                const { email, password } = req.body;
                if (!email || !password) return res.status(400).json({ success: false, error: 'Email and password required' });
                const result = await sq('SELECT * FROM users WHERE email = @e', [{ name: 'e', type: V, value: email }]);
                const user = result.recordset[0];
                if (!user) return res.status(401).json({ success: false, error: 'Invalid credentials' });
                const valid = await bcrypt.compare(password, user.password_hash);
                if (!valid) return res.status(401).json({ success: false, error: 'Invalid credentials' });
                if (user.status !== 'active') return res.status(403).json({ success: false, error: 'Account inactive' });
                const tokens = this.generateTokens(user);
                await sq('UPDATE user_presence SET is_online = 1, last_seen = GETDATE() WHERE user_id = @uid', [{ name: 'uid', type: V, value: user.id }]);
                res.json({
                    success: true,
                    accessToken: tokens.accessToken,
                    refreshToken: tokens.refreshToken,
                    user: {
                        id: user.id,
                        name: `${user.first_name} ${user.last_name}`.trim(),
                        email: user.email,
                        role: user.role,
                        phone: user.phone_number,
                        gender: user.gender
                    }
                });
            } catch (err) { res.status(500).json({ success: false, error: err.message }); }
        });

        this.app.post('/api/auth/refresh', async (req, res) => {
            try {
                const { refreshToken } = req.body;
                if (!refreshToken) return res.status(400).json({ success: false, error: 'Refresh token required' });
                const decoded = this.verifyRefresh(refreshToken);
                if (!decoded) return res.status(401).json({ success: false, error: 'Invalid refresh token' });
                const result = await sq('SELECT * FROM users WHERE id = @id', [{ name: 'id', type: V, value: decoded.userId }]);
                const user = result.recordset[0];
                if (!user) return res.status(401).json({ success: false, error: 'User not found' });
                const tokens = this.generateTokens(user);
                res.json({ success: true, accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
            } catch (err) { res.status(500).json({ success: false, error: err.message }); }
        });

        this.app.post('/api/auth/logout', (req, res, next) => { am(req, res, async () => {
            try {
                await sq('UPDATE user_presence SET is_online = 0, last_seen = GETDATE() WHERE user_id = @uid', [{ name: 'uid', type: V, value: req.user.userId }]);
                res.json({ success: true });
            } catch (err) { res.status(500).json({ success: false, error: err.message }); }
        }); });

        this.app.get('/api/auth/me', (req, res, next) => { am(req, res, async () => {
            try {
                const result = await sq('SELECT id, first_name, last_name, email, role, phone_number, gender FROM users WHERE id = @id', [{ name: 'id', type: V, value: req.user.userId }]);
                const user = result.recordset[0];
                if (!user) return res.status(404).json({ success: false, error: 'Not found' });
                res.json({ success: true, user: { id: user.id, name: `${user.first_name} ${user.last_name}`.trim(), email: user.email, role: user.role, phone: user.phone_number, gender: user.gender } });
            } catch (err) { res.status(500).json({ success: false, error: err.message }); }
        }); });

        // Patients
        this.app.get('/api/patients', (req, res, next) => { am(req, res, async () => {
            try {
                const { search, limit = 100, offset = 0 } = req.query;
                let query = 'SELECT * FROM patients';
                const params = [];
                if (search) { query += ' WHERE first_name LIKE @s OR last_name LIKE @s OR patient_id LIKE @s'; params.push({ name: 's', type: V, value: `%${search}%` }); }
                query += ` ORDER BY created_at DESC OFFSET ${parseInt(offset)} ROWS FETCH NEXT ${parseInt(limit)} ROWS ONLY`;
                const result = await sq(query, params);
                res.json({ success: true, data: result.recordset, total: result.recordset.length });
            } catch (err) { res.status(500).json({ success: false, error: err.message }); }
        }); });

        this.app.get('/api/patients/:id', (req, res, next) => { am(req, res, async () => {
            try {
                const result = await sq('SELECT * FROM patients WHERE id = @id', [{ name: 'id', type: V, value: req.params.id }]);
                if (!result.recordset[0]) return res.status(404).json({ success: false, error: 'Not found' });
                res.json({ success: true, data: result.recordset[0] });
            } catch (err) { res.status(500).json({ success: false, error: err.message }); }
        }); });

        this.app.post('/api/patients', (req, res, next) => { am(req, res, async () => {
            try {
                const { patient_id, first_name, last_name, dob, gender, contact, email, address, reason_for_visit, client_type, marital_status, intake_date } = req.body;
                const id = uuidv4();
                await sq(
                    `INSERT INTO patients (id, patient_id, first_name, last_name, dob, gender, contact, email, address, reason_for_visit, client_type, marital_status, intake_date, created_at, updated_at)
                     VALUES (@id, @pid, @fn, @ln, @dob, @g, @c, @e, @addr, @rv, @ct, @ms, @idt, GETDATE(), GETDATE())`,
                    [
                        { name: 'id', type: V, value: id }, { name: 'pid', type: V, value: patient_id || id },
                        { name: 'fn', type: V, value: first_name }, { name: 'ln', type: V, value: last_name },
                        { name: 'dob', type: V, value: dob || null }, { name: 'g', type: V, value: gender || '' },
                        { name: 'c', type: V, value: contact || '' }, { name: 'e', type: V, value: email || '' },
                        { name: 'addr', type: V, value: address || '' }, { name: 'rv', type: V, value: reason_for_visit || '' },
                        { name: 'ct', type: V, value: client_type || '' }, { name: 'ms', type: V, value: marital_status || '' },
                        { name: 'idt', type: V, value: intake_date || null }
                    ]
                );
                const patientResult = await sq('SELECT * FROM patients WHERE id = @id', [{ name: 'id', type: V, value: id }]);
                const patient = patientResult.recordset[0];
                this.broadcast('data:update', { table: 'patients', action: 'create', record: patient });
                res.json({ success: true, id, patient });
            } catch (err) { res.status(500).json({ success: false, error: err.message }); }
        }); });

        this.app.put('/api/patients/:id', (req, res, next) => { am(req, res, async () => {
            try {
                const { first_name, last_name, dob, gender, contact, email, address, reason_for_visit, client_type, marital_status, intake_date } = req.body;
                await sq(
                    `UPDATE patients SET first_name=@fn, last_name=@ln, dob=@dob, gender=@g, contact=@c, email=@e, address=@addr, reason_for_visit=@rv, client_type=@ct, marital_status=@ms, intake_date=@idt, updated_at=GETDATE() WHERE id=@id`,
                    [
                        { name: 'fn', type: V, value: first_name }, { name: 'ln', type: V, value: last_name },
                        { name: 'dob', type: V, value: dob || null }, { name: 'g', type: V, value: gender || '' },
                        { name: 'c', type: V, value: contact || '' }, { name: 'e', type: V, value: email || '' },
                        { name: 'addr', type: V, value: address || '' }, { name: 'rv', type: V, value: reason_for_visit || '' },
                        { name: 'ct', type: V, value: client_type || '' }, { name: 'ms', type: V, value: marital_status || '' },
                        { name: 'idt', type: V, value: intake_date || null },
                        { name: 'id', type: V, value: req.params.id }
                    ]
                );
                const patientResult = await sq('SELECT * FROM patients WHERE id = @id', [{ name: 'id', type: V, value: req.params.id }]);
                const patient = patientResult.recordset[0];
                this.broadcast('data:update', { table: 'patients', action: 'update', record: patient });
                res.json({ success: true, patient });
            } catch (err) { res.status(500).json({ success: false, error: err.message }); }
        }); });

        this.app.delete('/api/patients/:id', (req, res, next) => { am(req, res, async () => {
            try {
                await sq('DELETE FROM patients WHERE id = @id', [{ name: 'id', type: V, value: req.params.id }]);
                this.broadcast('data:update', { table: 'patients', action: 'delete' });
                res.json({ success: true });
            } catch (err) { res.status(500).json({ success: false, error: err.message }); }
        }); });

        // Tests
        this.app.get('/api/tests', (req, res, next) => { am(req, res, async () => {
            try {
                const { patient_id, limit = 100, offset = 0 } = req.query;
                let query = 'SELECT * FROM tests';
                const params = [];
                if (patient_id) { query += ' WHERE patient_id = @pid'; params.push({ name: 'pid', type: V, value: patient_id }); }
                query += ` ORDER BY created_at DESC OFFSET ${parseInt(offset)} ROWS FETCH NEXT ${parseInt(limit)} ROWS ONLY`;
                const result = await sq(query, params);
                res.json({ success: true, data: result.recordset });
            } catch (err) { res.status(500).json({ success: false, error: err.message }); }
        }); });

        this.app.get('/api/tests/:id', (req, res, next) => { am(req, res, async () => {
            try {
                const result = await sq('SELECT * FROM tests WHERE id = @id', [{ name: 'id', type: V, value: req.params.id }]);
                if (!result.recordset[0]) return res.status(404).json({ success: false, error: 'Not found' });
                res.json({ success: true, data: result.recordset[0] });
            } catch (err) { res.status(500).json({ success: false, error: err.message }); }
        }); });

        this.app.post('/api/tests', (req, res, next) => { am(req, res, async () => { doc(req, res, async () => {
            try {
                const { patient_id, eye, machine_type, raw_data } = req.body;
                const id = uuidv4();
                const rd = typeof raw_data === 'string' ? raw_data : JSON.stringify(raw_data || {});
                await sq(`INSERT INTO tests (id, patient_id, eye, machine_type, raw_data, created_at, updated_at) VALUES (@id, @pid, @eye, @mt, @rd, GETDATE(), GETDATE())`,
                    [{ name: 'id', type: V, value: id }, { name: 'pid', type: V, value: patient_id }, { name: 'eye', type: V, value: eye || 'both' },
                     { name: 'mt', type: V, value: machine_type || '' }, { name: 'rd', type: V, value: rd }]);
                this.broadcast('data:update', { table: 'tests', action: 'create' });
                res.json({ success: true, id });
            } catch (err) { res.status(500).json({ success: false, error: err.message }); }
        }); }); });

        this.app.put('/api/tests/:id', (req, res, next) => { am(req, res, async () => { doc(req, res, async () => {
            try {
                const { eye, machine_type, raw_data } = req.body;
                await sq(`UPDATE tests SET eye=@eye, machine_type=@mt, raw_data=@rd, updated_at=GETDATE() WHERE id=@id`,
                    [{ name: 'eye', type: V, value: eye || 'both' }, { name: 'mt', type: V, value: machine_type || '' },
                     { name: 'rd', type: V, value: typeof raw_data === 'string' ? raw_data : JSON.stringify(raw_data || {}) },
                     { name: 'id', type: V, value: req.params.id }]);
                this.broadcast('data:update', { table: 'tests', action: 'update' });
                res.json({ success: true });
            } catch (err) { res.status(500).json({ success: false, error: err.message }); }
        }); }); });

        this.app.delete('/api/tests/:id', (req, res, next) => { am(req, res, async () => { doc(req, res, async () => {
            try {
                await sq('DELETE FROM tests WHERE id = @id', [{ name: 'id', type: V, value: req.params.id }]);
                this.broadcast('data:update', { table: 'tests', action: 'delete' });
                res.json({ success: true });
            } catch (err) { res.status(500).json({ success: false, error: err.message }); }
        }); }); });

        // Inventory
        this.app.get('/api/inventory', (req, res, next) => { am(req, res, async () => {
            try {
                const result = await sq('SELECT * FROM inventory ORDER BY item_name ASC');
                res.json({ success: true, data: result.recordset });
            } catch (err) { res.status(500).json({ success: false, error: err.message }); }
        }); });

        this.app.post('/api/inventory', (req, res, next) => { am(req, res, async () => { ao(req, res, async () => {
            try {
                const { item_code, item_name, category, quantity, unit, min_stock_level, expiry_date } = req.body;
                const id = uuidv4();
                await sq(`INSERT INTO inventory (id, item_code, item_name, category, quantity, unit, min_stock_level, expiry_date, created_at, updated_at) VALUES (@id, @code, @name, @cat, @qty, @unit, @min, @exp, GETDATE(), GETDATE())`,
                    [{ name: 'id', type: V, value: id }, { name: 'code', type: V, value: item_code || id }, { name: 'name', type: V, value: item_name || '' },
                     { name: 'cat', type: V, value: category || '' }, { name: 'qty', type: mssql.Int, value: quantity || 0 },
                     { name: 'unit', type: V, value: unit || '' }, { name: 'min', type: mssql.Int, value: min_stock_level || 0 },
                     { name: 'exp', type: V, value: expiry_date || null }]);
                this.broadcast('data:update', { table: 'inventory', action: 'create' });
                res.json({ success: true, id });
            } catch (err) { res.status(500).json({ success: false, error: err.message }); }
        }); }); });

        this.app.put('/api/inventory/:id', (req, res, next) => { am(req, res, async () => { ao(req, res, async () => {
            try {
                const { item_name, category, quantity, unit, min_stock_level, expiry_date } = req.body;
                await sq(`UPDATE inventory SET item_name=@name, category=@cat, quantity=@qty, unit=@unit, min_stock_level=@min, expiry_date=@exp, updated_at=GETDATE() WHERE id=@id`,
                    [{ name: 'name', type: V, value: item_name || '' }, { name: 'cat', type: V, value: category || '' },
                     { name: 'qty', type: mssql.Int, value: quantity || 0 }, { name: 'unit', type: V, value: unit || '' },
                     { name: 'min', type: mssql.Int, value: min_stock_level || 0 }, { name: 'exp', type: V, value: expiry_date || null },
                     { name: 'id', type: V, value: req.params.id }]);
                this.broadcast('data:update', { table: 'inventory', action: 'update' });
                res.json({ success: true });
            } catch (err) { res.status(500).json({ success: false, error: err.message }); }
        }); }); });

        this.app.delete('/api/inventory/:id', (req, res, next) => { am(req, res, async () => { ao(req, res, async () => {
            try {
                await sq('DELETE FROM inventory WHERE id = @id', [{ name: 'id', type: V, value: req.params.id }]);
                this.broadcast('data:update', { table: 'inventory', action: 'delete' });
                res.json({ success: true });
            } catch (err) { res.status(500).json({ success: false, error: err.message }); }
        }); }); });

        // Pharmacy
        this.app.get('/api/pharmacy/drugs', (req, res, next) => { am(req, res, async () => {
            try {
                const result = await sq('SELECT * FROM pharmacy_drugs ORDER BY drug_name ASC');
                res.json({ success: true, data: result.recordset });
            } catch (err) { res.status(500).json({ success: false, error: err.message }); }
        }); });

        this.app.post('/api/pharmacy/drugs', (req, res, next) => { am(req, res, async () => { doc(req, res, async () => {
            try {
                const { drug_code, drug_name, drug_form, strength, pack_size, unit_price, current_stock } = req.body;
                const id = uuidv4();
                await sq(`INSERT INTO pharmacy_drugs (id, drug_code, drug_name, drug_form, strength, pack_size, unit_price, current_stock, created_at, updated_at) VALUES (@id, @code, @name, @form, @str, @pack, @price, @stock, GETDATE(), GETDATE())`,
                    [{ name: 'id', type: V, value: id }, { name: 'code', type: V, value: drug_code || id }, { name: 'name', type: V, value: drug_name || '' },
                     { name: 'form', type: V, value: drug_form || '' }, { name: 'str', type: V, value: strength || '' },
                     { name: 'pack', type: V, value: pack_size || '' }, { name: 'price', type: V, value: unit_price || 0 },
                     { name: 'stock', type: mssql.Int, value: current_stock || 0 }]);
                this.broadcast('data:update', { table: 'pharmacy', action: 'create' });
                res.json({ success: true, id });
            } catch (err) { res.status(500).json({ success: false, error: err.message }); }
        }); }); });

        this.app.delete('/api/pharmacy/drugs/:id', (req, res, next) => { am(req, res, async () => { ao(req, res, async () => {
            try {
                await sq('DELETE FROM pharmacy_drugs WHERE id = @id', [{ name: 'id', type: V, value: req.params.id }]);
                this.broadcast('data:update', { table: 'pharmacy', action: 'delete' });
                res.json({ success: true });
            } catch (err) { res.status(500).json({ success: false, error: err.message }); }
        }); }); });

        this.app.get('/api/pharmacy/drugs/:id', (req, res, next) => { am(req, res, async () => {
            try {
                const result = await sq('SELECT * FROM pharmacy_drugs WHERE id = @id', [{ name: 'id', type: V, value: req.params.id }]);
                if (!result.recordset[0]) return res.status(404).json({ success: false, error: 'Not found' });
                res.json({ success: true, data: result.recordset[0] });
            } catch (err) { res.status(500).json({ success: false, error: err.message }); }
        }); });

        this.app.post('/api/pharmacy/dispense', (req, res, next) => { am(req, res, async () => {
            try {
                const { drugId, patientId, quantity, notes } = req.body;
                const dispId = uuidv4();
                const dispQty = quantity || 1;
                await sq(`INSERT INTO pharmacy_dispensations (id, drug_id, patient_id, quantity, unit_price, dispensed_by, notes, created_at)
                          SELECT @id, @drug, @pat, @qty, d.unit_price, @user, @notes, GETDATE() FROM pharmacy_drugs d WHERE d.id = @drug`,
                    [{ name: 'id', type: V, value: dispId }, { name: 'drug', type: V, value: drugId },
                     { name: 'pat', type: V, value: patientId }, { name: 'qty', type: mssql.Int, value: dispQty },
                     { name: 'user', type: V, value: req.user.userId }, { name: 'notes', type: V, value: notes || '' }]);
                await sq('UPDATE pharmacy_drugs SET current_stock = current_stock - @qty WHERE id = @drug',
                    [{ name: 'qty', type: mssql.Int, value: dispQty }, { name: 'drug', type: V, value: drugId }]);
                const drugResult = await sq('SELECT name, unit_price FROM pharmacy_drugs WHERE id = @id',
                    [{ name: 'id', type: V, value: drugId }]);
                if (drugResult.recordset[0]) {
                    const revenueId = uuidv4();
                    const { unit_price: unitPrice, name: drugName } = drugResult.recordset[0];
                    await sq(`INSERT INTO revenue (id, source, source_id, amount, currency, user_id, patient_id, description, timestamp)
                             VALUES (@id, @src, @srcId, @amt, 'NGN', @userId, @patId, @desc, GETDATE())`,
                        [{ name: 'id', type: V, value: revenueId }, { name: 'src', type: V, value: 'pharmacy' },
                         { name: 'srcId', type: V, value: dispId }, { name: 'amt', type: mssql.Decimal(12,2), value: parseFloat((unitPrice * dispQty).toFixed(2)) },
                         { name: 'userId', type: V, value: req.user.userId }, { name: 'patId', type: V, value: patientId },
                         { name: 'desc', type: V, value: `${drugName} dispensed x${dispQty}` }]);
                }
                this.broadcast('data:update', { table: 'pharmacy', action: 'dispense' });
                this.broadcast('data:update', { table: 'dashboard', action: 'refresh' });
                this.broadcast('data:update', { table: 'revenue', action: 'create' });
                res.json({ success: true, id: dispId });
            } catch (err) { res.status(500).json({ success: false, error: err.message }); }
        }); });

        // Prescriptions
        this.app.get('/api/prescriptions/pending', (req, res, next) => { am(req, res, async () => {
            try {
                const result = await sq(
                    `SELECT p.*, pt.first_name+' '+pt.last_name as patient_name, u.first_name+' '+u.last_name as doctor_name, d.drug_name
                     FROM prescriptions p JOIN patients pt ON p.patient_id=pt.id JOIN users u ON p.doctor_id=u.id JOIN pharmacy_drugs d ON p.drug_id=d.id WHERE p.status='pending' ORDER BY p.created_at DESC`);
                res.json({ success: true, data: result.recordset });
            } catch (err) { res.status(500).json({ success: false, error: err.message }); }
        }); });

        this.app.post('/api/prescriptions', (req, res, next) => { am(req, res, async () => { doc(req, res, async () => {
            try {
                const { patient_id, drug_id, quantity, instructions } = req.body;
                const id = uuidv4();
                await sq(`INSERT INTO prescriptions (id, patient_id, doctor_id, drug_id, quantity, instructions, status, created_at, updated_at) VALUES (@id, @pid, @did, @drgid, @qty, @inst, 'pending', GETDATE(), GETDATE())`,
                    [{ name: 'id', type: V, value: id }, { name: 'pid', type: V, value: patient_id }, { name: 'did', type: V, value: req.user.userId },
                     { name: 'drgid', type: V, value: drug_id }, { name: 'qty', type: mssql.Int, value: quantity }, { name: 'inst', type: V, value: instructions || '' }]);
                this.broadcast('data:update', { table: 'prescriptions', action: 'create' });
                res.json({ success: true, id });
            } catch (err) { res.status(500).json({ success: false, error: err.message }); }
        }); }); });

        this.app.put('/api/prescriptions/:id/status', (req, res, next) => { am(req, res, async () => {
            try {
                const { status } = req.body;
                await sq('UPDATE prescriptions SET status=@s, updated_at=GETDATE() WHERE id=@id', [
                    { name: 's', type: V, value: status },
                    { name: 'id', type: V, value: req.params.id }
                ]);
                this.broadcast('data:update', { table: 'prescriptions', action: 'update' });
                res.json({ success: true });
            } catch (err) { res.status(500).json({ success: false, error: err.message }); }
        }); });

        // Chat
        this.app.get('/api/chat/:otherUserId', (req, res, next) => { am(req, res, async () => {
            try {
                const result = await sq(
                    `SELECT * FROM chat WHERE (sender_id=@me AND receiver_id=@other) OR (sender_id=@other AND receiver_id=@me) ORDER BY timestamp ASC`,
                    [{ name: 'me', type: V, value: req.user.userId }, { name: 'other', type: V, value: req.params.otherUserId }]);
                res.json({ success: true, data: result.recordset });
            } catch (err) { res.status(500).json({ success: false, error: err.message }); }
        }); });

        this.app.post('/api/chat', (req, res, next) => { am(req, res, async () => {
            try {
                const { receiver_id, message_text, attachment, reply_to_id } = req.body;
                const id = uuidv4();
                await sq(`INSERT INTO chat (id, sender_id, receiver_id, message_text, attachment, reply_to_id, status, timestamp) VALUES (@id, @sid, @rid, @msg, @att, @reply, 'unread', GETDATE())`,
                    [{ name: 'id', type: V, value: id }, { name: 'sid', type: V, value: req.user.userId }, { name: 'rid', type: V, value: receiver_id },
                     { name: 'msg', type: V, value: message_text }, { name: 'att', type: V, value: attachment || null }, { name: 'reply', type: V, value: reply_to_id || null }]);
                this.sendToUser(receiver_id, 'chat:message', { id, sender_id: req.user.userId, message_text, attachment, timestamp: new Date().toISOString() });
                res.json({ success: true, id });
            } catch (err) { res.status(500).json({ success: false, error: err.message }); }
        }); });

        this.app.post('/api/chat/mark-read', (req, res, next) => { am(req, res, async () => {
            try {
                const { otherUserId } = req.body;
                await sq(`UPDATE chat SET status='read' WHERE sender_id=@other AND receiver_id=@me AND status='unread'`,
                    [{ name: 'other', type: V, value: otherUserId }, { name: 'me', type: V, value: req.user.userId }]);
                res.json({ success: true });
            } catch (err) { res.status(500).json({ success: false, error: err.message }); }
        }); });

        // Presence
        this.app.get('/api/presence/online', (req, res, next) => { am(req, res, async () => {
            try {
                const result = await sq(`SELECT up.*, u.first_name, u.last_name, u.email, u.role FROM user_presence up JOIN users u ON up.user_id=u.id WHERE up.is_online=1`);
                res.json({ success: true, users: result.recordset });
            } catch (err) { res.status(500).json({ success: false, error: err.message }); }
        });         });

        // Settings
        this.app.get('/api/settings', (req, res, next) => { am(req, res, async () => {
            try {
                const { key, userId } = req.query;
                const uid = userId || req.user.userId;
                if (key) {
                    const result = await sq(
                        'SELECT * FROM settings WHERE setting_key=@key AND (user_id=@uid OR user_id IS NULL) ORDER BY user_id DESC',
                        [{ name: 'key', type: V, value: key }, { name: 'uid', type: V, value: uid }]
                    );
                    const row = result.recordset[0];
                    return res.json({ success: true, data: row ? { key: row.setting_key, value: row.setting_value, user_id: row.user_id } : null });
                }
                const result = await sq('SELECT * FROM settings WHERE user_id=@uid OR user_id IS NULL', [{ name: 'uid', type: V, value: uid }]);
                res.json({ success: true, settings: result.recordset.map(row => ({ key: row.setting_key, value: row.setting_value, user_id: row.user_id })) });
            } catch (err) { res.status(500).json({ success: false, error: err.message }); }
        }); });

        this.app.put('/api/settings', (req, res, next) => { am(req, res, async () => {
            try {
                const { key, value, userId } = req.body;
                const uid = userId || req.user.userId;
                await sq(
                    `IF EXISTS (SELECT 1 FROM settings WHERE setting_key=@key AND user_id=@uid)
                       UPDATE settings SET setting_value=@val, updated_at=GETDATE() WHERE setting_key=@key AND user_id=@uid
                     ELSE
                       INSERT INTO settings (id,setting_key,setting_value,user_id,created_at,updated_at) VALUES (@id,@key,@val,@uid,GETDATE(),GETDATE())`,
                    [{ name: 'id', type: V, value: uuidv4() }, { name: 'key', type: V, value: key }, { name: 'val', type: V, value: value }, { name: 'uid', type: V, value: uid }]
                );
                this.broadcast('data:update', { table: 'settings', action: 'update', userId: uid });
                res.json({ success: true });
            } catch (err) { res.status(500).json({ success: false, error: err.message }); }
        }); });

        // Dashboard
        this.app.get('/api/dashboard/stats', (req, res, next) => { am(req, res, async () => {
            try {
                const today = new Date().toISOString().split('T')[0];
                const [pc, tc, rt, rm, pp] = await Promise.all([
                    sq('SELECT COUNT(*) as cnt FROM patients'),
                    sq('SELECT COUNT(*) as cnt FROM tests'),
                    sq('SELECT COALESCE(SUM(amount),0) as total FROM revenue WHERE CAST(timestamp AS DATE)=@today', [{ name: 'today', type: V, value: today }]),
                    sq('SELECT COALESCE(SUM(amount),0) as total FROM revenue WHERE MONTH(timestamp)=MONTH(GETDATE()) AND YEAR(timestamp)=YEAR(GETDATE())'),
                    sq("SELECT COUNT(*) as cnt FROM prescriptions WHERE status='pending'")
                ]);
                res.json({ success: true, stats: {
                    totalPatients: pc.recordset[0].cnt,
                    totalTests: tc.recordset[0].cnt,
                    todayRevenue: rt.recordset[0].total,
                    monthlyRevenue: rm.recordset[0].total,
                    pendingPrescriptions: pp.recordset[0].cnt
                }});
            } catch (err) { res.status(500).json({ success: false, error: err.message }); }
        }); });

        // Activity logs
        this.app.get('/api/activity-logs', (req, res, next) => { am(req, res, async () => {
            try {
                const { limit = 200 } = req.query;
                const result = await sq(`SELECT al.*, u.first_name+' '+u.last_name as user_name FROM activity_logs al JOIN users u ON al.user_id=u.id ORDER BY al.timestamp DESC OFFSET 0 ROWS FETCH NEXT ${parseInt(limit)} ROWS ONLY`);
                res.json({ success: true, data: result.recordset });
            } catch (err) { res.status(500).json({ success: false, error: err.message }); }
        }); });

        this.app.post('/api/activity-logs', (req, res, next) => { am(req, res, async () => {
            try {
                const { action_type, entity_type, entity_id, description, ip_address, user_agent } = req.body;
                const id = uuidv4();
                await sq(`INSERT INTO activity_logs (id, user_id, action_type, entity_type, entity_id, description, ip_address, user_agent, timestamp) VALUES (@id, @uid, @at, @et, @eid, @desc, @ip, @ua, GETDATE())`,
                    [{ name: 'id', type: V, value: id }, { name: 'uid', type: V, value: req.user.userId },
                     { name: 'at', type: V, value: action_type }, { name: 'et', type: V, value: entity_type },
                     { name: 'eid', type: V, value: entity_id || null }, { name: 'desc', type: V, value: description },
                     { name: 'ip', type: V, value: ip_address || '' }, { name: 'ua', type: V, value: user_agent || '' }]);
                res.json({ success: true, id });
            } catch (err) { res.status(500).json({ success: false, error: err.message }); }
        }); });

        // Reports
        this.app.get('/api/reports', (req, res, next) => { am(req, res, async () => {
            try {
                const { patient_id } = req.query;
                const result = patient_id
                    ? await sq('SELECT * FROM reports WHERE patient_id=@pid ORDER BY created_at DESC', [{ name: 'pid', type: V, value: patient_id }])
                    : await sq('SELECT * FROM reports ORDER BY created_at DESC');
                res.json({ success: true, data: result.recordset });
            } catch (err) { res.status(500).json({ success: false, error: err.message }); }
        }); });

        this.app.post('/api/reports', (req, res, next) => { am(req, res, async () => {
            try {
                const { patient_id, report_type, title, report_file } = req.body;
                const id = uuidv4();
                await sq(`INSERT INTO reports (id, patient_id, report_type, title, report_file, created_at, updated_at) VALUES (@id, @pid, @type, @title, @file, GETDATE(), GETDATE())`,
                    [{ name: 'id', type: V, value: id }, { name: 'pid', type: V, value: patient_id },
                     { name: 'type', type: V, value: report_type || 'general' }, { name: 'title', type: V, value: title || '' },
                     { name: 'file', type: V, value: report_file || '' }]);
                this.broadcast('data:update', { table: 'reports', action: 'create' });
                res.json({ success: true, id });
            } catch (err) { res.status(500).json({ success: false, error: err.message }); }
        }); });

        this.app.delete('/api/reports/:id', (req, res, next) => { am(req, res, async () => {
            try {
                await sq('DELETE FROM reports WHERE id = @id', [{ name: 'id', type: V, value: req.params.id }]);
                this.broadcast('data:update', { table: 'reports', action: 'delete' });
                res.json({ success: true });
            } catch (err) { res.status(500).json({ success: false, error: err.message }); }
        }); });

        // Notifications
        this.app.get('/api/notifications', (req, res, next) => { am(req, res, async () => {
            try {
                const result = await sq('SELECT * FROM notifications WHERE user_id = @uid ORDER BY created_at DESC', [{ name: 'uid', type: V, value: req.user.userId }]);
                res.json({ success: true, data: result.recordset });
            } catch (err) { res.status(500).json({ success: false, error: err.message }); }
        }); });

        this.app.put('/api/notifications/:id/read', (req, res, next) => { am(req, res, async () => {
            try {
                await sq('UPDATE notifications SET is_read = 1, read_at = GETDATE() WHERE id = @id', [{ name: 'id', type: V, value: req.params.id }]);
                res.json({ success: true });
            } catch (err) { res.status(500).json({ success: false, error: err.message }); }
        }); });

        // Presence
        this.app.post('/api/presence/set-online', (req, res, next) => { am(req, res, async () => {
            try {
                await sq('UPDATE user_presence SET is_online = 1, last_seen = GETDATE() WHERE user_id = @uid', [{ name: 'uid', type: V, value: req.user.userId }]);
                this.broadcast('presence', { userId: req.user.userId, status: 'online' });
                res.json({ success: true });
            } catch (err) { res.status(500).json({ success: false, error: err.message }); }
        }); });

        this.app.post('/api/presence/set-offline', (req, res, next) => { am(req, res, async () => {
            try {
                await sq('UPDATE user_presence SET is_online = 0, last_seen = GETDATE() WHERE user_id = @uid', [{ name: 'uid', type: V, value: req.user.userId }]);
                this.broadcast('presence', { userId: req.user.userId, status: 'offline' });
                res.json({ success: true });
            } catch (err) { res.status(500).json({ success: false, error: err.message }); }
        }); });

        // Users (admin)
        this.app.get('/api/users', (req, res, next) => { am(req, res, async () => {
            try {
                const result = await sq('SELECT id, first_name, last_name, email, role, phone_number, gender, status, created_at FROM users ORDER BY created_at DESC');
                res.json({ success: true, data: result.recordset });
            } catch (err) { res.status(500).json({ success: false, error: err.message }); }
        }); });

        this.app.post('/api/users', (req, res, next) => { am(req, res, async () => { ao(req, res, async () => {
            try {
                const { email, password, first_name, last_name, role, phone_number, gender } = req.body;
                const hash = await bcrypt.hash(password, 10);
                const id = uuidv4();
                await sq(`INSERT INTO users (id, first_name, last_name, email, password_hash, role, phone_number, gender, status, created_at, updated_at) VALUES (@id, @fn, @ln, @email, @hash, @role, @phone, @g, 'active', GETDATE(), GETDATE())`,
                    [{ name: 'id', type: V, value: id }, { name: 'fn', type: V, value: first_name }, { name: 'ln', type: V, value: last_name },
                     { name: 'email', type: V, value: email }, { name: 'hash', type: V, value: hash },
                     { name: 'role', type: V, value: role }, { name: 'phone', type: V, value: phone_number || '' }, { name: 'g', type: V, value: gender || '' }]);
                this.broadcast('data:update', { table: 'users', action: 'create' });
                res.json({ success: true, id });
            } catch (err) { res.status(500).json({ success: false, error: err.message }); }
        }); }); });

        this.app.put('/api/users/:id', (req, res, next) => { am(req, res, async () => { ao(req, res, async () => {
            try {
                const { first_name, last_name, email, role, phone_number, gender, password } = req.body;
                let query = `UPDATE users SET first_name=@fn, last_name=@ln, email=@email, role=@role, phone_number=@phone, gender=@g, updated_at=GETDATE()`;
                const params = [
                    { name: 'fn', type: V, value: first_name || '' }, { name: 'ln', type: V, value: last_name || '' },
                    { name: 'email', type: V, value: email || '' }, { name: 'role', type: V, value: role || '' },
                    { name: 'phone', type: V, value: phone_number || '' }, { name: 'g', type: V, value: gender || '' },
                    { name: 'id', type: V, value: req.params.id }
                ];
                if (password) {
                    const hash = await bcrypt.hash(password, 10);
                    query = `UPDATE users SET first_name=@fn, last_name=@ln, email=@email, role=@role, phone_number=@phone, gender=@g, password_hash=@hash, updated_at=GETDATE()`;
                    params.unshift({ name: 'hash', type: V, value: hash });
                }
                query += ' WHERE id = @id';
                await sq(query, params);
                this.broadcast('data:update', { table: 'users', action: 'update' });
                res.json({ success: true });
            } catch (err) { res.status(500).json({ success: false, error: err.message }); }
        }); }); });

        this.app.delete('/api/users/:id', (req, res, next) => { am(req, res, async () => { ao(req, res, async () => {
            try {
                await sq('DELETE FROM users WHERE id = @id', [{ name: 'id', type: V, value: req.params.id }]);
                this.broadcast('data:update', { table: 'users', action: 'delete' });
                res.json({ success: true });
            } catch (err) { res.status(500).json({ success: false, error: err.message }); }
        }); }); });

        // Server status
        this.app.get('/api/server/status', (req, res, next) => { am(req, res, async () => { ao(req, res, async () => {
            res.json({ success: true, status: this.getStatus() });
        }); }); });
    }
}

module.exports = new ServerManager();
