// src/services/backupService.js
import logger from '../utils/logger';

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

export const createBackup = async (options = {}) => {
    if (isServerMode()) {
        const res = await serverApiCall('/api/backup/create', 'POST', options);
        return res?.success ? res.backup : null;
    }
    try {
        const res = await window.electronAPI?.backupCreate?.(options);
        return res?.success ? res.backup : null;
    } catch (err) {
        logger.error('BackupService: createBackup error', { error: err.message });
        return null;
    }
};

export const listBackups = async () => {
    if (isServerMode()) {
        const res = await serverApiCall('/api/backup/list', 'GET');
        return res?.success ? res.backups || [] : [];
    }
    try {
        const res = await window.electronAPI?.backupList?.();
        return res?.success ? res.backups : [];
    } catch (err) {
        logger.error('BackupService: listBackups error', { error: err.message });
        return [];
    }
};

export const restoreBackup = async (fileName) => {
    if (isServerMode()) {
        const res = await serverApiCall(`/api/backup/restore/${encodeURIComponent(fileName)}`, 'POST', {});
        return res?.success;
    }
    try {
        const res = await window.electronAPI?.backupRestore?.(fileName);
        return !!res?.success;
    } catch (err) {
        logger.error('BackupService: restoreBackup error', { error: err.message });
        return false;
    }
};
