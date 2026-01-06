export const getAllPatients = async (filters) => {
  const result = await window.electronAPI.getPatients(filters);
  return result?.success ? result.patients : [];
};

export const getPatient = async (id) => {
  return await window.electronAPI.getPatient(id);
};

export const createPatient = async (patientData) => {
  return await window.electronAPI.createPatient(patientData);
};

export const updatePatient = async (id, patientData) => {
  return await window.electronAPI.updatePatient(id, patientData);
};

export const deletePatient = async (id) => {
  return await window.electronAPI.deletePatient(id);

};
