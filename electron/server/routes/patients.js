const { v4: uuidv4 } = require('uuid');
const mssql = require('mssql');
const { sqlQuery } = require('../database');
const { authenticated } = require('../auth');
const { broadcast } = require('../websocket');

function getPatientRoutes() {
    return [
        {
            method: 'get',
            path: '/api/patients',
            handler: authenticated(async (req, res) => {
                try {
                    const { search, limit = 100, offset = 0 } = req.query;
                    let query = 'SELECT * FROM patients';
                    const params = [];
                    if (search) {
                        query += ' WHERE first_name LIKE @s OR last_name LIKE @s OR patient_id LIKE @s';
                        params.push({ name: 's', type: mssql.VarChar, value: `%${search}%` });
                    }
                    query += ` ORDER BY created_at DESC OFFSET ${parseInt(offset)} ROWS FETCH NEXT ${parseInt(limit)} ROWS ONLY`;
                    const result = await sqlQuery(query, params);
                    res.json({ success: true, data: result.recordset, total: result.recordset.length });
                } catch (err) { res.status(500).json({ success: false, error: err.message }); }
            })
        },
        {
            method: 'get',
            path: '/api/patients/:id',
            handler: authenticated(async (req, res) => {
                try {
                    const result = await sqlQuery('SELECT * FROM patients WHERE id = @id', [{ name: 'id', type: mssql.VarChar, value: req.params.id }]);
                    if (!result.recordset[0]) return res.status(404).json({ success: false, error: 'Not found' });
                    res.json({ success: true, data: result.recordset[0] });
                } catch (err) { res.status(500).json({ success: false, error: err.message }); }
            })
        },
        {
            method: 'post',
            path: '/api/patients',
            handler: authenticated(async (req, res) => {
                try {
                    const { patient_id, first_name, last_name, dob, gender, contact, email, address, reason_for_visit, client_type, marital_status, intake_date } = req.body;
                    const id = uuidv4();
                    await sqlQuery(
                        `INSERT INTO patients (id, patient_id, first_name, last_name, dob, gender, contact, email, address, reason_for_visit, client_type, marital_status, intake_date, created_at, updated_at)
                         VALUES (@id, @pid, @fn, @ln, @dob, @g, @c, @e, @addr, @rv, @ct, @ms, @idt, GETDATE(), GETDATE())`,
                        [
                            { name: 'id', type: mssql.VarChar, value: id },
                            { name: 'pid', type: mssql.VarChar, value: patient_id || id },
                            { name: 'fn', type: mssql.VarChar, value: first_name },
                            { name: 'ln', type: mssql.VarChar, value: last_name },
                            { name: 'dob', type: mssql.VarChar, value: dob || null },
                            { name: 'g', type: mssql.VarChar, value: gender || '' },
                            { name: 'c', type: mssql.VarChar, value: contact || '' },
                            { name: 'e', type: mssql.VarChar, value: email || '' },
                            { name: 'addr', type: mssql.VarChar, value: address || '' },
                            { name: 'rv', type: mssql.VarChar, value: reason_for_visit || '' },
                            { name: 'ct', type: mssql.VarChar, value: client_type || '' },
                            { name: 'ms', type: mssql.VarChar, value: marital_status || '' },
                            { name: 'idt', type: mssql.VarChar, value: intake_date || null }
                        ]
                    );
                    const patientResult = await sqlQuery('SELECT * FROM patients WHERE id = @id', [{ name: 'id', type: mssql.VarChar, value: id }]);
                    const patient = patientResult.recordset[0];
                    broadcast('data:update', { table: 'patients', action: 'create', record: patient });
                    res.json({ success: true, id, patient });
                } catch (err) { res.status(500).json({ success: false, error: err.message }); }
            })
        },
        {
            method: 'put',
            path: '/api/patients/:id',
            handler: authenticated(async (req, res) => {
                try {
                    const { first_name, last_name, dob, gender, contact, email, address, reason_for_visit, client_type, marital_status, intake_date } = req.body;
                    await sqlQuery(
                        `UPDATE patients SET first_name=@fn, last_name=@ln, dob=@dob, gender=@g, contact=@c, email=@e, address=@addr, reason_for_visit=@rv, client_type=@ct, marital_status=@ms, intake_date=@idt, updated_at=GETDATE() WHERE id=@id`,
                        [
                            { name: 'fn', type: mssql.VarChar, value: first_name },
                            { name: 'ln', type: mssql.VarChar, value: last_name },
                            { name: 'dob', type: mssql.VarChar, value: dob || null },
                            { name: 'g', type: mssql.VarChar, value: gender || '' },
                            { name: 'c', type: mssql.VarChar, value: contact || '' },
                            { name: 'e', type: mssql.VarChar, value: email || '' },
                            { name: 'addr', type: mssql.VarChar, value: address || '' },
                            { name: 'rv', type: mssql.VarChar, value: reason_for_visit || '' },
                            { name: 'ct', type: mssql.VarChar, value: client_type || '' },
                            { name: 'ms', type: mssql.VarChar, value: marital_status || '' },
                            { name: 'idt', type: mssql.VarChar, value: intake_date || null },
                            { name: 'id', type: mssql.VarChar, value: req.params.id }
                        ]
                    );
                    const patientResult = await sqlQuery('SELECT * FROM patients WHERE id = @id', [{ name: 'id', type: mssql.VarChar, value: req.params.id }]);
                    const patient = patientResult.recordset[0];
                    broadcast('data:update', { table: 'patients', action: 'update', record: patient });
                    res.json({ success: true, patient });
                } catch (err) { res.status(500).json({ success: false, error: err.message }); }
            })
        },
        {
            method: 'delete',
            path: '/api/patients/:id',
            handler: authenticated(async (req, res) => {
                try {
                    await sqlQuery('DELETE FROM patients WHERE id = @id', [{ name: 'id', type: mssql.VarChar, value: req.params.id }]);
                    broadcast('data:update', { table: 'patients', action: 'delete' });
                    res.json({ success: true });
                } catch (err) { res.status(500).json({ success: false, error: err.message }); }
            })
        }
    ];
}

module.exports = { getPatientRoutes };
