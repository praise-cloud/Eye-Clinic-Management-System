// database.js
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

let BetterSqlite3;
try {
  BetterSqlite3 = require('better-sqlite3');
} catch (err) {
  console.error('[Database] better-sqlite3 failed to load:', err.message);
  BetterSqlite3 = null;
}

class Database {
  constructor(dbPath = null) {
    this.dbPath = dbPath || this.resolveDbPath();
    this.db = null;
  }

  resolveDbPath() {
    try {
      const { app } = require('electron');
      const userDataPath = app.getPath('userData');
      if (!fs.existsSync(userDataPath)) {
        fs.mkdirSync(userDataPath, { recursive: true });
      }
      return path.join(userDataPath, 'eye_clinic.db');
    } catch (error) {
      console.warn('[Database] Fallback path used:', error.message);
      return path.join(__dirname, 'eye_clinic.db');
    }
  }

  async initialize() {
    if (!BetterSqlite3) {
      throw new Error('better-sqlite3 is not available');
    }

    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    console.log('[Database] Initializing at:', this.dbPath);

    this.db = new BetterSqlite3(this.dbPath, { verbose: null });
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');

    await this.createTables();
    console.log('[Database] Ready');
    return this;
  }

  // Wrap better-sqlite3 sync calls in async interface
  // so all existing code that uses await still works
  async run(sql, params = []) {
    try {
      const stmt = this.db.prepare(sql);
      const result = stmt.run(params);
      return { lastID: result.lastInsertRowid, changes: result.changes };
    } catch (err) {
      throw err;
    }
  }

  async all(sql, params = []) {
    try {
      const stmt = this.db.prepare(sql);
      return stmt.all(params);
    } catch (err) {
      throw err;
    }
  }

  async get(sql, params = []) {
    try {
      const stmt = this.db.prepare(sql);
      return stmt.get(params);
    } catch (err) {
      throw err;
    }
  }

