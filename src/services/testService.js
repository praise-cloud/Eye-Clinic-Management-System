
const getApi = () => {
  if (!window.electronAPI) {
    console.error('Electron API not found in window');
    return null;
  }
  return window.electronAPI;
};

export const getAllTests = async (filters = {}) => {
  const api = getApi();
  if (!api) return [];
  try {
    const res = await api.getTests(filters);
    if (res?.success) {
      return res.tests.map(test => ({
        id: test.id,
        patientName: test.first_name && test.last_name
          ? `${test.first_name} ${test.last_name}`
          : 'Unknown Patient',
        patientId: test.patient_id,
        testType: test.machine_type || 'Unknown',
        eye: test.eye || 'both',
        result: (() => {
          try { return JSON.parse(test.raw_data || '{}').result || 'Pending'; } catch { return 'Pending'; }
        })(),
        date: test.test_date
          ? new Date(test.test_date).toLocaleDateString('en-GB')
          : 'N/A',
        notes: (() => {
          try { return JSON.parse(test.raw_data || '{}').notes || ''; } catch { return ''; }
        })(),
        fileName: (() => {
          try { return JSON.parse(test.raw_data || '{}').fileName || null; } catch { return null; }
        })(),
        imageData: (() => {
          try { return JSON.parse(test.raw_data || '{}').imageData || null; } catch { return null; }
        })()
      }));
    }
    return [];
  } catch (err) {
    console.error('getAllTests failed:', err);
    return [];
  }
};

export const getTestById = async (id) => {
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
