// scripts/start-server.js
// KORENE Eye Clinic Server - Runs with system Node
// Provides REST API + WebSocket for client connections

const path = require('path');
const fs = require('fs');
const http = require('http');
const os = require('os');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

// ── Parse args ────────────────────────────────────────────────
const args = process.argv.slice(2);
let port = 3001;
let autoStart = false;
for (let i = 0; i < args.length; i++) {
  if (args[i].startsWith('--port=')) port = parseInt(args[i].split('=')[1]) || 3001;
  if (args[i] === '--autostart') autoStart = true;
}

// ── App paths ────────────────────────────────────────────────
const appDataPath = process.env.APPDATA || process.env.HOME || '';
const dbFolder = path.join(appDataPath, 'KORENE_EyeClinic');
const logsFolder = path.join(dbFolder, 'logs');
const dbPath = path.join(dbFolder, 'eye_clinic.db');

if (!fs.existsSync(dbFolder)) fs.mkdirSync(dbFolder, { recursive: true });
if (!fs.existsSync(logsFolder)) fs.mkdirSync(logsFolder, { recursive: true });

// ── Logging ─────────────────────────────────────────────────
const logFile = path.join(logsFolder, `server_${new Date().toISOString().slice(0, 10)}.log`);
function log(msg) {
  const ts = new Date().toISOString();
  const line = `[${ts}] ${msg}`;
  console.log(line);
  try { fs.appendFileSync(logFile, line + '\n'); } catch { }
}

log('Starting KORENE Server...');

// ── Windows Auto-Start ─────────────────────────────────────────
function setupAutoStart() {
  const exePath = process.execPath;
  const scriptPath = path.join(__dirname, 'start-server.js');
  const startFolder = path.join(appDataPath, 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup');
  const shortcutPath = path.join(startFolder, 'KORENE_Server.bat');
  
  if (!fs.existsSync(startFolder)) {
    try { fs.mkdirSync(startFolder, { recursive: true }); } catch { }
  }
  
  const batContent = `@echo off\ncd /d "${path.join(__dirname, '..')}"\nnode "${scriptPath}" --port=${port}\n`;
  
  try {
    fs.writeFileSync(shortcutPath, batContent);
    log(`Auto-start registered: ${shortcutPath}`);
  } catch (e) {
    log(`Auto-start error: ${e.message}`);
  }
}

if (autoStart) {
  setupAutoStart();
}

// ── Get Local IP ────────────────────────────────────────────
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

// ── Database ──────────────────────────────────────────────
const Database = require('../electron/server/database');
Database.initialize();
log('Database initialized.');

// ── Express App ────────────────────────────────────────────
const express = require('express');
const cors = require('cors');
const expressApp = express();
expressApp.use(cors({ origin: '*', credentials: true }));
expressApp.use(express.json({ limit: '50mb' }));
expressApp.use(express.urlencoded({ extended: true, limit: '50mb' }));

const httpServer = http.createServer(expressApp);

// ── WebSocket Server ────────────────────────────────────────────
const WebSocket = require('ws');
const wss = new WebSocket.Server({ server: httpServer });
const clients = new Map();

function broadcast(type, data) {
  const msg = JSON.stringify({ type, data });
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      try { client.send(msg); } catch { }
    }
  });
}

wss.on('connection', (ws) => {
  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      if (msg.type === 'auth') {
        clients.set(ws, { userId: msg.userId, userName: msg.userName, userRole: msg.userRole, deviceName: msg.deviceName });
        ws.send(JSON.stringify({ type: 'connected', timestamp: Date.now() }));
        broadcast('presence', { ...clients.get(ws), status: 'online' });
        log(`Client connected: ${msg.userName}`);
      }
    } catch { }
  });
  ws.on('close', () => {
    const info = clients.get(ws);
    clients.delete(ws);
    if (info) broadcast('presence', { userId: info.userId, status: 'offline' });
  });
});

// ── JWT ─────────────────────────────────────���───────────
const jwt = require('jsonwebtoken');
const JWT_SECRET = 'eye-clinic-secret-key';
const JWT_REFRESH = 'eye-clinic-refresh-secret';

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.json({ success: false, error: 'No token provided' });
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.json({ success: false, error: 'Invalid token' });
    req.user = user;
    next();
  });
}

// ── API Routes ─────────────────────────────────────────────

// Auth: Login
expressApp.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = Database.sqlGet('SELECT * FROM users WHERE email = ? AND status = ?', [email, 'active']);
    if (!user) return res.json({ success: false, error: 'Invalid credentials' });
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.json({ success: false, error: 'Invalid credentials' });

    const accessToken = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign({ userId: user.id }, JWT_REFRESH, { expiresIn: '7d' });

    res.json({
      success: true,
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: `${user.first_name} ${user.last_name}`,
        email: user.email,
        role: user.role,
        first_name: user.first_name,
        last_name: user.last_name,
        phone_number: user.phone_number,
        gender: user.gender
      }
    });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// Auth: Refresh
