const { ipcMain, BrowserWindow } = require('electron');
const DatabaseService = require('../../../src/services/DatabaseService');
const { buildErrorResponse } = require('./utils');

let _currentUser = null;
let _accessToken = null;
let _refreshToken = null;

function setCurrentUser(u) { _currentUser = u; }
function getCurrentUser() { return _currentUser; }
function setTokens(access, refresh) { _accessToken = access; _refreshToken = refresh; }

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
        const http = require('http');
        return new Promise((resolve) => {
          const body = JSON.stringify({ email, password });
          const url = new URL(`${serverUrl}/api/auth/login`);
          const options = {
            hostname: url.hostname, port: url.port || 80,
            path: url.pathname, method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
          };
          const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
              try {
                const result = JSON.parse(data);
                if (result.success) {
                  _accessToken = result.accessToken;
                  _refreshToken = result.refreshToken;
                  _currentUser = result.user;
                  if (ctx._setCurrentUser) ctx._setCurrentUser(result.user);
                  if (ctx._setTokens) ctx._setTokens(result.accessToken, result.refreshToken);
                }
                resolve(result);
              } catch { resolve({ success: false, error: 'Invalid server response' }); }
            });
          });
          req.on('error', (err) => resolve({ success: false, error: `Server unreachable: ${err.message}` }));
          req.write(body); req.end();
        });
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
      const dbUserData = {
        first_name: userData.firstName, last_name: userData.lastName,
        email: userData.email, password: userData.password, role: userData.role,
        phone_number: userData.phoneNumber || null, gender: userData.gender || 'other'
      };
      const user = await DatabaseService.createUser(dbUserData);
      BrowserWindow.getAllWindows().forEach(w => w.webContents.send('data:update', { table: 'users', action: 'create', record: user }));
      return { success: true, user };
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
