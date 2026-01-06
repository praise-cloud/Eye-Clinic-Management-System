import React, { createContext, useContext, useState, useEffect } from 'react';

const SystemConfigContext = createContext();

export const useSystemConfig = () => {
  const context = useContext(SystemConfigContext);
  if (!context) {
    console.warn('useSystemConfig used outside SystemConfigProvider, using defaults');
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
      updateConfig: () => {},
      toggleConfig: () => {},
      updateMultipleConfig: () => {}
    };
  }
  return context;
};

export const SystemConfigProvider = ({ children }) => {
  const [config, setConfig] = useState(() => {
    const saved = localStorage.getItem('systemConfig');
    return saved ? JSON.parse(saved) : {
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
    };
  });

  useEffect(() => {
    localStorage.setItem('systemConfig', JSON.stringify(config));
    window.dispatchEvent(new CustomEvent('systemConfigChanged', { detail: config }));
  }, [config]);

  const updateConfig = (key, value) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const updateMultipleConfig = (updates) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  const toggleConfig = (key) => {
    setConfig(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <SystemConfigContext.Provider value={{ config, updateConfig, toggleConfig, updateMultipleConfig }}>
      {children}
    </SystemConfigContext.Provider>
  );
};
