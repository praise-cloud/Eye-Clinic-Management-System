const electronAPI = window.electronAPI;

export const getInventoryItems = async (filters = {}) => {
    try {
        const res = await electronAPI.getInventoryItems(filters);
        return res?.success ? res.items : [];
    } catch (err) {
        console.error('getInventoryItems error:', err);
        throw err;
    }
};

export const createInventoryItem = async (itemData) => {
    try {
        const res = await electronAPI.createInventoryItem(itemData);
        if (!res?.success) throw new Error(res?.error || 'Failed to create item');
        return res.item;
    } catch (err) {
        console.error('createInventoryItem error:', err);
        throw err;
    }
};

export const updateInventoryItem = async (id, itemData) => {
    try {
        const res = await electronAPI.updateInventoryItem(id, itemData);
        if (!res?.success) throw new Error(res?.error || 'Failed to update item');
        return res.item;
    } catch (err) {
        console.error('updateInventoryItem error:', err);
        throw err;
    }
};

export const deleteInventoryItem = async (id) => {
    try {
        const res = await electronAPI.deleteInventoryItem(id);
        return !!res?.success;
    } catch (err) {
        console.error('deleteInventoryItem error:', err);
        throw err;
    }
};

export const updateInventoryQuantity = async (id, quantity, userId, notes) => {
    try {
        const res = await electronAPI.updateInventoryQuantity(id, quantity, userId, notes);
        if (!res?.success) throw new Error(res?.error || 'Failed to update quantity');
        return true;
    } catch (err) {
        console.error('updateInventoryQuantity error:', err);
        throw err;
    }
};
