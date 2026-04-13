const mssql = require('mssql');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const DEFAULT_CONFIG = {
  server: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '1433'),
  database: 'master',
  user: process.env.DB_USER || '',
  password: process.env.DB_PASSWORD || '',
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true
  }
};

const schemas = {
  users: `CREATE TABLE users (
    id NVARCHAR(36) PRIMARY KEY,
    first_name NVARCHAR(100) NOT NULL,
    last_name NVARCHAR(100) NOT NULL,
    email NVARCHAR(255) UNIQUE NOT NULL,
    password_hash NVARCHAR(255) NOT NULL,
    gender NVARCHAR(20) NOT NULL DEFAULT '',
    role NVARCHAR(20) NOT NULL CHECK (role IN ('admin', 'doctor', 'assistant')),
    phone_number NVARCHAR(50),
    status NVARCHAR(20) DEFAULT 'active',
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE()
  )`,

  patients: `CREATE TABLE patients (
    id NVARCHAR(36) PRIMARY KEY,
    patient_id NVARCHAR(50) UNIQUE NOT NULL,
    first_name NVARCHAR(100) NOT NULL,
    last_name NVARCHAR(100) NOT NULL,
    dob DATE,
    gender NVARCHAR(20),
    contact NVARCHAR(50),
    email NVARCHAR(255),
    address NVARCHAR(500),
    reason_for_visit NVARCHAR(MAX),
    client_type NVARCHAR(50),
    marital_status NVARCHAR(20),
    intake_date DATE,
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE()
  )`,

  tests: `CREATE TABLE tests (
    id NVARCHAR(36) PRIMARY KEY,
    patient_id NVARCHAR(36) NOT NULL,
    test_date DATETIME DEFAULT GETDATE(),
    eye NVARCHAR(20),
    machine_type NVARCHAR(100),
    raw_data NVARCHAR(MAX),
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (patient_id) REFERENCES patients(id)
  )`,

  reports: `CREATE TABLE reports (
    id NVARCHAR(36) PRIMARY KEY,
    patient_id NVARCHAR(36) NOT NULL,
    report_date DATETIME DEFAULT GETDATE(),
    report_type NVARCHAR(50) DEFAULT 'visual_field_report',
    title NVARCHAR(255),
    report_file NVARCHAR(MAX),
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (patient_id) REFERENCES patients(id)
  )`,

  chat: `CREATE TABLE chat (
    id NVARCHAR(36) PRIMARY KEY,
    sender_id NVARCHAR(36) NOT NULL,
    receiver_id NVARCHAR(36) NOT NULL,
    message_text NVARCHAR(MAX) NOT NULL,
    attachment NVARCHAR(MAX),
    timestamp DATETIME DEFAULT GETDATE(),
    status NVARCHAR(20) DEFAULT 'unread',
    reply_to_id NVARCHAR(36),
    FOREIGN KEY (sender_id) REFERENCES users(id),
    FOREIGN KEY (receiver_id) REFERENCES users(id)
  )`,

  inventory: `CREATE TABLE inventory (
    id NVARCHAR(36) PRIMARY KEY,
    item_code NVARCHAR(50) UNIQUE NOT NULL,
    item_name NVARCHAR(255) NOT NULL,
    category NVARCHAR(50) NOT NULL,
    description NVARCHAR(MAX),
    manufacturer NVARCHAR(255),
    model_number NVARCHAR(100),
    serial_number NVARCHAR(100),
    current_quantity INT DEFAULT 0,
    minimum_quantity INT DEFAULT 0,
    maximum_quantity INT DEFAULT 100,
    unit_of_measure NVARCHAR(20) DEFAULT 'pieces',
    unit_cost DECIMAL(10,2) DEFAULT 0,
    supplier_name NVARCHAR(255),
    supplier_contact NVARCHAR(255),
    purchase_date DATE,
    expiry_date DATE,
    location NVARCHAR(255),
    status NVARCHAR(20) DEFAULT 'active',
    last_updated_by NVARCHAR(36),
    notes NVARCHAR(MAX),
    image_path NVARCHAR(500),
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (last_updated_by) REFERENCES users(id)
  )`,

  pharmacy_drugs: `CREATE TABLE pharmacy_drugs (
    id NVARCHAR(36) PRIMARY KEY,
    drug_code NVARCHAR(50) UNIQUE NOT NULL,
    drug_name NVARCHAR(255) NOT NULL,
    drug_form NVARCHAR(30) NOT NULL,
    strength NVARCHAR(50) NOT NULL,
    pack_size INT NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    current_quantity INT DEFAULT 0,
    minimum_quantity INT DEFAULT 0,
    status NVARCHAR(20) DEFAULT 'active',
    supplier_name NVARCHAR(255),
    supplier_contact NVARCHAR(255),
    expiry_date DATE,
    last_updated_by NVARCHAR(36),
    notes NVARCHAR(MAX),
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (last_updated_by) REFERENCES users(id)
  )`,

  pharmacy_dispensations: `CREATE TABLE pharmacy_dispensations (
    id NVARCHAR(36) PRIMARY KEY,
    drug_id NVARCHAR(36) NOT NULL,
    patient_id NVARCHAR(36) NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL,
    user_id NVARCHAR(36) NOT NULL,
    notes NVARCHAR(MAX),
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (drug_id) REFERENCES pharmacy_drugs(id),
    FOREIGN KEY (patient_id) REFERENCES patients(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`,

  revenue: `CREATE TABLE revenue (
    id NVARCHAR(36) PRIMARY KEY,
    source NVARCHAR(50) NOT NULL,
    source_id NVARCHAR(36),
    amount DECIMAL(12,2) NOT NULL,
    currency NVARCHAR(10) DEFAULT 'NGN',
    user_id NVARCHAR(36),
    patient_id NVARCHAR(36),
    description NVARCHAR(MAX),
    meta NVARCHAR(MAX),
    timestamp DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (patient_id) REFERENCES patients(id)
  )`,

  activity_logs: `CREATE TABLE activity_logs (
    id NVARCHAR(36) PRIMARY KEY,
    user_id NVARCHAR(36) NOT NULL,
    action_type NVARCHAR(50) NOT NULL,
    entity_type NVARCHAR(50) NOT NULL,
    entity_id NVARCHAR(36),
    description NVARCHAR(MAX) NOT NULL,
    ip_address NVARCHAR(50),
    user_agent NVARCHAR(500),
    timestamp DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`,

  settings: `CREATE TABLE settings (
    id NVARCHAR(36) PRIMARY KEY,
    setting_key NVARCHAR(100) NOT NULL,
    setting_value NVARCHAR(MAX),
    user_id NVARCHAR(36),
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE(),
    UNIQUE(setting_key, user_id)
  )`,

  user_presence: `CREATE TABLE user_presence (
    user_id NVARCHAR(36) PRIMARY KEY,
    is_online BIT DEFAULT 0,
    last_seen DATETIME DEFAULT GETDATE(),
    session_id NVARCHAR(100),
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`,

  prescriptions: `CREATE TABLE prescriptions (
    id NVARCHAR(36) PRIMARY KEY,
    patient_id NVARCHAR(36) NOT NULL,
    doctor_id NVARCHAR(36) NOT NULL,
    drug_id NVARCHAR(36) NOT NULL,
    quantity INT NOT NULL,
    instructions NVARCHAR(MAX),
    status NVARCHAR(20) DEFAULT 'pending',
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (patient_id) REFERENCES patients(id),
    FOREIGN KEY (doctor_id) REFERENCES users(id),
    FOREIGN KEY (drug_id) REFERENCES pharmacy_drugs(id)
  )`,

  notifications: `CREATE TABLE notifications (
    id NVARCHAR(36) PRIMARY KEY,
    user_id NVARCHAR(36) NOT NULL,
    title NVARCHAR(255) NOT NULL,
    message NVARCHAR(MAX) NOT NULL,
    type NVARCHAR(50) NOT NULL,
    related_id NVARCHAR(36),
    status NVARCHAR(20) DEFAULT 'unread',
    created_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`
};

