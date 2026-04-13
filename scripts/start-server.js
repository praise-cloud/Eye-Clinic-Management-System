const express = require('express');
const cors = require('cors');
const http = require('http');
const path = require('path');
const fs = require('fs');
const mssql = require('mssql');

const DEFAULT_SQL_CONFIG = {
    server: process.env.DB_HOST || 'localhost\\SQLEXPRESS',
    database: process.env.DB_NAME || 'eye_clinic_db',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    options: {
        encrypt: false,
        trustServerCertificate: true,
        enableArithAbort: true
    }
};

if (!DEFAULT_SQL_CONFIG.user || !DEFAULT_SQL_CONFIG.password) {
    console.error('ERROR: DB_USER and DB_PASSWORD environment variables are required.');
    console.error('');
    console.error('On THIS computer (server), run these commands FIRST:');
    console.error('  set DB_USER=eyetest');
    console.error('  set DB_PASSWORD=EyeClinic123!');
    console.error('  npm run setup:server');
    console.error('  npm run start:server');
    console.error('');
    console.error('Then on OTHER computers (clients), configure in Settings > Server Connection');
    process.exit(1);
}

const { sqlQuery, initialize, close } = require('./electron/server/database');
const { setupWebSocket, closeAll, getClientCount } = require('./electron/server/websocket');
const { registerAllRoutes } = require('./electron/server/routes');
const { getServerStatus } = require('./electron/server/routes/server');

async function start() {
    console.log('========================================');
    console.log('  Eye Clinic - Backend Server');
    console.log('========================================\n');

    const configPath = path.join(process.env.APPDATA || process.env.HOME || '', 'KORENE_EyeClinic', 'server-config.json');
    try {
        if (fs.existsSync(configPath)) {
            const loaded = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
            DEFAULT_SQL_CONFIG.server = loaded.sql_host || DEFAULT_SQL_CONFIG.server;
            DEFAULT_SQL_CONFIG.port = parseInt(loaded.sql_port || 1433);
            DEFAULT_SQL_CONFIG.database = loaded.sql_database || DEFAULT_SQL_CONFIG.database;
            DEFAULT_SQL_CONFIG.user = loaded.sql_user || DEFAULT_SQL_CONFIG.user;
            DEFAULT_SQL_CONFIG.password = loaded.sql_password || DEFAULT_SQL_CONFIG.password;
        }
    } catch (e) {
        console.warn('[Config] Could not load server-config.json, using defaults/env vars');
    }

    console.log(`Connecting to SQL Server: ${DEFAULT_SQL_CONFIG.server}:${DEFAULT_SQL_CONFIG.port}/${DEFAULT_SQL_CONFIG.database}...`);
    try {
        await initialize();
    } catch (err) {
        console.error('FATAL: Could not connect to SQL Server.');
        console.error('Error:', err.message);
        console.error('\nRun "npm run setup:server" first to create the database.');
        process.exit(1);
    }

    const app = express();
    app.use(cors({ origin: true, credentials: true }));
    app.use(express.json({ limit: '50mb' }));
    app.use(express.urlencoded({ extended: true, limit: '50mb' }));

    const server = http.createServer(app);

    setupWebSocket(server);
    registerAllRoutes(app);

    const PORT = parseInt(process.env.SERVER_PORT || '3001');

    server.listen(PORT, '0.0.0.0', () => {
        console.log(`\n[Server] HTTP + WebSocket listening on port ${PORT}`);
        console.log(`[Server] JWT auth enabled (15min access, 7day refresh)`);
        console.log('[Server] Ready to accept client connections.\n');
    });

    process.on('SIGINT', async () => {
        console.log('\n[Server] Shutting down...');
        closeAll();
        await close();
        server.close(() => process.exit(0));
    });
}

start().catch(err => {
    console.error('FATAL:', err);
    process.exit(1);
});
