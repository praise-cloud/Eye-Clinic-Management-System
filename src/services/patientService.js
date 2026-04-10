// src/services/patientService.js
// Abstracts all patient CRUD/search logic via IPC using window.electronAPI

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

// Generate unique patient ID
export const generatePatientId = () => {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `P${year}${month}${random}`;
};

export const getAllPatients = async (filters = {}) => {
  if (isServerMode()) {
    const res = await serverApiCall('/api/patients', 'GET', filters);
    return res?.success ? res.patients : [];
  }
  const api = getApi();
  if (!api) return [];
  try {
    const res = await api.getPatients(filters);
    return res?.success ? res.patients : [];
  } catch (err) {
    console.error('getAllPatients error:', err);
    return [];
  }
};

export const getPatientById = async (id) => {
  if (isServerMode()) {
    const res = await serverApiCall(`/api/patients/${id}`, 'GET');
    return res?.success ? res.patient : null;
  }
  const api = getApi();
  if (!api) return null;
  try {
    const res = await api.getPatient(id);
    return res?.success ? res.patient : null;
  } catch (err) {
    console.error('getPatientById error:', err);
    return null;
  }
};

export const createPatient = async (patientData) => {
  if (isServerMode()) {
    const res = await serverApiCall('/api/patients', 'POST', patientData);
    return res?.success ? res.patient : null;
  }
  const api = getApi();
  if (!api) return null;
  try {
    const res = await api.createPatient(patientData);
    return res?.success ? res.patient : null;
  } catch (err) {
    console.error('createPatient error:', err);
    return null;
  }
};

export const updatePatient = async (id, patientData) => {
  if (isServerMode()) {
    const res = await serverApiCall(`/api/patients/${id}`, 'PUT', patientData);
    return res?.success ? res.patient : null;
  }
  const api = getApi();
  if (!api) return null;
  try {
    const res = await api.updatePatient(id, patientData);
    return res?.success ? res.patient : null;
  } catch (err) {
    console.error('updatePatient error:', err);
    return null;
  }
};

export const deletePatient = async (id) => {
  if (isServerMode()) {
    const res = await serverApiCall(`/api/patients/${id}`, 'DELETE');
    return res?.success || false;
  }
  const api = getApi();
  if (!api) return false;
  try {
    const res = await api.deletePatient(id);
    return !!res?.success;
  } catch (err) {
    console.error('deletePatient error:', err);
    return false;
  }
};

export const searchPatients = async (searchTerm) => {
  if (isServerMode()) {
    const res = await serverApiCall('/api/patients/search', 'POST', { search: searchTerm });
    return res?.success ? res.patients : [];
  }
  const api = getApi();
  if (!api) return [];
  try {
    const res = await api.getPatients({ search: searchTerm });
    return res?.success ? res.patients : [];
  } catch (err) {
    console.error('searchPatients error:', err);
    return [];
  }
};
