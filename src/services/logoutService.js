import { clearUserSession } from '../utils/sessionUtils';
import logger from '../utils/logger';

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
      logger.info('LogoutService: Starting logout process');

      // Call all registered logout callbacks
      for (const callback of this.logoutCallbacks) {
        try {
          await callback();
        } catch (error) {
          logger.error('LogoutService: Error in logout callback', { error: error.message });
        }
      }

      // Call electron API logout if available
      if (window.electronAPI?.logout) {
        try {
          await window.electronAPI.logout();
          logger.info('LogoutService: Electron logout completed');
        } catch (error) {
          logger.error('LogoutService: Electron logout error', { error: error.message });
        }
      }

      // Clear all session data
      clearUserSession();

      // Additional cleanup
      this.clearApplicationState();

      logger.info('LogoutService: Logout process completed successfully');
      return { success: true };
    } catch (error) {
      logger.error('LogoutService: Logout process failed', { error: error.message });
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
      
      logger.info('LogoutService: Application state cleared');
    } catch (error) {
      logger.error('LogoutService: Error clearing application state', { error: error.message });
    }
  }

  // Force logout (for security purposes)
  forceLogout(reason = 'Session expired') {
    logger.warn(`LogoutService: Force logout triggered: ${reason}`);
    this.performLogout().then(() => {
      // Reload the page to ensure clean state
      window.location.reload();
    });
  }
}

// Create singleton instance
const logoutService = new LogoutService();

export default logoutService;