// src/hooks/useVisits.js
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

export default function useVisits() {
    const [visits, setVisits] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchVisits = useCallback(async (filters = {}) => {
        setLoading(true);
        setError(null);
        try {
            let result;
            if (isServerMode()) {
                const params = new URLSearchParams(filters).toString();
                const endpoint = params ? `/api/visits?${params}` : '/api/visits';
                result = await serverApiCall(endpoint, 'GET');
            } else {
                result = await window.electronAPI?.getAllVisits?.(filters);
            }
            if (result?.success) {
                setVisits(result.visits || result.data || []);
            } else {
                setError(result?.error);
            }
        } catch (err) {
            logger.error('useVisits: Error fetching visits', { error: err.message });
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchVisitsByPatient = useCallback(async (patientId) => {
        if (!patientId) return;
        setLoading(true);
        setError(null);
        try {
            let result;
            if (isServerMode()) {
                result = await serverApiCall(`/api/visits?patient_id=${patientId}`, 'GET');
            } else {
                result = await window.electronAPI?.getVisitsByPatient?.(patientId);
            }
            if (result?.success) {
                setVisits(result.visits || []);
            } else {
                setError(result?.error);
            }
        } catch (err) {
            logger.error('useVisits: Error fetching patient visits', { error: err.message });
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    const createVisit = useCallback(async (visitData) => {
        setError(null);
        try {
            let result;
            if (isServerMode()) {
                result = await serverApiCall('/api/visits', 'POST', visitData);
            } else {
                result = await window.electronAPI?.createVisit?.(visitData);
            }
            if (result?.success) {
                const newVisit = result.visit;
                setVisits(prev => [newVisit, ...prev]);
                return newVisit;
            } else {
                setError(result?.error);
                return null;
            }
        } catch (err) {
            logger.error('useVisits: Error creating visit', { error: err.message });
            setError(err.message);
            return null;
        }
    }, []);

    const getVisitById = useCallback(async (id) => {
        setLoading(true);
        setError(null);
        try {
            let result;
            if (isServerMode()) {
                result = await serverApiCall(`/api/visits/${id}`, 'GET');
            } else {
                result = await window.electronAPI?.getVisitById?.(id);
            }
            if (result?.success) {
                return result.visit;
            } else {
                setError(result?.error);
                return null;
            }
        } catch (err) {
            logger.error('useVisits: Error fetching visit', { error: err.message });
            setError(err.message);
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const handler = (e) => {
            const data = e.detail;
            if (data && data.table === 'visits') fetchVisits();
        };
        window.addEventListener('server:dataUpdate', handler);
        return () => window.removeEventListener('server:dataUpdate', handler);
    }, [fetchVisits]);

    return {
        visits,
        loading,
        error,
        fetchVisits,
        fetchVisitsByPatient,
        createVisit,
        getVisitById
    };
}
