const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const mssql = require('mssql');
const { sqlQuery } = require('../database');
const { authenticated, authenticatedAdmin } = require('../auth');
const { broadcast } = require('../websocket');

function getUserRoutes() {
    return [
        {
            method: 'get',
            path: '/api/users',
            handler: authenticated(async (req, res) => {
                try {
                    const result = await sqlQuery(
                        'SELECT id, first_name, last_name, email, role, phone_number, gender, status, created_at FROM users ORDER BY created_at DESC'
                    );
                    res.json({ success: true, data: result.recordset });
                } catch (err) { res.status(500).json({ success: false, error: err.message }); }
            })
        },
        {
            method: 'post',
            path: '/api/users',
            handler: authenticated(async (req, res) => {
                authenticatedAdmin(async (reqInner, resInner) => {
                    try {
                        const { email, password, first_name, last_name, role, phone_number, gender } = reqInner.body;
                        const hash = await bcrypt.hash(password, 10);
                        const id = uuidv4();
                        await sqlQuery(
                            `INSERT INTO users (id, first_name, last_name, email, password_hash, role, phone_number, gender, status, created_at, updated_at) VALUES (@id, @fn, @ln, @email, @hash, @role, @phone, @g, 'active', GETDATE(), GETDATE())`,
                            [
                                { name: 'id', type: mssql.VarChar, value: id },
                                { name: 'fn', type: mssql.VarChar, value: first_name },
                                { name: 'ln', type: mssql.VarChar, value: last_name },
                                { name: 'email', type: mssql.VarChar, value: email },
                                { name: 'hash', type: mssql.VarChar, value: hash },
                                { name: 'role', type: mssql.VarChar, value: role },
                                { name: 'phone', type: mssql.VarChar, value: phone_number || '' },
                                { name: 'g', type: mssql.VarChar, value: gender || '' }
                            ]
                        );
                        broadcast('data:update', { table: 'users', action: 'create' });
                        resInner.json({ success: true, id });
                    } catch (err) { resInner.status(500).json({ success: false, error: err.message }); }
                })(req, res, () => {});
            })
        },
        {
            method: 'put',
            path: '/api/users/:id',
            handler: authenticated(async (req, res) => {
                authenticatedAdmin(async (reqInner, resInner) => {
                    try {
                        const { first_name, last_name, email, role, phone_number, gender, password } = reqInner.body;
                        let query = `UPDATE users SET first_name=@fn, last_name=@ln, email=@email, role=@role, phone_number=@phone, gender=@g, updated_at=GETDATE()`;
                        const params = [
                            { name: 'fn', type: mssql.VarChar, value: first_name || '' },
                            { name: 'ln', type: mssql.VarChar, value: last_name || '' },
                            { name: 'email', type: mssql.VarChar, value: email || '' },
                            { name: 'role', type: mssql.VarChar, value: role || '' },
                            { name: 'phone', type: mssql.VarChar, value: phone_number || '' },
                            { name: 'g', type: mssql.VarChar, value: gender || '' },
                            { name: 'id', type: mssql.VarChar, value: reqInner.params.id }
                        ];
                        if (password) {
                            const hash = await bcrypt.hash(password, 10);
                            query = `UPDATE users SET first_name=@fn, last_name=@ln, email=@email, role=@role, phone_number=@phone, gender=@g, password_hash=@hash, updated_at=GETDATE()`;
                            params.unshift({ name: 'hash', type: mssql.VarChar, value: hash });
                        }
                        query += ' WHERE id = @id';
                        await sqlQuery(query, params);
                        broadcast('data:update', { table: 'users', action: 'update' });
                        resInner.json({ success: true });
                    } catch (err) { resInner.status(500).json({ success: false, error: err.message }); }
                })(req, res, () => {});
            })
        },
        {
            method: 'delete',
            path: '/api/users/:id',
            handler: authenticated(async (req, res) => {
                authenticatedAdmin(async (reqInner, resInner) => {
                    try {
                        await sqlQuery('DELETE FROM users WHERE id = @id', [{ name: 'id', type: mssql.VarChar, value: reqInner.params.id }]);
                        broadcast('data:update', { table: 'users', action: 'delete' });
                        resInner.json({ success: true });
                    } catch (err) { resInner.status(500).json({ success: false, error: err.message }); }
                })(req, res, () => {});
            })
        }
    ];
}

module.exports = { getUserRoutes };
