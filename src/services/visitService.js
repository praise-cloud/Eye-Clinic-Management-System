// src/services/visitService.js
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

export const getAllVisits = async (filters = {}) => {
    if (isServerMode()) {
        const params = new URLSearchParams(filters).toString();
        const endpoint = params ? `/api/visits?${params}` : '/api/visits';
        const res = await serverApiCall(endpoint, 'GET');
        return res?.success ? res.visits || res.data || [] : [];
    }
    try {
        const res = await window.electronAPI?.getAllVisits?.(filters);
        return res?.success ? res.visits : [];
    } catch (err) {
        console.error('getAllVisits error:', err);
        return [];
    }
};

export const getVisitById = async (id) => {
    if (isServerMode()) {
        const res = await serverApiCall(`/api/visits/${id}`, 'GET');
        return res?.success ? res.visit : null;
    }
    try {
        const res = await window.electronAPI?.getVisitById?.(id);
        return res?.success ? res.visit : null;
    } catch (err) {
        console.error('getVisitById error:', err);
        return null;
    }
};

export const createVisit = async (visitData) => {
    if (isServerMode()) {
        const res = await serverApiCall('/api/visits', 'POST', visitData);
        return res?.success ? res.visit : null;
    }
    try {
        const res = await window.electronAPI?.createVisit?.(visitData);
        return res?.success ? res.visit : null;
    } catch (err) {
        console.error('createVisit error:', err);
        return null;
    }
};

export const getVisitsByPatient = async (patientId) => {
    if (isServerMode()) {
        const res = await serverApiCall(`/api/visits?patient_id=${patientId}`, 'GET');
        return res?.success ? res.visits || res.data || [] : [];
    }
    try {
        const res = await window.electronAPI?.getVisitsByPatient?.(patientId);
        return res?.success ? res.visits : [];
    } catch (err) {
        console.error('getVisitsByPatient error:', err);
        return [];
    }
};
