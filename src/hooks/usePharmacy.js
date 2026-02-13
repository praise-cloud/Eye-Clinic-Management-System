import { useState, useCallback, useEffect } from 'react';
import * as pharmacyService from '../services/pharmacyService';

export default function usePharmacy() {
  const [drugs, setDrugs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchDrugs = useCallback(async (filters = {}) => {
    setLoading(true);
    setError(null);
    try {
      const data = await pharmacyService.getPharmacyDrugs(filters);
      setDrugs(data);
    } catch (err) {
      console.error('Error fetching pharmacy drugs:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const addDrug = useCallback(async (drugData) => {
    setLoading(true);
    setError(null);
    try {
      const newDrug = await pharmacyService.createPharmacyDrug(drugData);
      if (newDrug) setDrugs(prev => [...prev, newDrug]);
      return newDrug;
    } catch (err) {
      setError(err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateDrug = useCallback(async (id, drugData) => {
    setLoading(true);
    setError(null);
    try {
      const updated = await pharmacyService.updatePharmacyDrug(id, drugData);
      if (updated) setDrugs(prev => prev.map(drug => drug.id === id ? updated : drug));
      return updated;
    } catch (err) {
      setError(err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteDrug = useCallback(async (id) => {
    setLoading(true);
    setError(null);
    try {
      const success = await pharmacyService.deletePharmacyDrug(id);
      if (success) setDrugs(prev => prev.filter(drug => drug.id !== id));
      return success;
    } catch (err) {
      setError(err);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const dispenseDrug = useCallback(async (drugId, patientId, quantity, notes) => {
    setLoading(true);
    setError(null);
    try {
      const dispensation = await pharmacyService.dispensePharmacyDrug(drugId, patientId, quantity, notes);
      if (dispensation?.drug) {
        setDrugs(prev => prev.map(drug => drug.id === dispensation.drug.id ? dispensation.drug : drug));
      }
      return dispensation;
    } catch (err) {
      setError(err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!window.electronAPI || !window.electronAPI.onIpcEvent) return;
    const unsubscribe = window.electronAPI.onIpcEvent('data:update', (payload) => {
      if (payload && payload.table === 'pharmacy') {
        fetchDrugs();
      }
    });
    return unsubscribe;
  }, [fetchDrugs]);

  return {
    drugs,
    loading,
    error,
    fetchDrugs,
    addDrug,
    updateDrug,
    deleteDrug,
    dispenseDrug,
    setDrugs
  };
}

