import React, { createContext, useContext, useState, useEffect } from '\''react'\'';
import logger from '\''../utils/logger'\'';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('\''useTheme must be used within ThemeProvider'\'');
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('\''theme'\'');
    return saved === '\''dark'\'';
  });

  useEffect(() => {
    const root = document.documentElement;
    logger.debug('\''Theme changing'\'', { mode: isDark ? '\''dark'\'' : '\''light'\'' });
    if (isDark) {
      root.classList.add('\''dark'\'');
      localStorage.setItem('\''theme'\'', '\''dark'\'');
    } else {
      root.classList.remove('\''dark'\'');
      localStorage.setItem('\''theme'\'', '\''light'\'');
    }
  }, [isDark]);

  const toggleTheme = () => {
    logger.debug('\''Theme toggle requested'\'', { currentMode: isDark ? '\''dark'\'' : '\''light'\'' });
    setIsDark(!isDark);
  };

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
