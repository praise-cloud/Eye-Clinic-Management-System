const { v4: uuidv4 } = require('uuid');
const mssql = require('mssql');
const { sqlQuery } = require('../database');
const { authenticated, authenticatedDoctorOrAdmin } = require('../auth');
const { broadcast } = require('../websocket');

function getTestRoutes() {
    return [
        {
            method: 'get',
            path: '/api/tests',
            handler: authenticated(async (req, res) => {
                try {
                    const { patient_id, limit = 100, offset = 0 } = req.query;
                    let query = 'SELECT * FROM tests';
                    const params = [];
                    if (patient_id) {
                        query += ' WHERE patient_id = @pid';
                        params.push({ name: 'pid', type: mssql.VarChar, value: patient_id });
                    }
                    query += ` ORDER BY created_at DESC OFFSET ${parseInt(offset)} ROWS FETCH NEXT ${parseInt(limit)} ROWS ONLY`;
                    const result = await sqlQuery(query, params);
                    res.json({ success: true, data: result.recordset });
                } catch (err) { res.status(500).json({ success: false, error: err.message }); }
            })
        },
        {
            method: 'get',
            path: '/api/tests/:id',
            handler: authenticated(async (req, res) => {
                try {
                    const result = await sqlQuery('SELECT * FROM tests WHERE id = @id', [{ name: 'id', type: mssql.VarChar, value: req.params.id }]);
                    if (!result.recordset[0]) return res.status(404).json({ success: false, error: 'Not found' });
                    res.json({ success: true, data: result.recordset[0] });
                } catch (err) { res.status(500).json({ success: false, error: err.message }); }
            })
        },
        {
            method: 'post',
            path: '/api/tests',
            handler: authenticated(async (req, res) => {
                authenticatedDoctorOrAdmin(async (reqInner, resInner) => {
                    try {
                        const { patient_id, eye, machine_type, raw_data } = reqInner.body;
                        const id = uuidv4();
                        const rd = typeof raw_data === 'string' ? raw_data : JSON.stringify(raw_data || {});
                        await sqlQuery(
                            `INSERT INTO tests (id, patient_id, eye, machine_type, raw_data, created_at, updated_at) VALUES (@id, @pid, @eye, @mt, @rd, GETDATE(), GETDATE())`,
                            [
                                { name: 'id', type: mssql.VarChar, value: id },
                                { name: 'pid', type: mssql.VarChar, value: patient_id },
                                { name: 'eye', type: mssql.VarChar, value: eye || 'both' },
                                { name: 'mt', type: mssql.VarChar, value: machine_type || '' },
                                { name: 'rd', type: mssql.VarChar, value: rd }
                            ]
                        );
                        broadcast('data:update', { table: 'tests', action: 'create' });
                        resInner.json({ success: true, id });
                    } catch (err) { resInner.status(500).json({ success: false, error: err.message }); }
                })(req, res, () => {});
            })
        },
        {
            method: 'put',
            path: '/api/tests/:id',
            handler: authenticated(async (req, res) => {
                authenticatedDoctorOrAdmin(async (reqInner, resInner) => {
                    try {
                        const { eye, machine_type, raw_data } = reqInner.body;
                        await sqlQuery(
                            `UPDATE tests SET eye=@eye, machine_type=@mt, raw_data=@rd, updated_at=GETDATE() WHERE id=@id`,
                            [
                                { name: 'eye', type: mssql.VarChar, value: eye || 'both' },
                                { name: 'mt', type: mssql.VarChar, value: machine_type || '' },
                                { name: 'rd', type: mssql.VarChar, value: typeof raw_data === 'string' ? raw_data : JSON.stringify(raw_data || {}) },
                                { name: 'id', type: mssql.VarChar, value: reqInner.params.id }
                            ]
                        );
                        broadcast('data:update', { table: 'tests', action: 'update' });
                        resInner.json({ success: true });
                    } catch (err) { resInner.status(500).json({ success: false, error: err.message }); }
                })(req, res, () => {});
            })
        },
        {
            method: 'delete',
            path: '/api/tests/:id',
            handler: authenticated(async (req, res) => {
                authenticatedDoctorOrAdmin(async (reqInner, resInner) => {
                    try {
                        await sqlQuery('DELETE FROM tests WHERE id = @id', [{ name: 'id', type: mssql.VarChar, value: reqInner.params.id }]);
                        broadcast('data:update', { table: 'tests', action: 'delete' });
                        resInner.json({ success: true });
                    } catch (err) { resInner.status(500).json({ success: false, error: err.message }); }
                })(req, res, () => {});
            })
        }
    ];
}

module.exports = { getTestRoutes };
