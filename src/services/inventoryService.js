// src/services/inventoryService.js
// Abstracts all inventory CRUD logic via window.electronAPI

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

export const getInventoryItems = async (filters = {}) => {
    if (isServerMode()) {
        const res = await serverApiCall('/api/inventory', 'GET', filters);
        return res?.success ? res.inventory : [];
    }
    const api = getApi();
    if (!api) return [];
    try {
        const res = await api.getInventoryItems(filters);
        return res?.success ? res.items : [];
    } catch (err) {
        console.error('getInventoryItems error:', err);
        return [];
    }
};

export const createInventoryItem = async (itemData) => {
    if (isServerMode()) {
        const res = await serverApiCall('/api/inventory', 'POST', itemData);
        if (!res?.success) throw new Error(res?.error || 'Failed to create item');
        return res.inventory;
    }
    const api = getApi();
    if (!api) throw new Error('Electron API not available');
    try {
        const res = await api.createInventoryItem(itemData);
        if (!res?.success) throw new Error(res?.error || 'Failed to create item');
        return res.item;
    } catch (err) {
        console.error('createInventoryItem error:', err);
        throw err;
    }
};

export const updateInventoryItem = async (id, itemData) => {
    if (isServerMode()) {
        const res = await serverApiCall(`/api/inventory/${id}`, 'PUT', itemData);
        if (!res?.success) throw new Error(res?.error || 'Failed to update item');
        return res.inventory;
    }
    const api = getApi();
    if (!api) throw new Error('Electron API not available');
    try {
        const res = await api.updateInventoryItem(id, itemData);
        if (!res?.success) throw new Error(res?.error || 'Failed to update item');
        return res.item;
    } catch (err) {
        console.error('updateInventoryItem error:', err);
        throw err;
    }
};

export const deleteInventoryItem = async (id) => {
    if (isServerMode()) {
        const res = await serverApiCall(`/api/inventory/${id}`, 'DELETE');
        return res?.success || false;
    }
    const api = getApi();
    if (!api) return false;
    try {
        const res = await api.deleteInventoryItem(id);
        return !!res?.success;
    } catch (err) {
        console.error('deleteInventoryItem error:', err);
        return false;
    }
};

export const updateInventoryQuantity = async (id, quantity, userId, notes) => {
    if (isServerMode()) {
        const res = await serverApiCall(`/api/inventory/${id}/quantity`, 'PUT', { quantity, userId, notes });
        if (!res?.success) throw new Error(res?.error || 'Failed to update quantity');
        return true;
    }
    const api = getApi();
    if (!api) throw new Error('Electron API not available');
    try {
        const res = await api.updateInventoryQuantity(id, quantity, userId, notes);
        if (!res?.success) throw new Error(res?.error || 'Failed to update quantity');
        return true;
    } catch (err) {
        console.error('updateInventoryQuantity error:', err);
        throw err;
    }
};
