// src/services/patientService.js
// Abstracts all patient CRUD/search logic via IPC

const { ipcRenderer } = window.require ? window.require('electron') : {};

// Generate unique patient ID
export const generatePatientId = () => {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `P${year}${month}${random}`;
};

export const getAllPatients = async (filters = {}) => {
  if (!ipcRenderer) return [];
  const res = await ipcRenderer.invoke('patients:getAll', filters);
  return res.success ? res.patients : [];
};

export const getPatientById = async (id) => {
  if (!ipcRenderer) return null;
  const res = await ipcRenderer.invoke('patients:getById', id);
  return res.success ? res.patient : null;
};

export const createPatient = async (patientData) => {
  if (!ipcRenderer) return null;
  const res = await ipcRenderer.invoke('patients:create', patientData);
  return res.success ? res.patient : null;
};

export const updatePatient = async (id, patientData) => {
  if (!ipcRenderer) return null;
  const res = await ipcRenderer.invoke('patients:update', { id, patientData });
  return res.success ? res.patient : null;
};

export const deletePatient = async (id) => {
  if (!ipcRenderer) return false;
  const res = await ipcRenderer.invoke('patients:delete', id);
  return res.success;
};

export const searchPatients = async (searchTerm) => {
  if (!ipcRenderer) return [];
  const res = await ipcRenderer.invoke('patients:search', searchTerm);
  return res.success ? res.patients : [];
};
