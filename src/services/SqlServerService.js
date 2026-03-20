const fs = require('fs');
const path = require('path');
const { app } = require('electron');

let mssql = null;

const loadMssql = () => {
  if (mssql) return mssql;
  try {
    // Lazy load so the app can start without SQL Server configured.
    // This avoids hard failure on machines without the dependency installed yet.
    mssql = require('mssql');
    return mssql;
  } catch (err) {
    const message = 'mssql package not available. Run npm install.';
    throw new Error(message);
  }
};

class SqlServerService {
  constructor() {
    this.pool = null;
    this.cachedConfig = null;
  }

  getConfigPath() {
    const dir = app.getPath('userData');
    return path.join(dir, 'config.json');
  }

  readConfigFile() {
    const cfgPath = this.getConfigPath();
    if (!fs.existsSync(cfgPath)) return {};
    try {
      return JSON.parse(fs.readFileSync(cfgPath, 'utf-8'));
    } catch (err) {
      console.warn('Failed to read config.json:', err.message);
      return {};
    }
  }

  writeConfigFile(next) {
    const cfgPath = this.getConfigPath();
    try {
      fs.writeFileSync(cfgPath, JSON.stringify(next));
      return true;
    } catch (err) {
      console.warn('Failed to write config.json:', err.message);
      return false;
    }
  }

  getSqlServerConfig() {
    if (this.cachedConfig) return this.cachedConfig;
    const cfg = this.readConfigFile();
    const sql = cfg.sql_server || {};
    const normalized = {
      enabled: !!sql.enabled,
      host: sql.host || '',
      port: Number(sql.port || 1433),
      database: sql.database || '',
      user: sql.user || '',
      password: sql.password || '',
      encrypt: sql.encrypt !== false,
      trustServerCertificate: sql.trustServerCertificate !== false,
      connectTimeout: Number(sql.connectTimeout || 15000),
      requestTimeout: Number(sql.requestTimeout || 30000)
    };
    this.cachedConfig = normalized;
    return normalized;
  }

  saveSqlServerConfig(next) {
    const cfg = this.readConfigFile();
    const updated = { ...cfg, sql_server: { ...next } };
    const ok = this.writeConfigFile(updated);
    if (ok) {
      this.cachedConfig = null;
    }
    return ok;
  }

  buildMssqlConfig(cfg) {
    return {
      server: cfg.host,
      port: cfg.port,
      database: cfg.database,
      user: cfg.user,
      password: cfg.password,
      options: {
        encrypt: !!cfg.encrypt,
        trustServerCertificate: !!cfg.trustServerCertificate
      },
      pool: {
        max: 5,
        min: 0,
        idleTimeoutMillis: 10000
      },
      connectionTimeout: cfg.connectTimeout,
      requestTimeout: cfg.requestTimeout
    };
  }

  async connect(override = null) {
    const sql = loadMssql();
    const cfg = override || this.getSqlServerConfig();
    if (!cfg.enabled) {
      throw new Error('SQL Server connection is disabled.');
    }
    if (!cfg.host || !cfg.database) {
      throw new Error('SQL Server host and database are required.');
    }

    if (this.pool) {
      if (this.pool.connected) return this.pool;
      try {
        await this.pool.connect();
        return this.pool;
      } catch (err) {
        await this.close();
      }
    }

    const pool = new sql.ConnectionPool(this.buildMssqlConfig(cfg));
    this.pool = await pool.connect();
    return this.pool;
  }

  async close() {
    if (this.pool) {
      try {
        await this.pool.close();
      } catch {}
      this.pool = null;
    }
  }

  async testConnection(override = null) {
    const sql = loadMssql();
    const cfg = override || this.getSqlServerConfig();
    const pool = await this.connect(cfg);
    const result = await pool.request().query('SELECT 1 AS ok');
    const ok = Array.isArray(result?.recordset) && result.recordset[0]?.ok === 1;
    return { success: ok, recordset: result?.recordset || [] };
  }

  async query(text, params = {}) {
    const sql = loadMssql();
    const pool = await this.connect();
    const req = pool.request();
    Object.entries(params || {}).forEach(([key, value]) => {
      req.input(key, value);
    });
    return await req.query(text);
  }
}

module.exports = new SqlServerService();
