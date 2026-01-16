// src/services/TestService.js
// Abstracts all test-related IPC calls with clean error handling

const electronAPI = window.electronAPI;

export const getAllTests = async (filters = {}) => {
  try {
    const res = await electronAPI.getTests(filters);
    if (!res?.success) {
      console.warn('getAllTests failed:', res?.error);
      return [];
    }

    return res.tests.map(test => ({
      id: test.id,
      patientName: test.patient?.first_name && test.patient?.last_name
        ? `${test.patient.first_name} ${test.patient.last_name}`
        : 'Unknown Patient',
      patientId: test.patient_id,
      testType: test.machine_type || 'Unknown',
      eye: test.eye || 'both',
      result: (() => {
        try {
          return JSON.parse(test.raw_data || '{}').result || 'Pending';
        } catch {
          return 'Pending';
        }
      })(),
      date: test.test_date
        ? new Date(test.test_date).toLocaleDateString('en-GB')
        : 'N/A',
      notes: (() => {
        try {
          return JSON.parse(test.raw_data || '{}').notes || '';
        } catch {
          return '';
        }
      })()
    }));
  } catch (err) {
    console.error('getAllTests error:', err);
    return [];
  }
};

export const getTestById = async (id) => {
  try {
    const res = await electronAPI.getTest(id);
    return res?.success ? res.test : null;
  } catch (err) {
    console.error('getTestById error:', err);
    return null;
  }
};

export const createTest = async (testData) => {
  try {
    const res = await electronAPI.createTest(testData);
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
  try {
    const res = await electronAPI.updateTest(id, testData);
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
  try {
    const res = await electronAPI.deleteTest(id);
    return !!res?.success;
  } catch (err) {
    console.error('deleteTest error:', err);
    return false;
  }
};

export const getTestsByPatient = async (patientId) => {
  try {
    const res = await electronAPI.getTestsByPatient(patientId);
    return res?.success ? res.tests : [];
  } catch (err) {
    console.error('getTestsByPatient error:', err);
    return [];
  }
};