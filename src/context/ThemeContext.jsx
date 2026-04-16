import React, { createContext, useContext, useState, useEffect } from 'react';

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
    console.log('Theme changed:', isDark ? 'dark' : 'light');
    if (isDark) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      console.log('Dark mode enabled, classes:', root.className);
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      console.log('Light mode enabled, classes:', root.className);
    }
  }, [isDark]);

  const toggleTheme = () => {
    console.log('Toggle theme clicked, current:', isDark);
    setIsDark(!isDark);
  };

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
