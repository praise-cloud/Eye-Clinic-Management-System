const { v4: uuidv4 } = require('uuid');
const mssql = require('mssql');
const { sqlQuery } = require('../database');
const { authenticated, authenticatedAdmin, authenticatedDoctorOrAdmin } = require('../auth');
const { broadcast } = require('../websocket');

function getPharmacyRoutes() {
    return [
        {
            method: 'get',
            path: '/api/pharmacy/drugs',
            handler: authenticated(async (req, res) => {
                try {
                    const result = await sqlQuery('SELECT * FROM pharmacy_drugs ORDER BY drug_name ASC');
                    res.json({ success: true, data: result.recordset });
                } catch (err) { res.status(500).json({ success: false, error: err.message }); }
            })
        },
        {
            method: 'get',
            path: '/api/pharmacy/drugs/:id',
            handler: authenticated(async (req, res) => {
                try {
                    const result = await sqlQuery('SELECT * FROM pharmacy_drugs WHERE id = @id', [{ name: 'id', type: mssql.VarChar, value: req.params.id }]);
                    if (!result.recordset[0]) return res.status(404).json({ success: false, error: 'Not found' });
                    res.json({ success: true, data: result.recordset[0] });
                } catch (err) { res.status(500).json({ success: false, error: err.message }); }
            })
        },
        {
            method: 'post',
            path: '/api/pharmacy/drugs',
            handler: authenticated(async (req, res) => {
                authenticatedDoctorOrAdmin(async (reqInner, resInner) => {
                    try {
                        const { drug_code, drug_name, drug_form, strength, pack_size, unit_price, current_stock } = reqInner.body;
                        const id = uuidv4();
                        await sqlQuery(
                            `INSERT INTO pharmacy_drugs (id, drug_code, drug_name, drug_form, strength, pack_size, unit_price, current_stock, created_at, updated_at) VALUES (@id, @code, @name, @form, @str, @pack, @price, @stock, GETDATE(), GETDATE())`,
                            [
                                { name: 'id', type: mssql.VarChar, value: id },
                                { name: 'code', type: mssql.VarChar, value: drug_code || id },
                                { name: 'name', type: mssql.VarChar, value: drug_name || '' },
                                { name: 'form', type: mssql.VarChar, value: drug_form || '' },
                                { name: 'str', type: mssql.VarChar, value: strength || '' },
                                { name: 'pack', type: mssql.VarChar, value: pack_size || '' },
                                { name: 'price', type: mssql.VarChar, value: unit_price || 0 },
                                { name: 'stock', type: mssql.Int, value: current_stock || 0 }
                            ]
                        );
                        broadcast('data:update', { table: 'pharmacy', action: 'create' });
                        resInner.json({ success: true, id });
                    } catch (err) { resInner.status(500).json({ success: false, error: err.message }); }
                })(req, res, () => {});
            })
        },
        {
            method: 'delete',
            path: '/api/pharmacy/drugs/:id',
            handler: authenticated(async (req, res) => {
                authenticatedAdmin(async (reqInner, resInner) => {
                    try {
                        await sqlQuery('DELETE FROM pharmacy_drugs WHERE id = @id', [{ name: 'id', type: mssql.VarChar, value: reqInner.params.id }]);
                        broadcast('data:update', { table: 'pharmacy', action: 'delete' });
                        resInner.json({ success: true });
                    } catch (err) { resInner.status(500).json({ success: false, error: err.message }); }
                })(req, res, () => {});
            })
        },
        {
            method: 'post',
            path: '/api/pharmacy/dispense',
            handler: authenticated(async (req, res) => {
                try {
                    const { drugId, patientId, quantity, notes } = req.body;
                    const dispId = uuidv4();
                    const dispQty = quantity || 1;
                    await sqlQuery(
                        `INSERT INTO pharmacy_dispensations (id, drug_id, patient_id, quantity, unit_price, dispensed_by, notes, created_at)
                         SELECT @id, @drug, @pat, @qty, d.unit_price, @user, @notes, GETDATE() FROM pharmacy_drugs d WHERE d.id = @drug`,
                        [
                            { name: 'id', type: mssql.VarChar, value: dispId },
                            { name: 'drug', type: mssql.VarChar, value: drugId },
                            { name: 'pat', type: mssql.VarChar, value: patientId },
                            { name: 'qty', type: mssql.Int, value: dispQty },
                            { name: 'user', type: mssql.VarChar, value: req.user.userId },
                            { name: 'notes', type: mssql.VarChar, value: notes || '' }
                        ]
                    );
                    await sqlQuery('UPDATE pharmacy_drugs SET current_stock = current_stock - @qty WHERE id = @drug',
                        [{ name: 'qty', type: mssql.Int, value: dispQty }, { name: 'drug', type: mssql.VarChar, value: drugId }]);
                    const drugResult = await sqlQuery('SELECT drug_name, unit_price FROM pharmacy_drugs WHERE id = @id',
                        [{ name: 'id', type: mssql.VarChar, value: drugId }]);
                    if (drugResult.recordset[0]) {
                        const revenueId = uuidv4();
                        const { unit_price: unitPrice, drug_name: drugName } = drugResult.recordset[0];
                        await sqlQuery(
                            `INSERT INTO revenue (id, source, source_id, amount, currency, user_id, patient_id, description, timestamp)
                             VALUES (@id, @src, @srcId, @amt, 'NGN', @userId, @patId, @desc, GETDATE())`,
                            [
                                { name: 'id', type: mssql.VarChar, value: revenueId },
                                { name: 'src', type: mssql.VarChar, value: 'pharmacy' },
                                { name: 'srcId', type: mssql.VarChar, value: dispId },
                                { name: 'amt', type: mssql.Decimal(12, 2), value: parseFloat((unitPrice * dispQty).toFixed(2)) },
                                { name: 'userId', type: mssql.VarChar, value: req.user.userId },
                                { name: 'patId', type: mssql.VarChar, value: patientId },
                                { name: 'desc', type: mssql.VarChar, value: `${drugName} dispensed x${dispQty}` }
                            ]
                        );
                    }
                    broadcast('data:update', { table: 'pharmacy', action: 'dispense' });
                    broadcast('data:update', { table: 'dashboard', action: 'refresh' });
                    broadcast('data:update', { table: 'revenue', action: 'create' });
                    const dispensationResult = await sqlQuery('SELECT * FROM pharmacy_dispensations WHERE id = @id', [{ name: 'id', type: mssql.VarChar, value: dispId }]);
                    const dispensation = dispensationResult?.recordset?.[0] || null;
                    res.json({ success: true, id: dispId, dispensation });
                } catch (err) { res.status(500).json({ success: false, error: err.message }); }
            })
        }
    ];
}

module.exports = { getPharmacyRoutes };
