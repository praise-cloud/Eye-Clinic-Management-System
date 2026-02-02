// src/services/patientService.js
// Abstracts all patient CRUD/search logic via IPC using window.electronAPI

// Accessing window.electronAPI inside functions to ensure it's available after preload
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
  const api = getApi();
  if (!api) return [];
  try {
    // Note: getPatients handler in handlers.js already handles filters including search
    const res = await api.getPatients({ search: searchTerm });
    return res?.success ? res.patients : [];
  } catch (err) {
    console.error('searchPatients error:', err);
    return [];
  }
};
