import { useState, useCallback, useEffect } from 'react';

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

export default function usePrescriptions() {
    const [prescriptions, setPrescriptions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchPatientPrescriptions = useCallback(async (patientId) => {
        if (!patientId) return;
        setLoading(true);
        setError(null);
        try {
            let result;
            if (isServerMode()) {
                result = await serverApiCall(`/api/prescriptions?patientId=${patientId}`, 'GET');
            } else {
                result = await window.electronAPI.getPrescriptionsByPatient(patientId);
            }
            if (result.success) {
                setPrescriptions(result.prescriptions || result.data || []);
            } else {
                setError(result.error);
            }
        } catch (err) {
            console.error('Error fetching patient prescriptions:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchPendingPrescriptions = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            let result;
            if (isServerMode()) {
                result = await serverApiCall('/api/prescriptions/pending', 'GET');
            } else {
                result = await window.electronAPI.getPendingPrescriptions();
            }
            if (result.success) {
                setPrescriptions(result.prescriptions || result.data || []);
            } else {
                setError(result.error);
            }
        } catch (err) {
            console.error('Error fetching pending prescriptions:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchPrescriptionById = useCallback(async (id) => {
        setLoading(true);
        setError(null);
        try {
            let result;
            if (isServerMode()) {
                result = await serverApiCall(`/api/prescriptions/${id}`, 'GET');
            } else {
                result = await window.electronAPI.getPrescriptionById(id);
            }
            if (result.success) {
                return result.prescription;
            } else {
                setError(result.error);
                return null;
            }
        } catch (err) {
            console.error('Error fetching prescription by ID:', err);
            setError(err.message);
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    const createPrescription = useCallback(async (data) => {
        setError(null);
        try {
            let result;
            if (isServerMode()) {
                result = await serverApiCall('/api/prescriptions', 'POST', data);
            } else {
                result = await window.electronAPI.createPrescription(data);
            }
            if (result.success) {
                return result.prescription;
            } else {
                setError(result.error);
                return null;
            }
        } catch (err) {
            console.error('Error creating prescription:', err);
            setError(err.message);
            return null;
        }
    }, []);

    const createMultiplePrescriptions = useCallback(async (patientId, doctorId, items) => {
        setError(null);
        setLoading(true);
        try {
            let result;
            if (isServerMode()) {
                result = await serverApiCall('/api/prescriptions/multiple', 'POST', { patientId, doctorId, items });
            } else {
                result = await window.electronAPI.createMultiplePrescriptions({ patientId, doctorId, items });
            }
            if (result.success) {
                return result.prescriptions;
            } else {
                setError(result.error);
                return null;
            }
        } catch (err) {
            console.error('Error creating multiple prescriptions:', err);
            setError(err.message);
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    const updateStatus = useCallback(async (id, status, userId) => {
        setError(null);
        try {
            let result;
            if (isServerMode()) {
                result = await serverApiCall(`/api/prescriptions/${id}/status`, 'PUT', { status, userId });
            } else {
                result = await window.electronAPI.updatePrescriptionStatus({ id, status, userId });
            }
            if (result.success) {
                setPrescriptions(prev => prev.map(p => p.id === id ? { ...p, status } : p));
                return true;
            } else {
                setError(result.error);
                return false;
            }
        } catch (err) {
            console.error('Error updating prescription status:', err);
            setError(err.message);
            return false;
        }
    }, []);

    useEffect(() => {
        if (window.electronAPI?.onIpcEvent) {
            const unsubscribe = window.electronAPI.onIpcEvent('data:update', (payload) => {
                if (payload && payload.table === 'prescriptions') {
                    fetchPendingPrescriptions();
                }
            });
            return unsubscribe;
        }
    }, [fetchPendingPrescriptions]);

    useEffect(() => {
        const handler = (e) => {
            const data = e.detail;
            if (data && data.table === 'prescriptions') fetchPendingPrescriptions();
        };
        window.addEventListener('server:dataUpdate', handler);
        return () => window.removeEventListener('server:dataUpdate', handler);
    }, [fetchPendingPrescriptions]);

    return {
        prescriptions,
        loading,
        error,
        fetchPatientPrescriptions,
        fetchPendingPrescriptions,
        fetchPrescriptionById,
        createPrescription,
        createMultiplePrescriptions,
        updateStatus
    };
}
