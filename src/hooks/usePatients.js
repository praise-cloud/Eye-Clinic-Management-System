// src/hooks/usePatients.js
// React hook for patient CRUD/search using patientService
import { useState, useCallback } from 'react';
import * as patientService from '../services/patientService';

export default function usePatients() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchPatients = useCallback(async (filters = {}) => {
    setLoading(true);
    setError(null);
    try {
      const data = await patientService.getAllPatients(filters);
      setPatients(data);
    } catch (err) {
      setError(err);
    }
    setLoading(false);
  }, []);

  const addPatient = useCallback(async (patientData) => {
    setLoading(true);
    setError(null);
    try {
      const newPatient = await patientService.createPatient(patientData);
      if (newPatient) setPatients((prev) => [...prev, newPatient]);
      return newPatient;
    } catch (err) {
      setError(err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const editPatient = useCallback(async (id, patientData) => {
    setLoading(true);
    setError(null);
    try {
      const updated = await patientService.updatePatient(id, patientData);
      if (updated) setPatients((prev) => prev.map(p => p.id === id ? updated : p));
      return updated;
    } catch (err) {
      setError(err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const removePatient = useCallback(async (id) => {
    setLoading(true);
    setError(null);
    try {
      const success = await patientService.deletePatient(id);
      if (success) setPatients((prev) => prev.filter(p => p.id !== id));
      return success;
    } catch (err) {
      setError(err);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const searchPatients = useCallback(async (searchTerm) => {
    setLoading(true);
    setError(null);
    try {
      const data = await patientService.searchPatients(searchTerm);
      setPatients(data);
    } catch (err) {
      setError(err);
    }
    setLoading(false);
  }, []);

  return {
    patients,
    loading,
    error,
    fetchPatients,
    addPatient,
    editPatient,
    removePatient,
    searchPatients,
    setPatients // for manual override if needed
  };
}
