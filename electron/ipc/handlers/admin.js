const { ipcMain, BrowserWindow } = require('electron');
const DatabaseService = require('../../../src/services/DatabaseService');
const { buildErrorResponse, getTimeAgo, safeHandle } = require('./utils');
const http = require('http');

async function serverApiCall(serverUrl, endpoint, method, body, token) {
    return new Promise((resolve) => {
        const url = new URL(`${serverUrl}${endpoint}`);
        const options = {
            hostname: url.hostname, port: url.port || 80,
            path: url.pathname + url.search, method,
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body || ''),
                'Authorization': `Bearer ${token}`
            }
        };
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => {
                try { resolve(JSON.parse(data)); }
                catch { resolve({ success: false, error: 'Invalid server response' }); }
            });
        });
        req.on('error', err => resolve({ success: false, error: err.message }));
        req.write(body || '');
        req.end();
    });
}

let _currentUser = null;
function setCurrentUser(u) { _currentUser = u; }

module.exports = function registerAdminHandlers(ctx) {
  _currentUser = ctx.currentUser;
  if (ctx._setCurrentUser) {
    const orig = ctx._setCurrentUser;
    ctx._setCurrentUser = (u) => { _currentUser = u; orig(u); };
  } else {
    ctx._setCurrentUser = (u) => { _currentUser = u; };
  }

  safeHandle('admin:getAllUsers', async () => {
    try {
      const serverUrl = ctx.appConfig?.serverUrl;
      const token = ctx._authUtils?.getAccessToken?.();

      if (serverUrl && token) {
        const result = await serverApiCall(serverUrl, '/api/users', 'GET', '', token);
        if (result.success && result.data) {
          return { success: true, users: result.data.map(u => ({
            id: u.id,
            first_name: u.first_name,
            last_name: u.last_name,
            email: u.email,
            role: u.role,
            phone_number: u.phone_number,
            gender: u.gender,
            status: u.status,
            created_at: u.created_at
          })) };
        }
        return result;
      }

      const users = await DatabaseService.getAllUsers();
      return { success: true, users };
    } catch (error) {
      return buildErrorResponse(error, { scope: 'admin', action: 'getAllUsers', entity: 'user' });
    }
  });

  safeHandle('admin:createUser', async (event, { userData, createdBy }) => {
    try {
      const serverUrl = ctx.appConfig?.serverUrl;
      const token = ctx._authUtils?.getAccessToken?.();

      if (serverUrl && token) {
        const result = await serverApiCall(serverUrl, '/api/users', 'POST', JSON.stringify({
          email: userData.email,
          password: userData.password,
          first_name: userData.firstName,
          last_name: userData.lastName,
          role: userData.role,
          phone_number: userData.phoneNumber || '',
          gender: userData.gender || ''
        }), token);
        return result;
      }

      const dbUserData = {
        first_name: userData.firstName,
        last_name: userData.lastName,
        email: userData.email,
        password: userData.password,
        role: userData.role,
        phone_number: userData.phoneNumber || null,
        gender: userData.gender || 'other'
      };

      const required = ['first_name', 'last_name', 'email', 'password', 'role'];
      for (const field of required) { if (!dbUserData[field]) return { success: false, error: `${field} required` }; }

      const user = await DatabaseService.createUser(dbUserData);

      if (createdBy) {
        await DatabaseService.logActivity(createdBy, 'create', 'user', user.id, `User ${user.email} created by admin`);
      }

      BrowserWindow.getAllWindows().forEach(w => w.webContents.send('data:update', { table: 'users', action: 'create', record: user }));
      return { success: true, user };
    } catch (error) {
      return buildErrorResponse(error, { scope: 'admin', action: 'createUser', entity: 'user' });
    }
  });

  safeHandle('admin:updateUserStatus', async (event, { userId, isActive, updatedBy }) => {
    try {
      if (!userId) return { success: false, error: 'User ID required' };

      const result = await DatabaseService.updateUserStatus(userId, isActive);

      if (updatedBy) {
        await DatabaseService.logActivity(updatedBy, 'update', 'user', userId, `User status changed to ${isActive ? 'active' : 'inactive'}`);
      }

      BrowserWindow.getAllWindows().forEach(w => w.webContents.send('data:update', { table: 'users', action: 'update', userId }));
      return { success: true, ...result };
    } catch (error) {
      return buildErrorResponse(error, { scope: 'admin', action: 'updateUserStatus', entity: 'user' });
    }
  });

  safeHandle('admin:updateUser', async (event, { userId, userData, updatedBy }) => {
    try {
      if (!userId) return { success: false, error: 'User ID required' };

      const serverUrl = ctx.appConfig?.serverUrl;
      const token = ctx._authUtils?.getAccessToken?.();

      if (serverUrl && token) {
        const result = await serverApiCall(serverUrl, `/api/users/${userId}`, 'PUT', JSON.stringify({
          first_name: userData.first_name || userData.firstName,
          last_name: userData.last_name || userData.lastName,
          email: userData.email,
          role: userData.role,
          phone_number: userData.phone_number || userData.phoneNumber,
          gender: userData.gender,
          password: userData.password || undefined
        }), token);
        return result;
      }

      const dbUserData = {
        first_name: userData.first_name || userData.firstName,
        last_name: userData.last_name || userData.lastName,
        email: userData.email,
        role: userData.role,
        phone_number: userData.phone_number || userData.phoneNumber,
        gender: userData.gender,
        password: userData.password
      };

      const updatedUser = await DatabaseService.updateUser(userId, dbUserData);
      if (!updatedUser) return { success: false, error: 'User not found or no changes applied' };

      if (updatedBy) {
        await DatabaseService.logActivity(updatedBy, 'update', 'user', userId, `User ${updatedUser.email} updated by admin`);
      }

      const userWithName = {
        ..._currentUser,
        ...updatedUser,
        id: userId,
        role: updatedUser.role || _currentUser?.role,
        name: `${updatedUser.first_name || ''} ${updatedUser.last_name || ''}`.trim() || _currentUser?.name,
        phone: updatedUser.phone_number || _currentUser?.phone,
        email: updatedUser.email || _currentUser?.email,
        gender: updatedUser.gender || _currentUser?.gender
      };

      if (_currentUser?.id === userId) {
        _currentUser = userWithName;
      }

      BrowserWindow.getAllWindows().forEach(w => w.webContents.send('data:update', { table: 'users', action: 'update', record: userWithName }));
      BrowserWindow.getAllWindows().forEach(w => w.webContents.send('user:profileUpdated', userWithName));
      return { success: true, user: userWithName };
    } catch (error) {
      return buildErrorResponse(error, { scope: 'admin', action: 'updateUser', entity: 'user' });
    }
  });

  safeHandle('admin:deleteUser', async (event, { userId, deletedBy }) => {
    try {
      if (!userId) return { success: false, error: 'User ID required' };

      const serverUrl = ctx.appConfig?.serverUrl;
      const token = ctx._authUtils?.getAccessToken?.();

      if (serverUrl && token) {
        const result = await serverApiCall(serverUrl, `/api/users/${userId}`, 'DELETE', '', token);
        return result;
      }

      const result = await DatabaseService.deleteUser(userId);

      if (result.success && deletedBy) {
        await DatabaseService.logActivity(deletedBy, 'delete', 'user', userId, `User ${userId} deleted by admin`);
      }

      BrowserWindow.getAllWindows().forEach(w => w.webContents.send('data:update', { table: 'users', action: 'delete', userId }));
      return result;
    } catch (error) {
      return buildErrorResponse(error, { scope: 'admin', action: 'deleteUser', entity: 'user' });
    }
  });

  safeHandle('admin:getActivityLogs', async (event, filters = {}) => {
    try {
      const logs = await DatabaseService.getActivityLogs(filters);
      return { success: true, logs };
    } catch (error) {
      return buildErrorResponse(error, { scope: 'admin', action: 'getActivityLogs' });
    }
  });

  safeHandle('admin:getActivityStats', async () => {
    try {
      const stats = await DatabaseService.getDashboardStats();
      return { success: true, stats };
    } catch (error) {
      return buildErrorResponse(error, { scope: 'admin', action: 'getActivityStats' });
    }
  });

  safeHandle('admin:logActivity', async (event, { userId, actionType, entityType, entityId, description, ipAddress, userAgent }) => {
    try {
      if (!userId || !actionType || !entityType || !description) {
        return { success: false, error: 'Missing required activity fields' };
      }
      const activity = await DatabaseService.logActivity(userId, actionType, entityType, entityId, description, ipAddress, userAgent);
      return { success: true, activity };
    } catch (error) {
      return buildErrorResponse(error, { scope: 'admin', action: 'logActivity' });
    }
  });

  safeHandle('admin:getUserStats', async (event, userId) => {
    try {
      if (!_currentUser || String(_currentUser.role || '').toLowerCase() !== 'admin') {
        return { success: false, error: 'Admin access required' };
      }
      const stats = await DatabaseService.getUserStatistics(userId);
      return { success: true, stats };
    } catch (error) {
      return buildErrorResponse(error, { scope: 'admin', action: 'getUserStats' });
    }
  });

  safeHandle('admin:getActivityLogsFiltered', async (event, filters = {}) => {
    try {
      const { timeRange = '24h', userId = null, entityType = null, limit = 100 } = filters;
      const db = await DatabaseService.getDatabase();

      const allowedTimeRanges = ['5m', '1h', '24h', '7d', 'all'];
      const validatedTimeRange = allowedTimeRanges.includes(timeRange) ? timeRange : '24h';

      let timeCondition = '';
      switch (validatedTimeRange) {
        case '5m': timeCondition = `AND al.timestamp > datetime('now', '-5 minutes')`; break;
        case '1h': timeCondition = `AND al.timestamp > datetime('now', '-1 hour')`; break;
        case '24h': timeCondition = `AND al.timestamp > datetime('now', '-24 hours')`; break;
        case '7d': timeCondition = `AND al.timestamp > datetime('now', '-7 days')`; break;
        case 'all': timeCondition = ''; break;
        default: timeCondition = `AND al.timestamp > datetime('now', '-24 hours')`;
      }

      const sanitizedUserId = userId ? String(userId).replace(/[^a-zA-Z0-9-]/g, '') : null;
      const sanitizedEntityType = entityType ? String(entityType).replace(/[^a-zA-Z_]/g, '') : null;

      const userCondition = sanitizedUserId ? `AND al.user_id = ?` : '';
      const entityCondition = sanitizedEntityType ? `AND al.entity_type = ?` : '';

      const params = [];
      if (sanitizedUserId) params.push(sanitizedUserId);
      if (sanitizedEntityType) params.push(sanitizedEntityType);

      const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 1000);

      const logs = await db.all(`
        SELECT al.*, u.first_name, u.last_name, u.email, u.role
        FROM activity_logs al
        LEFT JOIN users u ON al.user_id = u.id
        WHERE 1=1 ${timeCondition} ${userCondition} ${entityCondition}
        ORDER BY al.timestamp DESC
        LIMIT ?
      `, [...params, safeLimit]);

      const formattedLogs = logs.map(log => ({
        id: log.id,
        user_id: log.user_id,
        user_name: `${log.first_name || ''} ${log.last_name || ''}`.trim(),
        user_email: log.email,
        user_role: log.role,
        action_type: log.action_type,
        entity_type: log.entity_type,
        entity_id: log.entity_id,
        description: log.description,
        timestamp: log.timestamp,
        time_ago: getTimeAgo(log.timestamp)
      }));

      const countResult = await db.get(`
        SELECT COUNT(*) as total FROM activity_logs al WHERE 1=1 ${timeCondition} ${userCondition} ${entityCondition}
      `, params);

      return { success: true, logs: formattedLogs, total: countResult?.total || 0, filters: { timeRange, userId, entityType } };
    } catch (error) {
      return buildErrorResponse(error, { scope: 'admin', action: 'getActivityLogsFiltered' });
    }
  });

  safeHandle('admin:getDoctorCaseStudies', async (event, options = {}) => {
    try {
      if (!_currentUser || String(_currentUser.role || '').toLowerCase() !== 'admin') {
        return { success: false, error: 'Only admin can view case studies' };
      }

      const { search = '', doctor = 'all', limit = 50, offset = 0 } = options || {};
      const db = await DatabaseService.getDatabase();

      const hasCaseHistory = await db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='CaseHistory'");
      if (!hasCaseHistory?.name) {
        return { success: false, error: 'CaseHistory table not found. Import legacy data first.' };
      }
      const hasPatients = await db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='PatientRegister'");
      const hasUsers = await db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='MyUsers'");

      const baseFrom = `
        FROM "CaseHistory" ch
        ${hasPatients?.name ? 'LEFT JOIN "PatientRegister" pr ON TRIM(pr."PatientID") = TRIM(ch."PatientID")' : ''}
        ${hasUsers?.name ? 'LEFT JOIN "MyUsers" mu ON TRIM(mu."UserID") = TRIM(ch."USERID")' : ''}
      `;

      const where = [`TRIM(COALESCE(ch."PatientID", '')) NOT IN ('', '---------')`];
      const params = [];
      if (doctor && doctor !== 'all') {
        where.push(`(TRIM(COALESCE(ch."DoctorName", '')) = ? OR TRIM(COALESCE(mu."FullName", '')) = ? OR TRIM(COALESCE(ch."USERID", '')) = ?)`);
        params.push(doctor, doctor, doctor);
      }
      if (search && String(search).trim().length > 0) {
        const like = `%${String(search).trim()}%`;
        where.push(`(ch."PatientID" LIKE ? OR ch."DoctorName" LIKE ? OR ch."DIAGNOSIS" LIKE ? OR ch."CASEHISTORY" LIKE ? OR ch."FOLLOWUPEXAM" LIKE ? ${hasPatients?.name ? ' OR pr."Names" LIKE ?' : ''} ${hasUsers?.name ? ' OR mu."FullName" LIKE ?' : ''})`);
        params.push(like, like, like, like, like);
        if (hasPatients?.name) params.push(like);
        if (hasUsers?.name) params.push(like);
      }

      const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
      const safeLimit = Number.isFinite(Number(limit)) ? Math.max(1, Math.min(Number(limit), 500)) : 50;
      const safeOffset = Number.isFinite(Number(offset)) ? Math.max(0, Number(offset)) : 0;

      const rows = await db.all(`
        SELECT
          ch."ID" as case_id, ch."PatientID" as patient_id,
          ${hasPatients?.name ? 'pr."Names" as patient_name,' : "'' as patient_name,"}
          ch."TreatmentDate" as treatment_date, ch."NextVisitDate" as next_visit_date,
          ch."DoctorName" as doctor_name,
          ${hasUsers?.name ? 'mu."FullName" as doctor_user_name,' : "'' as doctor_user_name,"}
          ch."DIAGNOSIS" as diagnosis, ch."CASEHISTORY" as case_history,
          ch."FOLLOWUPEXAM" as follow_up_exam, ch."FINALRXOD" as final_rx_od,
          ch."FINALRXOS" as final_rx_os, ch."USERID" as user_id, ch."STAMPDATE" as stamp_date
        ${baseFrom}
        ${whereSql}
        ORDER BY COALESCE(ch."STAMPDATE", ch."TreatmentDate") DESC
        LIMIT ? OFFSET ?
      `, [...params, safeLimit, safeOffset]);

      const totalRow = await db.get(`SELECT COUNT(*) as total ${baseFrom} ${whereSql}`, params);

      const doctors = await db.all(`
        SELECT doctor FROM (
          SELECT DISTINCT TRIM("DoctorName") as doctor FROM "CaseHistory" WHERE TRIM(COALESCE("DoctorName", '')) <> ''
          ${hasUsers?.name ? 'UNION SELECT DISTINCT TRIM("FullName") as doctor FROM "MyUsers" WHERE TRIM(COALESCE("FullName", \'\')) <> \'\'' : ''}
          UNION SELECT DISTINCT TRIM("USERID") as doctor FROM "CaseHistory" WHERE TRIM(COALESCE("USERID", '')) <> ''
        ) d WHERE TRIM(COALESCE(doctor, '')) <> '' ORDER BY doctor ASC
      `);

      return { success: true, data: rows || [], total: totalRow?.total || 0, doctors: (doctors || []).map(d => d.doctor), pagination: { limit: safeLimit, offset: safeOffset } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  safeHandle('admin:getTableData', async (event, options = {}) => {
    try {
      const { tableName, limit = 25, offset = 0 } = options;
      if (!tableName || typeof tableName !== 'string') return { success: false, error: 'Table name required' };

      const db = await DatabaseService.getDatabase();
      const safeTableName = String(tableName).replace(/"/g, '""');
      const exists = await db.get("SELECT name FROM sqlite_master WHERE type='table' AND name = ?", [tableName]);
      if (!exists?.name) return { success: false, error: 'Table not found' };

      const safeLimit = Number.isFinite(Number(limit)) ? Math.max(1, Math.min(Number(limit), 500)) : 25;
      const safeOffset = Number.isFinite(Number(offset)) ? Math.max(0, Number(offset)) : 0;

      const rows = await db.all(`SELECT * FROM "${safeTableName}" LIMIT ? OFFSET ?`, [safeLimit, safeOffset]);
      const countResult = await db.get(`SELECT COUNT(*) as total FROM "${safeTableName}"`);

      return { success: true, tableName, data: rows, count: rows.length, total: countResult?.total || 0 };
    } catch (error) {
      return buildErrorResponse(error, { scope: 'admin', action: 'getTableData' });
    }
  });
};

