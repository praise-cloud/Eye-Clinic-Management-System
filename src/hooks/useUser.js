import { useState, useEffect, useCallback } from 'react';
import logger from '../utils/logger';

const isServerMode = () => !!localStorage.getItem('serverUrl') && !!sessionStorage.getItem('accessToken');

const useUser = () => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const restoreServerSession = useCallback(async () => {
    const serverUrl = localStorage.getItem('serverUrl');
    const accessToken = sessionStorage.getItem('accessToken');
    const savedUser = sessionStorage.getItem('serverUser');
    if (!serverUrl || !accessToken || !savedUser) return null;
    try {
      const res = await fetch(`${serverUrl}/api/auth/me`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      const data = await res.json();
      if (data.success) {
        const userData = data.user;
        sessionStorage.setItem('serverUser', JSON.stringify(userData));
        return userData;
      }
      return null;
    } catch {
      const parsed = JSON.parse(savedUser);
      return parsed;
    }
  }, []);

  const initializeUser = useCallback(async () => {
    setLoading(true);
    try {
      if (isServerMode()) {
        const serverUser = await restoreServerSession();
        if (serverUser) {
          setUser(serverUser);
          sessionStorage.setItem('currentUser', JSON.stringify(serverUser));
          setLoading(false);
          return;
        }
      }

      const result = await (window.electronAPI?.getCurrentUser?.() ?? null);
      if (result?.success && result.user) {
        const u = result.user;
        const userData = {
          ...u,
          name: u.name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email
        };
        setUser(userData);
        localStorage.setItem('currentUser', JSON.stringify(userData));
        setLoading(false);
        return;
      }

      const stored = localStorage.getItem('currentUser');
      if (stored) {
        const parsed = JSON.parse(stored);
        const check = await (window.electronAPI?.isAuthenticated?.() ?? false);
        if (check) {
          setUser(parsed);
        } else {
          localStorage.removeItem('currentUser');
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch (err) {
      logger.error('useUser: Session init error', { error: err.message });
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [restoreServerSession]);

  useEffect(() => {
    initializeUser();

    const handleProfileUpdate = (updatedUser) => {
      if (updatedUser) {
        setUser(updatedUser);
        localStorage.setItem('currentUser', JSON.stringify(updatedUser));
        sessionStorage.setItem('currentUser', JSON.stringify(updatedUser));
        if (isServerMode()) sessionStorage.setItem('serverUser', JSON.stringify(updatedUser));
      }
    };

    const handleUserLoggedOut = () => {
      setUser(null);
      localStorage.removeItem('currentUser');
      sessionStorage.removeItem('currentUser');
    };

    let unsubscribe = null;
    if (window.electronAPI?.onUserProfileUpdated) {
      unsubscribe = window.electronAPI.onUserProfileUpdated(handleProfileUpdate);
    }
    window.addEventListener('userLoggedOut', handleUserLoggedOut);

    return () => {
      if (unsubscribe) unsubscribe();
      window.removeEventListener('userLoggedOut', handleUserLoggedOut);
    };
  }, [initializeUser]);

  const login = useCallback(async (credentials) => {
    setLoading(true);
    setError(null);

    try {
      if (isServerMode()) {
        const serverUrl = localStorage.getItem('serverUrl');
        const res = await fetch(`${serverUrl}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: credentials.email, password: credentials.password })
        });
        const data = await res.json();

        if (data.success) {
          sessionStorage.setItem('accessToken', data.accessToken);
          sessionStorage.setItem('refreshToken', data.refreshToken);
          sessionStorage.setItem('serverUser', JSON.stringify(data.user));
          sessionStorage.setItem('currentUser', JSON.stringify(data.user));
          localStorage.setItem('serverUrl', serverUrl);
          setUser(data.user);
          if (window.electronAPI?.syncUser) {
            await window.electronAPI.syncUser(data.user, data.accessToken, data.refreshToken);
          }

          window.dispatchEvent(new CustomEvent('userLogin', {
            detail: { userName: data.user.name, timestamp: new Date().toLocaleString(), status: 'success' }
          }));

          setLoading(false);
          return data.user;
        } else {
          setLoading(false);
          const errMsg = data.error || 'Login failed';
          setError(errMsg);
          throw new Error(errMsg);
        }
      }

      let result;
      if (window.electronAPI?.login) {
        result = await window.electronAPI.login(credentials.email, credentials.password);
        logger.info('useUser: Login result', { success: result?.success });

        if (result?.success && result?.user) {
          const u = result.user;
          const userData = {
            ...u,
            name: u.name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email
          };
          setUser(userData);
          localStorage.setItem('currentUser', JSON.stringify(userData));

          window.dispatchEvent(new CustomEvent('userLogin', {
            detail: { userName: userData.name, timestamp: new Date().toLocaleString(), status: 'success' }
          }));

          setLoading(false);
          return userData;
        }
      }

      const userData = {
        id: Date.now(),
        name: credentials.name || credentials.firstName + ' ' + credentials.lastName || 'User',
        email: credentials.email,
        role: credentials.role || 'admin',
        avatar: null,
        createdAt: new Date().toISOString()
      };
      setUser(userData);
      localStorage.setItem('currentUser', JSON.stringify(userData));
      window.dispatchEvent(new CustomEvent('userLogin', {
        detail: { userName: userData.name, timestamp: new Date().toLocaleString(), status: 'success' }
      }));
      setLoading(false);
      return userData;
    } catch (err) {
      logger.error('useUser: Login error', { error: err.message });
      setError(err.message);
      setLoading(false);
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      if (isServerMode()) {
        const serverUrl = localStorage.getItem('serverUrl');
        const accessToken = sessionStorage.getItem('accessToken');
        if (serverUrl && accessToken) {
          try {
            await fetch(`${serverUrl}/api/auth/logout`, {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
            });
          } catch { }
        }
        sessionStorage.removeItem('accessToken');
        sessionStorage.removeItem('refreshToken');
        sessionStorage.removeItem('serverUser');
        sessionStorage.removeItem('currentUser');
      }

      const current = user || (localStorage.getItem('currentUser') ? JSON.parse(localStorage.getItem('currentUser')) : null);
      if (current?.id && window.electronAPI?.setUserOffline) {
        try { await window.electronAPI.setUserOffline(current.id); } catch { }
      }
      if (window.electronAPI?.logout) {
        try { await window.electronAPI.logout(); } catch { }
      }
    } catch (err) {
      logger.error('useUser: Logout failed', { error: err.message });
    } finally {
      localStorage.removeItem('currentUser');
      setUser(null);
      window.dispatchEvent(new CustomEvent('userLoggedOut'));
    }
  }, [user]);

  const createUser = useCallback(async (userData) => {
    setLoading(true);
    setError(null);
    try {
      if (isServerMode()) {
        const serverUrl = localStorage.getItem('serverUrl');
        const accessToken = sessionStorage.getItem('accessToken');

        const res = await fetch(`${serverUrl}/api/users`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify({
            email: userData.email,
            password: userData.password,
            first_name: userData.firstName,
            last_name: userData.lastName,
            role: userData.role,
            phone_number: userData.phoneNumber || '',
            gender: userData.gender || ''
          })
        });
        const result = await res.json();

        if (result.success) {
          const loginRes = await fetch(`${serverUrl}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: userData.email, password: userData.password })
          });
          const loginData = await loginRes.json();

          if (loginData.success) {
            sessionStorage.setItem('accessToken', loginData.accessToken);
            sessionStorage.setItem('refreshToken', loginData.refreshToken);
            sessionStorage.setItem('serverUser', JSON.stringify(loginData.user));
            sessionStorage.setItem('currentUser', JSON.stringify(loginData.user));
            localStorage.setItem('serverUrl', serverUrl);
            setUser(loginData.user);

            window.dispatchEvent(new CustomEvent('userLogin', {
              detail: { userName: loginData.user.name, timestamp: new Date().toLocaleString(), status: 'success' }
            }));

            setLoading(false);
            return loginData.user;
          }
          throw new Error('User created but auto-login failed. Please log in.');
        } else {
          throw new Error(result.error || 'User creation failed');
        }
      }

      if (window.electronAPI?.createUser) {
        const result = await window.electronAPI.createUser(userData);
        if (result?.success && result?.user) {
          const newUser = result.user;
          localStorage.setItem('currentUser', JSON.stringify(newUser));
          setUser(newUser);

          window.dispatchEvent(new CustomEvent('userLogin', {
            detail: { userName: newUser.name, timestamp: new Date().toLocaleString(), status: 'success' }
          }));

          setLoading(false);
          return newUser;
        } else {
          setLoading(false);
          throw new Error(result?.error || 'User creation failed');
        }
      }
      throw new Error('Electron API not available');
    } catch (err) {
      setError(err.message);
      setLoading(false);
      throw err;
    }
  }, []);

  const updateProfile = useCallback(async (updates) => {
    setLoading(true);
    setError(null);
    try {
      const currentUserId = user?.id;
      if (!currentUserId) throw new Error('No user logged in');

      let updatedUser;

      if (isServerMode()) {
        const serverUrl = localStorage.getItem('serverUrl');
        const accessToken = sessionStorage.getItem('accessToken');
        const res = await fetch(`${serverUrl}/api/users/${currentUserId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify({
            first_name: updates.first_name || updates.firstName,
            last_name: updates.last_name || updates.lastName,
            email: updates.email,
            phone_number: updates.phone_number || updates.phoneNumber,
            gender: updates.gender
          })
        });
        const data = await res.json();

        if (data.success) {
          const meRes = await fetch(`${serverUrl}/api/auth/me`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
          });
          const meData = await meRes.json();
          if (meData.success) {
            updatedUser = meData.user;
          } else {
            updatedUser = { ...user, ...updates };
          }
        } else {
          updatedUser = { ...user, ...updates };
        }
      } else if (window.electronAPI?.updateUser) {
        const result = await window.electronAPI.updateUser(currentUserId, updates, currentUserId);
        updatedUser = result?.success ? result.user : { ...user, ...updates };
      } else {
        updatedUser = { ...user, ...updates };
      }

      setUser(updatedUser);
      localStorage.setItem('currentUser', JSON.stringify(updatedUser));
      sessionStorage.setItem('currentUser', JSON.stringify(updatedUser));
      if (isServerMode()) sessionStorage.setItem('serverUser', JSON.stringify(updatedUser));
      window.dispatchEvent(new CustomEvent('userProfileUpdated', { detail: { user: updatedUser } }));
      setLoading(false);
      return updatedUser;
    } catch (err) {
      setError(err.message);
      setLoading(false);
      throw err;
    }
  }, [user]);

  const hasRole = useCallback((role) => user?.role === role, [user]);

  const hasPermission = useCallback((permission) => {
    if (!user) return false;
    const rolePermissions = {
      admin: ['read', 'write', 'delete', 'manage_users', 'manage_settings'],
      doctor: ['read', 'write', 'manage_patients', 'generate_reports'],
      assistant: ['read', 'write', 'manage_patients'],
      viewer: ['read']
    };
    return rolePermissions[user.role]?.includes(permission) || false;
  }, [user]);

  return {
    user,
    loading,
    error,
    login,
    logout,
    createUser,
    updateProfile,
    hasRole,
    hasPermission,
    isAuthenticated: !!user
  };
};

export default useUser;
