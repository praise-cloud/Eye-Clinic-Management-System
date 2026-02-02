// src/services/inventoryService.js
// Abstracts all inventory CRUD logic via window.electronAPI

const getApi = () => {
    if (!window.electronAPI) {
        console.error('Electron API not found in window');
        return null;
    }
    return window.electronAPI;
};

export const getInventoryItems = async (filters = {}) => {
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