async function run() {
  console.log('========================================');
  console.log('  Eye Clinic - SQL Server Setup');
  console.log('========================================\n');

  let config = { ...DEFAULT_CONFIG };

  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--host' && args[i + 1]) config.server = args[++i];
    else if (args[i] === '--port' && args[i + 1]) config.port = parseInt(args[++i]);
    else if (args[i] === '--user' && args[i + 1]) config.user = args[++i];
    else if (args[i] === '--password' && args[i + 1]) config.password = args[++i];
    else if (args[i] === '--admin-email' && args[i + 1]) process.env.ADMIN_EMAIL = args[++i];
    else if (args[i] === '--admin-password' && args[i + 1]) process.env.ADMIN_PASSWORD = args[++i];
    else if (args[i] === '--help') {
      console.log('Usage: node setup-server.js [options]');
      console.log('Options:');
      console.log('  --host <server>       SQL Server host (default: localhost)');
      console.log('  --port <port>         SQL Server port (default: 1433)');
      console.log('  --user <username>     SQL Server username');
      console.log('  --password <pass>     SQL Server password');
      console.log('  --admin-email <email> Admin email (default: admin@clinic.com)');
      console.log('  --admin-password <pw> Admin password (default: admin123)');
      console.log('  --help                Show this help');
      console.log('\nEnvironment variables: DB_USER, DB_PASSWORD');
      return;
    }
  }

  console.log(`Connecting to SQL Server: ${config.server}:${config.port}...`);

  let pool;
  try {
    pool = await mssql.connect(config);
    console.log('Connected to SQL Server.\n');
  } catch (err) {
    console.error('FATAL: Could not connect to SQL Server.');
    console.error('Error:', err.message);
    console.error('\nMake sure:');
    console.error('  1. SQL Server is running');
    console.error('  2. Credentials are correct (use --user and --password flags or DB_USER/DB_PASSWORD env vars)');
    console.error('  3. The server host/instance is correct (use --host flag or DB_HOST env var)');
    process.exit(1);
  }

  const dbName = 'eye_clinic_db';

  try {
    console.log(`Creating database '${dbName}'...`);
    await pool.query(`IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = '${dbName}') CREATE DATABASE ${dbName}`);
    console.log(`Database '${dbName}' ready.`);
  } catch (err) {
    console.error('Failed to create database:', err.message);
    await pool.close();
    process.exit(1);
  }

  await pool.close();

  config.database = dbName;
  console.log(`\nConnecting to '${dbName}'...`);

  try {
    pool = await mssql.connect(config);
  } catch (err) {
    console.error('FATAL: Could not connect to database:', err.message);
    process.exit(1);
  }

  console.log('Creating tables...\n');

  for (const [tableName, createSQL] of Object.entries(schemas)) {
    try {
      await pool.query(`IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = '${tableName}') ${createSQL}`);
      console.log(`  [OK] ${tableName}`);
    } catch (err) {
      console.error(`  [FAIL] ${tableName}: ${err.message}`);
    }
  }

  console.log('\nSeeding admin user...');

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@clinic.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

  try {
    const req = pool.request();
    req.input('email', mssql.VarChar, adminEmail);
    const existing = await req.query(`SELECT id FROM users WHERE email = @email`);
    if (existing.recordset.length > 0) {
      console.log(`  Admin user '${adminEmail}' already exists, skipping.`);
    } else {
      const hash = await bcrypt.hash(adminPassword, 10);
      const req2 = pool.request();
      req2.input('id', mssql.VarChar, uuidv4());
      req2.input('fn', mssql.VarChar, 'Admin');
      req2.input('ln', mssql.VarChar, 'User');
      req2.input('email', mssql.VarChar, adminEmail);
      req2.input('hash', mssql.VarChar, hash);
      req2.input('gender', mssql.VarChar, '');
      req2.input('role', mssql.VarChar, 'admin');
      req2.input('phone', mssql.VarChar, '');
      req2.input('status', mssql.VarChar, 'active');
      await req2.query(
        `INSERT INTO users (id, first_name, last_name, email, password_hash, gender, role, phone_number, status, created_at, updated_at)
         VALUES (@id, @fn, @ln, @email, @hash, @gender, @role, @phone, @status, GETDATE(), GETDATE())`
      );
      console.log(`  [OK] Admin user created: ${adminEmail} / ${adminPassword}`);
    }
  } catch (err) {
    console.error('  [FAIL] Admin seed:', err.message);
  }

  await pool.close();

  console.log('\n========================================');
  console.log('  Setup complete!');
  console.log(`  Database: ${dbName}`);
  console.log(`  Admin: ${adminEmail} / ${adminPassword}`);
  console.log('========================================');
  console.log('\nNext: Run "npm run start:server" to start the backend.');
}

run().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
