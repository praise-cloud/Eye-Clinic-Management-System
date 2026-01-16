import { useState, useEffect, useCallback } from 'react'

const useUser = () => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Initialize user from storage
 useEffect(() => {
  const initializeUser = async () => {
    setLoading(true);
    try {
      // 1. Get user from main process (most authoritative)
      const result = await window.electronAPI.getCurrentUser();
      if (result?.success && result.user) {
        const userData = result.user;
        setUser(userData);
        localStorage.setItem('currentUser', JSON.stringify(userData));
        setLoading(false);
        return;
      }

      // 2. Fallback: localStorage (in case main process restarted)
      const stored = localStorage.getItem('currentUser');
      if (stored) {
        const parsed = JSON.parse(stored);
        // Quick validation with main process
        const check = await window.electronAPI.isAuthenticated();
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
      console.error('Session init error:', err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  initializeUser();
}, []);

  // Login user
  const login = useCallback(async (credentials) => {
    setLoading(true)
    setError(null)

    try {
      let result
      if (window.electronAPI?.login) {
        result = await window.electronAPI.login(credentials.email, credentials.password)
        console.log('Login result:', result)

        if (result?.success && result?.user) {
          const userData = result.user
          setUser(userData)
          localStorage.setItem('currentUser', JSON.stringify(userData))

          // Dispatch login event for admin dashboard
          window.dispatchEvent(new CustomEvent('userLogin', {
            detail: {
              userName: userData.name,
              timestamp: new Date().toLocaleString(),
              status: 'success'
            }
          }));

          setLoading(false)
          return userData
        } else {
          setLoading(false)
          const error = new Error(result?.error || 'Login failed')
          setError(error.message)
          throw error
        }
      } else {
        // Mock login for development
        const userData = {
          id: Date.now(),
          name: credentials.name || credentials.firstName + ' ' + credentials.lastName || 'User',
          email: credentials.email,
          role: credentials.role || 'admin',
          avatar: null,
          createdAt: new Date().toISOString()
        }
        setUser(userData)
        localStorage.setItem('currentUser', JSON.stringify(userData))

        // Dispatch login event for admin dashboard
        window.dispatchEvent(new CustomEvent('userLogin', {
          detail: {
            userName: userData.name,
            timestamp: new Date().toLocaleString(),
            status: 'success'
          }
        }));

        return userData
      }
    } catch (err) {
      console.error('Login error:', err)
      setError(err.message)
      setLoading(false)
      throw err
    }
  }, [])

  // Logout user
  const logout = useCallback(async () => {
    try {
      const current = user || (localStorage.getItem('currentUser') ? JSON.parse(localStorage.getItem('currentUser')) : null);

      if (current?.id && window.electronAPI?.setUserOffline) {
        try {
          await window.electronAPI.setUserOffline(current.id);
        } catch (err) {
          console.error('Set user offline failed:', err);
        }
      }

      if (window.electronAPI?.logout) {
        await window.electronAPI.logout();
      }
    } catch (err) {
      console.error('Logout failed:', err);
    } finally {
      localStorage.removeItem('currentUser');
      setUser(null);
      window.location.reload();
    }
  }, [user]);

  // Create new user
  const createUser = useCallback(async (userData) => {
    setLoading(true)
    setError(null)

    try {
      let result
      if (window.electronAPI?.createUser) {
        result = await window.electronAPI.createUser(userData)
        console.log('Create user result:', result)

        if (result?.success && result?.user) {
          const newUser = result.user
          setUser(newUser)
          localStorage.setItem('currentUser', JSON.stringify(newUser))
          setLoading(false)
          return newUser
        } else {
          setLoading(false)
          const error = new Error(result?.error || 'User creation failed')
          setError(error.message)
          throw error
        }
      } else {
        throw new Error('Electron API not available')
      }
    } catch (err) {
      console.error('Create user error:', err)
      setError(err.message)
      setLoading(false)
      throw err
    }
  }, [])
  const updateProfile = useCallback(async (updates) => {
    try {
      setLoading(true)
      setError(null)

      let updatedUser
      if (window.electronAPI?.updateUser) {
        updatedUser = await window.electronAPI.updateUser(user.id, updates)
      } else {
        updatedUser = { ...user, ...updates }
      }

      setUser(updatedUser)
      localStorage.setItem('currentUser', JSON.stringify(updatedUser))
      return updatedUser
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [user])

  // Check if user has specific role
  const hasRole = useCallback((role) => {
    return user?.role === role
  }, [user])

  // Check if user has permission
  const hasPermission = useCallback((permission) => {
    if (!user) return false

    const rolePermissions = {
      admin: ['read', 'write', 'delete', 'manage_users', 'manage_settings'],
      doctor: ['read', 'write', 'manage_patients', 'generate_reports'],
      assistant: ['read', 'write', 'manage_patients'],
      viewer: ['read']
    }

    return rolePermissions[user.role]?.includes(permission) || false
  }, [user])

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
  }
}

export default useUser
