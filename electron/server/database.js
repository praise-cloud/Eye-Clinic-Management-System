const mssql = require('mssql');
const { loadSqlConfig } = require('./config');

let pool = null;
let sqlConfig = null;

async function initialize() {
    sqlConfig = loadSqlConfig();
    pool = await mssql.connect(sqlConfig);
    console.log(`[Server] Connected to SQL Server: ${sqlConfig.server}:${sqlConfig.port}/${sqlConfig.database}`);
}

async function sqlQuery(query, params = []) {
    if (!pool) throw new Error('Database not connected');
    const req = pool.request();
    for (const p of params) req.input(p.name, p.type, p.value);
    return req.query(query);
}

function getPool() {
    return pool;
}

async function close() {
    if (pool) {
        await mssql.close();
        pool = null;
    }
}

module.exports = {
    initialize,
    sqlQuery,
    getPool,
    close
};
