import { useState, useCallback, useEffect } from 'react';

export default function usePrescriptions() {
    const [prescriptions, setPrescriptions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchPatientPrescriptions = useCallback(async (patientId) => {
        if (!patientId) return;
        setLoading(true);
        setError(null);
        try {
            const result = await window.electronAPI.getPrescriptionsByPatient(patientId);
            if (result.success) {
                setPrescriptions(result.prescriptions);
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
            const result = await window.electronAPI.getPendingPrescriptions();
            if (result.success) {
                setPrescriptions(result.prescriptions);
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
            const result = await window.electronAPI.getPrescriptionById(id);
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
            const result = await window.electronAPI.createPrescription(data);
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
            const result = await window.electronAPI.createMultiplePrescriptions({ patientId, doctorId, items });
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
            const result = await window.electronAPI.updatePrescriptionStatus({ id, status, userId });
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
        if (!window.electronAPI || !window.electronAPI.onIpcEvent) return;
        const unsubscribe = window.electronAPI.onIpcEvent('data:update', (payload) => {
            if (payload && payload.table === 'prescriptions') {
                // Redundant fetch or local update could be done here
                // For now, let's keep it simple
            }
        });
        return unsubscribe;
    }, []);

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
