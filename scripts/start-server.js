const express = require('express');
const cors = require('cors');
const http = require('http');
const WebSocket = require('ws');
const mssql = require('mssql');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

const JWT_SECRET = process.env.JWT_SECRET || 'eye-clinic-secret-key-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'eye-clinic-refresh-secret-change-in-production';
const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL = '7d';

const DEFAULT_SQL_CONFIG = {
  server: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'eye_clinic_db',
  user: process.env.DB_USER || '',
  password: process.env.DB_PASSWORD || '',
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true,
    integratedSecurity: true
  }
};

let sqlConfig = { ...DEFAULT_SQL_CONFIG };
let pool = null;
const connectedClients = new Map();

function loadConfig() {
  const configPath = path.join(process.env.APPDATA || process.env.HOME || '', 'KORENE_EyeClinic', 'server-config.json');
  try {
    if (fs.existsSync(configPath)) {
      const loaded = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      sqlConfig = {
        server: loaded.sql_host || sqlConfig.server,
        port: parseInt(loaded.sql_port || sqlConfig.port),
        database: loaded.sql_database || sqlConfig.database,
        user: loaded.sql_user || sqlConfig.user,
        password: loaded.sql_password || sqlConfig.password,
        options: {
          encrypt: false,
          trustServerCertificate: true,
          enableArithAbort: true
        }
      };
    }
  } catch (e) {
    console.warn('[Config] Could not load server-config.json, using defaults/env vars');
  }
}

async function sqlQuery(query, params = []) {
  if (!pool) throw new Error('Database not connected');
  const request = pool.request();
  for (const p of params) {
    request.input(p.name, p.type, p.value);
  }
  const result = await request.query(query);
  return result;
}

async function sqlConnect() {
  pool = await mssql.connect(sqlConfig);
  console.log(`[DB] Connected to SQL Server: ${sqlConfig.server}:${sqlConfig.port}/${sqlConfig.database}`);
}

function generateTokens(user) {
  const accessToken = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_TTL }
  );
  const refreshToken = jwt.sign(
    { userId: user.id, type: 'refresh' },
    JWT_REFRESH_SECRET,
    { expiresIn: REFRESH_TOKEN_TTL }
  );
  return { accessToken, refreshToken };
}

function verifyAccess(token) {
  try { return jwt.verify(token, JWT_SECRET); }
  catch { return null; }
}

function verifyRefresh(token) {
  try { return jwt.verify(token, JWT_REFRESH_SECRET); }
  catch { return null; }
}

const app = express();
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws, req) => {
  const clientId = uuidv4();
  const clientIp = req.socket.remoteAddress;
  connectedClients.set(clientId, { id: clientId, ip: clientIp, ws, userId: null });

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      switch (data.type) {
        case 'auth':
          connectedClients.get(clientId).userId = data.userId;
          broadcast('presence', { userId: data.userId, status: 'online', deviceName: data.deviceName });
          break;
        case 'ping':
          ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
          break;
      }
    } catch {}
  });

  ws.on('close', () => {
    const client = connectedClients.get(clientId);
    if (client?.userId) broadcast('presence', { userId: client.userId, status: 'offline' });
    connectedClients.delete(clientId);
  });
});

function broadcast(event, data) {
  const msg = JSON.stringify({ type: event, data, timestamp: Date.now() });
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) client.send(msg);
  });
}

function sendToUser(userId, event, data) {
  const msg = JSON.stringify({ type: event, data, timestamp: Date.now() });
  connectedClients.forEach(client => {
    if (client.userId === userId && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(msg);
    }
  });
}

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'No token provided' });
  }
  const token = header.split(' ')[1];
  const decoded = verifyAccess(token);
  if (!decoded) return res.status(401).json({ success: false, error: 'Invalid or expired token' });
  req.user = decoded;
  next();
}

function adminOnly(req, res, next) {
  if (req.user.role !== 'admin') return res.status(403).json({ success: false, error: 'Admin access required' });
  next();
}

function doctorOnly(req, res, next) {
  if (!['admin', 'doctor'].includes(req.user.role)) return res.status(403).json({ success: false, error: 'Doctor access required' });
  next();
}

