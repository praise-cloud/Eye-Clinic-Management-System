const mssql = require('mssql');
const { sqlQuery } = require('../database');
const { authenticated } = require('../auth');
const { broadcast } = require('../websocket');

function getPresenceRoutes() {
    return [
        {
            method: 'get',
            path: '/api/presence/online',
            handler: authenticated(async (req, res) => {
                try {
                    const result = await sqlQuery(
                        `SELECT up.*, u.first_name, u.last_name, u.email, u.role FROM user_presence up JOIN users u ON up.user_id=u.id WHERE up.is_online=1`
                    );
                    res.json({ success: true, users: result.recordset });
                } catch (err) { res.status(500).json({ success: false, error: err.message }); }
            })
        },
        {
            method: 'post',
            path: '/api/presence/set-online',
            handler: authenticated(async (req, res) => {
                try {
                    await sqlQuery(
                        'UPDATE user_presence SET is_online = 1, last_seen = GETDATE() WHERE user_id = @uid',
                        [{ name: 'uid', type: mssql.VarChar, value: req.user.userId }]
                    );
                    broadcast('presence', { userId: req.user.userId, status: 'online' });
                    res.json({ success: true });
                } catch (err) { res.status(500).json({ success: false, error: err.message }); }
            })
        },
        {
            method: 'post',
            path: '/api/presence/set-offline',
            handler: authenticated(async (req, res) => {
                try {
                    await sqlQuery(
                        'UPDATE user_presence SET is_online = 0, last_seen = GETDATE() WHERE user_id = @uid',
                        [{ name: 'uid', type: mssql.VarChar, value: req.user.userId }]
                    );
                    broadcast('presence', { userId: req.user.userId, status: 'offline' });
                    res.json({ success: true });
                } catch (err) { res.status(500).json({ success: false, error: err.message }); }
            })
        }
    ];
}

module.exports = { getPresenceRoutes };
