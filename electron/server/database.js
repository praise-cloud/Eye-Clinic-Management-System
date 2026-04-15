// electron/server/database.js
// SQLite database for KORENE backend using better-sqlite3
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

let db = null;

function getDbPath() {
  const appDataPath = process.env.APPDATA || process.env.HOME || '';
  const dbFolder = path.join(appDataPath, 'KORENE_EyeClinic');
  if (!fs.existsSync(dbFolder)) {
    fs.mkdirSync(dbFolder, { recursive: true });
  }
  return path.join(dbFolder, 'eye_clinic.db');
}

function getDb() {
  if (!db) {
    const dbPath = getDbPath();
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    db.pragma('busy_timeout = 5000');
    console.log('[DB] Connected to SQLite at:', dbPath);
    initializeTables();
  }
  return db;
}

function initializeTables() {
  const database = db;

  // 1. users
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      gender TEXT DEFAULT 'other',
      role TEXT NOT NULL CHECK (role IN ('admin', 'doctor', 'assistant')),
      phone_number TEXT,
      status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 2. patients
  database.exec(`
    CREATE TABLE IF NOT EXISTS patients (
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
    )
  `);

  // 3. visits (NEW)
  database.exec(`
    CREATE TABLE IF NOT EXISTS visits (
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
    )
  `);

  // 4. tests
  database.exec(`
    CREATE TABLE IF NOT EXISTS tests (
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
    )
  `);

  // 5. reports
  database.exec(`
    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL,
      report_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      report_type TEXT DEFAULT 'visual_field_report',
      title TEXT,
      report_file TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (patient_id) REFERENCES patients(id)
    )
  `);

  // 6. chat
  database.exec(`
    CREATE TABLE IF NOT EXISTS chat (
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
    )
  `);

  // 7. inventory
  database.exec(`
    CREATE TABLE IF NOT EXISTS inventory (
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
      purchase_date DATE,
      expiry_date DATE,
      location TEXT,
      status TEXT DEFAULT 'active',
      last_updated_by TEXT,
      notes TEXT,
      image_path TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 8. pharmacy_drugs
  database.exec(`
    CREATE TABLE IF NOT EXISTS pharmacy_drugs (
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
      expiry_date DATE,
      last_updated_by TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 9. pharmacy_dispensations
  database.exec(`
    CREATE TABLE IF NOT EXISTS pharmacy_dispensations (
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
    )
  `);

  // 10. prescriptions
  database.exec(`
    CREATE TABLE IF NOT EXISTS prescriptions (
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
    )
  `);

  // 11. prescription_dispensations (NEW)
  database.exec(`
    CREATE TABLE IF NOT EXISTS prescription_dispensations (
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
    )
  `);

  // 12. revenue
  database.exec(`
    CREATE TABLE IF NOT EXISTS revenue (
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
    )
  `);

  // 13. activity_logs
  database.exec(`
    CREATE TABLE IF NOT EXISTS activity_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      action_type TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      description TEXT NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // 14. settings
  database.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      id TEXT PRIMARY KEY,
      setting_key TEXT UNIQUE NOT NULL,
      setting_value TEXT,
      user_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 15. user_presence
  database.exec(`
    CREATE TABLE IF NOT EXISTS user_presence (
      user_id TEXT PRIMARY KEY,
      is_online INTEGER DEFAULT 0,
      last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
      session_id TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // 16. notifications
  database.exec(`
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL,
      related_id TEXT,
      status TEXT DEFAULT 'unread' CHECK (status IN ('read', 'unread')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // 17. case_notes (NEW)
  database.exec(`
    CREATE TABLE IF NOT EXISTS case_notes (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL,
      visit_id TEXT,
      test_id TEXT,
      doctor_id TEXT NOT NULL,
      chief_complaint TEXT,
      visual_acuity_od TEXT,
      visual_acuity_os TEXT,
      intraocular_pressure_od TEXT,
      intraocular_pressure_os TEXT,
      cvf_analysis_od TEXT,
      cvf_analysis_os TEXT,
      diagnosis TEXT,
      recommendation TEXT,
      next_appointment DATE,
      status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'signed')),
      signed_off_by TEXT,
      signed_off_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (patient_id) REFERENCES patients(id),
      FOREIGN KEY (doctor_id) REFERENCES users(id)
    )
  `);

  // 18. case_note_attachments (NEW)
  database.exec(`
    CREATE TABLE IF NOT EXISTS case_note_attachments (
      id TEXT PRIMARY KEY,
      case_note_id TEXT NOT NULL,
      test_id TEXT,
      attachment_type TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_name TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (case_note_id) REFERENCES case_notes(id)
    )
  `);

  // 19. appointment_reminders (NEW)
  database.exec(`
    CREATE TABLE IF NOT EXISTS appointment_reminders (
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
    )
  `);

  console.log('[DB] All tables initialized.');
}

function sqlQuery(sql, params = []) {
  const database = getDb();
  try {
    const stmt = database.prepare(sql);
    if (params && params.length > 0) {
      return stmt.all(...params);
    }
    return stmt.all();
  } catch (err) {
    console.error('[DB] Query error:', err.message, 'SQL:', sql);
    throw err;
  }
}

function sqlRun(sql, params = []) {
  const database = getDb();
  try {
    const stmt = database.prepare(sql);
    if (params && params.length > 0) {
      return stmt.run(...params);
    }
    return stmt.run();
  } catch (err) {
    console.error('[DB] Run error:', err.message, 'SQL:', sql);
    throw err;
  }
}

function sqlGet(sql, params = []) {
  const database = getDb();
  try {
    const stmt = database.prepare(sql);
    if (params && params.length > 0) {
      return stmt.get(...params);
    }
    return stmt.get();
  } catch (err) {
    console.error('[DB] Get error:', err.message, 'SQL:', sql);
    throw err;
  }
}

function sqlInsert(sql, params = []) {
  const result = sqlRun(sql, params);
  return result.changes > 0;
}

function close() {
  if (db) {
    db.close();
    db = null;
    console.log('[DB] Connection closed.');
  }
}

function initialize() {
  getDb();
}

module.exports = {
  getDb,
  sqlQuery,
  sqlRun,
  sqlGet,
  sqlInsert,
  close,
  initialize
};
