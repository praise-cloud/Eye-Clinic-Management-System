import React, { createContext, useContext, useState, useEffect } from 'react';
import logger from '../utils/logger';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'dark';
  });

  useEffect(() => {
    const root = document.documentElement;
    logger.debug('ThemeContext: Theme changed', { theme: isDark ? 'dark' : 'light' });
    if (isDark) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      logger.debug('ThemeContext: Dark mode enabled', { classes: root.className });
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      logger.debug('ThemeContext: Light mode enabled', { classes: root.className });
    }
  }, [isDark]);

  const toggleTheme = () => {
    logger.debug('ThemeContext: Toggle theme clicked', { currentTheme: isDark });
    setIsDark(!isDark);
  };

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
