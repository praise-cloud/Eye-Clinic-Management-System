import { clearUserSession } from '../utils/sessionUtils';

class LogoutService {
  constructor() {
    this.logoutCallbacks = [];
  }

  // Register a callback to be called on logout
  onLogout(callback) {
    this.logoutCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.logoutCallbacks.indexOf(callback);
      if (index > -1) {
        this.logoutCallbacks.splice(index, 1);
      }
    };
  }

  // Perform logout with all cleanup
  async performLogout() {
    try {
      console.log('Starting logout process...');

      // Call all registered logout callbacks
      for (const callback of this.logoutCallbacks) {
        try {
          await callback();
        } catch (error) {
          console.error('Error in logout callback:', error);
        }
      }

      // Call electron API logout if available
      if (window.electronAPI?.logout) {
        try {
          await window.electronAPI.logout();
          console.log('Electron logout completed');
        } catch (error) {
          console.error('Electron logout error:', error);
        }
      }

      // Clear all session data
      clearUserSession();

      // Additional cleanup
      this.clearApplicationState();

      console.log('Logout process completed successfully');
      return { success: true };
    } catch (error) {
      console.error('Logout process failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Clear any application-specific state
  clearApplicationState() {
    try {
      // Clear any cached data
      if (window.caches) {
        window.caches.keys().then(names => {
          names.forEach(name => {
            window.caches.delete(name);
          });
        });
      }

      // Clear any timers or intervals that might be running
      // This would be application-specific
      
      console.log('Application state cleared');
    } catch (error) {
      console.error('Error clearing application state:', error);
    }
  }

  // Force logout (for security purposes)
  forceLogout(reason = 'Session expired') {
    console.warn(`Force logout triggered: ${reason}`);
    this.performLogout().then(() => {
      // Reload the page to ensure clean state
      window.location.reload();
    });
  }
}

// Create singleton instance
const logoutService = new LogoutService();

export default logoutService;