// src/hooks/useTests.js
// React hook for test CRUD/search using testService
import { useState, useCallback } from 'react';
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
      if (newTest) setTests((prev) => [...prev, newTest]);
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
