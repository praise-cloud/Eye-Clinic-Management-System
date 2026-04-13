const { v4: uuidv4 } = require('uuid');
const mssql = require('mssql');
const { sqlQuery } = require('../database');
const { authenticated } = require('../auth');
const { broadcast } = require('../websocket');

function getReportRoutes() {
    return [
        {
            method: 'get',
            path: '/api/reports',
            handler: authenticated(async (req, res) => {
                try {
                    const { patient_id } = req.query;
                    const result = patient_id
                        ? await sqlQuery('SELECT * FROM reports WHERE patient_id=@pid ORDER BY created_at DESC', [{ name: 'pid', type: mssql.VarChar, value: patient_id }])
                        : await sqlQuery('SELECT * FROM reports ORDER BY created_at DESC');
                    res.json({ success: true, data: result.recordset });
                } catch (err) { res.status(500).json({ success: false, error: err.message }); }
            })
        },
        {
            method: 'post',
            path: '/api/reports',
            handler: authenticated(async (req, res) => {
                try {
                    const { patient_id, report_type, title, report_file } = req.body;
                    const id = uuidv4();
                    await sqlQuery(
                        `INSERT INTO reports (id, patient_id, report_type, title, report_file, created_at, updated_at) VALUES (@id, @pid, @type, @title, @file, GETDATE(), GETDATE())`,
                        [
                            { name: 'id', type: mssql.VarChar, value: id },
                            { name: 'pid', type: mssql.VarChar, value: patient_id },
                            { name: 'type', type: mssql.VarChar, value: report_type || 'general' },
                            { name: 'title', type: mssql.VarChar, value: title || '' },
                            { name: 'file', type: mssql.VarChar, value: report_file || '' }
                        ]
                    );
                    broadcast('data:update', { table: 'reports', action: 'create' });
                    res.json({ success: true, id });
                } catch (err) { res.status(500).json({ success: false, error: err.message }); }
            })
        },
        {
            method: 'delete',
            path: '/api/reports/:id',
            handler: authenticated(async (req, res) => {
                try {
                    await sqlQuery('DELETE FROM reports WHERE id = @id', [{ name: 'id', type: mssql.VarChar, value: req.params.id }]);
                    broadcast('data:update', { table: 'reports', action: 'delete' });
                    res.json({ success: true });
                } catch (err) { res.status(500).json({ success: false, error: err.message }); }
            })
        }
    ];
}

module.exports = { getReportRoutes };
