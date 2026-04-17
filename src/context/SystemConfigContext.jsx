import React, { createContext, useContext, useState, useEffect } from 'react';
import logger from '../utils/logger';

const SystemConfigContext = createContext();

export const useSystemConfig = () => {
  const context = useContext(SystemConfigContext);
  if (!context) {
    logger.warn('SystemConfigContext: useSystemConfig used outside SystemConfigProvider, using defaults');
    return {
      config: {
        autoBackups: true,
        emailNotifications: true,
        twoFactorAuth: false,
        backupTime: '02:00',
        sessionTimeout: 30,
        maxLoginAttempts: 3,
        clinicName: 'KORENE EYE CLINIC NIG. LTD.',
        clinicEmail: 'info@koreneclinic.com',
        clinicPhone: '+234-XXX-XXX-XXXX',
        clinicAddress: '',
        appointmentDuration: 30,
        workingHoursStart: '08:00',
        workingHoursEnd: '18:00'
      },
      updateConfig: () => { },
      toggleConfig: () => { },
      updateMultipleConfig: () => { }
    };
  }
  return context;
};

export const SystemConfigProvider = ({ children }) => {
  const [config, setConfig] = useState({
    autoBackups: true,
    emailNotifications: true,
    twoFactorAuth: false,
    backupTime: '02:00',
    sessionTimeout: 30,
    maxLoginAttempts: 3,
    clinicName: 'KORENE EYE CLINIC NIG. LTD.',
    clinicEmail: 'info@koreneclinic.com',
    clinicPhone: '+234-XXX-XXX-XXXX',
    clinicAddress: '',
    appointmentDuration: 30,
    workingHoursStart: '08:00',
    workingHoursEnd: '18:00'
  });

  // Load configuration on mount
  useEffect(() => {
    const loadConfig = async () => {
      try {
        // 1. Start with localStorage for speed
        const saved = localStorage.getItem('systemConfig');
        if (saved) {
          setConfig(prev => ({ ...prev, ...JSON.parse(saved) }));
        }

        // 2. Fetch from DB for authority (especially for network settings)
        if (window.electronAPI?.getSettings) {
          const res = await window.electronAPI.getSettings();
          if (res?.success && res.settings) {
            // Process settings if they are stored as JSON or individual keys
            // For now, assume we store a single 'systemConfig' key
            const dbSetting = res.settings.find(s => s.key === 'systemConfig');
            if (dbSetting && dbSetting.value) {
              const parsed = JSON.parse(dbSetting.value);
              setConfig(prev => ({ ...prev, ...parsed }));
              localStorage.setItem('systemConfig', dbSetting.value);
            }
          }
        }
      } catch (err) {
        logger.error('SystemConfigContext: Failed to load system config', { error: err.message });
      }
    };
    loadConfig();
  }, []);

  const updateConfig = async (key, value) => {
    const newConfig = { ...config, [key]: value };
    setConfig(newConfig);
    saveConfig(newConfig);
  };

  const updateMultipleConfig = async (updates) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    saveConfig(newConfig);
  };

  const toggleConfig = async (key) => {
    const newConfig = { ...config, [key]: !config[key] };
    setConfig(newConfig);
    saveConfig(newConfig);
  };

  const saveConfig = async (newConfig) => {
    localStorage.setItem('systemConfig', JSON.stringify(newConfig));
    window.dispatchEvent(new CustomEvent('systemConfigChanged', { detail: newConfig }));

    if (window.electronAPI?.setSetting) {
      try {
        await window.electronAPI.setSetting('systemConfig', JSON.stringify(newConfig));
      } catch (err) {
        logger.error('SystemConfigContext: Failed to save config to DB', { error: err.message });
      }
    }
  };

  return (
    <SystemConfigContext.Provider value={{ config, updateConfig, toggleConfig, updateMultipleConfig }}>
      {children}
    </SystemConfigContext.Provider>
  );
};
