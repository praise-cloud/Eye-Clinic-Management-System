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

export const getPharmacyDrugs = async (filters = {}) => {
  if (isServerMode()) {
    const res = await serverApiCall('/api/pharmacy/drugs', 'GET');
    return res?.success ? res.data : [];
  }
  const api = getApi();
  if (!api) return [];
  try { const r = await api.getPharmacyDrugs(filters); return r?.success ? r.drugs : []; }
  catch { return []; }
};

export const getPharmacyDrugById = async (id) => {
  if (isServerMode()) {
    const res = await serverApiCall(`/api/pharmacy/drugs/${id}`, 'GET');
    return res?.success ? res.data : null;
  }
  const api = getApi();
  if (!api) return null;
  try { const r = await api.getPharmacyDrugById(id); return r?.success ? r.drug : null; }
  catch { return null; }
};

export const createPharmacyDrug = async (drugData) => {
  if (isServerMode()) {
    const res = await serverApiCall('/api/pharmacy/drugs', 'POST', drugData);
    return res?.success ? { ...drugData, id: res.id } : null;
  }
  const api = getApi();
  if (!api) return null;
  try { const r = await api.createPharmacyDrug(drugData); return r?.success ? r.drug : null; }
  catch { return null; }
};

export const updatePharmacyDrug = async (id, drugData) => {
  if (isServerMode()) {
    const res = await serverApiCall(`/api/pharmacy/drugs/${id}`, 'PUT', drugData);
    return res?.success ? { ...drugData, id } : null;
  }
  const api = getApi();
  if (!api) return null;
  try { const r = await api.updatePharmacyDrug(id, drugData); return r?.success ? r.drug : null; }
  catch { return null; }
};

export const deletePharmacyDrug = async (id) => {
  if (isServerMode()) {
    const res = await serverApiCall(`/api/pharmacy/drugs/${id}`, 'DELETE');
    return res?.success || false;
  }
  const api = getApi();
  if (!api) return false;
  try { const r = await api.deletePharmacyDrug(id); return !!r?.success; }
  catch { return false; }
};

export const dispensePharmacyDrug = async (drugId, patientId, quantity, notes) => {
  if (isServerMode()) {
    const res = await serverApiCall('/api/pharmacy/dispense', 'POST', { drugId, patientId, quantity, notes });
    return res?.success ? res.dispensation : null;
  }
  const api = getApi();
  if (!api) return null;
  try { const r = await api.dispensePharmacyDrug(drugId, patientId, quantity, notes); return r?.success ? r.dispensation : null; }
  catch { return null; }
};
