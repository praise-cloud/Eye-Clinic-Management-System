const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const mssql = require('mssql');
const { sqlQuery } = require('../database');
const { generateTokens, verifyRefresh, authenticated } = require('../auth');

function getAuthRoutes() {
    return [
        {
            method: 'post',
            path: '/api/auth/login',
            handler: async (req, res) => {
                try {
                    const { email, password } = req.body;
                    if (!email || !password) return res.status(400).json({ success: false, error: 'Email and password required' });
                    const result = await sqlQuery('SELECT * FROM users WHERE email = @e', [{ name: 'e', type: mssql.VarChar, value: email }]);
                    const user = result.recordset[0];
                    if (!user) return res.status(401).json({ success: false, error: 'Invalid credentials' });
                    const valid = await bcrypt.compare(password, user.password_hash);
                    if (!valid) return res.status(401).json({ success: false, error: 'Invalid credentials' });
                    if (user.status !== 'active') return res.status(403).json({ success: false, error: 'Account inactive' });
                    const tokens = generateTokens(user);
                    await sqlQuery('UPDATE user_presence SET is_online = 1, last_seen = GETDATE() WHERE user_id = @uid', [{ name: 'uid', type: mssql.VarChar, value: user.id }]);
                    res.json({
                        success: true,
                        accessToken: tokens.accessToken,
                        refreshToken: tokens.refreshToken,
                        user: {
                            id: user.id,
                            name: `${user.first_name} ${user.last_name}`.trim(),
                            email: user.email,
                            role: user.role,
                            phone: user.phone_number,
                            gender: user.gender
                        }
                    });
                } catch (err) { res.status(500).json({ success: false, error: err.message }); }
            }
        },
        {
            method: 'post',
            path: '/api/auth/refresh',
            handler: async (req, res) => {
                try {
                    const { refreshToken } = req.body;
                    if (!refreshToken) return res.status(400).json({ success: false, error: 'Refresh token required' });
                    const decoded = verifyRefresh(refreshToken);
                    if (!decoded) return res.status(401).json({ success: false, error: 'Invalid refresh token' });
                    const result = await sqlQuery('SELECT * FROM users WHERE id = @id', [{ name: 'id', type: mssql.VarChar, value: decoded.userId }]);
                    const user = result.recordset[0];
                    if (!user) return res.status(401).json({ success: false, error: 'User not found' });
                    const tokens = generateTokens(user);
                    res.json({ success: true, accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
                } catch (err) { res.status(500).json({ success: false, error: err.message }); }
            }
        },
        {
            method: 'post',
            path: '/api/auth/logout',
            handler: authenticated(async (req, res) => {
                try {
                    await sqlQuery('UPDATE user_presence SET is_online = 0, last_seen = GETDATE() WHERE user_id = @uid', [{ name: 'uid', type: mssql.VarChar, value: req.user.userId }]);
                    res.json({ success: true });
                } catch (err) { res.status(500).json({ success: false, error: err.message }); }
            })
        },
        {
            method: 'get',
            path: '/api/auth/me',
            handler: authenticated(async (req, res) => {
                try {
                    const result = await sqlQuery(
                        'SELECT id, first_name, last_name, email, role, phone_number, gender FROM users WHERE id = @id',
                        [{ name: 'id', type: mssql.VarChar, value: req.user.userId }]
                    );
                    const user = result.recordset[0];
                    if (!user) return res.status(404).json({ success: false, error: 'Not found' });
                    res.json({
                        success: true,
                        user: {
                            id: user.id,
                            name: `${user.first_name} ${user.last_name}`.trim(),
                            email: user.email,
                            role: user.role,
                            phone: user.phone_number,
                            gender: user.gender
                        }
                    });
                } catch (err) { res.status(500).json({ success: false, error: err.message }); }
            })
        }
    ];
}

module.exports = { getAuthRoutes };
