const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const http = require('http');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

// ── Parse args 
const args = process.argv.slice(1);
const startMinimized = args.includes('--minimized');

// ── App paths ────────────────────────────────────────────────
const appDataPath = process.env.APPDATA || process.env.HOME || '';
const dbFolder = path.join(appDataPath, 'KORENE_EyeClinic');
const logsFolder = path.join(dbFolder, 'logs');
const dbPath = path.join(dbFolder, 'eye_clinic.db');

// Ensure directories exist
if (!fs.existsSync(dbFolder)) fs.mkdirSync(dbFolder, { recursive: true });
if (!fs.existsSync(logsFolder)) fs.mkdirSync(logsFolder, { recursive: true });

// ── Logging ─────────────────────────────────────────────────
const logFile = path.join(logsFolder, `server_${new Date().toISOString().slice(0, 10)}.log`);
function log(msg) {
  const ts = new Date().toISOString();
  const line = `[${ts}] ${msg}`;
  console.log(line);
  try {
    fs.appendFileSync(logFile, line + '\n');
  } catch { }
}

// ── Database (shared with app) ─────────────────────────────
const Database = require(path.join(__dirname, '../electron/server/database'));

// ── Express App ────────────────────────────────────────────
const expressApp = express();
expressApp.use(cors({ origin: '*', credentials: true }));
expressApp.use(express.json({ limit: '50mb' }));
expressApp.use(express.urlencoded({ extended: true, limit: '50mb' }));

const server = http.createServer(expressApp);

// ── WebSocket ───────────────────────────────────────────────
const wss = new WebSocket.Server({ server });
const clients = new Map(); // ws → { userId, userName, userRole, deviceName }

function broadcast(type, data) {
  const msg = JSON.stringify({ type, data });
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      try { client.send(msg); } catch { }
    }
  });
}

function sendToUser(userId, type, data) {
  const msg = JSON.stringify({ type, data });
  for (const [ws, info] of clients.entries()) {
    if (info.userId === userId && ws.readyState === WebSocket.OPEN) {
      try { ws.send(msg); } catch { }
    }
  }
}

wss.on('connection', (ws, req) => {
  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      if (msg.type === 'auth') {
        const clientInfo = {
          userId: msg.userId,
          userName: msg.userName,
          userRole: msg.userRole,
          deviceName: msg.deviceName || 'Unknown'
        };
        clients.set(ws, clientInfo);
        ws.send(JSON.stringify({ type: 'connected', timestamp: Date.now() }));
        broadcast('presence', { ...clientInfo, status: 'online' });
        log(`Client connected: ${msg.userName} (${msg.deviceName})`);
      } else if (msg.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
      }
    } catch { }
  });

  ws.on('close', () => {
    const info = clients.get(ws);
    clients.delete(ws);
    if (info) {
      broadcast('presence', { userId: info.userId, status: 'offline' });
      log(`Client disconnected: ${info.userName}`);
    }
  });

  ws.on('error', () => {
    clients.delete(ws);
  });
});

