import { useState, useCallback, useEffect } from 'react';
import * as inventoryService from '../services/inventoryService';

export default function useInventory() {
    const [inventoryItems, setInventoryItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchInventoryItems = useCallback(async (filters = {}) => {
        setLoading(true);
        setError(null);
        try {
            const data = await inventoryService.getInventoryItems(filters);
            setInventoryItems(data);
        } catch (err) {
            console.error('Error fetching inventory:', err);
            setError(err);
        } finally {
            setLoading(false);
        }
    }, []);

    const addItem = useCallback(async (itemData) => {
        setLoading(true);
        setError(null);
        try {
            const newItem = await inventoryService.createInventoryItem(itemData);
            if (newItem) setInventoryItems(prev => [...prev, newItem]);
            return newItem;
        } catch (err) {
            setError(err);
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    const updateItem = useCallback(async (id, itemData) => {
        setLoading(true);
        setError(null);
        try {
            const updated = await inventoryService.updateInventoryItem(id, itemData);
            if (updated) setInventoryItems(prev => prev.map(item => item.id === id ? updated : item));
            return updated;
        } catch (err) {
            setError(err);
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    const deleteItem = useCallback(async (id) => {
        setLoading(true);
        setError(null);
        try {
            const success = await inventoryService.deleteInventoryItem(id);
            if (success) setInventoryItems(prev => prev.filter(item => item.id !== id));
            return success;
        } catch (err) {
            setError(err);
            return false;
        } finally {
            setLoading(false);
        }
    }, []);

    const updateQuantity = useCallback(async (id, quantity, userId, notes) => {
        setLoading(true);
        setError(null);
        try {
            const success = await inventoryService.updateInventoryQuantity(id, quantity, userId, notes);
            if (success) {
                // Optimistic update
                setInventoryItems(prev => prev.map(item =>
                    item.id === id ? { ...item, current_quantity: quantity } : item
                ));
                // Ideally, re-fetch to get any server-side calculated fields or audit logs, but purely optional
            }
            return success;
        } catch (err) {
            setError(err);
            return false;
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!window.electronAPI || !window.electronAPI.onIpcEvent) return;
        const unsubscribe = window.electronAPI.onIpcEvent('data:update', (payload) => {
            if (payload && payload.table === 'inventory') {
                fetchInventoryItems();
            }
        });
        return unsubscribe;
    }, [fetchInventoryItems]);

    return {
        inventoryItems,
        loading,
        error,
        fetchInventoryItems,
        addItem,
        updateItem,
        deleteItem,
        updateQuantity,
        setInventoryItems
    };
}
