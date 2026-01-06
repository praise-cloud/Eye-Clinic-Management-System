import { useState, useEffect, useCallback } from 'react'

const useIPC = () => {
  const [isElectron, setIsElectron] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setIsElectron(!!window.electronAPI)
  }, [])

  // Generic IPC invoke method
  const invoke = useCallback(async (channel, ...args) => {
    if (!window.electronAPI) {
      throw new Error('Electron API not available')
    }
    
    setLoading(true)
    try {
      return await window.electronAPI.invoke(channel, ...args)
    } finally {
      setLoading(false)
    }
  }, [])

  // Database operations
  const db = {
    // Patients
    getPatients: useCallback(async (filters = {}) => {
      return invoke('db:getPatients', filters)
    }, [invoke]),

    addPatient: useCallback(async (patientData) => {
      return invoke('db:addPatient', patientData)
    }, [invoke]),

    updatePatient: useCallback(async (id, updates) => {
      return invoke('db:updatePatient', id, updates)
    }, [invoke]),

    deletePatient: useCallback(async (id) => {
      return invoke('db:deletePatient', id)
    }, [invoke]),

    // Tests
    getTests: useCallback(async (patientId) => {
      return invoke('db:getTests', patientId)
    }, [invoke]),

    addTest: useCallback(async (testData) => {
      return invoke('db:addTest', testData)
    }, [invoke]),

    // Reports
    generateReport: useCallback(async (reportData) => {
      return invoke('db:generateReport', reportData)
    }, [invoke]),

    getReports: useCallback(async (filters = {}) => {
      return invoke('db:getReports', filters)
    }, [invoke])
  }

  // File operations
  const files = {
    selectFile: useCallback(async (options = {}) => {
      return invoke('file:select', options)
    }, [invoke]),

    saveFile: useCallback(async (filePath, data) => {
      return invoke('file:save', filePath, data)
    }, [invoke]),

    openFile: useCallback(async (filePath) => {
      return invoke('file:open', filePath)
    }, [invoke]),

    exportData: useCallback(async (data, format = 'pdf') => {
      return invoke('file:export', data, format)
    }, [invoke])
  }

  // System operations
  const system = {
    getSystemInfo: useCallback(async () => {
      return invoke('system:info')
    }, [invoke]),

    openExternal: useCallback(async (url) => {
      return invoke('system:openExternal', url)
    }, [invoke]),

    showNotification: useCallback(async (title, body) => {
      return invoke('system:notification', { title, body })
    }, [invoke])
  }

  // Event listeners
  const on = useCallback((channel, callback) => {
    if (window.electronAPI?.on) {
      window.electronAPI.on(channel, callback)
    }
  }, [])

  const off = useCallback((channel, callback) => {
    if (window.electronAPI?.off) {
      window.electronAPI.off(channel, callback)
    }
  }, [])

  return {
    isElectron,
    loading,
    invoke,
    db,
    files,
    system,
    on,
    off
  }
}

export default useIPC