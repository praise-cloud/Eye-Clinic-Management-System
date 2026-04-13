const { v4: uuidv4 } = require('uuid');
const mssql = require('mssql');
const { sqlQuery } = require('../database');
const { authenticated } = require('../auth');

function getActivityLogRoutes() {
    return [
        {
            method: 'get',
            path: '/api/activity-logs',
            handler: authenticated(async (req, res) => {
                try {
                    const { limit = 200 } = req.query;
                    const result = await sqlQuery(
                        `SELECT al.*, u.first_name+' '+u.last_name as user_name FROM activity_logs al JOIN users u ON al.user_id=u.id ORDER BY al.timestamp DESC OFFSET 0 ROWS FETCH NEXT ${parseInt(limit)} ROWS ONLY`
                    );
                    res.json({ success: true, data: result.recordset });
                } catch (err) { res.status(500).json({ success: false, error: err.message }); }
            })
        },
        {
            method: 'post',
            path: '/api/activity-logs',
            handler: authenticated(async (req, res) => {
                try {
                    const { action_type, entity_type, entity_id, description, ip_address, user_agent } = req.body;
                    const id = uuidv4();
                    await sqlQuery(
                        `INSERT INTO activity_logs (id, user_id, action_type, entity_type, entity_id, description, ip_address, user_agent, timestamp) VALUES (@id, @uid, @at, @et, @eid, @desc, @ip, @ua, GETDATE())`,
                        [
                            { name: 'id', type: mssql.VarChar, value: id },
                            { name: 'uid', type: mssql.VarChar, value: req.user.userId },
                            { name: 'at', type: mssql.VarChar, value: action_type },
                            { name: 'et', type: mssql.VarChar, value: entity_type },
                            { name: 'eid', type: mssql.VarChar, value: entity_id || null },
                            { name: 'desc', type: mssql.VarChar, value: description },
                            { name: 'ip', type: mssql.VarChar, value: ip_address || '' },
                            { name: 'ua', type: mssql.VarChar, value: user_agent || '' }
                        ]
                    );
                    res.json({ success: true, id });
                } catch (err) { res.status(500).json({ success: false, error: err.message }); }
            })
        }
    ];
}

module.exports = { getActivityLogRoutes };
