const { v4: uuidv4 } = require('uuid');
const mssql = require('mssql');
const { sqlQuery } = require('../database');
const { authenticated } = require('../auth');
const { broadcast } = require('../websocket');

function getSettingsRoutes() {
    return [
        {
            method: 'get',
            path: '/api/settings',
            handler: authenticated(async (req, res) => {
                try {
                    const { key, userId } = req.query;
                    const uid = userId || req.user.userId;
                    if (key) {
                        const result = await sqlQuery(
                            'SELECT * FROM settings WHERE setting_key=@key AND (user_id=@uid OR user_id IS NULL) ORDER BY user_id DESC',
                            [{ name: 'key', type: mssql.VarChar, value: key }, { name: 'uid', type: mssql.VarChar, value: uid }]
                        );
                        const row = result.recordset[0];
                        return res.json({ success: true, data: row ? { key: row.setting_key, value: row.setting_value, user_id: row.user_id } : null });
                    }
                    const result = await sqlQuery(
                        'SELECT * FROM settings WHERE user_id=@uid OR user_id IS NULL',
                        [{ name: 'uid', type: mssql.VarChar, value: uid }]
                    );
                    res.json({
                        success: true,
                        settings: result.recordset.map(row => ({ key: row.setting_key, value: row.setting_value, user_id: row.user_id }))
                    });
                } catch (err) { res.status(500).json({ success: false, error: err.message }); }
            })
        },
        {
            method: 'put',
            path: '/api/settings',
            handler: authenticated(async (req, res) => {
                try {
                    const { key, value, userId } = req.body;
                    const uid = userId || req.user.userId;
                    await sqlQuery(
                        `IF EXISTS (SELECT 1 FROM settings WHERE setting_key=@key AND user_id=@uid)
                           UPDATE settings SET setting_value=@val, updated_at=GETDATE() WHERE setting_key=@key AND user_id=@uid
                         ELSE
                           INSERT INTO settings (id,setting_key,setting_value,user_id,created_at,updated_at) VALUES (@id,@key,@val,@uid,GETDATE(),GETDATE())`,
                        [
                            { name: 'id', type: mssql.VarChar, value: uuidv4() },
                            { name: 'key', type: mssql.VarChar, value: key },
                            { name: 'val', type: mssql.VarChar, value: value },
                            { name: 'uid', type: mssql.VarChar, value: uid }
                        ]
                    );
                    broadcast('data:update', { table: 'settings', action: 'update', userId: uid });
                    res.json({ success: true });
                } catch (err) { res.status(500).json({ success: false, error: err.message }); }
            })
        }
    ];
}

module.exports = { getSettingsRoutes };
