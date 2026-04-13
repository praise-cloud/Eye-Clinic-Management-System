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
                    res.json({ success: true, data: result.recordset, prescriptions: result.recordset });
                } catch (err) { res.status(500).json({ success: false, error: err.message }); }
            })
        },
        {
            method: 'get',
            path: '/api/prescriptions',
            handler: authenticated(async (req, res) => {
                try {
                    const { patientId } = req.query;
                    let query = 'SELECT p.*, pt.first_name, pt.last_name, u.first_name, u.last_name, d.drug_name FROM prescriptions p JOIN patients pt ON p.patient_id=pt.id JOIN users u ON p.doctor_id=u.id JOIN pharmacy_drugs d ON p.drug_id=d.id';
                    const params = [];
                    if (patientId) {
                        query += ' WHERE p.patient_id=@pid';
                        params.push({ name: 'pid', type: mssql.VarChar, value: patientId });
                    }
                    query += ' ORDER BY p.created_at DESC';
                    const result = await sqlQuery(query, params);
                    res.json({ success: true, data: result.recordset, prescriptions: result.recordset });
                } catch (err) { res.status(500).json({ success: false, error: err.message }); }
            })
        },
        {
            method: 'get',
            path: '/api/prescriptions/:id',
            handler: authenticated(async (req, res) => {
                try {
                    const result = await sqlQuery(
                        `SELECT p.*, pt.first_name, pt.last_name, u.first_name, u.last_name, d.drug_name FROM prescriptions p JOIN patients pt ON p.patient_id=pt.id JOIN users u ON p.doctor_id=u.id JOIN pharmacy_drugs d ON p.drug_id=d.id WHERE p.id=@id`,
                        [{ name: 'id', type: mssql.VarChar, value: req.params.id }]
                    );
                    if (!result.recordset[0]) return res.status(404).json({ success: false, error: 'Not found' });
                    res.json({ success: true, data: result.recordset[0], prescription: result.recordset[0] });
                } catch (err) { res.status(500).json({ success: false, error: err.message }); }
            })
        },
        {
            method: 'post',
            path: '/api/prescriptions',
            handler: authenticated(async (req, res) => {
                authenticatedDoctorOrAdmin(async (reqInner, resInner) => {
                    try {
                        const { patient_id, patientId, drug_id, drugId, quantity, instructions } = reqInner.body;
                        const pid = patient_id || patientId;
                        const did = drug_id || drugId;
                        if (!pid || !did) return resInner.status(400).json({ success: false, error: 'patient_id and drug_id required' });
                        const id = uuidv4();
                        await sqlQuery(
                            `INSERT INTO prescriptions (id, patient_id, doctor_id, drug_id, quantity, instructions, status, created_at, updated_at) VALUES (@id, @pid, @did, @drgid, @qty, @inst, 'pending', GETDATE(), GETDATE())`,
                            [
                                { name: 'id', type: mssql.VarChar, value: id },
                                { name: 'pid', type: mssql.VarChar, value: pid },
                                { name: 'did', type: mssql.VarChar, value: reqInner.user.userId },
                                { name: 'drgid', type: mssql.VarChar, value: did },
                                { name: 'qty', type: mssql.Int, value: quantity || 1 },
                                { name: 'inst', type: mssql.VarChar, value: instructions || '' }
                            ]
                        );
                        broadcast('data:update', { table: 'prescriptions', action: 'create' });
                        resInner.json({ success: true, id, prescription: { id, patient_id: pid, drug_id: did, quantity, instructions } });
                    } catch (err) { resInner.status(500).json({ success: false, error: err.message }); }
                })(req, res, () => {});
            })
        },
        {
            method: 'post',
            path: '/api/prescriptions/multiple',
            handler: authenticated(async (req, res) => {
                authenticatedDoctorOrAdmin(async (reqInner, resInner) => {
                    try {
                        const { patientId, doctorId, items } = reqInner.body;
                        if (!patientId || !items || !Array.isArray(items) || items.length === 0) {
                            return resInner.status(400).json({ success: false, error: 'patientId and items array required' });
                        }
                        const created = [];
                        for (const item of items) {
                            const { drugId, quantity, instructions } = item;
                            const id = uuidv4();
                            await sqlQuery(
                                `INSERT INTO prescriptions (id, patient_id, doctor_id, drug_id, quantity, instructions, status, created_at, updated_at) VALUES (@id, @pid, @did, @drgid, @qty, @inst, 'pending', GETDATE(), GETDATE())`,
                                [
                                    { name: 'id', type: mssql.VarChar, value: id },
                                    { name: 'pid', type: mssql.VarChar, value: patientId },
                                    { name: 'did', type: mssql.VarChar, value: reqInner.user.userId },
                                    { name: 'drgid', type: mssql.VarChar, value: drugId },
                                    { name: 'qty', type: mssql.Int, value: quantity || 1 },
                                    { name: 'inst', type: mssql.VarChar, value: instructions || '' }
                                ]
                            );
                            created.push({ id, patient_id: patientId, drug_id: drugId, quantity, instructions });
                        }
                        broadcast('data:update', { table: 'prescriptions', action: 'create' });
                        resInner.json({ success: true, prescriptions: created });
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
