const getApi = () => {
  if (!window.electronAPI) {
    console.error('Electron API not found in window');
    return null;
  }
  return window.electronAPI;
};

export const getPharmacyDrugs = async (filters = {}) => {
  const api = getApi();
  if (!api) return [];
  try {
    const res = await api.getPharmacyDrugs(filters);
    return res?.success ? res.drugs : [];
  } catch (err) {
    console.error('getPharmacyDrugs error:', err);
    return [];
  }
};

export const createPharmacyDrug = async (drugData) => {
  const api = getApi();
  if (!api) throw new Error('Electron API not available');
  try {
    const res = await api.createPharmacyDrug(drugData);
    if (!res?.success) throw new Error(res?.error || 'Failed to create drug');
    return res.drug;
  } catch (err) {
    console.error('createPharmacyDrug error:', err);
    throw err;
  }
};

export const updatePharmacyDrug = async (id, drugData) => {
  const api = getApi();
  if (!api) throw new Error('Electron API not available');
  try {
    const res = await api.updatePharmacyDrug(id, drugData);
    if (!res?.success) throw new Error(res?.error || 'Failed to update drug');
    return res.drug;
  } catch (err) {
    console.error('updatePharmacyDrug error:', err);
    throw err;
  }
};

export const deletePharmacyDrug = async (id) => {
  const api = getApi();
  if (!api) return false;
  try {
    const res = await api.deletePharmacyDrug(id);
    return !!res?.success;
  } catch (err) {
    console.error('deletePharmacyDrug error:', err);
    return false;
  }
};

export const dispensePharmacyDrug = async (drugId, patientId, quantity, notes) => {
  const api = getApi();
  if (!api) throw new Error('Electron API not available');
  try {
    const res = await api.dispensePharmacyDrug(drugId, patientId, quantity, notes);
    if (!res?.success) throw new Error(res?.error || 'Failed to record dispensation');
    return res.dispensation;
  } catch (err) {
    console.error('dispensePharmacyDrug error:', err);
    throw err;
  }
};

