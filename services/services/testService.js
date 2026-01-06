// src/services/testService.js
// Abstracts all test CRUD logic via IPC

const { ipcRenderer } = window.require ? window.require('electron') : {};

export const getAllTests = async (filters = {}) => {
  if (!ipcRenderer) return [];
  const res = await ipcRenderer.invoke('tests:getAll', filters);
  return res.success ? res.tests : [];
};

export const getTestById = async (id) => {
  if (!ipcRenderer) return null;
  const res = await ipcRenderer.invoke('tests:getById', id);
  return res.success ? res.test : null;
};

export const createTest = async (testData) => {
  if (!ipcRenderer) return null;
  const res = await ipcRenderer.invoke('tests:create', testData);
  return res.success ? res.test : null;
};

export const updateTest = async (id, testData) => {
  if (!ipcRenderer) return null;
  const res = await ipcRenderer.invoke('tests:update', { id, testData });
  return res.success ? res.test : null;
};

export const deleteTest = async (id) => {
  if (!ipcRenderer) return false;
  const res = await ipcRenderer.invoke('tests:delete', id);
  return res.success;
};

export const getTestsByPatient = async (patientId) => {
  if (!ipcRenderer) return [];
  const res = await ipcRenderer.invoke('tests:getByPatient', patientId);
  return res.success ? res.tests : [];
};
