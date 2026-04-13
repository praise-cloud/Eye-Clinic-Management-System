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

export const getAllReports = async (filters = {}) => {
  if (isServerMode()) {
    const res = await serverApiCall('/api/reports', 'GET');
    return res?.success ? res.data : [];
  }
  const api = getApi();
  if (!api) return [];
  try { const r = await api.getReports(filters); return r?.success ? r.reports : []; }
  catch { return []; }
};

export const getReportById = async (id) => {
  if (isServerMode()) {
    const res = await serverApiCall(`/api/reports/${id}`, 'GET');
    return res?.success ? res.data : null;
  }
  const api = getApi();
  if (!api) return null;
  try { const r = await api.getReportById(id); return r?.success ? r.report : null; }
  catch { return null; }
};

export const generateReport = async (patientId, testIds, title, reportType) => {
  if (isServerMode()) {
    const res = await serverApiCall('/api/reports', 'POST', { patient_id: patientId, testIds, title, report_type: reportType });
    return res?.success || false;
  }
  const api = getApi();
  if (!api) return false;
  try { const r = await api.generateReport({ patientId, testIds, title, reportType }); return !!r?.success; }
  catch { return false; }
};

export const exportReport = async (reportId) => {
  if (isServerMode()) {
    return { success: false, error: 'Export not supported in server mode yet' };
  }
  const api = getApi();
  if (!api) return { success: false };
  try { return await api.exportReport({ reportId }); }
  catch { return { success: false }; }
};

export const deleteReport = async (id) => {
  if (isServerMode()) {
    const res = await serverApiCall(`/api/reports/${id}`, 'DELETE');
    return res?.success || false;
  }
  const api = getApi();
  if (!api) return false;
  try { const r = await api.deleteReport(id); return !!r?.success; }
  catch { return false; }
};
