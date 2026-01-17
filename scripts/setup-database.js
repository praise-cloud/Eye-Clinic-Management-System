
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
const Database = require('../database/database.js');

async function setupDatabase() {
    console.log('🏥 Eye Clinic Database Setup');
    console.log('============================\n');

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
            password: 'admin123',
            role: 'admin',
            gender: 'other'
        });

        await ensureUser(db, {
            first_name: 'John',
            last_name: 'Smith',
            email: 'doctor@clinic.com',
            password: 'doctor123',
            role: 'doctor',
            gender: 'male'
        });

        await ensureUser(db, {
            first_name: 'Mary',
            last_name: 'Johnson',
            email: 'assistant@clinic.com',
            password: 'assistant123',
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
        console.log('│ Admin:     admin@clinic.com / admin123  │');
        console.log('│ Doctor:    doctor@clinic.com / doctor123│');
        console.log('│ Assistant: assistant@clinic.com / assi..│');
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