// ── API Routes ─────────────────────────────────────────────
function registerRoutes(app) {
  const { sqlQuery, sqlRun, sqlGet } = Database;

  // ── Auth ──
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      const user = sqlGet('SELECT * FROM users WHERE email = ? AND status = ?', [email, 'active']);
      if (!user) return res.json({ success: false, error: 'Invalid credentials' });
      const match = await bcrypt.compare(password, user.password_hash);
      if (!match) return res.json({ success: false, error: 'Invalid credentials' });

      const jwt = require('jsonwebtoken');
      const accessToken = jwt.sign(
        { userId: user.id, role: user.role },
        'eye-clinic-secret-key',
        { expiresIn: '15m' }
      );
      const refreshToken = jwt.sign(
        { userId: user.id },
        'eye-clinic-refresh-secret',
        { expiresIn: '7d' }
      );

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

  app.post('/api/auth/refresh', (req, res) => {
    try {
      const { refreshToken } = req.body;
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(refreshToken, 'eye-clinic-refresh-secret');
      const user = sqlGet('SELECT * FROM users WHERE id = ?', [decoded.userId]);
      if (!user) return res.json({ success: false, error: 'User not found' });

      const accessToken = jwt.sign({ userId: user.id, role: user.role }, 'eye-clinic-secret-key', { expiresIn: '15m' });
      const newRefresh = jwt.sign({ userId: user.id }, 'eye-clinic-refresh-secret', { expiresIn: '7d' });
      res.json({ success: true, accessToken, refreshToken: newRefresh });
    } catch {
      res.json({ success: false, error: 'Invalid refresh token' });
    }
  });

  app.get('/api/auth/me', (req, res) => {
    try {
      const auth = req.headers.authorization;
      if (!auth) return res.json({ success: false, error: 'No token' });
      const token = auth.replace('Bearer ', '');
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, 'eye-clinic-secret-key');
      const user = sqlGet('SELECT * FROM users WHERE id = ?', [decoded.userId]);
      if (!user) return res.json({ success: false, error: 'User not found' });
      res.json({
        success: true,
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
    } catch {
      res.json({ success: false, error: 'Invalid token' });
    }
  });

  // ── Health ──
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      version: '1.0.0',
      mode: 'KORENE_Server',
      port: PORT,
      dbPath,
      clients: clients.size,
      uptime: process.uptime()
    });
  });

  // ── Patients ──
  app.get('/api/patients', (req, res) => {
    try {
      const { search, page = 1, limit = 50 } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);
      let sql = 'SELECT * FROM patients';
      let params = [];
      if (search) {
        sql += ' WHERE first_name LIKE ? OR last_name LIKE ? OR patient_id LIKE ? OR contact LIKE ?';
        const s = `%${search}%`;
        params = [s, s, s, s];
      }
      sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
      params.push(parseInt(limit), parseInt(offset));
      const patients = sqlQuery(sql, params);

      const countSql = search
        ? 'SELECT COUNT(*) as total FROM patients WHERE first_name LIKE ? OR last_name LIKE ? OR patient_id LIKE ? OR contact LIKE ?'
        : 'SELECT COUNT(*) as total FROM patients';
      const total = sqlGet(countSql, search ? [`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`] : []).total;

      res.json({ success: true, patients, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
    } catch (err) { res.json({ success: false, error: err.message }); }
  });

  app.post('/api/patients', (req, res) => {
    try {
      const { first_name, last_name, dob, gender, contact, email, address, reason_for_visit, client_type, marital_status, intake_date } = req.body;
      const id = uuidv4();
      const patient_id = 'P-' + Date.now().toString().slice(-6);
      sqlRun(
        `INSERT INTO patients (id, patient_id, first_name, last_name, dob, gender, contact, email, address, reason_for_visit, client_type, marital_status, intake_date)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, patient_id, first_name, last_name, dob, gender, contact, email, address, reason_for_visit, client_type, marital_status, intake_date || new Date().toISOString().slice(0, 10)]
      );
      const patient = sqlGet('SELECT * FROM patients WHERE id = ?', [id]);
      broadcast('data:update', { table: 'patients', action: 'create', record: patient });
      res.json({ success: true, id, patient });
    } catch (err) { res.json({ success: false, error: err.message }); }
  });

  app.get('/api/patients/:id', (req, res) => {
    try {
      const patient = sqlGet('SELECT * FROM patients WHERE id = ?', [req.params.id]);
      if (!patient) return res.json({ success: false, error: 'Not found' });
      res.json({ success: true, patient });
    } catch (err) { res.json({ success: false, error: err.message }); }
  });

  app.put('/api/patients/:id', (req, res) => {
    try {
      const { first_name, last_name, dob, gender, contact, email, address, reason_for_visit, client_type, marital_status } = req.body;
      sqlRun(
        `UPDATE patients SET first_name=?, last_name=?, dob=?, gender=?, contact=?, email=?, address=?, reason_for_visit=?, client_type=?, marital_status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`,
        [first_name, last_name, dob, gender, contact, email, address, reason_for_visit, client_type, marital_status, req.params.id]
      );
      const patient = sqlGet('SELECT * FROM patients WHERE id = ?', [req.params.id]);
      broadcast('data:update', { table: 'patients', action: 'update', record: patient });
      res.json({ success: true, patient });
    } catch (err) { res.json({ success: false, error: err.message }); }
  });

  app.delete('/api/patients/:id', (req, res) => {
    try {
      sqlRun('DELETE FROM patients WHERE id = ?', [req.params.id]);
      broadcast('data:update', { table: 'patients', action: 'delete', id: req.params.id });
      res.json({ success: true });
    } catch (err) { res.json({ success: false, error: err.message }); }
  });

  // Patient history (full profile)
  app.get('/api/patients/:id/history', (req, res) => {
    try {
      const patient = sqlGet('SELECT * FROM patients WHERE id = ?', [req.params.id]);
      if (!patient) return res.json({ success: false, error: 'Not found' });

      const visits = sqlQuery('SELECT * FROM visits WHERE patient_id = ? ORDER BY visit_date DESC', [req.params.id]);
      const tests = sqlQuery('SELECT * FROM tests WHERE patient_id = ? ORDER BY test_date DESC', [req.params.id]);
      const caseNotes = sqlQuery('SELECT * FROM case_notes WHERE patient_id = ? ORDER BY created_at DESC', [req.params.id]);
      const prescriptions = sqlQuery('SELECT * FROM prescriptions WHERE patient_id = ? ORDER BY created_at DESC', [req.params.id]);
      const revenue = sqlQuery('SELECT * FROM revenue WHERE patient_id = ? ORDER BY timestamp DESC', [req.params.id]);
      const attachments = sqlQuery(`
        SELECT ca.* FROM case_note_attachments ca
        JOIN case_notes cn ON ca.case_note_id = cn.id
        WHERE cn.patient_id = ?
      `, [req.params.id]);

      res.json({ success: true, patient, visits, tests, caseNotes, prescriptions, revenue, attachments });
    } catch (err) { res.json({ success: false, error: err.message }); }
  });

  // ── Visits ──
  app.get('/api/visits', (req, res) => {
    try {
      const { patient_id, page = 1, limit = 50 } = req.query;
      let sql = 'SELECT v.*, p.first_name || " " || p.last_name as patient_name FROM visits v JOIN patients p ON v.patient_id = p.id';
      let params = [];
      if (patient_id) { sql += ' WHERE v.patient_id = ?'; params.push(patient_id); }
      sql += ' ORDER BY v.visit_date DESC LIMIT ? OFFSET ?';
      params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));
      res.json({ success: true, visits: sqlQuery(sql, params) });
    } catch (err) { res.json({ success: false, error: err.message }); }
  });

  app.post('/api/visits', (req, res) => {
    try {
      const { patient_id, visit_date, visit_type, reason, payment_status, amount_paid, linked_prescription_id, created_by } = req.body;
      const id = uuidv4();
      sqlRun(
        `INSERT INTO visits (id, patient_id, visit_date, visit_type, reason, payment_status, amount_paid, linked_prescription_id, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, patient_id, visit_date, visit_type || 'follow_up', reason, payment_status || 'pending', amount_paid || 0, linked_prescription_id, created_by]
      );
      const visit = sqlGet('SELECT * FROM visits WHERE id = ?', [id]);
      broadcast('data:update', { table: 'visits', action: 'create', record: visit });
      res.json({ success: true, visit });
    } catch (err) { res.json({ success: false, error: err.message }); }
  });

  // ── Tests ──
  app.get('/api/tests', (req, res) => {
    try {
      const { patient_id, page = 1, limit = 50 } = req.query;
      let sql = 'SELECT t.*, p.first_name || " " || p.last_name as patient_name FROM tests t JOIN patients p ON t.patient_id = p.id';
      let params = [];
      if (patient_id) { sql += ' WHERE t.patient_id = ?'; params.push(patient_id); }
      sql += ' ORDER BY t.test_date DESC LIMIT ? OFFSET ?';
      params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));
      res.json({ success: true, tests: sqlQuery(sql, params) });
    } catch (err) { res.json({ success: false, error: err.message }); }
  });

  app.post('/api/tests', (req, res) => {
    try {
      const { patient_id, visit_id, test_date, eye, machine_type, raw_data, report_status, created_by } = req.body;
      const id = uuidv4();
      sqlRun(
        `INSERT INTO tests (id, patient_id, visit_id, test_date, eye, machine_type, raw_data, report_status, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, patient_id, visit_id, test_date, eye, machine_type, typeof raw_data === 'string' ? raw_data : JSON.stringify(raw_data), report_status || 'pending', created_by]
      );
      const test = sqlGet('SELECT * FROM tests WHERE id = ?', [id]);
      broadcast('data:update', { table: 'tests', action: 'create', record: test });
      res.json({ success: true, test });
    } catch (err) { res.json({ success: false, error: err.message }); }
  });

  // ── Case Notes ──
  app.get('/api/case-notes', (req, res) => {
    try {
      const { patient_id, doctor_id, page = 1, limit = 50 } = req.query;
      let sql = `SELECT cn.*, p.first_name || " " || p.last_name as patient_name,
                 u.first_name || " " || u.last_name as doctor_name
                 FROM case_notes cn
                 JOIN patients p ON cn.patient_id = p.id
                 JOIN users u ON cn.doctor_id = u.id`;
      let params = [];
      const conditions = [];
      if (patient_id) { conditions.push('cn.patient_id = ?'); params.push(patient_id); }
      if (doctor_id) { conditions.push('cn.doctor_id = ?'); params.push(doctor_id); }
      if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
      sql += ' ORDER BY cn.created_at DESC LIMIT ? OFFSET ?';
      params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));
      res.json({ success: true, caseNotes: sqlQuery(sql, params) });
    } catch (err) { res.json({ success: false, error: err.message }); }
  });

  app.post('/api/case-notes', (req, res) => {
    try {
      const {
        patient_id, visit_id, test_id, doctor_id, chief_complaint,
        visual_acuity_od, visual_acuity_os, intraocular_pressure_od, intraocular_pressure_os,
        cvf_analysis_od, cvf_analysis_os, diagnosis, recommendation, next_appointment, status
      } = req.body;
      const id = uuidv4();
      sqlRun(
        `INSERT INTO case_notes (id, patient_id, visit_id, test_id, doctor_id, chief_complaint,
         visual_acuity_od, visual_acuity_os, intraocular_pressure_od, intraocular_pressure_os,
         cvf_analysis_od, cvf_analysis_os, diagnosis, recommendation, next_appointment, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, patient_id, visit_id, test_id, doctor_id, chief_complaint,
          visual_acuity_od, visual_acuity_os, intraocular_pressure_od, intraocular_pressure_os,
          cvf_analysis_od, cvf_analysis_os, diagnosis, recommendation, next_appointment, status || 'draft']
      );
      const caseNote = sqlGet('SELECT * FROM case_notes WHERE id = ?', [id]);
      broadcast('data:update', { table: 'case_notes', action: 'create', record: caseNote });
      res.json({ success: true, caseNote });
    } catch (err) { res.json({ success: false, error: err.message }); }
  });

  app.put('/api/case-notes/:id', (req, res) => {
    try {
      const {
        chief_complaint, visual_acuity_od, visual_acuity_os, intraocular_pressure_od, intraocular_pressure_os,
        cvf_analysis_od, cvf_analysis_os, diagnosis, recommendation, next_appointment, status, signed_off_by
      } = req.body;
      const existing = sqlGet('SELECT * FROM case_notes WHERE id = ?', [req.params.id]);
      if (!existing) return res.json({ success: false, error: 'Case note not found' });

      // If case note was previously signed and is now being edited, reset sign-off
      let newStatus = status || existing.status;
      let newSignedOffBy = existing.signed_off_by;
      let newSignedOffAt = existing.signed_off_at;

      if (existing.signed_off_by && status !== 'signed') {
        // Editing a signed note - reset to draft, require re-sign
        newStatus = 'draft';
        newSignedOffBy = null;
        newSignedOffAt = null;
      } else if (status === 'signed' && !existing.signed_off_by) {
        // Signing for the first time
        newSignedOffBy = signed_off_by || 'system';
        newSignedOffAt = new Date().toISOString();
      }

      sqlRun(
        `UPDATE case_notes SET chief_complaint=?, visual_acuity_od=?, visual_acuity_os=?,
         intraocular_pressure_od=?, intraocular_pressure_os=?, cvf_analysis_od=?, cvf_analysis_os=?,
         diagnosis=?, recommendation=?, next_appointment=?, status=?, signed_off_by=?,
         signed_off_at=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`,
        [chief_complaint, visual_acuity_od, visual_acuity_os,
          intraocular_pressure_od, intraocular_pressure_os, cvf_analysis_od, cvf_analysis_os,
          diagnosis, recommendation, next_appointment, newStatus,
          newSignedOffBy, newSignedOffAt, req.params.id]
      );
      const caseNote = sqlGet('SELECT * FROM case_notes WHERE id = ?', [req.params.id]);
      broadcast('data:update', { table: 'case_notes', action: 'update', record: caseNote });
      res.json({ success: true, caseNote, signOffReset: existing.signed_off_by && !newSignedOffBy });
    } catch (err) { res.json({ success: false, error: err.message }); }
  });

  app.get('/api/case-notes/:id', (req, res) => {
    try {
      const caseNote = sqlGet('SELECT * FROM case_notes WHERE id = ?', [req.params.id]);
      if (!caseNote) return res.json({ success: false, error: 'Not found' });
      const attachments = sqlQuery('SELECT * FROM case_note_attachments WHERE case_note_id = ?', [req.params.id]);
      res.json({ success: true, caseNote, attachments });
    } catch (err) { res.json({ success: false, error: err.message }); }
  });

  // ── Prescriptions ──
  app.get('/api/prescriptions/pending', (req, res) => {
    try {
      const prescriptions = sqlQuery(`
        SELECT pr.*, p.first_name || " " || p.last_name as patient_name,
               d.drug_name, du.first_name || " " || du.last_name as doctor_name
        FROM prescriptions pr
        JOIN patients p ON pr.patient_id = p.id
        LEFT JOIN pharmacy_drugs d ON pr.drug_id = d.id
        JOIN users du ON pr.doctor_id = du.id
        WHERE pr.status IN ('pending', 'pending_return')
        ORDER BY pr.created_at DESC
      `);
      res.json({ success: true, prescriptions });
    } catch (err) { res.json({ success: false, error: err.message }); }
  });

  app.post('/api/prescriptions', (req, res) => {
    try {
      const { patient_id, visit_id, case_note_id, doctor_id, prescription_type, drug_id, quantity, instructions,
        glasses_details, glasses_amount_adjusted, glasses_adjustment_notes } = req.body;
      const id = uuidv4();
      sqlRun(
        `INSERT INTO prescriptions (id, patient_id, visit_id, case_note_id, doctor_id, prescription_type,
         drug_id, quantity, instructions, glasses_details, glasses_amount_adjusted, glasses_adjustment_notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, patient_id, visit_id, case_note_id, doctor_id, prescription_type || 'drug',
          drug_id, quantity || 1, instructions,
          typeof glasses_details === 'string' ? glasses_details : JSON.stringify(glasses_details),
          glasses_amount_adjusted || 0, glasses_adjustment_notes]
      );
      const prescription = sqlGet('SELECT * FROM prescriptions WHERE id = ?', [id]);
      broadcast('data:update', { table: 'prescriptions', action: 'create', record: prescription });
      res.json({ success: true, prescription });
    } catch (err) { res.json({ success: false, error: err.message }); }
  });

  app.put('/api/prescriptions/:id/status', (req, res) => {
    try {
      const { status, dispensed_by, dispensed_at, visit_id, payment_received, payment_type,
        glasses_amount_adjusted, glasses_adjustment_notes, notes } = req.body;

      sqlRun('UPDATE prescriptions SET status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?', [status, req.params.id]);

      if (status === 'dispensed') {
        const prescription = sqlGet('SELECT * FROM prescriptions WHERE id = ?', [req.params.id]);
        if (!prescription) return res.json({ success: false, error: 'Prescription not found' });

        // Record dispensation
        const dispId = uuidv4();
        sqlRun(
          `INSERT INTO prescription_dispensations (id, prescription_id, patient_id, visit_id, dispensed_by,
           dispensed_at, payment_received, payment_type, glasses_amount_adjusted, glasses_adjustment_notes, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [dispId, req.params.id, prescription.patient_id, visit_id, dispensed_by,
            dispensed_at || new Date().toISOString(),
            payment_received || 0, payment_type || 'cash',
            glasses_amount_adjusted || 0, glasses_adjustment_notes, notes]
        );

        // If it's a drug prescription, update pharmacy stock
        if (prescription.drug_id && prescription.drug_id !== '') {
          const drug = sqlGet('SELECT * FROM pharmacy_drugs WHERE id = ?', [prescription.drug_id]);
          if (drug) {
            sqlRun('UPDATE pharmacy_drugs SET current_quantity = current_quantity - ? WHERE id = ?',
              [prescription.quantity || 1, prescription.drug_id]);
          }
          // Record pharmacy revenue
          const drugDispId = uuidv4();
          sqlRun(
            `INSERT INTO pharmacy_dispensations (id, prescription_id, drug_id, patient_id, visit_id,
             quantity, unit_price, total_amount, user_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [drugDispId, req.params.id, prescription.drug_id, prescription.patient_id, visit_id,
              prescription.quantity || 1, drug?.unit_price || 0, (prescription.quantity || 1) * (drug?.unit_price || 0), dispensed_by]
          );
        }

        // Record revenue
        if (payment_received > 0) {
          const revenueId = uuidv4();
          sqlRun(
            `INSERT INTO revenue (id, source, source_id, amount, collected_by, patient_id, visit_id, description)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [revenueId, prescription.prescription_type === 'glasses' ? 'glasses' : 'pharmacy',
              prescription.prescription_type === 'glasses' ? prescription.id : drugDispId,
              payment_received, dispensed_by, prescription.patient_id, visit_id,
              prescription.prescription_type === 'glasses'
                ? `Glasses prescription - Patient ID ${prescription.patient_id}`
                : `Pharmacy dispensation - Patient ID ${prescription.patient_id}`]
          );
        }
      }

      const prescription = sqlGet('SELECT * FROM prescriptions WHERE id = ?', [req.params.id]);
      broadcast('data:update', { table: 'prescriptions', action: 'update', record: prescription });
      broadcast('data:update', { table: 'dashboard', action: 'refresh' });
      res.json({ success: true, prescription });
    } catch (err) { res.json({ success: false, error: err.message }); }
  });

  // ── Pharmacy ──
  app.get('/api/pharmacy/drugs', (req, res) => {
    try {
      const { search } = req.query;
      let sql = 'SELECT * FROM pharmacy_drugs WHERE status = ?';
      const params = ['active'];
      if (search) { sql += ' AND (drug_name LIKE ? OR drug_code LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
      sql += ' ORDER BY drug_name';
      res.json({ success: true, drugs: sqlQuery(sql, params) });
    } catch (err) { res.json({ success: false, error: err.message }); }
  });

  app.post('/api/pharmacy/drugs', (req, res) => {
    try {
      const { drug_code, drug_name, drug_form, strength, pack_size, unit_price, current_quantity, minimum_quantity, supplier_name, supplier_contact, expiry_date, notes, last_updated_by } = req.body;
      const id = uuidv4();
      sqlRun(
        `INSERT INTO pharmacy_drugs (id, drug_code, drug_name, drug_form, strength, pack_size, unit_price, current_quantity, minimum_quantity, supplier_name, supplier_contact, expiry_date, notes, last_updated_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, drug_code, drug_name, drug_form, strength, pack_size || 1, unit_price || 0, current_quantity || 0, minimum_quantity || 0, supplier_name, supplier_contact, expiry_date, notes, last_updated_by]
      );
      const drug = sqlGet('SELECT * FROM pharmacy_drugs WHERE id = ?', [id]);
      broadcast('data:update', { table: 'pharmacy_drugs', action: 'create', record: drug });
      res.json({ success: true, drug });
    } catch (err) { res.json({ success: false, error: err.message }); }
  });

  app.post('/api/pharmacy/dispense', (req, res) => {
    try {
      const { prescription_id, drug_id, patient_id, visit_id, quantity, user_id, notes } = req.body;
      const drug = sqlGet('SELECT * FROM pharmacy_drugs WHERE id = ?', [drug_id]);
      if (!drug) return res.json({ success: false, error: 'Drug not found' });
      if (drug.current_quantity < quantity) return res.json({ success: false, error: 'Insufficient stock' });

      const id = uuidv4();
      const total_amount = quantity * drug.unit_price;
      sqlRun(
        `INSERT INTO pharmacy_dispensations (id, prescription_id, drug_id, patient_id, visit_id, quantity, unit_price, total_amount, user_id, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, prescription_id, drug_id, patient_id, visit_id, quantity, drug.unit_price, total_amount, user_id, notes]
      );
      sqlRun('UPDATE pharmacy_drugs SET current_quantity = current_quantity - ? WHERE id = ?', [quantity, drug_id]);

      // Record revenue
      const revenueId = uuidv4();
      sqlRun(
        `INSERT INTO revenue (id, source, source_id, amount, collected_by, patient_id, visit_id, description)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [revenueId, 'pharmacy', id, total_amount, user_id, patient_id, visit_id, `${drug.drug_name} x${quantity} - Patient ID ${patient_id}`]
      );

      broadcast('data:update', { table: 'pharmacy_dispensations', action: 'create', record: { id, prescription_id, drug_id, patient_id, quantity, total_amount } });
      broadcast('data:update', { table: 'pharmacy_drugs', action: 'update', record: { ...drug, current_quantity: drug.current_quantity - quantity } });
      broadcast('data:update', { table: 'revenue', action: 'create' });
      broadcast('data:update', { table: 'dashboard', action: 'refresh' });
      res.json({ success: true, dispensation: { id, quantity, unit_price: drug.unit_price, total_amount } });
    } catch (err) { res.json({ success: false, error: err.message }); }
  });

  // ── Inventory ──
  app.get('/api/inventory', (req, res) => {
    try {
      const { search, category } = req.query;
      let sql = 'SELECT * FROM inventory WHERE status = ?';
      let params = ['active'];
      if (search) { sql += ' AND (item_name LIKE ? OR item_code LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
      if (category) { sql += ' AND category = ?'; params.push(category); }
      sql += ' ORDER BY item_name';
      res.json({ success: true, items: sqlQuery(sql, params) });
    } catch (err) { res.json({ success: false, error: err.message }); }
  });

  app.post('/api/inventory', (req, res) => {
    try {
      const { item_code, item_name, category, description, manufacturer, model_number, serial_number,
        current_quantity, minimum_quantity, unit_cost, supplier_name, purchase_date, expiry_date,
        location, notes, image_path, last_updated_by } = req.body;
      const id = uuidv4();
      sqlRun(
        `INSERT INTO inventory (id, item_code, item_name, category, description, manufacturer, model_number,
         serial_number, current_quantity, minimum_quantity, unit_cost, supplier_name, purchase_date,
         expiry_date, location, notes, image_path, last_updated_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, item_code, item_name, category, description, manufacturer, model_number, serial_number,
          current_quantity || 0, minimum_quantity || 0, unit_cost || 0, supplier_name, purchase_date,
          expiry_date, location, notes, image_path, last_updated_by]
      );
      const item = sqlGet('SELECT * FROM inventory WHERE id = ?', [id]);
      broadcast('data:update', { table: 'inventory', action: 'create', record: item });
      res.json({ success: true, item });
    } catch (err) { res.json({ success: false, error: err.message }); }
  });

  app.put('/api/inventory/:id', (req, res) => {
    try {
      const { item_name, category, description, current_quantity, minimum_quantity, unit_cost,
        supplier_name, expiry_date, location, notes, last_updated_by } = req.body;
      sqlRun(
        `UPDATE inventory SET item_name=?, category=?, description=?, current_quantity=?, minimum_quantity=?,
         unit_cost=?, supplier_name=?, expiry_date=?, location=?, notes=?, last_updated_by=?,
         updated_at=CURRENT_TIMESTAMP WHERE id=?`,
        [item_name, category, description, current_quantity, minimum_quantity, unit_cost,
          supplier_name, expiry_date, location, notes, last_updated_by, req.params.id]
      );
      const item = sqlGet('SELECT * FROM inventory WHERE id = ?', [req.params.id]);
      broadcast('data:update', { table: 'inventory', action: 'update', record: item });
      res.json({ success: true, item });
    } catch (err) { res.json({ success: false, error: err.message }); }
  });

  // ── Revenue ──
  app.get('/api/revenue', (req, res) => {
    try {
      const { start_date, end_date, source, page = 1, limit = 50 } = req.query;
      let sql = `SELECT r.*, u.first_name || " " || u.last_name as collected_by_name,
                 p.first_name || " " || p.last_name as patient_name
                 FROM revenue r
                 LEFT JOIN users u ON r.collected_by = u.id
                 LEFT JOIN patients p ON r.patient_id = p.id WHERE 1=1`;
      let params = [];
      if (start_date) { sql += ' AND DATE(r.timestamp) >= ?'; params.push(start_date); }
      if (end_date) { sql += ' AND DATE(r.timestamp) <= ?'; params.push(end_date); }
      if (source) { sql += ' AND r.source = ?'; params.push(source); }
      sql += ' ORDER BY r.timestamp DESC LIMIT ? OFFSET ?';
      params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));
      res.json({ success: true, records: sqlQuery(sql, params) });
    } catch (err) { res.json({ success: false, error: err.message }); }
  });

  app.get('/api/revenue/stats', (req, res) => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const monthStart = today.slice(0, 7) + '-01';

      const todayRevenue = sqlGet(`SELECT COALESCE(SUM(amount), 0) as total FROM revenue WHERE DATE(timestamp) = ?`, [today]);
      const monthRevenue = sqlGet(`SELECT COALESCE(SUM(amount), 0) as total FROM revenue WHERE DATE(timestamp) >= ?`, [monthStart]);
      const totalRevenue = sqlGet('SELECT COALESCE(SUM(amount), 0) as total FROM revenue', []);
      const todayCount = sqlGet('SELECT COUNT(*) as count FROM revenue WHERE DATE(timestamp) = ?', [today]);
      const monthCount = sqlGet('SELECT COUNT(*) as count FROM revenue WHERE DATE(timestamp) >= ?', [monthStart]);

      const bySource = sqlQuery(`
        SELECT source, COALESCE(SUM(amount), 0) as total, COUNT(*) as count
        FROM revenue WHERE DATE(timestamp) >= ? GROUP BY source
      `, [monthStart]);

      res.json({
        success: true,
        stats: {
          today: todayRevenue.total,
          month: monthRevenue.total,
          total: totalRevenue.total,
          todayCount: todayCount.count,
          monthCount: monthCount.count,
          bySource
        }
      });
    } catch (err) { res.json({ success: false, error: err.message }); }
  });

  // ── Dashboard ──
  app.get('/api/dashboard/stats', (req, res) => {
    try {
      const today = new Date().toISOString().slice(0, 10);

      const totalPatients = sqlGet('SELECT COUNT(*) as count FROM patients')?.count || 0;
      const todayPatients = sqlGet('SELECT COUNT(*) as count FROM patients WHERE DATE(intake_date) = ?', [today])?.count || 0;
      const totalTests = sqlGet('SELECT COUNT(*) as count FROM tests')?.count || 0;
      const todayTests = sqlGet('SELECT COUNT(*) as count FROM tests WHERE DATE(test_date) = ?', [today])?.count || 0;
      const pendingPrescriptions = sqlGet("SELECT COUNT(*) as count FROM prescriptions WHERE status IN ('pending', 'pending_return')")?.count || 0;
      const lowStockDrugs = sqlGet('SELECT COUNT(*) as count FROM pharmacy_drugs WHERE current_quantity <= minimum_quantity AND status = ?', ['active'])?.count || 0;
      const lowStockInventory = sqlGet('SELECT COUNT(*) as count FROM inventory WHERE current_quantity <= minimum_quantity AND status = ?', ['active'])?.count || 0;
      const todayRevenue = sqlGet('SELECT COALESCE(SUM(amount), 0) as total FROM revenue WHERE DATE(timestamp) = ?', [today])?.total || 0;
      const monthRevenue = sqlGet('SELECT COALESCE(SUM(amount), 0) as total FROM revenue WHERE DATE(timestamp) >= ?', [today.slice(0, 7) + '-01'])?.total || 0;

      const recentActivity = sqlQuery('SELECT * FROM activity_logs ORDER BY timestamp DESC LIMIT 10', []);
      const pendingGlasses = sqlGet("SELECT COUNT(*) as count FROM prescriptions WHERE prescription_type = 'glasses' AND status IN ('pending', 'pending_return')")?.count || 0;
      const upcomingReminders = sqlQuery(
        `SELECT ar.*, p.first_name || " " || p.last_name as patient_name
         FROM appointment_reminders ar
         JOIN patients p ON ar.patient_id = p.id
         WHERE ar.appointment_date >= ? AND ar.status = 'pending'
         ORDER BY ar.appointment_date LIMIT 10`, [today]
      );

      res.json({
        success: true,
        stats: {
          totalPatients, todayPatients, totalTests, todayTests,
          pendingPrescriptions, lowStockDrugs, lowStockInventory,
          todayRevenue, monthRevenue, recentActivity,
          pendingGlasses, upcomingReminders
        }
      });
    } catch (err) { res.json({ success: false, error: err.message }); }
  });

  // ── Chat ──
  app.get('/api/chat/:otherUserId', (req, res) => {
    try {
      const auth = req.headers.authorization;
      const token = auth?.replace('Bearer ', '');
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, 'eye-clinic-secret-key');
      const { otherUserId, page = 1, limit = 50 } = req.query;
      const messages = sqlQuery(`
        SELECT c.*, u1.first_name || " " || u1.last_name as sender_name,
               u2.first_name || " " || u2.last_name as receiver_name
        FROM chat c
        JOIN users u1 ON c.sender_id = u1.id
        JOIN users u2 ON c.receiver_id = u2.id
        WHERE (c.sender_id = ? AND c.receiver_id = ?) OR (c.sender_id = ? AND c.receiver_id = ?)
        ORDER BY c.timestamp DESC LIMIT ? OFFSET ?`,
        [decoded.userId, otherUserId, otherUserId, decoded.userId, parseInt(limit), (parseInt(page) - 1) * parseInt(limit)]
      );
      res.json({ success: true, messages: messages.reverse() });
    } catch (err) { res.json({ success: false, error: err.message }); }
  });

  app.post('/api/chat', (req, res) => {
    try {
      const { receiver_id, message_text, attachment } = req.body;
      const auth = req.headers.authorization;
      const token = auth?.replace('Bearer ', '');
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, 'eye-clinic-secret-key');
      const id = uuidv4();
      sqlRun(
        `INSERT INTO chat (id, sender_id, receiver_id, message_text, attachment, status)
         VALUES (?, ?, ?, ?, ?, 'unread')`,
        [id, decoded.userId, receiver_id, message_text, attachment]
      );
      const message = sqlGet('SELECT * FROM chat WHERE id = ?', [id]);
      sendToUser(receiver_id, 'chat:message', message);
      res.json({ success: true, message });
    } catch (err) { res.json({ success: false, error: err.message }); }
  });

  // ── Notifications ──
  app.get('/api/notifications', (req, res) => {
    try {
      const auth = req.headers.authorization;
      const token = auth?.replace('Bearer ', '');
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, 'eye-clinic-secret-key');
      const notifications = sqlQuery(
        'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
        [decoded.userId]
      );
      res.json({ success: true, notifications });
    } catch (err) { res.json({ success: false, error: err.message }); }
  });

  app.put('/api/notifications/:id/read', (req, res) => {
    try {
      sqlRun('UPDATE notifications SET status = ? WHERE id = ?', ['read', req.params.id]);
      res.json({ success: true });
    } catch (err) { res.json({ success: false, error: err.message }); }
  });

  // ── Presence ──
  app.get('/api/presence/online', (req, res) => {
    try {
      const users = [];
      for (const [, info] of clients.entries()) {
        if (info.userId) users.push(info);
      }
      res.json({ success: true, users });
    } catch (err) { res.json({ success: false, error: err.message }); }
  });

  // ── Users ──
  app.get('/api/users', (req, res) => {
    try {
      const users = sqlQuery('SELECT id, first_name, last_name, email, role, gender, phone_number, status, created_at FROM users ORDER BY created_at DESC');
      res.json({ success: true, users });
    } catch (err) { res.json({ success: false, error: err.message }); }
  });

  app.post('/api/users', async (req, res) => {
    try {
      const { email, password, first_name, last_name, role, phone_number, gender } = req.body;
      const id = uuidv4();
      const password_hash = await bcrypt.hash(password, 10);
      sqlRun(
        `INSERT INTO users (id, email, password_hash, first_name, last_name, role, phone_number, gender)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, email, password_hash, first_name, last_name, role || 'assistant', phone_number, gender || '']
      );
      const user = sqlGet('SELECT id, first_name, last_name, email, role, gender, phone_number, status FROM users WHERE id = ?', [id]);
      res.json({ success: true, user });
    } catch (err) { res.json({ success: false, error: err.message }); }
  });

  app.put('/api/users/:id', async (req, res) => {
    try {
      const { first_name, last_name, email, phone_number, gender, role, password } = req.body;
      if (password) {
        const password_hash = await bcrypt.hash(password, 10);
        sqlRun('UPDATE users SET first_name=?, last_name=?, email=?, phone_number=?, gender=?, role=?, password_hash=?, updated_at=CURRENT_TIMESTAMP WHERE id=?',
          [first_name, last_name, email, phone_number, gender, role, password_hash, req.params.id]);
      } else {
        sqlRun('UPDATE users SET first_name=?, last_name=?, email=?, phone_number=?, gender=?, role=?, updated_at=CURRENT_TIMESTAMP WHERE id=?',
          [first_name, last_name, email, phone_number, gender, role, req.params.id]);
      }
      const user = sqlGet('SELECT id, first_name, last_name, email, role, gender, phone_number, status FROM users WHERE id = ?', [req.params.id]);
      res.json({ success: true, user });
    } catch (err) { res.json({ success: false, error: err.message }); }
  });

  // ── Activity Logs ──
  app.get('/api/activity-logs', (req, res) => {
    try {
      const { page = 1, limit = 50 } = req.query;
      const logs = sqlQuery(
        `SELECT al.*, u.first_name || " " || u.last_name as user_name
         FROM activity_logs al JOIN users u ON al.user_id = u.id
         ORDER BY al.timestamp DESC LIMIT ? OFFSET ?`,
        [parseInt(limit), (parseInt(page) - 1) * parseInt(limit)]
      );
      res.json({ success: true, logs });
    } catch (err) { res.json({ success: false, error: err.message }); }
  });

  // ── Reminders ──
  app.get('/api/reminders', (req, res) => {
    try {
      const { status, page = 1, limit = 50 } = req.query;
      let sql = `SELECT ar.*, p.first_name || " " || p.last_name as patient_name,
                        u.first_name || " " || u.last_name as notified_to_name
                 FROM appointment_reminders ar
                 JOIN patients p ON ar.patient_id = p.id
                 LEFT JOIN users u ON ar.notified_to = u.id`;
      let params = [];
      if (status) { sql += ' WHERE ar.status = ?'; params.push(status); }
      sql += ' ORDER BY ar.appointment_date DESC LIMIT ? OFFSET ?';
      params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));
      res.json({ success: true, reminders: sqlQuery(sql, params) });
    } catch (err) { res.json({ success: false, error: err.message }); }
  });

  app.post('/api/reminders', (req, res) => {
    try {
      const { patient_id, case_note_id, visit_id, appointment_date, reminder_for, status, notified_to, notes } = req.body;
      const id = uuidv4();
      sqlRun(
        `INSERT INTO appointment_reminders (id, patient_id, case_note_id, visit_id, appointment_date, reminder_for, status, notified_to, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, patient_id, case_note_id, visit_id, appointment_date, reminder_for, status || 'pending', notified_to, notes]
      );
      const reminder = sqlGet('SELECT * FROM appointment_reminders WHERE id = ?', [id]);
      res.json({ success: true, reminder });
    } catch (err) { res.json({ success: false, error: err.message }); }
  });

  app.put('/api/reminders/:id', (req, res) => {
    try {
      const { status, notified_at, notes } = req.body;
      sqlRun('UPDATE appointment_reminders SET status=?, notified_at=?, notes=? WHERE id=?',
        [status, notified_at, notes, req.params.id]);
      const reminder = sqlGet('SELECT * FROM appointment_reminders WHERE id = ?', [req.params.id]);
      if (status === 'sent' && reminder) {
        // Create notification for assistant
        const notifId = uuidv4();
        sqlRun(
          `INSERT INTO notifications (id, user_id, title, message, type, related_id)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [notifId, reminder.notified_to,
            'Patient Appointment Reminder',
            `Reminder: A patient has an appointment today. Please reach out to confirm.`,
            'reminder', reminder.id]
        );
        sendToUser(reminder.notified_to, 'notifications:new', { id: notifId, title: 'Patient Appointment Reminder' });
      }
      res.json({ success: true, reminder });
    } catch (err) { res.json({ success: false, error: err.message }); }
  });

  app.get('/api/reminders/upcoming', (req, res) => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const reminders = sqlQuery(
        `SELECT ar.*, p.first_name || " " || p.last_name as patient_name,
                p.contact as patient_contact,
                cn.diagnosis as last_diagnosis,
                u.first_name || " " || u.last_name as notified_to_name
         FROM appointment_reminders ar
         JOIN patients p ON ar.patient_id = p.id
         LEFT JOIN case_notes cn ON cn.patient_id = ar.patient_id
         LEFT JOIN users u ON ar.notified_to = u.id
         WHERE ar.appointment_date >= ? AND ar.status = 'pending'
         ORDER BY ar.appointment_date
         LIMIT 20`,
        [today]
      );
      res.json({ success: true, reminders });
    } catch (err) { res.json({ success: false, error: err.message }); }
  });

  // ── Backup ──
  app.post('/api/backup/create', (req, res) => {
    try {
      const { created_by } = req.body || {};
      const backupFolder = path.join(dbFolder, 'backups');
      if (!fs.existsSync(backupFolder)) fs.mkdirSync(backupFolder, { recursive: true });

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const backupPath = path.join(backupFolder, `eye_clinic_backup_${timestamp}.db`);
      fs.copyFileSync(dbPath, backupPath);
      const stats = fs.statSync(backupPath);

      res.json({
        success: true,
        backup: {
          file_name: `eye_clinic_backup_${timestamp}.db`,
          file_path: backupPath,
          size: stats.size,
          created_at: new Date().toISOString()
        }
      });
    } catch (err) { res.json({ success: false, error: err.message }); }
  });

  app.get('/api/backup/list', (req, res) => {
    try {
      const backupFolder = path.join(dbFolder, 'backups');
      if (!fs.existsSync(backupFolder)) return res.json({ success: true, backups: [] });
      const files = fs.readdirSync(backupFolder).filter(f => f.endsWith('.db')).map(f => {
        const filePath = path.join(backupFolder, f);
        const stats = fs.statSync(filePath);
        return { file_name: f, file_path: filePath, size: stats.size, created_at: stats.mtime.toISOString() };
      }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      res.json({ success: true, backups: files });
    } catch (err) { res.json({ success: false, error: err.message }); }
  });

  app.post('/api/backup/restore/:fileName', (req, res) => {
    try {
      const backupFolder = path.join(dbFolder, 'backups');
      const backupPath = path.join(backupFolder, req.params.fileName);
      if (!fs.existsSync(backupPath)) return res.json({ success: false, error: 'Backup file not found' });

      // Close current DB connection, copy backup, reopen
      Database.close();
      fs.copyFileSync(backupPath, dbPath);
      Database.initialize();

      res.json({ success: true, message: 'Database restored successfully. Please restart the application.' });
    } catch (err) { res.json({ success: false, error: err.message }); }
  });
}

registerRoutes(expressApp);

// ── Start ─────────────────────────────────────────────────
const PORT = parseInt(process.env.SERVER_PORT || '3001');

log('KORENE Server starting...');
log(`Database: ${dbPath}`);

// Initialize database
try {
  Database.initialize();
  log('Database initialized.');
} catch (err) {
  log('FATAL: Could not initialize database: ' + err.message);
  console.error('FATAL: Could not initialize database:', err);
  process.exit(1);
}

// Start server
server.listen(PORT, '0.0.0.0', () => {
  log(`KORENE Server ONLINE on port ${PORT}`);
  console.log(`\n[KORENE Server] 🟢 ONLINE on port ${PORT}`);
  console.log(`[KORENE Server] Database: ${dbPath}`);
  console.log(`[KORENE Server] WebSocket: enabled`);
  console.log(`[KORENE Server] Clients: 0 connected`);
  console.log(`Press Ctrl+C to stop the server.\n`);
});

// Handle clean shutdown
process.on('SIGINT', () => {
  log('Received SIGINT, shutting down...');
  server.close(() => {
    Database.close();
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  log('Received SIGTERM, shutting down...');
  server.close(() => {
    Database.close();
    process.exit(0);
  });
});
