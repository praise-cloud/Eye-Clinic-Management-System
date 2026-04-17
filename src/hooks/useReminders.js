// src/hooks/useReminders.js
import { useState, useCallback, useEffect } from 'react';
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

export default function useReminders() {
    const [reminders, setReminders] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchReminders = useCallback(async (filters = {}) => {
        setLoading(true);
        setError(null);
        try {
            let result;
            if (isServerMode()) {
                const params = new URLSearchParams(filters).toString();
                const endpoint = params ? `/api/reminders?${params}` : '/api/reminders';
                result = await serverApiCall(endpoint, 'GET');
            } else {
                result = await window.electronAPI?.getAllReminders?.(filters);
            }
            if (result?.success) {
                setReminders(result.reminders || result.data || []);
            } else {
                setError(result?.error);
            }
        } catch (err) {
            logger.error('useReminders: Error fetching reminders', { error: err.message });
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchUpcomingReminders = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            let result;
            if (isServerMode()) {
                result = await serverApiCall('/api/reminders/upcoming', 'GET');
            } else {
                result = await window.electronAPI?.getUpcomingReminders?.();
            }
            if (result?.success) {
                setReminders(result.reminders || []);
            } else {
                setError(result?.error);
            }
        } catch (err) {
            logger.error('useReminders: Error fetching upcoming reminders', { error: err.message });
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    const createReminder = useCallback(async (reminderData) => {
        setError(null);
        try {
            let result;
            if (isServerMode()) {
                result = await serverApiCall('/api/reminders', 'POST', reminderData);
            } else {
                result = await window.electronAPI?.createReminder?.(reminderData);
            }
            if (result?.success) {
                const newReminder = result.reminder;
                setReminders(prev => [newReminder, ...prev]);
                return newReminder;
            } else {
                setError(result?.error);
                return null;
            }
        } catch (err) {
            logger.error('useReminders: Error creating reminder', { error: err.message });
            setError(err.message);
            return null;
        }
    }, []);

    useEffect(() => {
        const handler = (e) => {
            const data = e.detail;
            if (data && data.table === 'appointment_reminders') fetchReminders();
        };
        window.addEventListener('server:dataUpdate', handler);
        return () => window.removeEventListener('server:dataUpdate', handler);
    }, [fetchReminders]);

    return {
        reminders,
        loading,
        error,
        fetchReminders,
        fetchUpcomingReminders,
        createReminder
    };
}
