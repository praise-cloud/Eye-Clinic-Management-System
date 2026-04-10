
const getServerUrl = () => localStorage.getItem('serverUrl');
const isServerMode = () => !!getServerUrl();

const serverApiCall = async (endpoint, method = 'GET', body = null) => {
    const serverUrl = getServerUrl();
    if (!serverUrl) return { success: false, error: 'Not connected to server' };
    
    try {
        const options = { method, headers: { 'Content-Type': 'application/json' } };
        if (body) options.body = JSON.stringify(body);
        
        const response = await fetch(`${serverUrl}${endpoint}`, options);
        return await response.json();
    } catch (err) {
        return { success: false, error: err.message };
    }
};

const getApi = () => {
  if (!window.electronAPI) {
    console.error('Electron API not found in window');
    return null;
  }
  return window.electronAPI;
};

export const getAllTests = async (filters = {}) => {
  if (isServerMode()) {
    const res = await serverApiCall('/api/tests', 'GET', filters);
    if (res?.success) {
      return res.tests.map(test => {
        const rawData = (() => {
          try { return JSON.parse(test.raw_data || '{}'); } catch { return {}; }
        })();
        return ({
        rawData,
        id: test.id,
        patientName: test.first_name && test.last_name
          ? `${test.first_name} ${test.last_name}`
          : 'Unknown Patient',
        patientId: test.patient_id,
        testType: test.machine_type || 'Unknown',
        machineType: test.machine_type || 'Unknown',
        eye: test.eye || 'both',
        result: rawData.result || 'Pending',
        date: test.test_date
          ? new Date(test.test_date).toLocaleDateString('en-GB')
          : 'N/A',
        testDate: test.test_date || null,
        notes: rawData.notes || '',
        fileName: rawData.fileName || null,
        imageData: rawData.imageData || null
      });
      });
    }
    return [];
  }
  const api = getApi();
  if (!api) return [];
  try {
    const res = await api.getTests(filters);
    if (res?.success) {
      return res.tests.map(test => {
        const rawData = (() => {
          try { return JSON.parse(test.raw_data || '{}'); } catch { return {}; }
        })();
        return ({
        rawData,
        id: test.id,
        patientName: test.first_name && test.last_name
          ? `${test.first_name} ${test.last_name}`
          : 'Unknown Patient',
        patientId: test.patient_id,
        testType: test.machine_type || 'Unknown',
        machineType: test.machine_type || 'Unknown',
        eye: test.eye || 'both',
        result: rawData.result || 'Pending',
        date: test.test_date
          ? new Date(test.test_date).toLocaleDateString('en-GB')
          : 'N/A',
        testDate: test.test_date || null,
        notes: rawData.notes || '',
        fileName: rawData.fileName || null,
        imageData: rawData.imageData || null
      });
      });
    }
    return [];
  } catch (err) {
    console.error('getAllTests failed:', err);
    return [];
  }
};

export const getTestById = async (id) => {
  if (isServerMode()) {
    const res = await serverApiCall(`/api/tests/${id}`, 'GET');
    return res?.success ? res.test : null;
  }
  const api = getApi();
  if (!api) return null;
  try {
    const res = await api.getTest(id);
    return res?.success ? res.test : null;
  } catch (err) {
    console.error('getTestById error:', err);
    return null;
  }
};

export const createTest = async (testData) => {
  if (isServerMode()) {
    const res = await serverApiCall('/api/tests', 'POST', testData);
    if (!res?.success) throw new Error(res?.error || 'Test creation failed');
    return res.test;
  }
  const api = getApi();
  if (!api) throw new Error('Electron API not available');
  try {
    const res = await api.createTest(testData);
    if (!res?.success) {
      throw new Error(res?.error || 'Test creation failed');
    }
    return res.test;
  } catch (err) {
    console.error('createTest error:', err);
    throw err;
  }
};

export const updateTest = async (id, testData) => {
  if (isServerMode()) {
    const res = await serverApiCall(`/api/tests/${id}`, 'PUT', testData);
    if (!res?.success) throw new Error(res?.error || 'Test update failed');
    return res.test;
  }
  const api = getApi();
  if (!api) throw new Error('Electron API not available');
  try {
    const res = await api.updateTest(id, testData);
    if (!res?.success) {
      throw new Error(res?.error || 'Test update failed');
    }
    return res.test;
  } catch (err) {
    console.error('updateTest error:', err);
    throw err;
  }
};

export const deleteTest = async (id) => {
  if (isServerMode()) {
    const res = await serverApiCall(`/api/tests/${id}`, 'DELETE');
    return res?.success || false;
  }
  const api = getApi();
  if (!api) return false;
  try {
    const res = await api.deleteTest(id);
    return !!res?.success;
  } catch (err) {
    console.error('deleteTest error:', err);
    return false;
  }
};

export const generateReport = async (patientId, testIds) => {
  if (isServerMode()) {
    const res = await serverApiCall('/api/tests/generateReport', 'POST', { patientId, testIds });
    if (!res?.success) throw new Error(res?.error || 'Report generation failed');
    return res;
  }
  const api = getApi();
  if (!api) throw new Error('Electron API not available');
  try {
    const res = await api.generateReport(patientId, testIds);
    if (!res?.success) throw new Error(res?.error || 'Report generation failed');
    return res;
  } catch (err) {
    console.error('generateReport error:', err);
    throw err;
  }
};
