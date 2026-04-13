const { v4: uuidv4 } = require('uuid');
const mssql = require('mssql');
const { sqlQuery } = require('../database');
const { authenticated, authenticatedAdmin } = require('../auth');
const { broadcast } = require('../websocket');

function getInventoryRoutes() {
    return [
        {
            method: 'get',
            path: '/api/inventory',
            handler: authenticated(async (req, res) => {
                try {
                    const result = await sqlQuery('SELECT * FROM inventory ORDER BY item_name ASC');
                    res.json({ success: true, data: result.recordset });
                } catch (err) { res.status(500).json({ success: false, error: err.message }); }
            })
        },
        {
            method: 'post',
            path: '/api/inventory',
            handler: authenticated(async (req, res) => {
                authenticatedAdmin(async (reqInner, resInner) => {
                    try {
                        const { item_code, item_name, category, quantity, unit, min_stock_level, expiry_date } = reqInner.body;
                        const id = uuidv4();
                        await sqlQuery(
                            `INSERT INTO inventory (id, item_code, item_name, category, quantity, unit, min_stock_level, expiry_date, created_at, updated_at) VALUES (@id, @code, @name, @cat, @qty, @unit, @min, @exp, GETDATE(), GETDATE())`,
                            [
                                { name: 'id', type: mssql.VarChar, value: id },
                                { name: 'code', type: mssql.VarChar, value: item_code || id },
                                { name: 'name', type: mssql.VarChar, value: item_name || '' },
                                { name: 'cat', type: mssql.VarChar, value: category || '' },
                                { name: 'qty', type: mssql.Int, value: quantity || 0 },
                                { name: 'unit', type: mssql.VarChar, value: unit || '' },
                                { name: 'min', type: mssql.Int, value: min_stock_level || 0 },
                                { name: 'exp', type: mssql.VarChar, value: expiry_date || null }
                            ]
                        );
                        broadcast('data:update', { table: 'inventory', action: 'create' });
                        resInner.json({ success: true, id });
                    } catch (err) { resInner.status(500).json({ success: false, error: err.message }); }
                })(req, res, () => {});
            })
        },
        {
            method: 'put',
            path: '/api/inventory/:id',
            handler: authenticated(async (req, res) => {
                authenticatedAdmin(async (reqInner, resInner) => {
                    try {
                        const { item_name, category, quantity, unit, min_stock_level, expiry_date } = reqInner.body;
                        await sqlQuery(
                            `UPDATE inventory SET item_name=@name, category=@cat, quantity=@qty, unit=@unit, min_stock_level=@min, expiry_date=@exp, updated_at=GETDATE() WHERE id=@id`,
                            [
                                { name: 'name', type: mssql.VarChar, value: item_name || '' },
                                { name: 'cat', type: mssql.VarChar, value: category || '' },
                                { name: 'qty', type: mssql.Int, value: quantity || 0 },
                                { name: 'unit', type: mssql.VarChar, value: unit || '' },
                                { name: 'min', type: mssql.Int, value: min_stock_level || 0 },
                                { name: 'exp', type: mssql.VarChar, value: expiry_date || null },
                                { name: 'id', type: mssql.VarChar, value: reqInner.params.id }
                            ]
                        );
                        broadcast('data:update', { table: 'inventory', action: 'update' });
                        resInner.json({ success: true });
                    } catch (err) { resInner.status(500).json({ success: false, error: err.message }); }
                })(req, res, () => {});
            })
        },
        {
            method: 'delete',
            path: '/api/inventory/:id',
            handler: authenticated(async (req, res) => {
                authenticatedAdmin(async (reqInner, resInner) => {
                    try {
                        await sqlQuery('DELETE FROM inventory WHERE id = @id', [{ name: 'id', type: mssql.VarChar, value: reqInner.params.id }]);
                        broadcast('data:update', { table: 'inventory', action: 'delete' });
                        resInner.json({ success: true });
                    } catch (err) { resInner.status(500).json({ success: false, error: err.message }); }
                })(req, res, () => {});
            })
        }
    ];
}

module.exports = { getInventoryRoutes };
