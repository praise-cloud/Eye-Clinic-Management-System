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

export const getAllInventoryItems = async (filters = {}) => {
  if (isServerMode()) {
    const res = await serverApiCall('/api/inventory', 'GET');
    return res?.success ? res.data : [];
  }
  const api = getApi();
  if (!api) return [];
  try { const r = await api.getInventoryItems(filters); return r?.success ? r.items : []; }
  catch { return []; }
};
export const getInventoryItems = getAllInventoryItems;

export const getInventoryItemById = async (id) => {
  if (isServerMode()) {
    const res = await serverApiCall(`/api/inventory/${id}`, 'GET');
    return res?.success ? res.data : null;
  }
  const api = getApi();
  if (!api) return null;
  try { const r = await api.getInventoryItem(id); return r?.success ? r.item : null; }
  catch { return null; }
};

export const createInventoryItem = async (itemData) => {
  if (isServerMode()) {
    const res = await serverApiCall('/api/inventory', 'POST', itemData);
    return res?.success ? { ...itemData, id: res.id } : null;
  }
  const api = getApi();
  if (!api) return null;
  try { const r = await api.createInventoryItem(itemData); return r?.success ? r.item : null; }
  catch { return null; }
};

export const updateInventoryItem = async (id, itemData) => {
  if (isServerMode()) {
    const res = await serverApiCall(`/api/inventory/${id}`, 'PUT', itemData);
    return res?.success ? { ...itemData, id } : null;
  }
  const api = getApi();
  if (!api) return null;
  try { const r = await api.updateInventoryItem(id, itemData); return r?.success ? r.item : null; }
  catch { return null; }
};

export const deleteInventoryItem = async (id) => {
  if (isServerMode()) {
    const res = await serverApiCall(`/api/inventory/${id}`, 'DELETE');
    return res?.success || false;
  }
  const api = getApi();
  if (!api) return false;
  try { const r = await api.deleteInventoryItem(id); return !!r?.success; }
  catch { return false; }
};

export const updateInventoryQuantity = async (id, quantity, userId, notes) => {
  if (isServerMode()) {
    const res = await serverApiCall(`/api/inventory/${id}`, 'PUT', { quantity });
    return res?.success || false;
  }
  const api = getApi();
  if (!api) return false;
  try { const r = await api.updateInventoryQuantity(id, quantity, userId, notes); return !!r?.success; }
  catch { return false; }
};

export const getInventoryItemByCode = async (itemCode) => {
  const api = getApi();
  if (!api) return null;
  try { const r = await api.getInventoryItemByCode(itemCode); return r?.success ? r.item : null; }
  catch { return null; }
};

export const getInventoryStatistics = async () => {
  const api = getApi();
  if (!api) return {};
  try { const r = await api.getInventoryStatistics(); return r?.success ? r.stats : {}; }
  catch { return {}; }
};

export const getLowStockItems = async () => {
  const api = getApi();
  if (!api) return [];
  try { const r = await api.getLowStockItems(); return r?.success ? r.items : []; }
  catch { return []; }
};

export const getExpiringItems = async (days = 30) => {
  const api = getApi();
  if (!api) return [];
  try { const r = await api.getExpiringItems(days); return r?.success ? r.items : []; }
  catch { return []; }
};

export const searchInventory = async (searchTerm) => {
  const api = getApi();
  if (!api) return [];
  try { const r = await api.searchInventory(searchTerm); return r?.success ? r.items : []; }
  catch { return []; }
};
