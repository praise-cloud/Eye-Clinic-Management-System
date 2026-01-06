// Electron mock for standalone Node execution (MUST be defined before requiring Database)
const Module = require('module');
const originalRequire = Module.prototype.require;
Module.prototype.require = function (id) {
  if (id === 'electron') {
    return {
      app: {
        // Use scripts folder as userData so it matches setup-database.js behavior
        getPath: () => __dirname
      }
    };
  }
  return originalRequire.apply(this, arguments);
};

// Load Database after mocking electron
const Database = require('../database/database.js');
const { app } = require('electron');

// Duplicate-safe helper: creates user if missing, otherwise skips
async function ensureUser(db, user) {
  const email = user.email.toLowerCase();
  const existing = await db.get('SELECT id FROM users WHERE email = ?', [email]);
  if (existing?.id) {
    console.log(`ℹ️ ${email} already exists, skipping create.`);
    return existing.id;
  }
  const created = await db.createUser(user);
  console.log(`✅ Created admin ${email} (${created.id})`);
  return created.id;
}

async function createAdmin() {
  const db = new Database();
  await db.initialize();

  try {
    const id = await ensureUser(db, {
      first_name: 'Admin',
      last_name: 'User',
      email: 'admin@clinic.com',
      password: 'admin123',
      gender: 'other',
      role: 'admin',
      phone_number: null
    });

    console.log('Admin user ready:', id);
    console.log('Email: admin@clinic.com');
    console.log('Password: admin123');
    process.exit(0);
  } catch (error) {
    console.error('Error creating admin:', error);
    process.exit(1);
  } finally {
    db.close();
  }
}

// Mock app.getPath for standalone script
if (!app || !app.getPath) {
  const path = require('path');
  global.app = {
    getPath: () => path.join(__dirname, '..')
  };
}

createAdmin();
