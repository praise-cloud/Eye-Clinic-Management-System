#!/usr/bin/env node

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
const Database = require('./database.js');

async function setupDatabase() {
    console.log('🏥 Eye Clinic Database Setup');
    console.log('============================\n');

    // Generate random passwords for security
    const adminPassword = `Admin${Math.random().toString(36).slice(2, 10)}!`;
    const doctorPassword = `Doctor${Math.random().toString(36).slice(2, 10)}!`;
    const assistantPassword = `Asst${Math.random().toString(36).slice(2, 10)}!`;

    const dbPath = path.join(__dirname, 'eye_clinic.db');
    
    // Remove existing database if it exists
    if (fs.existsSync(dbPath)) {
        console.log('📁 Removing existing database...');
        fs.unlinkSync(dbPath);
    }

    console.log('📊 Creating new database...');
    
    // Use existing Database class
    const db = new Database(dbPath);

    try {
        // Initialize database (creates tables)
        await db.initialize();
        console.log('✅ Database tables created successfully');

        // Create default users
        console.log('👤 Creating default users...');
        
        await db.createUser({
            name: 'System Administrator',
            email: 'admin@clinic.com',
            password: adminPassword,
            role: 'admin',
            gender: 'other'
        });

        await db.createUser({
            name: 'Dr. John Smith',
            email: 'doctor@clinic.com',
            password: doctorPassword,
            role: 'doctor',
            gender: 'male'
        });

        await db.createUser({
            name: 'Mary Johnson',
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