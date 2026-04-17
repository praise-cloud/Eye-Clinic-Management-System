// Session management utilities
import logger from './logger';

export const clearUserSession = () => {
  try {
    // Clear localStorage
    localStorage.removeItem('currentUser');
    localStorage.removeItem('authToken');
    localStorage.removeItem('sessionData');

    // Clear sessionStorage
    sessionStorage.clear();

    // Clear any other app-specific storage
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('clinic_') || key.startsWith('user_') || key.startsWith('auth_'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));

    logger.info('sessionUtils: User session cleared successfully');
  } catch (error) {
    logger.error('sessionUtils: Error clearing user session', { error: error.message });
  }
};

export const isSessionValid = () => {
  try {
    const user = localStorage.getItem('currentUser');
    if (!user) return false;

    const userData = JSON.parse(user);
    return userData && userData.id;
  } catch (error) {
    logger.error('sessionUtils: Error validating session', { error: error.message });
    return false;
  }
};

export const getStoredUser = () => {
  try {
    const user = localStorage.getItem('currentUser');
    return user ? JSON.parse(user) : null;
  } catch (error) {
    logger.error('sessionUtils: Error getting stored user', { error: error.message });
    return null;
  }
};