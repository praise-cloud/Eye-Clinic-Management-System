const mssql = require('mssql');
const { sqlQuery } = require('../database');
const { authenticated } = require('../auth');

function getNotificationRoutes() {
    return [
        {
            method: 'get',
            path: '/api/notifications',
            handler: authenticated(async (req, res) => {
                try {
                    const result = await sqlQuery(
                        'SELECT * FROM notifications WHERE user_id = @uid ORDER BY created_at DESC',
                        [{ name: 'uid', type: mssql.VarChar, value: req.user.userId }]
                    );
                    res.json({ success: true, data: result.recordset });
                } catch (err) { res.status(500).json({ success: false, error: err.message }); }
            })
        },
        {
            method: 'put',
            path: '/api/notifications/:id/read',
            handler: authenticated(async (req, res) => {
                try {
                    await sqlQuery(
                        'UPDATE notifications SET is_read = 1, read_at = GETDATE() WHERE id = @id',
                        [{ name: 'id', type: mssql.VarChar, value: req.params.id }]
                    );
                    res.json({ success: true });
                } catch (err) { res.status(500).json({ success: false, error: err.message }); }
            })
        }
    ];
}

module.exports = { getNotificationRoutes };
