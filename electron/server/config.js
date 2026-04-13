const path = require('path');
const fs = require('fs');

const JWT_SECRET = process.env.JWT_SECRET || 'eye-clinic-secret-key';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'eye-clinic-refresh-secret';
const ACCESS_TTL = '15m';
const REFRESH_TTL = '7d';

const DEFAULT_SQL_CONFIG = {
    server: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '1433'),
    database: process.env.DB_NAME || 'eye_clinic_db',
    user: process.env.DB_USER || '',
    password: process.env.DB_PASSWORD || '',
    options: {
        encrypt: true,
        trustServerCertificate: true,
        enableArithAbort: true
    }
};

function loadSqlConfig() {
    const configPath = path.join(process.env.APPDATA || process.env.HOME || '', 'KORENE_EyeClinic', 'server-config.json');
    let sqlConfig = null;
    try {
        if (fs.existsSync(configPath)) {
            const loaded = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
            sqlConfig = {
                server: loaded.sql_host || DEFAULT_SQL_CONFIG.server,
                port: parseInt(loaded.sql_port || DEFAULT_SQL_CONFIG.port),
                database: loaded.sql_database || DEFAULT_SQL_CONFIG.database,
                user: loaded.sql_user || DEFAULT_SQL_CONFIG.user,
                password: loaded.sql_password || DEFAULT_SQL_CONFIG.password,
                options: { encrypt: true, trustServerCertificate: true, enableArithAbort: true }
            };
        }
    } catch {}
    return sqlConfig || DEFAULT_SQL_CONFIG;
}

module.exports = {
    JWT_SECRET,
    JWT_REFRESH_SECRET,
    ACCESS_TTL,
    REFRESH_TTL,
    DEFAULT_SQL_CONFIG,
    loadSqlConfig
};