  async createTables() {
    const queries = [
      `CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        gender TEXT NOT NULL DEFAULT 'other',
        role TEXT NOT NULL CHECK (role IN ('admin', 'doctor', 'assistant')),
        phone_number TEXT,
        status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
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
      `CREATE TABLE IF NOT EXISTS visits (
        id TEXT PRIMARY KEY,
        patient_id TEXT NOT NULL,
        visit_date DATE NOT NULL,
        visit_type TEXT DEFAULT 'follow_up',
        reason TEXT,
        payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'partial')),
        amount_paid REAL DEFAULT 0,
        linked_prescription_id TEXT,
        created_by TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (patient_id) REFERENCES patients(id)
      )`,
      `CREATE TABLE IF NOT EXISTS tests (
        id TEXT PRIMARY KEY,
        patient_id TEXT NOT NULL,
        visit_id TEXT,
        test_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        eye TEXT CHECK (eye IN ('left', 'right', 'both')),
        machine_type TEXT,
        raw_data TEXT,
        report_status TEXT DEFAULT 'pending',
        created_by TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (patient_id) REFERENCES patients(id)
      )`,
      `CREATE TABLE IF NOT EXISTS reports (
        id TEXT PRIMARY KEY,
        patient_id TEXT NOT NULL,
        report_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        report_type TEXT DEFAULT 'visual_field_report',
        title TEXT,
        report_file TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (patient_id) REFERENCES patients(id)
      )`,
      `CREATE TABLE IF NOT EXISTS chat (
        id TEXT PRIMARY KEY,
        sender_id TEXT NOT NULL,
        receiver_id TEXT NOT NULL,
        message_text TEXT NOT NULL,
        attachment TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        status TEXT DEFAULT 'unread' CHECK (status IN ('read', 'unread')),
        reply_to_id TEXT,
        FOREIGN KEY (sender_id) REFERENCES users(id),
        FOREIGN KEY (receiver_id) REFERENCES users(id)
      )`,
      `CREATE TABLE IF NOT EXISTS inventory (
        id TEXT PRIMARY KEY,
        item_code TEXT UNIQUE NOT NULL,
        item_name TEXT NOT NULL,
        category TEXT NOT NULL,
        description TEXT,
        manufacturer TEXT,
        model_number TEXT,
        serial_number TEXT,
        current_quantity INTEGER DEFAULT 0,
        minimum_quantity INTEGER DEFAULT 0,
        maximum_quantity INTEGER DEFAULT 100,
        unit_of_measure TEXT DEFAULT 'pieces',
        unit_cost REAL DEFAULT 0,
        supplier_name TEXT,
        supplier_contact TEXT,
        purchase_date TEXT,
        expiry_date TEXT,
        location TEXT,
        status TEXT DEFAULT 'active',
        last_updated_by TEXT,
        notes TEXT,
        image_path TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS pharmacy_drugs (
        id TEXT PRIMARY KEY,
        drug_code TEXT UNIQUE NOT NULL,
        drug_name TEXT NOT NULL,
        drug_form TEXT,
        strength TEXT,
        pack_size INTEGER DEFAULT 1,
        unit_price REAL DEFAULT 0,
        current_quantity INTEGER DEFAULT 0,
        minimum_quantity INTEGER DEFAULT 0,
        status TEXT DEFAULT 'active',
        supplier_name TEXT,
        supplier_contact TEXT,
        expiry_date TEXT,
        last_updated_by TEXT,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS pharmacy_dispensations (
        id TEXT PRIMARY KEY,
        prescription_id TEXT,
        drug_id TEXT NOT NULL,
        patient_id TEXT NOT NULL,
        visit_id TEXT,
        quantity INTEGER NOT NULL,
        unit_price REAL DEFAULT 0,
        total_amount REAL NOT NULL,
        user_id TEXT NOT NULL,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (drug_id) REFERENCES pharmacy_drugs(id),
        FOREIGN KEY (patient_id) REFERENCES patients(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )`,
      `CREATE TABLE IF NOT EXISTS prescriptions (
        id TEXT PRIMARY KEY,
        patient_id TEXT NOT NULL,
        visit_id TEXT,
        case_note_id TEXT,
        doctor_id TEXT NOT NULL,
        prescription_type TEXT DEFAULT 'drug' CHECK (prescription_type IN ('drug', 'glasses')),
        drug_id TEXT,
        quantity INTEGER DEFAULT 1,
        instructions TEXT,
        glasses_details TEXT,
        glasses_amount_adjusted REAL DEFAULT 0,
        glasses_adjustment_notes TEXT,
        status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'dispensed', 'cancelled', 'pending_return')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (patient_id) REFERENCES patients(id),
        FOREIGN KEY (doctor_id) REFERENCES users(id),
        FOREIGN KEY (drug_id) REFERENCES pharmacy_drugs(id)
      )`,
      `CREATE TABLE IF NOT EXISTS prescription_dispensations (
        id TEXT PRIMARY KEY,
        prescription_id TEXT NOT NULL,
        patient_id TEXT NOT NULL,
        visit_id TEXT,
        dispensed_by TEXT NOT NULL,
        dispensed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        payment_received REAL DEFAULT 0,
        payment_type TEXT DEFAULT 'cash',
        payment_status TEXT DEFAULT 'paid' CHECK (payment_status IN ('paid', 'pending', 'waived')),
        glasses_amount_adjusted REAL DEFAULT 0,
        glasses_adjustment_notes TEXT,
        notes TEXT,
        FOREIGN KEY (prescription_id) REFERENCES prescriptions(id),
        FOREIGN KEY (patient_id) REFERENCES patients(id),
        FOREIGN KEY (dispensed_by) REFERENCES users(id)
      )`,
      `CREATE TABLE IF NOT EXISTS revenue (
        id TEXT PRIMARY KEY,
        source TEXT NOT NULL,
        source_id TEXT,
        amount REAL NOT NULL,
        currency TEXT DEFAULT 'NGN',
        user_id TEXT,
        patient_id TEXT,
        visit_id TEXT,
        collected_by TEXT,
        description TEXT,
        meta TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        type TEXT NOT NULL,
        related_id TEXT,
        status TEXT DEFAULT 'unread' CHECK (status IN ('read', 'unread')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )`,
      `CREATE TABLE IF NOT EXISTS activity_logs (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        action_type TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT,
        description TEXT NOT NULL,
        ip_address TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )`,
      `CREATE TABLE IF NOT EXISTS settings (
        id TEXT PRIMARY KEY,
        key TEXT UNIQUE NOT NULL,
        value TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS user_presence (
        user_id TEXT PRIMARY KEY,
        is_online INTEGER DEFAULT 0,
        last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
        session_id TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )`,
      `CREATE TABLE IF NOT EXISTS case_notes (
        id TEXT PRIMARY KEY,
        patient_id TEXT NOT NULL,
        visit_id TEXT,
        test_id TEXT,
        doctor_id TEXT NOT NULL,
        
        -- Patient Visit Info
        visit_date DATE,
        chief_complaint TEXT,
        history_of_present_illness TEXT,
        duration TEXT,
        affected_eye TEXT CHECK (affected_eye IN ('OD', 'OS', 'OU', 'both')),
        
        -- Visual Acuity
        va_distance_uncorrected_od TEXT,
        va_distance_uncorrected_os TEXT,
        va_distance_glasses_od TEXT,
        va_distance_glasses_os TEXT,
        va_distance_pinhole_od TEXT,
        va_distance_pinhole_os TEXT,
        va_near_uncorrected_od TEXT,
        va_near_uncorrected_os TEXT,
        va_near_glasses_od TEXT,
        va_near_glasses_os TEXT,
        va_best_corrected_od TEXT,
        va_best_corrected_os TEXT,
        
        -- Refraction
        refraction_sphere_od TEXT,
        refraction_sphere_os TEXT,
        refraction_cylinder_od TEXT,
        refraction_cylinder_os TEXT,
        refraction_axis_od TEXT,
        refraction_axis_os TEXT,
        refraction_add_od TEXT,
        refraction_add_os TEXT,
        
        -- Intraocular Pressure
        intraocular_pressure_od TEXT,
        intraocular_pressure_os TEXT,
        iop_method TEXT,
        
        -- Anterior Segment
        anterior_segment_od TEXT,
        anterior_segment_os TEXT,
        
        -- Posterior Segment
        posterior_segment_od TEXT,
        posterior_segment_os TEXT,
        
        -- Diagnostic Tests
        diagnostic_tests TEXT,
        cvf_analysis_od TEXT,
        cvf_analysis_os TEXT,
        oct_findings TEXT,
        
        -- Assessment & Diagnosis
        diagnosis TEXT,
        differential_diagnosis TEXT,
        severity TEXT,
        
        -- Treatment Plan
        treatment_plan TEXT,
        medications TEXT,
        procedures TEXT,
        follow_up_date DATE,
        follow_up_instructions TEXT,
        
        -- Status & Sign-off
        status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'signed', 'completed')),
        signed_off_by TEXT,
        signed_off_at DATETIME,
        
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (patient_id) REFERENCES patients(id),
        FOREIGN KEY (doctor_id) REFERENCES users(id)
      )`,
      `CREATE TABLE IF NOT EXISTS case_note_attachments (
        id TEXT PRIMARY KEY,
        case_note_id TEXT NOT NULL,
        test_id TEXT,
        attachment_type TEXT NOT NULL,
        file_path TEXT NOT NULL,
        file_name TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (case_note_id) REFERENCES case_notes(id)
      )`,
      `CREATE TABLE IF NOT EXISTS appointment_reminders (
        id TEXT PRIMARY KEY,
        patient_id TEXT NOT NULL,
        case_note_id TEXT,
        visit_id TEXT,
        appointment_date DATE NOT NULL,
        reminder_for TEXT NOT NULL,
        status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'cancelled')),
        notified_to TEXT NOT NULL,
        notified_at DATETIME,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (patient_id) REFERENCES patients(id)
      )`
    ];

    for (const sql of queries) {
      await this.run(sql);
    }

    await this.runMigrations();
  }

  async runMigrations() {
    const addColumnIfMissing = async (table, column, type) => {
      try {
        const info = await this.all(`PRAGMA table_info(${table})`);
        const exists = info.some(c => c.name === column);
        if (!exists) {
          await this.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
          console.log(`[Migration] Added ${table}.${column}`);
        }
      } catch (e) {
        console.warn(`[Migration] ${table}.${column} skipped:`, e.message);
      }
    };

    await addColumnIfMissing('users', 'gender', "TEXT NOT NULL DEFAULT 'other'");
    await addColumnIfMissing('users', 'phone_number', 'TEXT');
    await addColumnIfMissing('patients', 'email', 'TEXT');
    await addColumnIfMissing('patients', 'client_type', 'TEXT');
    await addColumnIfMissing('patients', 'marital_status', 'TEXT');
    await addColumnIfMissing('patients', 'reason_for_visit', 'TEXT');
    await addColumnIfMissing('patients', 'intake_date', 'DATE');
    await addColumnIfMissing('pharmacy_dispensations', 'unit_price', 'REAL DEFAULT 0');
    await addColumnIfMissing('pharmacy_dispensations', 'prescription_id', 'TEXT');
    await addColumnIfMissing('pharmacy_dispensations', 'visit_id', 'TEXT');
    await addColumnIfMissing('revenue', 'patient_id', 'TEXT');
    await addColumnIfMissing('revenue', 'visit_id', 'TEXT');
    await addColumnIfMissing('revenue', 'collected_by', 'TEXT');
    await addColumnIfMissing('chat', 'attachment', 'TEXT');
    await addColumnIfMissing('chat', 'reply_to_id', 'TEXT');
    await addColumnIfMissing('tests', 'visit_id', 'TEXT');
    await addColumnIfMissing('tests', 'report_status', "TEXT DEFAULT 'pending'");
    await addColumnIfMissing('tests', 'created_by', 'TEXT');
    await addColumnIfMissing('prescriptions', 'visit_id', 'TEXT');
    await addColumnIfMissing('prescriptions', 'case_note_id', 'TEXT');
    await addColumnIfMissing('prescriptions', 'prescription_type', "TEXT DEFAULT 'drug'");
    await addColumnIfMissing('prescriptions', 'glasses_details', 'TEXT');
    await addColumnIfMissing('prescriptions', 'glasses_amount_adjusted', 'REAL DEFAULT 0');
    await addColumnIfMissing('prescriptions', 'glasses_adjustment_notes', 'TEXT');
    await addColumnIfMissing('prescriptions', 'status', "TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'dispensed', 'cancelled', 'pending_return'))");
    
    // Case Notes migrations - comprehensive ophthalmology fields
    await addColumnIfMissing('case_notes', 'visit_date', 'DATE');
    await addColumnIfMissing('case_notes', 'history_of_present_illness', 'TEXT');
    await addColumnIfMissing('case_notes', 'duration', 'TEXT');
    await addColumnIfMissing('case_notes', 'affected_eye', 'TEXT');
    await addColumnIfMissing('case_notes', 'va_distance_uncorrected_od', 'TEXT');
    await addColumnIfMissing('case_notes', 'va_distance_uncorrected_os', 'TEXT');
    await addColumnIfMissing('case_notes', 'va_distance_glasses_od', 'TEXT');
    await addColumnIfMissing('case_notes', 'va_distance_glasses_os', 'TEXT');
    await addColumnIfMissing('case_notes', 'va_distance_pinhole_od', 'TEXT');
    await addColumnIfMissing('case_notes', 'va_distance_pinhole_os', 'TEXT');
    await addColumnIfMissing('case_notes', 'va_near_uncorrected_od', 'TEXT');
    await addColumnIfMissing('case_notes', 'va_near_uncorrected_os', 'TEXT');
    await addColumnIfMissing('case_notes', 'va_near_glasses_od', 'TEXT');
    await addColumnIfMissing('case_notes', 'va_near_glasses_os', 'TEXT');
    await addColumnIfMissing('case_notes', 'va_best_corrected_od', 'TEXT');
    await addColumnIfMissing('case_notes', 'va_best_corrected_os', 'TEXT');
    await addColumnIfMissing('case_notes', 'refraction_sphere_od', 'TEXT');
    await addColumnIfMissing('case_notes', 'refraction_sphere_os', 'TEXT');
    await addColumnIfMissing('case_notes', 'refraction_cylinder_od', 'TEXT');
    await addColumnIfMissing('case_notes', 'refraction_cylinder_os', 'TEXT');
    await addColumnIfMissing('case_notes', 'refraction_axis_od', 'TEXT');
    await addColumnIfMissing('case_notes', 'refraction_axis_os', 'TEXT');
    await addColumnIfMissing('case_notes', 'refraction_add_od', 'TEXT');
    await addColumnIfMissing('case_notes', 'refraction_add_os', 'TEXT');
    await addColumnIfMissing('case_notes', 'iop_method', 'TEXT');
    await addColumnIfMissing('case_notes', 'anterior_segment_od', 'TEXT');
    await addColumnIfMissing('case_notes', 'anterior_segment_os', 'TEXT');
    await addColumnIfMissing('case_notes', 'posterior_segment_od', 'TEXT');
    await addColumnIfMissing('case_notes', 'posterior_segment_os', 'TEXT');
    await addColumnIfMissing('case_notes', 'diagnostic_tests', 'TEXT');
    await addColumnIfMissing('case_notes', 'oct_findings', 'TEXT');
    await addColumnIfMissing('case_notes', 'differential_diagnosis', 'TEXT');
    await addColumnIfMissing('case_notes', 'severity', 'TEXT');
    await addColumnIfMissing('case_notes', 'treatment_plan', 'TEXT');
    await addColumnIfMissing('case_notes', 'medications', 'TEXT');
    await addColumnIfMissing('case_notes', 'procedures', 'TEXT');
    await addColumnIfMissing('case_notes', 'follow_up_date', 'DATE');
    await addColumnIfMissing('case_notes', 'follow_up_instructions', 'TEXT');
    await addColumnIfMissing('case_notes', 'status', "TEXT DEFAULT 'draft'");
  }

  async isFirstRun() {
    try {
      const row = await this.get('SELECT COUNT(*) as count FROM users');
      return row.count === 0;
    } catch {
      return true;
    }
  }

  async createUser(userData) {
    const { first_name, last_name, email, password, role, gender, phone_number } = userData;
    const passwordHash = await bcrypt.hash(password, 10);
    const userId = uuidv4();

    await this.run(
      `INSERT INTO users (id, first_name, last_name, email, password_hash, gender, role, phone_number)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, first_name, last_name, email, passwordHash, gender || 'other', role, phone_number || null]
    );

    return { id: userId, first_name, last_name, email, role, gender: gender || 'other', phone_number };
  }

  async authenticateUser(email, password) {
    const user = await this.get('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) return null;
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return null;
    const { password_hash, ...safe } = user;
    return safe;
  }

  async getAllUsers() {
    return this.all(
      'SELECT id, first_name, last_name, email, role, phone_number, status, gender, created_at FROM users ORDER BY created_at DESC'
    );
  }

  async updateUser(userId, userData) {
    const { first_name, last_name, email, role, phone_number, gender, password } = userData;
    const sets = [];
    const params = [];

    if (first_name !== undefined) { sets.push('first_name = ?'); params.push(first_name); }
    if (last_name !== undefined) { sets.push('last_name = ?'); params.push(last_name); }
    if (email !== undefined) { sets.push('email = ?'); params.push(email); }
    if (role !== undefined) { sets.push('role = ?'); params.push(role); }
    if (phone_number !== undefined) { sets.push('phone_number = ?'); params.push(phone_number || null); }
    if (gender !== undefined) { sets.push('gender = ?'); params.push(gender || 'other'); }
    if (password) {
      sets.push('password_hash = ?');
      params.push(await bcrypt.hash(password, 10));
    }

    if (sets.length === 0) throw new Error('No fields to update');
    sets.push('updated_at = CURRENT_TIMESTAMP');
    params.push(userId);

    await this.run(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`, params);
    return { id: userId, first_name, last_name, email, role, phone_number, gender };
  }

  async updateUserStatus(userId, isActive) {
    const status = isActive ? 'active' : 'inactive';
    await this.run(`UPDATE users SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [status, userId]);
    return { id: userId, status };
  }

  async deleteUser(userId) {
    const result = await this.run(`DELETE FROM users WHERE id = ?`, [userId]);
    return { success: result.changes > 0 };
  }

  async setUserOnline(userId, sessionId = null) {
    return this.run(
      `INSERT INTO user_presence (user_id, is_online, last_seen, session_id) VALUES (?, 1, CURRENT_TIMESTAMP, ?)
       ON CONFLICT(user_id) DO UPDATE SET is_online = 1, last_seen = CURRENT_TIMESTAMP, session_id = excluded.session_id`,
      [userId, sessionId]
    );
  }

  async setUserOffline(userId) {
    return this.run(
      `UPDATE user_presence SET is_online = 0, last_seen = CURRENT_TIMESTAMP WHERE user_id = ?`,
      [userId]
    );
  }

  async getOnlineUsers() {
    return this.all(
      `SELECT u.id, u.first_name, u.last_name, u.email, u.role, p.last_seen
       FROM users u JOIN user_presence p ON u.id = p.user_id
       WHERE p.is_online = 1 ORDER BY u.first_name`
    );
  }

  async getUsersWithPresence() {
    return this.all(
      `SELECT u.id, u.first_name, u.last_name, u.email, u.role, u.phone_number,
              COALESCE(p.is_online, 0) as is_online, p.last_seen
       FROM users u LEFT JOIN user_presence p ON u.id = p.user_id
       ORDER BY p.is_online DESC, u.first_name`
    );
  }

  // Case Notes CRUD
  async createCaseNote(data) {
    const id = uuidv4();
    const {
      patient_id, visit_id, doctor_id, visit_date, chief_complaint, history_of_present_illness, duration,
      affected_eye, va_distance_uncorrected_od, va_distance_uncorrected_os, va_distance_glasses_od, va_distance_glasses_os,
      va_distance_pinhole_od, va_distance_pinhole_os, va_near_uncorrected_od, va_near_uncorrected_os,
      va_near_glasses_od, va_near_glasses_os, va_best_corrected_od, va_best_corrected_os,
      refraction_sphere_od, refraction_sphere_os, refraction_cylinder_od, refraction_cylinder_os,
      refraction_axis_od, refraction_axis_os, refraction_add_od, refraction_add_os,
      intraocular_pressure_od, intraocular_pressure_os, iop_method,
      anterior_segment_od, anterior_segment_os, posterior_segment_od, posterior_segment_os,
      diagnostic_tests, cvf_analysis_od, cvf_analysis_os, oct_findings,
      diagnosis, differential_diagnosis, severity, treatment_plan, medications, procedures,
      follow_up_date, follow_up_instructions, status
    } = data;
    
    await this.run(
      `INSERT INTO case_notes (
        id, patient_id, visit_id, doctor_id, visit_date, chief_complaint, history_of_present_illness, duration,
        affected_eye, va_distance_uncorrected_od, va_distance_uncorrected_os, va_distance_glasses_od, va_distance_glasses_os,
        va_distance_pinhole_od, va_distance_pinhole_os, va_near_uncorrected_od, va_near_uncorrected_os,
        va_near_glasses_od, va_near_glasses_os, va_best_corrected_od, va_best_corrected_os,
        refraction_sphere_od, refraction_sphere_os, refraction_cylinder_od, refraction_cylinder_os,
        refraction_axis_od, refraction_axis_os, refraction_add_od, refraction_add_os,
        intraocular_pressure_od, intraocular_pressure_os, iop_method,
        anterior_segment_od, anterior_segment_os, posterior_segment_od, posterior_segment_os,
        diagnostic_tests, cvf_analysis_od, cvf_analysis_os, oct_findings,
        diagnosis, differential_diagnosis, severity, treatment_plan, medications, procedures,
        follow_up_date, follow_up_instructions, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, patient_id, visit_id || null, doctor_id, visit_date || null, chief_complaint, history_of_present_illness, duration,
        affected_eye, va_distance_uncorrected_od, va_distance_uncorrected_os, va_distance_glasses_od, va_distance_glasses_os,
        va_distance_pinhole_od, va_distance_pinhole_os, va_near_uncorrected_od, va_near_uncorrected_os,
        va_near_glasses_od, va_near_glasses_os, va_best_corrected_od, va_best_corrected_os,
        refraction_sphere_od, refraction_sphere_os, refraction_cylinder_od, refraction_cylinder_os,
        refraction_axis_od, refraction_axis_os, refraction_add_od, refraction_add_os,
        intraocular_pressure_od, intraocular_pressure_os, iop_method,
        anterior_segment_od, anterior_segment_os, posterior_segment_od, posterior_segment_os,
        diagnostic_tests, cvf_analysis_od, cvf_analysis_os, oct_findings,
        diagnosis, differential_diagnosis, severity, treatment_plan, medications, procedures,
        follow_up_date || null, follow_up_instructions, status || 'draft']
    );
    return { id, ...data };
  }

  async getCaseNotesByPatient(patientId) {
    return this.all(
      `SELECT cn.*, u.first_name as doctor_first_name, u.last_name as doctor_last_name
       FROM case_notes cn
       JOIN users u ON cn.doctor_id = u.id
       WHERE cn.patient_id = ?
       ORDER BY cn.created_at DESC`,
      [patientId]
    );
  }

  async getCaseNoteById(id) {
    return this.get(
      `SELECT cn.*, u.first_name as doctor_first_name, u.last_name as doctor_last_name,
              p.first_name as patient_first_name, p.last_name as patient_last_name
       FROM case_notes cn
       JOIN users u ON cn.doctor_id = u.id
       JOIN patients p ON cn.patient_id = p.id
       WHERE cn.id = ?`,
      [id]
    );
  }

  async updateCaseNote(id, data) {
    const fields = Object.keys(data).filter(k => k !== 'id');
    const set = fields.map(f => `${f} = ?`).join(', ');
    const values = fields.map(f => data[f]);
    
    await this.run(
      `UPDATE case_notes SET ${set}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [...values, id]
    );
    return { id, ...data };
  }

  async deleteCaseNote(id) {
    await this.run('DELETE FROM case_notes WHERE id = ?', [id]);
    return { success: true };
  }

  async getSetting(key) {
    const row = await this.get('SELECT value FROM settings WHERE key = ?', [key]);
    return row ? row.value : null;
  }

  async setSetting(key, value) {
    return this.run(
      `INSERT INTO settings (id, key, value) VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`,
      [uuidv4(), key, value]
    );
  }

  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
      console.log('[Database] Closed');
    }
  }
}

module.exports = Database;