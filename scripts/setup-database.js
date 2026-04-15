
const fs = require('fs');
const path = require('path');

// Mock Electron for database.js
const mockElectron = {
    app: {
        getPath: (name) => __dirname
    }
};

// Mock require for electron
const Module = require('module');
const originalRequire = Module.prototype.require;
Module.prototype.require = function(id) {
    if (id === 'electron') {
        return mockElectron;
    }
    return originalRequire.apply(this, arguments);
};

// Use existing Database class
const Database = require('../database.js');

async function setupDatabase() {
    console.log('🏥 Eye Clinic Database Setup');
    console.log('============================\n');

    // Generate random passwords for security
    const adminPassword = `Admin${Math.random().toString(36).slice(2, 10)}!`;
    const doctorPassword = `Doctor${Math.random().toString(36).slice(2, 10)}!`;
    const assistantPassword = `Asst${Math.random().toString(36).slice(2, 10)}!`;

    // Use the same path Database will use (scripts/eye_clinic.db)
    const dbPath = path.join(mockElectron.app.getPath('userData'), 'eye_clinic.db');

    // Remove existing database if it exists
    if (fs.existsSync(dbPath)) {
        console.log('📁 Removing existing database...');
        fs.unlinkSync(dbPath);
    }

    console.log('📊 Creating new database...');

    // Instantiate Database without passing a path (constructor ignores args)
    const db = new Database();

    try {
        // Initialize database (creates tables)
        await db.initialize();
        console.log('✅ Database tables created successfully');

        // Create default users (duplicate-safe)
        console.log('👤 Creating default users...');

        await ensureUser(db, {
            first_name: 'System',
            last_name: 'Administrator',
            email: 'admin@clinic.com',
            password: adminPassword,
            role: 'admin',
            gender: 'other'
        });

        await ensureUser(db, {
            first_name: 'John',
            last_name: 'Smith',
            email: 'doctor@clinic.com',
            password: doctorPassword,
            role: 'doctor',
            gender: 'male'
        });

        await ensureUser(db, {
            first_name: 'Mary',
            last_name: 'Johnson',
            email: 'assistant@clinic.com',
            password: assistantPassword,
            role: 'assistant',
            gender: 'female'
        });

        // Add initial settings
        await db.setSetting('clinic_name', 'KORENYE CLINIC NIG. LTD.');
        await db.setSetting('database_version', '1.0');
        await db.setSetting('initialized_at', new Date().toISOString());

        console.log('\n🎉 Database setup completed successfully!');
        console.log('\n📋 Default Login Credentials:');
        console.log('┌─────────────────────────────────────────┐');
        console.log('│ Admin:     admin@clinic.com / ' + adminPassword + '  │');
        console.log('│ Doctor:    doctor@clinic.com / ' + doctorPassword + ' │');
        console.log('│ Assistant: assistant@clinic.com / ' + assistantPassword.substring(0, 8) + '.. │');
        console.log('└─────────────────────────────────────────┘');
        console.log('\n📁 Database file created at:', dbPath);

    } catch (error) {
        console.error('❌ Database setup failed:', error);
    } finally {
        db.close();
    }
}

// Run setup
setupDatabase().catch(console.error);

// Safe helper to avoid UNIQUE constraint errors on repeated runs
async function ensureUser(db, user) {
    try {
        const existing = await db.get('SELECT id FROM users WHERE email = ?', [user.email.toLowerCase()]);
        if (existing?.id) {
            console.log(`ℹ️ ${user.email} already exists, skipping create.`);
            return existing.id;
        }
        const created = await db.createUser(user);
        console.log(`✅ Created user ${user.email} (${created.id})`);
        return created.id;
    } catch (err) {
        console.error('ensureUser error:', err);
        throw err;
    }
}
