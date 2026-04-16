import { clearUserSession } from '\''../utils/sessionUtils'\'';
import logger from '\''../utils/logger'\'';

class LogoutService {
  constructor() {
    this.logoutCallbacks = [];
  }

  onLogout(callback) {
    this.logoutCallbacks.push(callback);
    return () => {
      const index = this.logoutCallbacks.indexOf(callback);
      if (index > -1) {
        this.logoutCallbacks.splice(index, 1);
      }
    };
  }

  async performLogout() {
    try {
      logger.info('\''Starting logout process'\'');

      for (const callback of this.logoutCallbacks) {
        try {
          await callback();
        } catch (error) {
          logger.error('\''Logout callback error'\'', error);
        }
      }

      if (window.electronAPI?.logout) {
        try {
          await window.electronAPI.logout();
          logger.info('\''Electron logout completed'\'');
        } catch (error) {
          logger.error('\''Electron logout failed'\'', error);
        }
      }

      clearUserSession();
      this.clearApplicationState();

      logger.info('\''Logout process completed'\'');
      return { success: true };
    } catch (error) {
      logger.error('\''Logout process failed'\'', error);
      return { success: false, error: error.message };
    }
  }

  clearApplicationState() {
    try {
      if (window.caches) {
        window.caches.keys().then(names => {
          names.forEach(name => {
            window.caches.delete(name);
          });
        });
      }
      
      logger.debug('\''Application state cleared'\'');
    } catch (error) {
      logger.error('\''Error clearing application state'\'', error);
    }
  }

  forceLogout(reason = '\''Session expired'\'') {
    logger.warn('\''Force logout triggered'\'', { reason });
    this.performLogout().then(() => {
      window.location.reload();
    });
  }
}

const logoutService = new LogoutService();

export default logoutService;
