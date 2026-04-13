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
    const response = await fetch(`${serverUrl}${endpoint}`, options);
    return await response.json();
  } catch (err) {
    return { success: false, error: err.message };
  }
};

const mapTest = (test) => {
  const rawData = (() => {
    try { return JSON.parse(test.raw_data || '{}'); } catch { return {}; }
  })();
  return {
    rawData,
    id: test.id,
    patientName: test.first_name && test.last_name ? `${test.first_name} ${test.last_name}` : 'Unknown Patient',
    patientId: test.patient_id,
    testType: test.machine_type || 'Unknown',
    machineType: test.machine_type || 'Unknown',
    eye: test.eye || 'both',
    result: rawData.result || 'Pending',
    date: test.test_date ? new Date(test.test_date).toLocaleDateString('en-GB') : 'N/A',
    testDate: test.test_date || null,
    notes: rawData.notes || '',
    fileName: rawData.fileName || null,
    imageData: rawData.imageData || null
  };
};

export const getAllTests = async (filters = {}) => {
  if (isServerMode()) {
    const res = await serverApiCall('/api/tests', 'GET', filters);
    if (res?.success) return (res.data || []).map(mapTest);
    return [];
  }
  const api = getApi();
  if (!api) return [];
  try {
    const res = await api.getTests(filters);
    if (res?.success) return (res.tests || []).map(mapTest);
    return [];
  } catch { return []; }
};

export const getTestById = async (id) => {
  if (isServerMode()) {
    const res = await serverApiCall(`/api/tests/${id}`, 'GET');
    if (res?.success && res.data) return mapTest(res.data);
    return null;
  }
  const api = getApi();
  if (!api) return null;
  try { const r = await api.getTest(id); return r?.success ? r.test : null; } catch { return null; }
};

export const createTest = async (testData) => {
  if (isServerMode()) {
    const res = await serverApiCall('/api/tests', 'POST', testData);
    if (!res?.success) throw new Error(res?.error || 'Test creation failed');
    return { id: res.id, ...testData };
  }
  const api = getApi();
  if (!api) throw new Error('Electron API not available');
  try {
    const res = await api.createTest(testData);
    if (!res?.success) throw new Error(res?.error || 'Test creation failed');
    return res.test;
  } catch (err) { throw err; }
};

export const updateTest = async (id, testData) => {
  if (isServerMode()) {
    const res = await serverApiCall(`/api/tests/${id}`, 'PUT', testData);
    if (!res?.success) throw new Error(res?.error || 'Test update failed');
    return { id, ...testData };
  }
  const api = getApi();
  if (!api) throw new Error('Electron API not available');
  try {
    const res = await api.updateTest(id, testData);
    if (!res?.success) throw new Error(res?.error || 'Test update failed');
    return res.test;
  } catch (err) { throw err; }
};

export const deleteTest = async (id) => {
  if (isServerMode()) {
    const res = await serverApiCall(`/api/tests/${id}`, 'DELETE');
    return res?.success || false;
  }
  const api = getApi();
  if (!api) return false;
  try { const r = await api.deleteTest(id); return !!r?.success; } catch { return false; }
};
