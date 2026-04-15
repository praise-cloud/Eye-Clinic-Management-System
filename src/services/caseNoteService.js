// src/services/caseNoteService.js
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

export const getAllCaseNotes = async (filters = {}) => {
    if (isServerMode()) {
        const params = new URLSearchParams(filters).toString();
        const endpoint = params ? `/api/case-notes?${params}` : '/api/case-notes';
        const res = await serverApiCall(endpoint, 'GET');
        return res?.success ? res.caseNotes || res.data || [] : [];
    }
    try {
        const res = await window.electronAPI?.getAllCaseNotes?.(filters);
        return res?.success ? res.caseNotes : [];
    } catch (err) {
        console.error('getAllCaseNotes error:', err);
        return [];
    }
};

export const getCaseNoteById = async (id) => {
    if (isServerMode()) {
        const res = await serverApiCall(`/api/case-notes/${id}`, 'GET');
        return res?.success ? res.caseNote : null;
    }
    try {
        const res = await window.electronAPI?.getCaseNoteById?.(id);
        return res?.success ? res.caseNote : null;
    } catch (err) {
        console.error('getCaseNoteById error:', err);
        return null;
    }
};

export const createCaseNote = async (caseNoteData) => {
    if (isServerMode()) {
        const res = await serverApiCall('/api/case-notes', 'POST', caseNoteData);
        return res?.success ? res.caseNote : null;
    }
    try {
        const res = await window.electronAPI?.createCaseNote?.(caseNoteData);
        return res?.success ? res.caseNote : null;
    } catch (err) {
        console.error('createCaseNote error:', err);
        return null;
    }
};

export const updateCaseNote = async (id, caseNoteData) => {
    if (isServerMode()) {
        const res = await serverApiCall(`/api/case-notes/${id}`, 'PUT', caseNoteData);
        return res?.success ? res.caseNote : null;
    }
    try {
        const res = await window.electronAPI?.updateCaseNote?.({ id, caseNoteData });
        return res?.success ? res.caseNote : null;
    } catch (err) {
        console.error('updateCaseNote error:', err);
        return null;
    }
};

export const signCaseNote = async (id, doctorId) => {
    if (isServerMode()) {
        const res = await serverApiCall(`/api/case-notes/${id}`, 'PUT', { status: 'signed', signed_off_by: doctorId });
        return res?.success ? res.caseNote : null;
    }
    try {
        const res = await window.electronAPI?.signCaseNote?.({ id, signed_off_by: doctorId });
        return res?.success ? res.caseNote : null;
    } catch (err) {
        console.error('signCaseNote error:', err);
        return null;
    }
};

export const getCaseNotesByPatient = async (patientId) => {
    if (isServerMode()) {
        const res = await serverApiCall(`/api/case-notes?patient_id=${patientId}`, 'GET');
        return res?.success ? res.caseNotes || res.data || [] : [];
    }
    try {
        const res = await window.electronAPI?.getCaseNotesByPatient?.(patientId);
        return res?.success ? res.caseNotes : [];
    } catch (err) {
        console.error('getCaseNotesByPatient error:', err);
        return [];
    }
};
