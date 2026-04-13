const { ipcMain, BrowserWindow } = require('electron');
const DatabaseService = require('../../../src/services/DatabaseService');
const { buildErrorResponse } = require('./utils');
const http = require('http');

let _currentUser = null;
let _accessToken = null;
let _refreshToken = null;

function setCurrentUser(u) { _currentUser = u; }
function getCurrentUser() { return _currentUser; }
function setTokens(access, refresh) { _accessToken = access; _refreshToken = refresh; }

async function httpRequest(url, method, body, headers = {}) {
    return new Promise((resolve) => {
        const urlObj = new URL(url);
        const options = {
            hostname: urlObj.hostname,
            port: urlObj.port || 80,
            path: urlObj.pathname + urlObj.search,
            method,
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body || ''), ...headers }
        };
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try { resolve(JSON.parse(data)); }
                catch { resolve({ success: false, error: 'Invalid server response' }); }
            });
        });
        req.on('error', (err) => resolve({ success: false, error: `Server unreachable: ${err.message}` }));
        req.write(body || '');
        req.end();
    });
}

module.exports = function registerAuthHandlers(ctx) {
    _currentUser = ctx.currentUser;
    ctx._authUtils = { setCurrentUser, setTokens, getAccessToken: () => _accessToken };

    ipcMain.handle('auth:getCurrentUser', async () => {
        return _currentUser
            ? { success: true, user: _currentUser, hasServerToken: !!_accessToken }
            : { success: false, message: 'No user logged in' };
    });

    ipcMain.handle('auth:logout', async (event, { userId } = {}) => {
        try {
            const id = userId || _currentUser?.id;
            if (id) await DatabaseService.logActivity(id, 'logout', 'user', id, 'User logged out');
            _currentUser = null; _accessToken = null; _refreshToken = null;
            if (ctx._setCurrentUser) ctx._setCurrentUser(null);
            return { success: true, message: 'Logged out successfully' };
        } catch (error) {
            return buildErrorResponse(error, { scope: 'auth', action: 'logout' });
        }
    });

    ipcMain.handle('auth:isFirstRun', async () => {
        try {
            const db = await DatabaseService.getDatabase();
            const result = await db.get('SELECT COUNT(*) as count FROM users');
            return { success: true, isFirstRun: result.count === 0 };
        } catch (error) {
            return buildErrorResponse(error, { scope: 'auth', action: 'isFirstRun' }, { isFirstRun: true });
        }
    });

    ipcMain.handle('auth:login', async (event, email, password) => {
        try {
            if (!email || !password) return { success: false, error: 'Email and password required' };

            const serverUrl = ctx.appConfig?.serverUrl;
            if (serverUrl) {
                const result = await httpRequest(`${serverUrl}/api/auth/login`, 'POST', JSON.stringify({ email, password }));
                if (result.success) {
                    _accessToken = result.accessToken;
                    _refreshToken = result.refreshToken;
                    _currentUser = result.user;
                    if (ctx._setCurrentUser) ctx._setCurrentUser(result.user);
                    if (ctx._setTokens) ctx._setTokens(result.accessToken, result.refreshToken);
                }
                return result;
            }

            const user = await DatabaseService.authenticateUser(email, password);
            if (!user) return { success: false, error: 'Invalid credentials' };
            const userWithName = {
                ...user,
                role: (user.role || '').toLowerCase(),
                name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
                phone: user.phone_number
            };
            _currentUser = userWithName;
            if (ctx._setCurrentUser) ctx._setCurrentUser(userWithName);
            return { success: true, user: userWithName };
        } catch (error) {
            console.error('Login error:', error);
            return buildErrorResponse(error, { scope: 'auth', action: 'login', entity: 'user' });
        }
    });

    ipcMain.handle('auth:completeSetup', async (event, { clinicData, adminData }) => {
        try {
            if (!adminData?.firstName || !adminData?.lastName || !adminData?.email || !adminData?.password || !adminData?.role) {
                return { success: false, error: 'Missing required admin fields' };
            }

            const serverUrl = ctx.appConfig?.serverUrl;
            if (serverUrl) {
                const createResult = await httpRequest(`${serverUrl}/api/users`, 'POST', JSON.stringify({
                    email: adminData.email,
                    password: adminData.password,
                    first_name: adminData.firstName,
                    last_name: adminData.lastName,
                    role: adminData.role.toLowerCase().trim() === 'clinic assistant' ? 'assistant' : adminData.role.toLowerCase().trim(),
                    phone_number: adminData.phoneNumber || '',
                    gender: adminData.gender || ''
                }), { 'Authorization': `Bearer ${ctx._authUtils?.getAccessToken?.() || ''}` });

                if (!createResult.success) return { success: false, error: createResult.error || 'Failed to create user on server' };

                const loginResult = await httpRequest(`${serverUrl}/api/auth/login`, 'POST', JSON.stringify({ email: adminData.email, password: adminData.password }));
                if (!loginResult.success) return { success: false, error: 'User created but login failed. Please log in manually.' };

                _accessToken = loginResult.accessToken;
                _refreshToken = loginResult.refreshToken;
                _currentUser = loginResult.user;
                if (ctx._setCurrentUser) ctx._setCurrentUser(loginResult.user);
                if (ctx._setTokens) ctx._setTokens(loginResult.accessToken, loginResult.refreshToken);
                return { success: true, user: loginResult.user };
            }

            let role = adminData.role.toLowerCase().trim();
            if (role === 'clinic assistant') role = 'assistant';
            const userData = {
                first_name: adminData.firstName, last_name: adminData.lastName,
                email: adminData.email, password: adminData.password, role,
                phone_number: adminData.phoneNumber || null, gender: adminData.gender || 'other'
            };
            const user = await DatabaseService.createUser(userData);
            if (!user) return { success: false, error: 'Failed to create admin user' };
            const userWithName = { ...user, name: `${user.first_name || ''} ${user.last_name || ''}`.trim(), phone: user.phone_number };
            _currentUser = userWithName;
            if (ctx._setCurrentUser) ctx._setCurrentUser(userWithName);
            await DatabaseService.setSetting('setup_complete', 'true');
            await DatabaseService.logActivity(user.id, 'setup', 'system', null, `Initial setup completed by ${userWithName.name}`);
            BrowserWindow.getAllWindows().forEach(w => w.webContents.send('data:update', { table: 'users', action: 'create', record: userWithName }));
            return { success: true, user: userWithName };
        } catch (error) {
            console.error('Setup error:', error);
            return buildErrorResponse(error, { scope: 'auth', action: 'completeSetup', entity: 'user' });
        }
    });

    ipcMain.handle('auth:createUser', async (event, userData) => {
        try {
            const serverUrl = ctx.appConfig?.serverUrl;
            if (serverUrl) {
                const createResult = await httpRequest(`${serverUrl}/api/users`, 'POST', JSON.stringify({
                    email: userData.email,
                    password: userData.password,
                    first_name: userData.firstName,
                    last_name: userData.lastName,
                    role: userData.role,
                    phone_number: userData.phoneNumber || '',
                    gender: userData.gender || ''
                }), { 'Authorization': `Bearer ${ctx._authUtils?.getAccessToken?.() || ''}` });

                if (!createResult.success) return { success: false, error: createResult.error || 'Failed to create user' };

                const loginResult = await httpRequest(`${serverUrl}/api/auth/login`, 'POST', JSON.stringify({ email: userData.email, password: userData.password }));
                if (!loginResult.success) return { success: false, error: 'User created but login failed. Please log in manually.' };

                _accessToken = loginResult.accessToken;
                _refreshToken = loginResult.refreshToken;
                _currentUser = loginResult.user;
                if (ctx._setCurrentUser) ctx._setCurrentUser(loginResult.user);
                if (ctx._setTokens) ctx._setTokens(loginResult.accessToken, loginResult.refreshToken);
                return { success: true, user: loginResult.user };
            }

            const dbUserData = {
                first_name: userData.firstName, last_name: userData.lastName,
                email: userData.email, password: userData.password, role: userData.role,
                phone_number: userData.phoneNumber || null, gender: userData.gender || 'other'
            };
            const user = await DatabaseService.createUser(dbUserData);
            if (!user) return { success: false, error: 'Failed to create user' };
            const userWithName = { ...user, name: `${user.first_name || ''} ${user.last_name || ''}`.trim(), phone: user.phone_number };
            BrowserWindow.getAllWindows().forEach(w => w.webContents.send('data:update', { table: 'users', action: 'create', record: userWithName }));
            return { success: true, user: userWithName };
        } catch (error) {
            return buildErrorResponse(error, { scope: 'auth', action: 'createUser', entity: 'user' });
        }
    });

    ipcMain.handle('auth:getAllUsers', async () => {
        try {
            const users = await DatabaseService.getAllUsers();
            return { success: true, users };
        } catch (error) {
            return buildErrorResponse(error, { scope: 'auth', action: 'getAllUsers', entity: 'user' });
        }
    });

    ipcMain.handle('auth:isAuthenticated', async () => !!_currentUser);
};
