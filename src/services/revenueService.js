const getServerUrl = () => localStorage.getItem('serverUrl');
const isServerMode = () => !!getServerUrl();

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

export const getRevenueLogs = async (filters = {}) => {
    if (isServerMode()) {
        const params = new URLSearchParams();
        if (filters.startDate) params.append('startDate', filters.startDate);
        if (filters.endDate) params.append('endDate', filters.endDate);
        if (filters.source) params.append('source', filters.source);
        const query = params.toString() ? `?${params.toString()}` : '';
        const res = await serverApiCall(`/api/revenue${query}`, 'GET');
        return res?.success ? res.data : [];
    }
    const api = window.electronAPI;
    if (!api) return [];
    try {
        const r = await api.getRevenueLogs(filters);
        return r?.success ? r.data : [];
    } catch { return []; }
};

export const getRevenueStats = async () => {
    if (isServerMode()) {
        const res = await serverApiCall('/api/revenue/stats', 'GET');
        return res?.success ? res.stats : null;
    }
    const api = window.electronAPI;
    if (!api) return null;
    try {
        const r = await api.getRevenueStats();
        return r?.success ? r.stats : null;
    } catch { return null; }
};
