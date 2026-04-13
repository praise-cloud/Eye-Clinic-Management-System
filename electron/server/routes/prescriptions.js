const { v4: uuidv4 } = require('uuid');
const mssql = require('mssql');
const { sqlQuery } = require('../database');
const { authenticated, authenticatedDoctorOrAdmin } = require('../auth');
const { broadcast } = require('../websocket');

function getPrescriptionRoutes() {
    return [
        {
            method: 'get',
            path: '/api/prescriptions/pending',
            handler: authenticated(async (req, res) => {
                try {
                    const result = await sqlQuery(
                        `SELECT p.*, pt.first_name+' '+pt.last_name as patient_name, u.first_name+' '+u.last_name as doctor_name, d.drug_name
                         FROM prescriptions p
                         JOIN patients pt ON p.patient_id=pt.id
                         JOIN users u ON p.doctor_id=u.id
                         JOIN pharmacy_drugs d ON p.drug_id=d.id
                         WHERE p.status='pending' ORDER BY p.created_at DESC`
                    );
                    res.json({ success: true, data: result.recordset });
                } catch (err) { res.status(500).json({ success: false, error: err.message }); }
            })
        },
        {
            method: 'post',
            path: '/api/prescriptions',
            handler: authenticated(async (req, res) => {
                authenticatedDoctorOrAdmin(async (reqInner, resInner) => {
                    try {
                        const { patient_id, drug_id, quantity, instructions } = reqInner.body;
                        const id = uuidv4();
                        await sqlQuery(
                            `INSERT INTO prescriptions (id, patient_id, doctor_id, drug_id, quantity, instructions, status, created_at, updated_at) VALUES (@id, @pid, @did, @drgid, @qty, @inst, 'pending', GETDATE(), GETDATE())`,
                            [
                                { name: 'id', type: mssql.VarChar, value: id },
                                { name: 'pid', type: mssql.VarChar, value: patient_id },
                                { name: 'did', type: mssql.VarChar, value: reqInner.user.userId },
                                { name: 'drgid', type: mssql.VarChar, value: drug_id },
                                { name: 'qty', type: mssql.Int, value: quantity },
                                { name: 'inst', type: mssql.VarChar, value: instructions || '' }
                            ]
                        );
                        broadcast('data:update', { table: 'prescriptions', action: 'create' });
                        resInner.json({ success: true, id });
                    } catch (err) { resInner.status(500).json({ success: false, error: err.message }); }
                })(req, res, () => {});
            })
        },
        {
            method: 'put',
            path: '/api/prescriptions/:id/status',
            handler: authenticated(async (req, res) => {
                try {
                    const { status } = req.body;
                    await sqlQuery(
                        'UPDATE prescriptions SET status=@s, updated_at=GETDATE() WHERE id=@id',
                        [{ name: 's', type: mssql.VarChar, value: status }, { name: 'id', type: mssql.VarChar, value: req.params.id }]
                    );
                    broadcast('data:update', { table: 'prescriptions', action: 'update' });
                    res.json({ success: true });
                } catch (err) { res.status(500).json({ success: false, error: err.message }); }
            })
        }
    ];
}

module.exports = { getPrescriptionRoutes };
