// scripts/setup-server.js
// Initializes the SQLite database with all tables and seeds the admin user
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const appDataPath = process.env.APPDATA || process.env.HOME || '';
const dbFolder = path.join(appDataPath, 'KORENE_EyeClinic');
const dbPath = path.join(dbFolder, 'eye_clinic.db');

console.log('========================================');
console.log('  KORENE Eye Clinic - Database Setup');
console.log('========================================\n');

// Parse command line args
const args = process.argv.slice(2);
let adminEmail = 'admin@clinic.com';
let adminPassword = 'admin123';

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--email' && args[i + 1]) adminEmail = args[++i];
  if (args[i] === '--password' && args[i + 1]) adminPassword = args[++i];
  if (args[i] === '--help') {
    console.log('Usage: node setup-server.js [--email email] [--password password]');
    console.log('Defaults: admin@clinic.com / admin123');
    return;
  }
}

// Ensure directory exists
if (!fs.existsSync(dbFolder)) {
  fs.mkdirSync(dbFolder, { recursive: true });
  console.log(`Created directory: ${dbFolder}`);
}

// Use the server database module
const Database = require('../electron/server/database');

console.log(`\nInitializing database at: ${dbPath}`);

try {
  Database.initialize();
  console.log('Database tables created.\n');
} catch (err) {
  console.error('FATAL: Could not initialize database:', err.message);
  process.exit(1);
}

// Seed admin user
console.log(`Seeding admin user: ${adminEmail}`);

try {
  const existing = Database.sqlGet('SELECT id FROM users WHERE email = ?', [adminEmail]);
  if (existing) {
    console.log(`Admin user '${adminEmail}' already exists, skipping.`);
  } else {
    const id = uuidv4();
    const hash = bcrypt.hashSync(adminPassword, 10);
    Database.sqlRun(
      `INSERT INTO users (id, first_name, last_name, email, password_hash, gender, role, phone_number, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, 'Admin', 'User', adminEmail, hash, '', 'admin', '', 'active']
    );
    console.log(`Admin user created: ${adminEmail} / ${adminPassword}`);
  }
} catch (err) {
  console.error('Admin seed failed:', err.message);
}

console.log('\n========================================');
console.log('  Setup complete!');
console.log(`  Database: ${dbPath}`);
console.log(`  Admin: ${adminEmail} / ${adminPassword}`);
console.log('========================================\n');
console.log('Next: Run "npm run start:server" to start the backend server.\n');