// ─── AUTH ───────────────────────────────────────────────────────────────────────

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, error: 'Email and password required' });

    const result = await sqlQuery('SELECT * FROM users WHERE email = @email', [
      { name: 'email', type: mssql.VarChar, value: email }
    ]);
    const user = result.recordset[0];
    if (!user) return res.status(401).json({ success: false, error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ success: false, error: 'Invalid credentials' });

    if (user.status !== 'active') return res.status(403).json({ success: false, error: 'Account is inactive' });

    const tokens = generateTokens(user);

    await sqlQuery('UPDATE user_presence SET is_online = 1, last_seen = GETDATE() WHERE user_id = @uid', [
      { name: 'uid', type: mssql.VarChar, value: user.id }
    ]);

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
  } catch (err) {
    console.error('[Auth] Login error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/auth/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ success: false, error: 'Refresh token required' });

    const decoded = verifyRefresh(refreshToken);
    if (!decoded) return res.status(401).json({ success: false, error: 'Invalid refresh token' });

    const result = await sqlQuery('SELECT * FROM users WHERE id = @id', [
      { name: 'id', type: mssql.VarChar, value: decoded.userId }
    ]);
    const user = result.recordset[0];
    if (!user) return res.status(401).json({ success: false, error: 'User not found' });

    const tokens = generateTokens(user);
    res.json({ success: true, accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/auth/logout', authMiddleware, async (req, res) => {
  try {
    await sqlQuery('UPDATE user_presence SET is_online = 0, last_seen = GETDATE() WHERE user_id = @uid', [
      { name: 'uid', type: mssql.VarChar, value: req.user.userId }
    ]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/auth/me', authMiddleware, async (req, res) => {
  try {
    const result = await sqlQuery('SELECT id, first_name, last_name, email, role, phone_number, gender FROM users WHERE id = @id', [
      { name: 'id', type: mssql.VarChar, value: req.user.userId }
    ]);
    const user = result.recordset[0];
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    res.json({
      success: true,
      user: {
        id: user.id,
        name: `${user.first_name} ${user.last_name}`.trim(),
        email: user.email,
        role: user.role,
        phone: user.phone_number,
        gender: user.gender
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── PATIENTS ──────────────────────────────────────────────────────────────────

app.get('/api/patients', authMiddleware, async (req, res) => {
  try {
    const { search, limit = 100, offset = 0 } = req.query;
    let query = 'SELECT * FROM patients';
    const params = [];
    if (search) {
      query += ' WHERE first_name LIKE @s OR last_name LIKE @s OR patient_id LIKE @s OR email LIKE @s';
      params.push({ name: 's', type: mssql.VarChar, value: `%${search}%` });
    }
    query += ` ORDER BY created_at DESC OFFSET ${parseInt(offset)} ROWS FETCH NEXT ${parseInt(limit)} ROWS ONLY`;
    const result = await sqlQuery(query, params);
    res.json({ success: true, data: result.recordset, total: result.recordset.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/patients/:id', authMiddleware, async (req, res) => {
  try {
    const result = await sqlQuery('SELECT * FROM patients WHERE id = @id', [
      { name: 'id', type: mssql.VarChar, value: req.params.id }
    ]);
    if (!result.recordset[0]) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: result.recordset[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/patients', authMiddleware, async (req, res) => {
  try {
    const { patient_id, first_name, last_name, dob, gender, contact, email, address, reason_for_visit, client_type, marital_status, intake_date } = req.body;
    const id = uuidv4();
    await sqlQuery(
      `INSERT INTO patients (id, patient_id, first_name, last_name, dob, gender, contact, email, address, reason_for_visit, client_type, marital_status, intake_date, created_at, updated_at)
       VALUES (@id, @pid, @fn, @ln, @dob, @g, @c, @e, @addr, @rv, @ct, @ms, @idt, GETDATE(), GETDATE())`,
      [
        { name: 'id', type: mssql.VarChar, value: id },
        { name: 'pid', type: mssql.VarChar, value: patient_id || id },
        { name: 'fn', type: mssql.VarChar, value: first_name },
        { name: 'ln', type: mssql.VarChar, value: last_name },
        { name: 'dob', type: mssql.VarChar, value: dob || null },
        { name: 'g', type: mssql.VarChar, value: gender || '' },
        { name: 'c', type: mssql.VarChar, value: contact || '' },
        { name: 'e', type: mssql.VarChar, value: email || '' },
        { name: 'addr', type: mssql.VarChar, value: address || '' },
        { name: 'rv', type: mssql.VarChar, value: reason_for_visit || '' },
        { name: 'ct', type: mssql.VarChar, value: client_type || '' },
        { name: 'ms', type: mssql.VarChar, value: marital_status || '' },
        { name: 'idt', type: mssql.VarChar, value: intake_date || null }
      ]
    );
    const patientResult = await sqlQuery('SELECT * FROM patients WHERE id = @id', [{ name: 'id', type: mssql.VarChar, value: id }]);
    const patient = patientResult.recordset[0];
    broadcast('data:update', { table: 'patients', action: 'create', record: patient });
    res.json({ success: true, id, patient });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/patients/:id', authMiddleware, async (req, res) => {
  try {
    const { first_name, last_name, dob, gender, contact, email, address, reason_for_visit, client_type, marital_status, intake_date } = req.body;
    await sqlQuery(
      `UPDATE patients SET first_name=@fn, last_name=@ln, dob=@dob, gender=@g, contact=@c, email=@e, address=@addr, reason_for_visit=@rv, client_type=@ct, marital_status=@ms, intake_date=@idt, updated_at=GETDATE() WHERE id=@id`,
      [
        { name: 'fn', type: mssql.VarChar, value: first_name },
        { name: 'ln', type: mssql.VarChar, value: last_name },
        { name: 'dob', type: mssql.VarChar, value: dob || null },
        { name: 'g', type: mssql.VarChar, value: gender || '' },
        { name: 'c', type: mssql.VarChar, value: contact || '' },
        { name: 'e', type: mssql.VarChar, value: email || '' },
        { name: 'addr', type: mssql.VarChar, value: address || '' },
        { name: 'rv', type: mssql.VarChar, value: reason_for_visit || '' },
        { name: 'ct', type: mssql.VarChar, value: client_type || '' },
        { name: 'ms', type: mssql.VarChar, value: marital_status || '' },
        { name: 'idt', type: mssql.VarChar, value: intake_date || null },
        { name: 'id', type: mssql.VarChar, value: req.params.id }
      ]
    );
    const patientResult = await sqlQuery('SELECT * FROM patients WHERE id = @id', [{ name: 'id', type: mssql.VarChar, value: req.params.id }]);
    const patient = patientResult.recordset[0];
    broadcast('data:update', { table: 'patients', action: 'update', record: patient });
    res.json({ success: true, patient });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/patients/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    await sqlQuery('DELETE FROM patients WHERE id = @id', [
      { name: 'id', type: mssql.VarChar, value: req.params.id }
    ]);
    broadcast('data:update', { table: 'patients', action: 'delete' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── TESTS ──────────────────────────────────────────────────────────────────────

app.get('/api/tests', authMiddleware, async (req, res) => {
  try {
    const { patient_id, limit = 100, offset = 0 } = req.query;
    let query = 'SELECT * FROM tests';
    const params = [];
    if (patient_id) {
      query += ' WHERE patient_id = @pid';
      params.push({ name: 'pid', type: mssql.VarChar, value: patient_id });
    }
    query += ` ORDER BY created_at DESC OFFSET ${parseInt(offset)} ROWS FETCH NEXT ${parseInt(limit)} ROWS ONLY`;
    const result = await sqlQuery(query, params);
    res.json({ success: true, data: result.recordset });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/tests/:id', authMiddleware, async (req, res) => {
  try {
    const result = await sqlQuery('SELECT * FROM tests WHERE id = @id', [
      { name: 'id', type: mssql.VarChar, value: req.params.id }
    ]);
    if (!result.recordset[0]) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: result.recordset[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/tests', doctorOnly, async (req, res) => {
  try {
    const { patient_id, eye, machine_type, raw_data } = req.body;
    const id = uuidv4();
    await sqlQuery(
      `INSERT INTO tests (id, patient_id, eye, machine_type, raw_data, created_at, updated_at) VALUES (@id, @pid, @eye, @mt, @rd, GETDATE(), GETDATE())`,
      [
        { name: 'id', type: mssql.VarChar, value: id },
        { name: 'pid', type: mssql.VarChar, value: patient_id },
        { name: 'eye', type: mssql.VarChar, value: eye || 'both' },
        { name: 'mt', type: mssql.VarChar, value: machine_type || '' },
        { name: 'rd', type: mssql.VarChar, value: typeof raw_data === 'string' ? raw_data : JSON.stringify(raw_data) }
      ]
    );
    broadcast('data:update', { table: 'tests', action: 'create' });
    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/tests/:id', doctorOnly, async (req, res) => {
  try {
    const { eye, machine_type, raw_data } = req.body;
    await sqlQuery(
      `UPDATE tests SET eye=@eye, machine_type=@mt, raw_data=@rd, updated_at=GETDATE() WHERE id=@id`,
      [
        { name: 'eye', type: mssql.VarChar, value: eye || 'both' },
        { name: 'mt', type: mssql.VarChar, value: machine_type || '' },
        { name: 'rd', type: mssql.VarChar, value: typeof raw_data === 'string' ? raw_data : JSON.stringify(raw_data || {}) },
        { name: 'id', type: mssql.VarChar, value: req.params.id }
      ]
    );
    broadcast('data:update', { table: 'tests', action: 'update' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/tests/:id', doctorOnly, async (req, res) => {
  try {
    await sqlQuery('DELETE FROM tests WHERE id = @id', [
      { name: 'id', type: mssql.VarChar, value: req.params.id }
    ]);
    broadcast('data:update', { table: 'tests', action: 'delete' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── INVENTORY ─────────────────────────────────────────────────────────────────

app.get('/api/inventory', authMiddleware, async (req, res) => {
  try {
    const result = await sqlQuery('SELECT * FROM inventory ORDER BY item_name ASC');
    res.json({ success: true, data: result.recordset });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/inventory', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { item_code, item_name, category, quantity, unit, min_stock_level, expiry_date } = req.body;
    const id = uuidv4();
    await sqlQuery(
      `INSERT INTO inventory (id, item_code, item_name, category, quantity, unit, min_stock_level, expiry_date, created_at, updated_at)
       VALUES (@id, @code, @name, @cat, @qty, @unit, @min, @exp, GETDATE(), GETDATE())`,
      [
        { name: 'id', type: mssql.VarChar, value: id },
        { name: 'code', type: mssql.VarChar, value: item_code || id },
        { name: 'name', type: mssql.VarChar, value: item_name || '' },
        { name: 'cat', type: mssql.VarChar, value: category || '' },
        { name: 'qty', type: mssql.Int, value: quantity || 0 },
        { name: 'unit', type: mssql.VarChar, value: unit || '' },
        { name: 'min', type: mssql.Int, value: min_stock_level || 0 },
        { name: 'exp', type: mssql.VarChar, value: expiry_date || null }
      ]
    );
    broadcast('data:update', { table: 'inventory', action: 'create' });
    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/inventory/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { item_name, category, quantity, unit, min_stock_level, expiry_date } = req.body;
    await sqlQuery(
      `UPDATE inventory SET item_name=@name, category=@cat, quantity=@qty, unit=@unit, min_stock_level=@min, expiry_date=@exp, updated_at=GETDATE() WHERE id=@id`,
      [
        { name: 'name', type: mssql.VarChar, value: item_name || '' },
        { name: 'cat', type: mssql.VarChar, value: category || '' },
        { name: 'qty', type: mssql.Int, value: quantity || 0 },
        { name: 'unit', type: mssql.VarChar, value: unit || '' },
        { name: 'min', type: mssql.Int, value: min_stock_level || 0 },
        { name: 'exp', type: mssql.VarChar, value: expiry_date || null },
        { name: 'id', type: mssql.VarChar, value: req.params.id }
      ]
    );
    broadcast('data:update', { table: 'inventory', action: 'update' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/inventory/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    await sqlQuery('DELETE FROM inventory WHERE id = @id', [
      { name: 'id', type: mssql.VarChar, value: req.params.id }
    ]);
    broadcast('data:update', { table: 'inventory', action: 'delete' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── PHARMACY ──────────────────────────────────────────────────────────────────

app.get('/api/pharmacy/drugs', authMiddleware, async (req, res) => {
  try {
    const result = await sqlQuery('SELECT * FROM pharmacy_drugs ORDER BY drug_name ASC');
    res.json({ success: true, data: result.recordset });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/pharmacy/drugs', authMiddleware, doctorOnly, async (req, res) => {
  try {
    const { drug_code, drug_name, drug_form, strength, pack_size, unit_price, current_stock } = req.body;
    const id = uuidv4();
    await sqlQuery(
      `INSERT INTO pharmacy_drugs (id, drug_code, drug_name, drug_form, strength, pack_size, unit_price, current_stock, created_at, updated_at)
       VALUES (@id, @code, @name, @form, @str, @pack, @price, @stock, GETDATE(), GETDATE())`,
      [
        { name: 'id', type: mssql.VarChar, value: id },
        { name: 'code', type: mssql.VarChar, value: drug_code || id },
        { name: 'name', type: mssql.VarChar, value: drug_name || '' },
        { name: 'form', type: mssql.VarChar, value: drug_form || '' },
        { name: 'str', type: mssql.VarChar, value: strength || '' },
        { name: 'pack', type: mssql.VarChar, value: pack_size || '' },
        { name: 'price', type: mssql.Decimal, value: unit_price || 0 },
        { name: 'stock', type: mssql.Int, value: current_stock || 0 }
      ]
    );
    broadcast('data:update', { table: 'pharmacy', action: 'create' });
    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/pharmacy/drugs/:id', authMiddleware, async (req, res) => {
  try {
    const result = await sqlQuery('SELECT * FROM pharmacy_drugs WHERE id = @id', [
      { name: 'id', type: mssql.VarChar, value: req.params.id }
    ]);
    if (!result.recordset[0]) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: result.recordset[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/pharmacy/dispense', authMiddleware, async (req, res) => {
  try {
    const { drugId, patientId, quantity, notes } = req.body;
    const dispId = uuidv4();
    const dispQty = quantity || 1;
    const dispResult = await sqlQuery(
      `INSERT INTO pharmacy_dispensations (id, drug_id, patient_id, quantity, unit_price, dispensed_by, notes, created_at)
       SELECT @id, @drug, @pat, @qty, d.unit_price, @user, @notes, GETDATE()
       FROM pharmacy_drugs d WHERE d.id = @drug`,
      [
        { name: 'id', type: mssql.VarChar, value: dispId },
        { name: 'drug', type: mssql.VarChar, value: drugId },
        { name: 'pat', type: mssql.VarChar, value: patientId },
        { name: 'qty', type: mssql.Int, value: dispQty },
        { name: 'user', type: mssql.VarChar, value: req.user.userId },
        { name: 'notes', type: mssql.VarChar, value: notes || '' }
      ]
    );
    await sqlQuery('UPDATE pharmacy_drugs SET current_stock = current_stock - @qty WHERE id = @drug', [
      { name: 'qty', type: mssql.Int, value: dispQty },
      { name: 'drug', type: mssql.VarChar, value: drugId }
    ]);
    const drugResult = await sqlQuery('SELECT name, unit_price FROM pharmacy_drugs WHERE id = @id', [
      { name: 'id', type: mssql.VarChar, value: drugId }
    ]);
    if (drugResult.recordset[0]) {
      const revenueId = uuidv4();
      const { unit_price: unitPrice } = drugResult.recordset[0];
      const drugName = drugResult.recordset[0].name;
      await sqlQuery(
        `INSERT INTO revenue (id, source, source_id, amount, currency, user_id, patient_id, description, timestamp)
         VALUES (@id, @src, @srcId, @amt, 'NGN', @userId, @patId, @desc, GETDATE())`,
        [
          { name: 'id', type: mssql.VarChar, value: revenueId },
          { name: 'src', type: mssql.VarChar, value: 'pharmacy' },
          { name: 'srcId', type: mssql.VarChar, value: dispId },
          { name: 'amt', type: mssql.Decimal(12,2), value: parseFloat((unitPrice * dispQty).toFixed(2)) },
          { name: 'userId', type: mssql.VarChar, value: req.user.userId },
          { name: 'patId', type: mssql.VarChar, value: patientId },
          { name: 'desc', type: mssql.VarChar, value: `${drugName} dispensed x${dispQty}` }
        ]
      );
    }
    broadcast('data:update', { table: 'pharmacy', action: 'dispense' });
    broadcast('data:update', { table: 'dashboard', action: 'refresh' });
    broadcast('data:update', { table: 'revenue', action: 'create' });
    res.json({ success: true, id: dispId });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/pharmacy/drugs/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    await sqlQuery('DELETE FROM pharmacy_drugs WHERE id = @id', [
      { name: 'id', type: mssql.VarChar, value: req.params.id }
    ]);
    broadcast('data:update', { table: 'pharmacy', action: 'delete' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── CHAT ───────────────────────────────────────────────────────────────────────

app.post('/api/chat/mark-read', authMiddleware, async (req, res) => {
  try {
    const { otherUserId } = req.body;
    await sqlQuery(
      `UPDATE chat SET status = 'read' WHERE sender_id = @other AND receiver_id = @me AND status = 'unread'`,
      [
        { name: 'other', type: mssql.VarChar, value: otherUserId },
        { name: 'me', type: mssql.VarChar, value: req.user.userId }
      ]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/chat/:otherUserId', authMiddleware, async (req, res) => {
  try {
    const myId = req.user.userId;
    const otherId = req.params.otherUserId;
    const result = await sqlQuery(
      `SELECT * FROM chat WHERE (sender_id = @me AND receiver_id = @other) OR (sender_id = @other AND receiver_id = @me) ORDER BY timestamp ASC`,
      [
        { name: 'me', type: mssql.VarChar, value: myId },
        { name: 'other', type: mssql.VarChar, value: otherId }
      ]
    );
    res.json({ success: true, data: result.recordset });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/chat', authMiddleware, async (req, res) => {
  try {
    const { receiver_id, message_text, attachment, reply_to_id } = req.body;
    const id = uuidv4();
    await sqlQuery(
      `INSERT INTO chat (id, sender_id, receiver_id, message_text, attachment, reply_to_id, status, timestamp) VALUES (@id, @sid, @rid, @msg, @att, @reply, 'unread', GETDATE())`,
      [
        { name: 'id', type: mssql.VarChar, value: id },
        { name: 'sid', type: mssql.VarChar, value: req.user.userId },
        { name: 'rid', type: mssql.VarChar, value: receiver_id },
        { name: 'msg', type: mssql.VarChar, value: message_text },
        { name: 'att', type: mssql.VarChar, value: attachment || null },
        { name: 'reply', type: mssql.VarChar, value: reply_to_id || null }
      ]
    );
    sendToUser(receiver_id, 'chat:message', { id, sender_id: req.user.userId, message_text, attachment, timestamp: new Date().toISOString() });
    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── PRESENCE ──────────────────────────────────────────────────────────────────

app.get('/api/presence/online', authMiddleware, async (req, res) => {
  try {
    const result = await sqlQuery(
      `SELECT up.*, u.first_name, u.last_name, u.email, u.role FROM user_presence up JOIN users u ON up.user_id = u.id WHERE up.is_online = 1`
    );
    res.json({ success: true, users: result.recordset });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/presence/set-online', authMiddleware, async (req, res) => {
  try {
    await sqlQuery('UPDATE user_presence SET is_online = 1, last_seen = GETDATE() WHERE user_id = @uid', [
      { name: 'uid', type: mssql.VarChar, value: req.user.userId }
    ]);
    broadcast('presence', { userId: req.user.userId, status: 'online' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/presence/set-offline', authMiddleware, async (req, res) => {
  try {
    await sqlQuery('UPDATE user_presence SET is_online = 0, last_seen = GETDATE() WHERE user_id = @uid', [
      { name: 'uid', type: mssql.VarChar, value: req.user.userId }
    ]);
    broadcast('presence', { userId: req.user.userId, status: 'offline' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── ACTIVITY LOGS ─────────────────────────────────────────────────────────────

app.get('/api/activity-logs', authMiddleware, async (req, res) => {
  try {
    const { limit = 200 } = req.query;
    const result = await sqlQuery(
      `SELECT al.*, u.first_name + ' ' + u.last_name as user_name
       FROM activity_logs al
       LEFT JOIN users u ON al.user_id = u.id
       ORDER BY al.timestamp DESC
       OFFSET 0 ROWS FETCH NEXT ${parseInt(limit)} ROWS ONLY`
    );
    res.json({ success: true, data: result.recordset });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/activity-logs', authMiddleware, async (req, res) => {
  try {
    const { action_type, entity_type, entity_id, description, ip_address, user_agent } = req.body;
    const id = uuidv4();
    await sqlQuery(
      `INSERT INTO activity_logs (id, user_id, action_type, entity_type, entity_id, description, ip_address, user_agent, timestamp)
       VALUES (@id, @uid, @at, @et, @eid, @desc, @ip, @ua, GETDATE())`,
      [
        { name: 'id', type: mssql.VarChar, value: id },
        { name: 'uid', type: mssql.VarChar, value: req.user.userId },
        { name: 'at', type: mssql.VarChar, value: action_type || '' },
        { name: 'et', type: mssql.VarChar, value: entity_type || '' },
        { name: 'eid', type: mssql.VarChar, value: entity_id || null },
        { name: 'desc', type: mssql.VarChar, value: description || '' },
        { name: 'ip', type: mssql.VarChar, value: ip_address || '' },
        { name: 'ua', type: mssql.VarChar, value: user_agent || '' }
      ]
    );
    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── REPORTS ──────────────────────────────────────────────────────────────────

app.get('/api/reports', authMiddleware, async (req, res) => {
  try {
    const { patient_id } = req.query;
    let result;
    if (patient_id) {
      result = await sqlQuery(
        'SELECT * FROM reports WHERE patient_id = @pid ORDER BY created_at DESC',
        [{ name: 'pid', type: mssql.VarChar, value: patient_id }]
      );
    } else {
      result = await sqlQuery('SELECT * FROM reports ORDER BY created_at DESC');
    }
    res.json({ success: true, data: result.recordset });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/reports', authMiddleware, async (req, res) => {
  try {
    const { patient_id, report_type, title, report_file } = req.body;
    const id = uuidv4();
    await sqlQuery(
      `INSERT INTO reports (id, patient_id, report_type, title, report_file, created_at, updated_at)
       VALUES (@id, @pid, @type, @title, @file, GETDATE(), GETDATE())`,
      [
        { name: 'id', type: mssql.VarChar, value: id },
        { name: 'pid', type: mssql.VarChar, value: patient_id },
        { name: 'type', type: mssql.VarChar, value: report_type || 'general' },
        { name: 'title', type: mssql.VarChar, value: title || '' },
        { name: 'file', type: mssql.VarChar, value: report_file || '' }
      ]
    );
    broadcast('data:update', { table: 'reports', action: 'create' });
    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/reports/:id', authMiddleware, async (req, res) => {
  try {
    await sqlQuery('DELETE FROM reports WHERE id = @id', [
      { name: 'id', type: mssql.VarChar, value: req.params.id }
    ]);
    broadcast('data:update', { table: 'reports', action: 'delete' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── NOTIFICATIONS ────────────────────────────────────────────────────────────

app.get('/api/notifications', authMiddleware, async (req, res) => {
  try {
    const result = await sqlQuery(
      `SELECT * FROM notifications WHERE user_id = @uid ORDER BY created_at DESC`,
      [{ name: 'uid', type: mssql.VarChar, value: req.user.userId }]
    );
    res.json({ success: true, data: result.recordset });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/notifications/:id/read', authMiddleware, async (req, res) => {
  try {
    await sqlQuery(
      `UPDATE notifications SET is_read = 1, read_at = GETDATE() WHERE id = @id`,
      [{ name: 'id', type: mssql.VarChar, value: req.params.id }]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── USERS ─────────────────────────────────────────────────────────────────────

app.get('/api/users', authMiddleware, async (req, res) => {
  try {
    const result = await sqlQuery(
      'SELECT id, first_name, last_name, email, role, phone_number, gender, status, created_at FROM users ORDER BY created_at DESC'
    );
    res.json({ success: true, data: result.recordset });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/users', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { email, password, first_name, last_name, role, phone_number, gender } = req.body;
    const hash = await bcrypt.hash(password, 10);
    const id = uuidv4();
    await sqlQuery(
      `INSERT INTO users (id, first_name, last_name, email, password_hash, role, phone_number, gender, status, created_at, updated_at)
       VALUES (@id, @fn, @ln, @email, @hash, @role, @phone, @g, 'active', GETDATE(), GETDATE())`,
      [
        { name: 'id', type: mssql.VarChar, value: id },
        { name: 'fn', type: mssql.VarChar, value: first_name || '' },
        { name: 'ln', type: mssql.VarChar, value: last_name || '' },
        { name: 'email', type: mssql.VarChar, value: email },
        { name: 'hash', type: mssql.VarChar, value: hash },
        { name: 'role', type: mssql.VarChar, value: role || 'assistant' },
        { name: 'phone', type: mssql.VarChar, value: phone_number || '' },
        { name: 'g', type: mssql.VarChar, value: gender || '' }
      ]
    );
    broadcast('data:update', { table: 'users', action: 'create' });
    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/users/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { first_name, last_name, email, role, phone_number, gender, password } = req.body;
    let query = `UPDATE users SET first_name=@fn, last_name=@ln, email=@email, role=@role, phone_number=@phone, gender=@g, updated_at=GETDATE()`;
    const params = [
      { name: 'fn', type: mssql.VarChar, value: first_name || '' },
      { name: 'ln', type: mssql.VarChar, value: last_name || '' },
      { name: 'email', type: mssql.VarChar, value: email || '' },
      { name: 'role', type: mssql.VarChar, value: role || '' },
      { name: 'phone', type: mssql.VarChar, value: phone_number || '' },
      { name: 'g', type: mssql.VarChar, value: gender || '' },
      { name: 'id', type: mssql.VarChar, value: req.params.id }
    ];
    if (password) {
      const hash = await bcrypt.hash(password, 10);
      query = `UPDATE users SET first_name=@fn, last_name=@ln, email=@email, role=@role, phone_number=@phone, gender=@g, password_hash=@hash, updated_at=GETDATE()`;
      params.unshift({ name: 'hash', type: mssql.VarChar, value: hash });
    }
    query += ' WHERE id = @id';
    await sqlQuery(query, params);
    broadcast('data:update', { table: 'users', action: 'update' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/users/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    await sqlQuery('DELETE FROM users WHERE id = @id', [
      { name: 'id', type: mssql.VarChar, value: req.params.id }
    ]);
    broadcast('data:update', { table: 'users', action: 'delete' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── SETTINGS ─────────────────────────────────────────────────────────────────

app.get('/api/settings', authMiddleware, async (req, res) => {
  try {
    const { key, userId } = req.query;
    const userIdParam = userId || req.user.userId;
    if (key) {
      const result = await sqlQuery(
        'SELECT * FROM settings WHERE setting_key = @key AND (user_id = @uid OR user_id IS NULL) ORDER BY user_id DESC',
        [{ name: 'key', type: mssql.VarChar, value: key }, { name: 'uid', type: mssql.VarChar, value: userIdParam }]
      );
      const row = result.recordset[0];
      return res.json({ success: true, data: row ? { key: row.setting_key, value: row.setting_value, user_id: row.user_id } : null });
    }
    const result = await sqlQuery(
      'SELECT * FROM settings WHERE user_id = @uid OR user_id IS NULL',
      [{ name: 'uid', type: mssql.VarChar, value: userIdParam }]
    );
    res.json({ success: true, settings: result.recordset.map(row => ({ key: row.setting_key, value: row.setting_value, user_id: row.user_id })) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/settings', authMiddleware, async (req, res) => {
  try {
    const { key, value, userId } = req.body;
    const uid = userId || req.user.userId;
    await sqlQuery(
      `IF EXISTS (SELECT 1 FROM settings WHERE setting_key = @key AND user_id = @uid)
         UPDATE settings SET setting_value = @val, updated_at = GETDATE() WHERE setting_key = @key AND user_id = @uid
       ELSE
         INSERT INTO settings (id, setting_key, setting_value, user_id, created_at, updated_at)
         VALUES (@id, @key, @val, @uid, GETDATE(), GETDATE())`,
      [
        { name: 'id', type: mssql.VarChar, value: uuidv4() },
        { name: 'key', type: mssql.VarChar, value: key },
        { name: 'val', type: mssql.VarChar, value: value },
        { name: 'uid', type: mssql.VarChar, value: uid }
      ]
    );
    broadcast('data:update', { table: 'settings', action: 'update', userId: uid });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── DASHBOARD ─────────────────────────────────────────────────────────────────

app.get('/api/dashboard/stats', authMiddleware, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const [
      patientCount, testCount, revenueToday, revenueMonth, pendingPrescriptions
    ] = await Promise.all([
      sqlQuery('SELECT COUNT(*) as cnt FROM patients'),
      sqlQuery('SELECT COUNT(*) as cnt FROM tests'),
      sqlQuery('SELECT COALESCE(SUM(amount), 0) as total FROM revenue WHERE CAST(timestamp AS DATE) = @today', [
        { name: 'today', type: mssql.VarChar, value: today }
      ]),
      sqlQuery('SELECT COALESCE(SUM(amount), 0) as total FROM revenue WHERE MONTH(timestamp) = MONTH(GETDATE()) AND YEAR(timestamp) = YEAR(GETDATE())'),
      sqlQuery("SELECT COUNT(*) as cnt FROM prescriptions WHERE status = 'pending'")
    ]);
    res.json({
      success: true,
      stats: {
        totalPatients: patientCount.recordset[0].cnt,
        totalTests: testCount.recordset[0].cnt,
        todayRevenue: revenueToday.recordset[0].total,
        monthlyRevenue: revenueMonth.recordset[0].total,
        pendingPrescriptions: pendingPrescriptions.recordset[0].cnt
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── PRESCRIPTIONS ─────────────────────────────────────────────────────────────

app.get('/api/prescriptions/pending', authMiddleware, async (req, res) => {
  try {
    const result = await sqlQuery(
      `SELECT p.*, pt.first_name + ' ' + pt.last_name as patient_name, u.first_name + ' ' + u.last_name as doctor_name, d.drug_name
       FROM prescriptions p
       JOIN patients pt ON p.patient_id = pt.id
       JOIN users u ON p.doctor_id = u.id
       JOIN pharmacy_drugs d ON p.drug_id = d.id
       WHERE p.status = 'pending'
       ORDER BY p.created_at DESC`
    );
    res.json({ success: true, data: result.recordset });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/prescriptions', doctorOnly, async (req, res) => {
  try {
    const { patient_id, drug_id, quantity, instructions } = req.body;
    const id = uuidv4();
    await sqlQuery(
      `INSERT INTO prescriptions (id, patient_id, doctor_id, drug_id, quantity, instructions, status, created_at, updated_at) VALUES (@id, @pid, @did, @drgid, @qty, @inst, 'pending', GETDATE(), GETDATE())`,
      [
        { name: 'id', type: mssql.VarChar, value: id },
        { name: 'pid', type: mssql.VarChar, value: patient_id },
        { name: 'did', type: mssql.VarChar, value: req.user.userId },
        { name: 'drgid', type: mssql.VarChar, value: drug_id },
        { name: 'qty', type: mssql.Int, value: quantity },
        { name: 'inst', type: mssql.VarChar, value: instructions || '' }
      ]
    );
    res.json({ success: true, id });
    broadcast('data:update', { table: 'prescriptions', action: 'create' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/prescriptions/:id/status', authMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    await sqlQuery('UPDATE prescriptions SET status = @s, updated_at = GETDATE() WHERE id = @id', [
      { name: 's', type: mssql.VarChar, value: status },
      { name: 'id', type: mssql.VarChar, value: req.params.id }
    ]);
    res.json({ success: true });
    broadcast('data:update', { table: 'prescriptions', action: 'update' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── HEALTH ────────────────────────────────────────────────────────────────────

app.get('/api/health', (req, res) => {
  const os = require('os');
  const ifs = os.networkInterfaces();
  const ips = Object.values(ifs).flat().filter(i => i.family === 'IPv4' && !i.internal).map(i => i.address);
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    db: pool ? 'connected' : 'disconnected',
    serverIp: ips[0] || '127.0.0.1',
    serverIps: ips
  });
});

app.get('/api/server/status', authMiddleware, adminOnly, (req, res) => {
  const os = require('os');
  const ifs = os.networkInterfaces();
  const ips = Object.values(ifs).flat().filter(i => i.family === 'IPv4' && !i.internal).map(i => i.address);
  res.json({
    success: true,
    status: {
      running: true,
      clients: connectedClients.size,
      database: sqlConfig.database,
      uptime: process.uptime(),
      serverIp: ips[0] || '127.0.0.1',
      serverIps: ips
    }
  });
});

// ─── SERVER STARTUP ─────────────────────────────────────────────────────────────

const PORT = parseInt(process.env.SERVER_PORT || '3001');

async function start() {
  console.log('========================================');
  console.log('  Eye Clinic - Backend Server');
  console.log('========================================\n');

  loadConfig();

  console.log(`Connecting to SQL Server: ${sqlConfig.server}:${sqlConfig.port}/${sqlConfig.database}...`);
  try {
    await sqlConnect();
  } catch (err) {
    console.error('FATAL: Could not connect to SQL Server.');
    console.error('Error:', err.message);
    console.error('\nRun "npm run setup:server" first to create the database.');
    process.exit(1);
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`\n[Server] HTTP + WebSocket listening on port ${PORT}`);
    console.log(`[Server] JWT auth enabled (15min access, 7day refresh)`);
    console.log('[Server] Ready to accept client connections.\n');
  });
}

process.on('SIGINT', async () => {
  console.log('\n[Server] Shutting down...');
  if (pool) await mssql.close();
  server.close(() => process.exit(0));
});

start().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
