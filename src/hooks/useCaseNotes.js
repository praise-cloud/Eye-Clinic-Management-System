// src/hooks/useCaseNotes.js
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

export default function useCaseNotes() {
    const [caseNotes, setCaseNotes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchCaseNotes = useCallback(async (filters = {}) => {
        setLoading(true);
        setError(null);
        try {
            let result;
            if (isServerMode()) {
                const params = new URLSearchParams(filters).toString();
                const endpoint = params ? `/api/case-notes?${params}` : '/api/case-notes';
                result = await serverApiCall(endpoint, 'GET');
            } else {
                result = await window.electronAPI?.getAllCaseNotes?.(filters);
            }
            if (result?.success) {
                setCaseNotes(result.caseNotes || result.data || []);
            } else {
                setError(result?.error);
            }
        } catch (err) {
            console.error('Error fetching case notes:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchCaseNotesByPatient = useCallback(async (patientId) => {
        if (!patientId) return;
        setLoading(true);
        setError(null);
        try {
            let result;
            if (isServerMode()) {
                result = await serverApiCall(`/api/case-notes?patient_id=${patientId}`, 'GET');
            } else {
                result = await window.electronAPI?.getCaseNotesByPatient?.(patientId);
            }
            if (result?.success) {
                setCaseNotes(result.caseNotes || []);
            } else {
                setError(result?.error);
            }
        } catch (err) {
            console.error('Error fetching patient case notes:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    const createCaseNote = useCallback(async (caseNoteData) => {
        setError(null);
        try {
            let result;
            if (isServerMode()) {
                result = await serverApiCall('/api/case-notes', 'POST', caseNoteData);
            } else {
                result = await window.electronAPI?.createCaseNote?.(caseNoteData);
            }
            if (result?.success) {
                const newNote = result.caseNote;
                setCaseNotes(prev => [newNote, ...prev]);
                return newNote;
            } else {
                setError(result?.error);
                return null;
            }
        } catch (err) {
            console.error('Error creating case note:', err);
            setError(err.message);
            return null;
        }
    }, []);

    const updateCaseNote = useCallback(async (id, caseNoteData) => {
        setError(null);
        try {
            let result;
            if (isServerMode()) {
                result = await serverApiCall(`/api/case-notes/${id}`, 'PUT', caseNoteData);
            } else {
                result = await window.electronAPI?.updateCaseNote?.({ id, caseNoteData });
            }
            if (result?.success) {
                const updated = result.caseNote;
                setCaseNotes(prev => prev.map(n => n.id === id ? updated : n));
                return updated;
            } else {
                setError(result?.error);
                return null;
            }
        } catch (err) {
            console.error('Error updating case note:', err);
            setError(err.message);
            return null;
        }
    }, []);

    const signCaseNote = useCallback(async (id, doctorId) => {
        setError(null);
        try {
            let result;
            if (isServerMode()) {
                result = await serverApiCall(`/api/case-notes/${id}`, 'PUT', { status: 'signed', signed_off_by: doctorId });
            } else {
                result = await window.electronAPI?.signCaseNote?.({ id, signed_off_by: doctorId });
            }
            if (result?.success) {
                const signed = result.caseNote;
                setCaseNotes(prev => prev.map(n => n.id === id ? signed : n));
                return signed;
            } else {
                setError(result?.error);
                return null;
            }
        } catch (err) {
            console.error('Error signing case note:', err);
            setError(err.message);
            return null;
        }
    }, []);

    const getCaseNoteById = useCallback(async (id) => {
        setLoading(true);
        setError(null);
        try {
            let result;
            if (isServerMode()) {
                result = await serverApiCall(`/api/case-notes/${id}`, 'GET');
            } else {
                result = await window.electronAPI?.getCaseNoteById?.(id);
            }
            if (result?.success) {
                return result.caseNote;
            } else {
                setError(result?.error);
                return null;
            }
        } catch (err) {
            console.error('Error fetching case note:', err);
            setError(err.message);
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const handler = (e) => {
            const data = e.detail;
            if (data && data.table === 'case_notes') fetchCaseNotes();
        };
        window.addEventListener('server:dataUpdate', handler);
        return () => window.removeEventListener('server:dataUpdate', handler);
    }, [fetchCaseNotes]);

    return {
        caseNotes,
        loading,
        error,
        fetchCaseNotes,
        fetchCaseNotesByPatient,
        createCaseNote,
        updateCaseNote,
        signCaseNote,
        getCaseNoteById
    };
}
