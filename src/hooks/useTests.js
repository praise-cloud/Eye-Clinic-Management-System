import { useState, useCallback, useEffect } from 'react';
import * as testService from '../services/testService';

export default function useTests() {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchTests = useCallback(async (filters = {}) => {
    setLoading(true);
    setError(null);
    try {
      const data = await testService.getAllTests(filters);
      setTests(data);
    } catch (err) {
      setError(err);
    }
    setLoading(false);
  }, []);

  const addTest = useCallback(async (testData) => {
    setLoading(true);
    setError(null);
    try {
      const newTest = await testService.createTest(testData);
      if (newTest) {
        await fetchTests();
      }
      return newTest;
    } catch (err) {
      setError(err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const editTest = useCallback(async (id, testData) => {
    setLoading(true);
    setError(null);
    try {
      const updated = await testService.updateTest(id, testData);
      if (updated) setTests((prev) => prev.map(t => t.id === id ? updated : t));
      return updated;
    } catch (err) {
      setError(err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const removeTest = useCallback(async (id) => {
    setLoading(true);
    setError(null);
    try {
      const success = await testService.deleteTest(id);
      if (success) setTests((prev) => prev.filter(t => t.id !== id));
      return success;
    } catch (err) {
      setError(err);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (window.electronAPI?.onIpcEvent) {
      const unsubscribe = window.electronAPI.onIpcEvent('data:update', (payload) => {
        if (payload && payload.table === 'tests') {
          fetchTests();
        }
      });
      return unsubscribe;
    }
  }, [fetchTests]);

  useEffect(() => {
    const handler = (e) => {
      const data = e.detail;
      if (data && data.table === 'tests') fetchTests();
    };
    window.addEventListener('server:dataUpdate', handler);
    return () => window.removeEventListener('server:dataUpdate', handler);
  }, [fetchTests]);

  return {
    tests,
    loading,
    error,
    fetchTests,
    addTest,
    editTest,
    removeTest,
    setTests // for manual override if needed
  };
}
