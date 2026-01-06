const Database = require('../database/database.js');
const path = require('path');

async function initializeDatabase() {
    console.log('Initializing Eye Clinic Database...');

    try {
        // Create database instance with explicit path
        const dbPath = path.join(__dirname, 'eye_clinic.db');
        const db = new Database(dbPath);

        // Initialize database and create tables
        await db.initialize();

        // Check if this is first run
        const isFirstRun = await db.isFirstRun();
        console.log('Is first run:', isFirstRun);

        if (isFirstRun) {
            console.log('Creating default admin user...');

            // Create default admin user
            await db.createUser({
                first_name: 'System',
                last_name: 'Administrator',
                email: 'admin@clinic.com',
                password: 'admin123',
                role: 'admin',
                gender: 'other'
            });

            // Set initial settings
            await db.setSetting('clinic_name', 'KORENYE CLINIC NIG. LTD.');
            await db.setSetting('database_version', '1.0');
            await db.setSetting('initialized_at', new Date().toISOString());

            console.log('Default admin user created:');
            console.log('Email: admin@clinic.com');
            console.log('Password: admin123');
        }

        // Close database connection
        db.close();

        console.log('Database initialization completed successfully!');
        console.log('Database file created at:', dbPath);

    } catch (error) {
        console.error('Database initialization failed:', error);
        process.exit(1);
    }
}

// Run initialization
initializeDatabase();
