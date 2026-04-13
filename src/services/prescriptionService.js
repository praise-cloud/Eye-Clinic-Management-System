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

export const getPrescriptionsByPatient = async (patientId) => {
  if (isServerMode()) {
    const res = await serverApiCall(`/api/prescriptions?patient_id=${patientId}`, 'GET');
    return res?.success ? res.data : [];
  }
  const api = getApi();
  if (!api) return [];
  try { const r = await api.getPrescriptionsByPatient(patientId); return r?.success ? r.prescriptions : []; }
  catch { return []; }
};

export const getPendingPrescriptions = async () => {
  if (isServerMode()) {
    const res = await serverApiCall('/api/prescriptions/pending', 'GET');
    return res?.success ? res.data : [];
  }
  const api = getApi();
  if (!api) return [];
  try { const r = await api.getPendingPrescriptions(); return r?.success ? r.prescriptions : []; }
  catch { return []; }
};

export const createPrescription = async (prescriptionData) => {
  if (isServerMode()) {
    const res = await serverApiCall('/api/prescriptions', 'POST', prescriptionData);
    return res?.success ? { ...prescriptionData, id: res.id } : null;
  }
  const api = getApi();
  if (!api) return null;
  try { const r = await api.createPrescription(prescriptionData); return r?.success ? r.prescription : null; }
  catch { return null; }
};

export const createMultiplePrescriptions = async (patientId, doctorId, items) => {
  if (isServerMode()) {
    const results = [];
    for (const item of items) {
      const r = await serverApiCall('/api/prescriptions', 'POST', { patient_id: patientId, doctor_id: doctorId, ...item });
      if (r?.success) results.push({ ...item, id: r.id });
    }
    return { prescriptions: results };
  }
  const api = getApi();
  if (!api) return { prescriptions: [] };
  try {
    const r = await api.createMultiplePrescriptions({ patientId, doctorId, items });
    return r?.success ? r : { prescriptions: [] };
  } catch { return { prescriptions: [] }; }
};

export const updatePrescriptionStatus = async (id, status, userId) => {
  if (isServerMode()) {
    const res = await serverApiCall(`/api/prescriptions/${id}/status`, 'PUT', { status });
    return res?.success || false;
  }
  const api = getApi();
  if (!api) return false;
  try { const r = await api.updatePrescriptionStatus({ id, status, userId }); return !!r?.success; }
  catch { return false; }
};

export const getPrescriptionById = async (id) => {
  if (isServerMode()) {
    const res = await serverApiCall(`/api/prescriptions/${id}`, 'GET');
    return res?.success ? res.data : null;
  }
  const api = getApi();
  if (!api) return null;
  try { const r = await api.getPrescriptionById(id); return r?.success ? r.prescription : null; }
  catch { return null; }
};
