// src/hooks/useBackup.js
import { useState, useCallback } from 'react';

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
        const response = await fetch(`${serverUrl}${endpoint}`, options);
        return await response.json();
    } catch (err) {
        return { success: false, error: err.message };
    }
};

export default function useBackup() {
    const [backups, setBackups] = useState([]);
    const [loading, setLoading] = useState(false);
    const [creating, setCreating] = useState(false);
    const [restoring, setRestoring] = useState(false);
    const [error, setError] = useState(null);

    const fetchBackups = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            let result;
            if (isServerMode()) {
                result = await serverApiCall('/api/backup/list', 'GET');
            } else {
                result = await window.electronAPI?.backupList?.();
            }
            if (result?.success) {
                setBackups(result.backups || []);
            } else {
                setError(result?.error);
            }
        } catch (err) {
            console.error('Error fetching backups:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    const createBackup = useCallback(async (options = {}) => {
        setCreating(true);
        setError(null);
        try {
            let result;
            if (isServerMode()) {
                result = await serverApiCall('/api/backup/create', 'POST', options);
            } else {
                result = await window.electronAPI?.backupCreate?.(options);
            }
            if (result?.success) {
                await fetchBackups();
                return result.backup;
            } else {
                setError(result?.error);
                return null;
            }
        } catch (err) {
            console.error('Error creating backup:', err);
            setError(err.message);
            return null;
        } finally {
            setCreating(false);
        }
    }, [fetchBackups]);

    const restoreBackup = useCallback(async (fileName) => {
        setRestoring(true);
        setError(null);
        try {
            let result;
            if (isServerMode()) {
                result = await serverApiCall(`/api/backup/restore/${encodeURIComponent(fileName)}`, 'POST', {});
            } else {
                result = await window.electronAPI?.backupRestore?.(fileName);
            }
            if (result?.success) {
                return true;
            } else {
                setError(result?.error);
                return false;
            }
        } catch (err) {
            console.error('Error restoring backup:', err);
            setError(err.message);
            return false;
        } finally {
            setRestoring(false);
        }
    }, []);

    return {
        backups,
        loading,
        creating,
        restoring,
        error,
        fetchBackups,
        createBackup,
        restoreBackup
    };
}
