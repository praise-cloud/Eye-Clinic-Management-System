// Session management utilities

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
    
    console.log('User session cleared successfully');
  } catch (error) {
    console.error('Error clearing user session:', error);
  }
};

export const isSessionValid = () => {
  try {
    const user = localStorage.getItem('currentUser');
    if (!user) return false;
    
    const userData = JSON.parse(user);
    return userData && userData.id;
  } catch (error) {
    console.error('Error validating session:', error);
    return false;
  }
};

export const getStoredUser = () => {
  try {
    const user = localStorage.getItem('currentUser');
    return user ? JSON.parse(user) : null;
  } catch (error) {
    console.error('Error getting stored user:', error);
    return null;
  }
};