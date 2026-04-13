const getServerUrl = () => localStorage.getItem('serverUrl');
const isServerMode = () => !!getServerUrl();
const getApi = () => window.electronAPI || null;

const serverApiCall = async (endpoint, method = 'GET', body = null) => {
  const serverUrl = getServerUrl();
  if (!serverUrl) return { success: false, error: 'Not connected to server' };
  try {
    const accessToken = sessionStorage.getItem('accessToken');
    const headers = { 'Content-Type': 'application/json' };
    if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;
    const options = { method, headers };
    if (body) options.body = JSON.stringify(body);
    const res = await fetch(`${serverUrl}${endpoint}`, options);
    return res.json();
  } catch (err) { return { success: false, error: err.message }; }
};

export const logActivity = async (userId, actionType, entityType, entityId, description) => {
  if (isServerMode()) {
    const res = await serverApiCall('/api/activity-logs', 'POST', { userId, action_type: actionType, entity_type: entityType, entity_id: entityId, description });
    return res?.success || false;
  }
  const api = getApi();
  if (!api) return false;
  try { const r = await api.logActivity({ userId, actionType, entityType, entityId, description }); return !!r?.success; }
  catch { return false; }
};

export const getActivityLogs = async (filters = {}) => {
  if (isServerMode()) {
    const res = await serverApiCall('/api/activity-logs', 'GET');
    return res?.success ? res.data : [];
  }
  const api = getApi();
  if (!api) return [];
  try { const r = await api.getActivityLogs(filters); return r?.success ? r.logs : []; }
  catch { return []; }
};

export const getActivityLogsFiltered = async (filters = {}) => {
  if (isServerMode()) {
    const params = new URLSearchParams(filters).toString();
    const res = await serverApiCall(`/api/activity-logs?${params}`, 'GET');
    return res?.success ? res.data : [];
  }
  const api = getApi();
  if (!api) return [];
  try { const r = await api.getActivityLogsFiltered(filters); return r?.success ? r.logs : []; }
  catch { return []; }
};

export const getActivityStats = async () => {
  if (isServerMode()) {
    const res = await serverApiCall('/api/activity-logs/stats', 'GET');
    return res?.success ? res.stats : {};
  }
  const api = getApi();
  if (!api) return {};
  try { const r = await api.getActivityStats(); return r?.success ? r.stats : {}; }
  catch { return {}; }
};