expressApp.post('/api/auth/refresh', (req, res) => {
  try {
    const { refreshToken } = req.body;
    jwt.verify(refreshToken, JWT_REFRESH, (err, user) => {
      if (err) return res.json({ success: false, error: 'Invalid refresh token' });
      const newAccess = jwt.sign({ userId: user.userId, role: user.role }, JWT_SECRET, { expiresIn: '15m' });
      res.json({ success: true, accessToken: newAccess });
    });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// Users: Create
expressApp.post('/api/users', authenticateToken, async (req, res) => {
  try {
    const { email, password, first_name, last_name, role, phone_number, gender } = req.body;
    const existing = Database.sqlGet('SELECT id FROM users WHERE email = ?', [email]);
    if (existing) return res.json({ success: false, error: 'Email already exists' });

    const id = uuidv4();
    const hash = await bcrypt.hash(password, 10);
    Database.sqlRun(
      'INSERT INTO users (id, first_name, last_name, email, password_hash, role, phone_number, gender, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, first_name, last_name, email, hash, role, phone_number || '', gender || '', 'active']
    );

    res.json({ success: true, id });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// Patients: Get All
expressApp.get('/api/patients', authenticateToken, (req, res) => {
  try {
    const patients = Database.sqlQuery('SELECT * FROM patients ORDER BY created_at DESC');
    res.json({ success: true, patients });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// Patients: Create
expressApp.post('/api/patients', authenticateToken, (req, res) => {
  try {
    const id = uuidv4();
    const { patient_id, first_name, last_name, dob, gender, contact, email, address, reason_for_visit, client_type, marital_status, intake_date } = req.body;
    Database.sqlRun(
      'INSERT INTO patients (id, patient_id, first_name, last_name, dob, gender, contact, email, address, reason_for_visit, client_type, marital_status, intake_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, patient_id, first_name, last_name, dob, gender, contact, email, address, reason_for_visit, client_type, marital_status, intake_date]
    );
    res.json({ success: true, id });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// Patients: Update
expressApp.put('/api/patients/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const { patient_id, first_name, last_name, dob, gender, contact, email, address, reason_for_visit, client_type, marital_status } = req.body;
    Database.sqlRun(
      'UPDATE patients SET patient_id = ?, first_name = ?, last_name = ?, dob = ?, gender = ?, contact = ?, email = ?, address = ?, reason_for_visit = ?, client_type = ?, marital_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [patient_id, first_name, last_name, dob, gender, contact, email, address, reason_for_visit, client_type, marital_status, id]
    );
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// Patients: Delete
expressApp.delete('/api/patients/:id', authenticateToken, (req, res) => {
  try {
    Database.sqlRun('DELETE FROM patients WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// Tests: Get All
expressApp.get('/api/tests', authenticateToken, (req, res) => {
  try {
    const tests = Database.sqlQuery('SELECT * FROM tests ORDER BY created_at DESC');
    res.json({ success: true, tests });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// Tests: Create
expressApp.post('/api/tests', authenticateToken, (req, res) => {
  try {
    const id = uuidv4();
    const { patient_id, test_type, result, diagnosis, notes, machine_type, raw_data } = req.body;
    Database.sqlRun(
      'INSERT INTO tests (id, patient_id, test_type, result, diagnosis, notes, machine_type, raw_data) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [id, patient_id, test_type, result, diagnosis, notes, machine_type, raw_data]
    );
    res.json({ success: true, id });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// Inventory: Get All
expressApp.get('/api/inventory', authenticateToken, (req, res) => {
  try {
    const items = Database.sqlQuery('SELECT * FROM inventory ORDER BY item_name');
    res.json({ success: true, inventory: items });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// Inventory: Create
expressApp.post('/api/inventory', authenticateToken, (req, res) => {
  try {
    const id = uuidv4();
    const { item_code, item_name, category, quantity, minimum_quantity, unit_price, expiry_date } = req.body;
    Database.sqlRun(
      'INSERT INTO inventory (id, item_code, item_name, category, quantity, minimum_quantity, unit_price, expiry_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [id, item_code, item_name, category, quantity, minimum_quantity, unit_price, expiry_date]
    );
    res.json({ success: true, id });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// Prescriptions: Get
expressApp.get('/api/prescriptions', authenticateToken, (req, res) => {
  try {
    const prescriptions = Database.sqlQuery('SELECT * FROM prescriptions ORDER BY created_at DESC');
    res.json({ success: true, prescriptions });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// Prescriptions: Create
expressApp.post('/api/prescriptions', authenticateToken, (req, res) => {
  try {
    const id = uuidv4();
    const { patient_id, drug_id, quantity, notes, status } = req.body;
    Database.sqlRun(
      'INSERT INTO prescriptions (id, patient_id, drug_id, quantity, notes, status) VALUES (?, ?, ?, ?, ?, ?)',
      [id, patient_id, drug_id, quantity, notes, status || 'pending']
    );
    res.json({ success: true, id });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// Pharmacy: Get Drugs
expressApp.get('/api/pharmacy/drugs', authenticateToken, (req, res) => {
  try {
    const drugs = Database.sqlQuery('SELECT * FROM pharmacy_drugs ORDER BY drug_name');
    res.json({ success: true, drugs });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// Pharmacy: Dispense
expressApp.post('/api/pharmacy/dispense', authenticateToken, (req, res) => {
  try {
    const { drug_id, patient_id, quantity, notes } = req.body;
    const drug = Database.sqlGet('SELECT * FROM pharmacy_drugs WHERE id = ?', [drug_id]);
    if (!drug) return res.json({ success: false, error: 'Drug not found' });
    if (drug.quantity < quantity) return res.json({ success: false, error: 'Insufficient stock' });

    const id = uuidv4();
    const total = drug.unit_price * quantity;
    Database.sqlRun('INSERT INTO pharmacy_dispensations (id, drug_id, patient_id, quantity, unit_price, notes) VALUES (?, ?, ?, ?, ?, ?)', [id, drug_id, patient_id, quantity, drug.unit_price, notes]);
    Database.sqlRun('UPDATE pharmacy_drugs SET quantity = quantity - ? WHERE id = ?', [quantity, drug_id]);
    Database.sqlRun('INSERT INTO revenue (id, type, amount, patient_id) VALUES (?, ?, ?, ?)', [uuidv4(), 'pharmacy', total, patient_id]);

    res.json({ success: true, total });
    broadcast('data:update', { table: 'pharmacy' });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// Dashboard Stats
expressApp.get('/api/dashboard/stats', authenticateToken, (req, res) => {
  try {
    const patients = Database.sqlGet('SELECT COUNT(*) as count FROM patients');
    const tests = Database.sqlGet('SELECT COUNT(*) as count FROM tests');
    const today = new Date().toISOString().slice(0, 10);
    const newToday = Database.sqlGet("SELECT COUNT(*) as count FROM patients WHERE intake_date = ?", [today]);
    const revenue = Database.sqlGet("SELECT SUM(amount) as total FROM revenue WHERE date(created_at) = ?", [today]);

    res.json({
      success: true,
      stats: {
        totalPatients: patients.count,
        totalTests: tests.count,
        newClientsToday: newToday.count,
        revenueToday: revenue.total || 0
      }
    });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// Chat: Get Messages
expressApp.get('/api/chat', authenticateToken, (req, res) => {
  try {
    const { sender_id, receiver_id } = req.query;
    let query = 'SELECT * FROM chat WHERE ';
    const params = [];
    if (sender_id && receiver_id) {
      query += '(sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)';
      params.push(sender_id, receiver_id, receiver_id, sender_id);
    } else if (sender_id) {
      query += 'sender_id = ? OR receiver_id = ?';
      params.push(sender_id, sender_id);
    }
    query += ' ORDER BY created_at ASC';
    const messages = Database.sqlQuery(query, params);
    res.json({ success: true, messages });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// Chat: Send Message
expressApp.post('/api/chat', authenticateToken, (req, res) => {
  try {
    const { sender_id, receiver_id, message_text, attachment } = req.body;
    const id = uuidv4();
    Database.sqlRun(
      'INSERT INTO chat (id, sender_id, receiver_id, message_text, attachment) VALUES (?, ?, ?, ?, ?)',
      [id, sender_id, receiver_id, message_text, attachment]
    );
    res.json({ success: true, id });
    broadcast('new-message', { sender_id, receiver_id, message_text });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// Health Check
expressApp.get('/api/health', (req, res) => {
  res.json({ success: true, status: 'ok', timestamp: Date.now() });
});

// ── Start HTTP Server ────────────────────────────────────────
const serverIP = getLocalIP();
httpServer.listen(port, () => {
  log(`KORENE Server ONLINE on port ${port} (IP: ${serverIP})`);
  console.log(`\n========================================`);
  console.log(`  KORENE Eye Clinic Server`);
  console.log(`========================================`);
  console.log(`🟢 Server: ONLINE on port ${port}`);
  console.log(`📍 IP Address: ${serverIP}`);
  console.log(`💾 Database: ${dbPath}`);
  console.log(`🌐 WebSocket: enabled`);
  console.log(`\nClient Connection:`);
  console.log(`  http://${serverIP}:${port}`);
  console.log(`\nPress Ctrl+C to stop.\n`);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  log('Server shutting down...');
  httpServer.close();
  process.exit(0);
});