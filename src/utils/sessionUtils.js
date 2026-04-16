// Session management utilities
import logger from '\''../utils/logger'\'';

export const clearUserSession = () => {
  try {
    localStorage.removeItem('\''currentUser'\'');
    localStorage.removeItem('\''authToken'\'');
    localStorage.removeItem('\''sessionData'\'');
    
    sessionStorage.clear();
    
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('\''clinic_'\'') || key.startsWith('\''user_'\'') || key.startsWith('\''auth_'\''))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    logger.debug('\''User session cleared'\'');
  } catch (error) {
    logger.error('\''Error clearing user session'\'', error);
  }
};

export const isSessionValid = () => {
  try {
    const user = localStorage.getItem('\''currentUser'\'');
    if (!user) return false;
    
    const userData = JSON.parse(user);
    return userData && userData.id;
  } catch (error) {
    logger.error('\''Error validating session'\'', error);
    return false;
  }
};

export const getStoredUser = () => {
  try {
    const user = localStorage.getItem('\''currentUser'\'');
    return user ? JSON.parse(user) : null;
  } catch (error) {
    logger.error('\''Error getting stored user'\'', error);
    return null;
  }
};
