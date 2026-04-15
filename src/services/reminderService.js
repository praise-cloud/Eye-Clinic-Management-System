// src/services/reminderService.js
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

export const getAllReminders = async (filters = {}) => {
    if (isServerMode()) {
        const params = new URLSearchParams(filters).toString();
        const endpoint = params ? `/api/reminders?${params}` : '/api/reminders';
        const res = await serverApiCall(endpoint, 'GET');
        return res?.success ? res.reminders || res.data || [] : [];
    }
    try {
        const res = await window.electronAPI?.getAllReminders?.(filters);
        return res?.success ? res.reminders : [];
    } catch (err) {
        console.error('getAllReminders error:', err);
        return [];
    }
};

export const createReminder = async (reminderData) => {
    if (isServerMode()) {
        const res = await serverApiCall('/api/reminders', 'POST', reminderData);
        return res?.success ? res.reminder : null;
    }
    try {
        const res = await window.electronAPI?.createReminder?.(reminderData);
        return res?.success ? res.reminder : null;
    } catch (err) {
        console.error('createReminder error:', err);
        return null;
    }
};

export const getUpcomingReminders = async () => {
    if (isServerMode()) {
        const res = await serverApiCall('/api/reminders/upcoming', 'GET');
        return res?.success ? res.reminders || res.data || [] : [];
    }
    try {
        const res = await window.electronAPI?.getUpcomingReminders?.();
        return res?.success ? res.reminders : [];
    } catch (err) {
        console.error('getUpcomingReminders error:', err);
        return [];
    }
};
