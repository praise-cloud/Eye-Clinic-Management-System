import React, { useState, useEffect } from 'react'
import { useTheme } from '../../context/ThemeContext'
import useUser from '../../hooks/useUser'
import logger from '../../utils/logger'

const SettingsContent = () => {
  const { isDark, toggleTheme } = useTheme()
  const { user, updateProfile } = useUser()
  const [loading, setLoading] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [profileImage, setProfileImage] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    gender: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [cvfWatchPath, setCvfWatchPath] = useState('')
  const [cvfWatchStatus, setCvfWatchStatus] = useState('')
  const [backups, setBackups] = useState([])
  const [loadingBackups, setLoadingBackups] = useState(false)
  const [serverMode, setServerMode] = useState(false)
  const [serverUrl, setServerUrl] = useState('')
  const [sqlHost, setSqlHost] = useState('')
  const [sqlPort, setSqlPort] = useState(1433)
  const [sqlDatabase, setSqlDatabase] = useState('eye_clinic_db')
  const [sqlUser, setSqlUser] = useState('')
  const [sqlPassword, setSqlPassword] = useState('')
  const [serverStatus, setServerStatus] = useState(null)
  const [serverStarting, setServerStarting] = useState(false)
  const [testingConnection, setTestingConnection] = useState(false)
  const [connectionResult, setConnectionResult] = useState(null)
  const isAdmin = (user?.role || '').toLowerCase() === 'admin'

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        gender: user.gender || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      })
    }
    const loadCvfWatchPath = async () => {
      try {
        const res = await window.electronAPI?.getCvfWatchPath?.()
        if (res?.success && res.path) setCvfWatchPath(res.path)
      } catch { }
    }
    loadCvfWatchPath()
    const loadServerConfig = async () => {
      try {
        if (window.electronAPI?.getServerConfig) {
          const res = await window.electronAPI.getServerConfig()
          if (res?.success && res.config) {
            setServerMode(res.config.isServerMode || false)
            setServerUrl(res.config.serverUrl || '')
            if (res.config.sql_server) {
              setSqlHost(res.config.sql_server.host || 'localhost')
              setSqlPort(res.config.sql_server.port || 1433)
              setSqlDatabase(res.config.sql_server.database || 'eye_clinic_db')
              setSqlUser(res.config.sql_server.user || '')
              setSqlPassword(res.config.sql_server.password || '')
            }
          }
        }
        if (window.electronAPI?.serverStatus) {
          const status = await window.electronAPI.serverStatus()
          setServerStatus(status?.status || null)
        }
      } catch {}
    }
    if (isAdmin) loadServerConfig()
    const loadBackups = async () => {
      setLoadingBackups(true)
      try {
        if (window.electronAPI?.backupList) {
          const result = await window.electronAPI.backupList()
          if (result?.success) setBackups(result.backups || [])
        }
      } catch { }
      setLoadingBackups(false)
    }
    if (isAdmin) loadBackups()
  }, [user, isAdmin])

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleTestServerConnection = async () => {
    setTestingConnection(true)
    setConnectionResult(null)
    try {
      if (!serverUrl) { setConnectionResult({ success: false, error: 'Enter a server URL' }); return }
      const res = await fetch(`${serverUrl}/api/health`)
      if (res.ok) setConnectionResult({ success: true, message: 'Connected to server!' })
      else setConnectionResult({ success: false, error: `Server returned ${res.status}` })
    } catch (err) { setConnectionResult({ success: false, error: err.message }) }
    setTestingConnection(false)
  }

  const handleAutoDetectServer = async () => {
    setTestingConnection(true)
    setConnectionResult(null)
    try {
      // Try localhost first
      const targets = ['localhost:3001', '127.0.0.1:3001'];
      
      // Add local network range
      for (let i = 1; i < 255; i++) {
        targets.push(`192.168.1.${i}:3001`);
        targets.push(`192.168.0.${i}:3001`);
        targets.push(`10.0.0.${i}:3001`);
      }

      // Scan in parallel with timeout
      const scanServer = async (url) => {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 300);
          const res = await fetch(`http://${url}/api/health`, { signal: controller.signal });
          clearTimeout(timeout);
          if (res.ok) return url;
        } catch {}
        return null;
      };

      // Scan in batches
      for (let i = 0; i < targets.length; i += 20) {
        const batch = targets.slice(i, i + 20);
        const results = await Promise.all(batch.map(scanServer));
        const found = results.find(ip => ip !== null);
        if (found) {
          const foundUrl = `http://${found}`;
          setServerUrl(foundUrl);
          setConnectionResult({ success: true, message: `Server found: ${foundUrl}` });
          setTestingConnection(false);
          return;
        }
      }

      setConnectionResult({ success: false, error: 'Server not found on network. Make sure server is running.' });
    } catch (err) {
      setConnectionResult({ success: false, error: err.message });
    }
    setTestingConnection(false)
  }

  const handleStartServer = async () => {
    setServerStarting(true)
    try {
      const res = await window.electronAPI?.serverStart?.({ port: 3001 })
      if (res?.success) {
        setServerStatus(res.status)
        setSuccessMessage('Server started successfully on port 3001.')
        setShowSuccess(true)
        setTimeout(() => setShowSuccess(false), 5000)
        loadServerConfig()
      } else {
        alert('Failed to start server: ' + (res?.error || 'Unknown error'))
      }
    } catch (err) {
      alert('Failed to start server: ' + err.message)
    }
    setServerStarting(false)
  }

  const handleStopServer = async () => {
    try {
      const res = await window.electronAPI?.serverStop?.()
      if (res?.success) {
        setServerStatus({ running: false, port: 3001 })
        setSuccessMessage('Server stopped.')
        setShowSuccess(true)
        setTimeout(() => setShowSuccess(false), 3000)
        loadServerConfig()
      } else {
        alert('Failed to stop server: ' + (res?.error || 'Unknown error'))
      }
    } catch (err) {
      alert('Failed to stop server: ' + err.message)
    }
  }

  const handleSaveServerConfig = async () => {
    try {
      if (!window.electronAPI?.setServerConfig) return
      const config = {
        isServerMode: serverMode,
        serverUrl: serverUrl,
        serverPort: 3001,
        sql_server: {
          host: sqlHost,
          port: sqlPort,
          database: sqlDatabase,
          user: sqlUser,
          password: sqlPassword,
          encrypt: true,
          trustServerCertificate: true
        }
      }
      const res = await window.electronAPI.setServerConfig(config)
      if (res?.success) {
        setSuccessMessage('Server configuration saved. Restart required for changes to take effect.')
        setShowSuccess(true)
        setTimeout(() => setShowSuccess(false), 5000)
      } else {
        alert('Failed to save: ' + (res?.error || 'Unknown error'))
      }
    } catch (err) {
      alert('Failed to save server configuration')
    }
  }

  const handleBrowseCvfFolder = async () => {
    try {
      if (window.electronAPI?.selectFile) {
        const result = await window.electronAPI.selectFile({
          title: 'Select CVF Watch Folder',
          properties: ['openDirectory']
        })
        const chosen = result?.filePath || null
        if (!chosen) return
        const res = await window.electronAPI?.setCvfWatchPath?.(chosen)
        if (res?.success) {
          setCvfWatchPath(chosen)
          setCvfWatchStatus('CVF watch folder updated.')
          setTimeout(() => setCvfWatchStatus(''), 3000)
        }
      }
    } catch {
      setCvfWatchStatus('Failed to update CVF watch folder.')
    }
  }

  const handleCreateBackup = async () => {
    try {
      if (window.electronAPI?.backupCreate) {
        const result = await window.electronAPI.backupCreate()
        if (result.success) {
          setSuccessMessage('Backup created successfully')
          setShowSuccess(true)
          setTimeout(() => setShowSuccess(false), 5000)
          const result = await window.electronAPI.backupList()
          if (result?.success) setBackups(result.backups || [])
        } else {
          alert(result.error || 'Failed to create backup')
        }
      }
    } catch (err) {
      logger.error('SettingsContent: Backup error', { error: err.message });
    }
  }

  const handleRestoreBackup = async (backupPath) => {
    if (!confirm('Are you sure you want to restore this backup? Current data will be lost.')) return
    try {
      if (window.electronAPI?.backupRestore) {
        const result = await window.electronAPI.backupRestore(backupPath)
        if (result.success) {
          setSuccessMessage('Database restored. Please restart the application.')
          setShowSuccess(true)
          setTimeout(() => setShowSuccess(false), 5000)
        } else {
          alert(result.error || 'Failed to restore backup')
        }
      }
    } catch (err) {
      logger.error('SettingsContent: Restore error', { error: err.message });
    }
  }

  const handleImageSelect = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/jpeg,image/jpg,image/png'
    input.onchange = (e) => {
      const file = e.target.files[0]
      if (file) {
        const reader = new FileReader()
        reader.onload = (event) => {
          setProfileImage(event.target.result)
        }
        reader.readAsDataURL(file)
      }
    }
    input.click()
  }

  const handleSaveProfile = async () => {
    setLoading(true)
    try {
      const nameParts = (formData.name || '').trim().split(' ')
      const first_name = nameParts[0] || ''
      const last_name = nameParts.slice(1).join(' ') || ''
      const updates = {
        first_name,
        last_name,
        email: formData.email,
        phone_number: formData.phone,
        gender: formData.gender
      }
      let result
      if (updateProfile) {
        result = await updateProfile(updates)
      } else if (window.electronAPI?.updateUser) {
        result = await window.electronAPI.updateUser(user.id, updates, user.id)
      }
      if (result?.success !== false) {
        setIsEditing(false)
        setSuccessMessage('Profile updated successfully')
        setShowSuccess(true)
        setTimeout(() => setShowSuccess(false), 3000)
      } else {
        alert('Failed to update profile: ' + (result?.error || 'Unknown error'))
      }
    } catch (error) {
      logger.error('SettingsContent: Error saving profile', { error: error.message });
      alert('Failed to update profile: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        gender: user.gender || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      })
    }
  }

  const handleChangePassword = async () => {
    if (!formData.currentPassword || !formData.newPassword || !formData.confirmPassword) {
      alert('Please fill in all password fields')
      return
    }
    if (formData.newPassword !== formData.confirmPassword) {
      alert('New passwords do not match')
      return
    }
    if (formData.newPassword.length < 6) {
      alert('Password must be at least 6 characters')
      return
    }
    setLoading(true)
    try {
      let result
      if (window.electronAPI?.updateUser) {
        result = await window.electronAPI.updateUser(user.id, { password: formData.newPassword }, user.id)
      }
      if (result?.success !== false) {
        setFormData(prev => ({ ...prev, currentPassword: '', newPassword: '', confirmPassword: '' }))
        setIsChangingPassword(false)
        setSuccessMessage('Secret/Password updated successfully')
        setShowSuccess(true)
        setTimeout(() => setShowSuccess(false), 3000)
      } else {
        alert('Failed to change password: ' + (result?.error || 'Unknown error'))
      }
    } catch (error) {
      logger.error('SettingsContent: Error changing password', { error: error.message });
      alert('Failed to change password: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8 animate-premium-fade pb-10">
      {showSuccess && (
        <div className="fixed top-8 right-8 z-[100] glass-effect border-l-4 border-emerald-500 p-5 rounded-2xl shadow-2xl flex items-center gap-4 animate-premium-fade ring-1 ring-slate-900/5">
          <div className="w-10 h-10 bg-emerald-50 content-center text-center rounded-xl text-emerald-600">
            <svg className="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
          </div>
          <div>
            <p className="text-sm font-black text-slate-900 dark:text-white">Operation Success</p>
            <p className="text-xs text-slate-500 font-medium">{successMessage}</p>
          </div>
          <button onClick={() => setShowSuccess(false)} className="text-slate-400 hover:text-slate-600 ml-4">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="card-premium p-8">
            <div className="flex justify-between items-center mb-8 pb-6 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Personal Identity</h2>
                <p className="text-sm text-slate-500 font-medium">Manage your professional physician profile</p>
              </div>
              {!isEditing && (
                <button onClick={() => setIsEditing(true)} className="btn btn-ghost bg-slate-50 border-slate-200">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  Edit Profile
                </button>
              )}
            </div>

            <div className="flex flex-col md:flex-row gap-10">
              <div className="flex flex-col items-center">
                <div className="relative group">
                  <div className={`w-32 h-32 rounded-[2.5rem] bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden transition-all duration-500 ${isEditing ? 'ring-4 ring-indigo-500/20 ring-offset-4 ring-offset-white dark:ring-offset-slate-900 shadow-2xl scale-105' : 'shadow-lg'}`}>
                    {profileImage ? (
                      <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <svg className="w-12 h-12 text-slate-300" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" /></svg>
                    )}
                    {isEditing && (
                      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" onClick={handleImageSelect}>
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Legal Full Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    disabled={!isEditing}
                    className="input-premium py-3 text-sm font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Professional Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    disabled={!isEditing}
                    className="input-premium py-3 text-sm font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Contact Number</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    disabled={!isEditing}
                    className="input-premium py-3 text-sm font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Gender</label>
                  {isEditing ? (
                    <select
                      value={formData.gender}
                      onChange={(e) => handleInputChange('gender', e.target.value)}
                      className="input-premium py-3 text-sm font-bold appearance-none"
                    >
                      <option value="">Select Gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  ) : (
                    <div className="input-premium py-3 text-sm font-bold bg-slate-50/50 dark:bg-slate-800/50 capitalize">
                      {formData.gender || 'Not specified'}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {isEditing && (
              <div className="flex justify-end gap-3 mt-10 pt-8 border-t border-slate-100 dark:border-slate-800">
                <button onClick={handleCancelEdit} className="btn btn-ghost px-8" disabled={loading}>Discard</button>
                <button onClick={handleSaveProfile} className="btn btn-primary px-8" disabled={loading}>
                  {loading ? 'Processing...' : 'Save Profile'}
                </button>
              </div>
            )}
          </div>

          <div className="card-premium p-8">
            <div className="flex justify-between items-center mb-8 pb-6 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Credential Security</h2>
                <p className="text-sm text-slate-500 font-medium">Protect your access to clinical records</p>
              </div>
              {!isChangingPassword && (
                <button onClick={() => setIsChangingPassword(true)} className="btn btn-ghost bg-slate-50 border-slate-200">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m-2-2a2 2 0 00-2 2m2-2V5a2 2 0 10-4 0v2m4 0h3.586a1 1 0 01.707.293l2.414 2.414a1 1 0 01.293.707V19a2 2 0 01-2 2H5a2 2 0 01-2-2V9a2 2 0 012-2h2m2 4h.01M9 15h.01M9 19h.01m4-10V1M9 1h4m-4 0v1h4v-1" /></svg>
                  Reset Secret
                </button>
              )}
            </div>

            {isChangingPassword ? (
              <div className="space-y-6 bg-slate-50/50 dark:bg-slate-800/30 p-8 rounded-3xl border border-slate-100 dark:border-slate-800">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Current</label>
                    <input type="password" value={formData.currentPassword} onChange={(e) => handleInputChange('currentPassword', e.target.value)} className="input-premium" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">New Secret</label>
                    <input type="password" value={formData.newPassword} onChange={(e) => handleInputChange('newPassword', e.target.value)} className="input-premium" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Confirm New</label>
                    <input type="password" value={formData.confirmPassword} onChange={(e) => handleInputChange('confirmPassword', e.target.value)} className="input-premium" />
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-6">
                  <button onClick={() => setIsChangingPassword(false)} className="btn btn-ghost px-8">Cancel</button>
                  <button onClick={handleChangePassword} className="btn btn-primary px-8">Confirm Change</button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-5 p-6 bg-indigo-50/30 dark:bg-indigo-900/10 rounded-[2rem] border border-indigo-100/50 dark:border-indigo-900/30">
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600">
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 00-2 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">Active Protection</p>
                  <p className="text-xs text-slate-500 font-medium">Your credentials are managed under SHA-256 clinical encryption standards.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-8">
          {isAdmin && (
            <div className="card-premium p-8">
              <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight mb-2">Backup & Restore</h2>
              <p className="text-sm text-slate-500 font-medium mb-8">Manage database backups</p>

              <button onClick={handleCreateBackup} className="w-full btn btn-primary mb-6">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
                Create Backup
              </button>

              {loadingBackups ? (
                <div className="py-8 text-center">
                  <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-sm text-slate-500 mt-2">Loading backups...</p>
                </div>
              ) : backups.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-sm text-slate-500">No backups found</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {backups.map((backup, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800/50">
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{backup.name}</p>
                        <p className="text-xs text-slate-500 font-medium">{(backup.size / 1024 / 1024).toFixed(2)} MB &middot; {new Date(backup.created).toLocaleString()}</p>
                      </div>
                      <button onClick={() => handleRestoreBackup(backup.path)} className="px-3 py-1.5 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-lg text-xs font-bold hover:bg-rose-200 dark:hover:bg-rose-900/50">
                        Restore
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="card-premium p-8">
            <div className="flex items-center justify-between mb-6 pb-6 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">Server Connection</h2>
                <p className="text-sm text-slate-500 font-medium">Connect to a clinic server or run as server</p>
              </div>
              {isAdmin && (
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${serverMode ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                    {serverMode ? 'Server Mode' : 'Client Mode'}
                  </span>
                  <button onClick={() => setServerMode(!serverMode)} className={`w-14 h-7 rounded-full transition-all duration-300 relative ${serverMode ? 'bg-indigo-500 shadow-lg shadow-indigo-500/30' : 'bg-slate-300'}`}>
                    <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transition-all duration-300 ${serverMode ? 'left-8' : 'left-1'}`} />
                  </button>
                </div>
              )}
            </div>

              {(serverMode && isAdmin) ? (
                <div className="space-y-5">
                  <div className="p-4 bg-indigo-50 dark:bg-indigo-900/10 rounded-2xl border border-indigo-100 dark:border-indigo-900/30">
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-3 h-3 rounded-full ${serverStatus?.running ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                      <span className="text-sm font-bold text-indigo-700 dark:text-indigo-400">
                        {serverStatus?.running ? 'Server Running' : 'Server Not Running'}
                      </span>
                      {serverStatus?.running && serverStatus?.port && (
                        <span className="text-xs text-indigo-500">on port {serverStatus.port}</span>
                      )}
                    </div>
                    {serverStatus?.running && serverStatus?.serverIp && (
                      <div className="bg-indigo-100 dark:bg-indigo-800/30 rounded-xl p-3 mb-3">
                        <p className="text-xs font-bold text-indigo-600 dark:text-indigo-300 mb-1">Server IP Address</p>
                        <p className="text-lg font-mono font-black text-indigo-800 dark:text-indigo-200">{serverStatus.serverIp}:3001</p>
                        <p className="text-xs text-indigo-500 mt-1">Other computers connect to this address</p>
                      </div>
                    )}
                    <p className="text-xs text-indigo-600 dark:text-indigo-400">
                      Running this PC as the clinic server. Other computers will connect to this machine.
                    </p>
                  </div>
                  <div className="flex gap-3">
                    {!serverStatus?.running ? (
                      <button onClick={handleStartServer} disabled={serverStarting} className="flex-1 btn btn-primary py-3">
                        {serverStarting ? 'Starting...' : 'Start Server'}
                      </button>
                    ) : (
                      <button onClick={handleStopServer} className="flex-1 btn btn-ghost bg-rose-50 text-rose-600 ring-1 ring-rose-200 py-3">
                        Stop Server
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">SQL Server Host</label>
                      <input type="text" value={sqlHost} onChange={(e) => setSqlHost(e.target.value)} className="input-premium text-xs font-mono" placeholder="localhost" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Port</label>
                        <input type="number" value={sqlPort} onChange={(e) => setSqlPort(parseInt(e.target.value) || 1433)} className="input-premium text-xs font-mono" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Database</label>
                        <input type="text" value={sqlDatabase} onChange={(e) => setSqlDatabase(e.target.value)} className="input-premium text-xs font-mono" placeholder="eye_clinic_db" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">DB Username</label>
                        <input type="text" value={sqlUser} onChange={(e) => setSqlUser(e.target.value)} className="input-premium text-xs font-mono" placeholder="sa" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">DB Password</label>
                        <input type="password" value={sqlPassword} onChange={(e) => setSqlPassword(e.target.value)} className="input-premium text-xs font-mono" placeholder="••••••••" />
                      </div>
                    </div>
                  </div>
                  <button onClick={handleSaveServerConfig} className="w-full btn btn-primary py-3">
                    Save & Restart Server
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Connect to a remote clinic server. Enter the server IP address.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Server URL</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={serverUrl}
                        onChange={(e) => setServerUrl(e.target.value)}
                        className="input-premium text-xs font-mono flex-1"
                        placeholder="http://192.168.1.100:3001"
                      />
                      <button onClick={handleAutoDetectServer} disabled={testingConnection} className="btn btn-secondary px-3 text-xs font-bold">
                        {testingConnection ? '...' : '🔍'}
                      </button>
                      <button onClick={handleTestServerConnection} disabled={testingConnection} className="btn btn-ghost bg-slate-50 px-4 text-xs font-bold">
                        Test
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-400 pl-1">Click 🔍 to auto-detect server on network</p>
                  </div>
                  {connectionResult && (
                    <div className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${connectionResult.success ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/10 dark:text-emerald-400' : 'bg-rose-50 text-rose-700 dark:bg-rose-900/10 dark:text-rose-400'}`}>
                      {connectionResult.success ? '✓' : '✗'}
                      {connectionResult.success ? connectionResult.message : connectionResult.error}
                    </div>
                  )}
                  <button onClick={handleSaveServerConfig} className="w-full btn btn-primary py-3">
                    Save Connection
                  </button>
                </div>
              )}
          </div>

          {isAdmin && (
            <div className="card-premium p-8">
              <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight mb-2">CVF Watch Folder</h2>
              <p className="text-sm text-slate-500 font-medium mb-6">Automatically import Henson 8000 exports</p>

              <div className="space-y-4">
                <input
                  type="text"
                  value={cvfWatchPath}
                  readOnly
                  className="input-premium text-xs font-mono"
                  placeholder="Select a folder to watch for CVF files"
                />
                <button onClick={handleBrowseCvfFolder} className="w-full btn btn-secondary">
                  Choose Folder
                </button>
                {cvfWatchStatus && (
                  <p className="text-xs font-semibold text-indigo-600">{cvfWatchStatus}</p>
                )}
              </div>
            </div>
          )}

          <div className="card-premium p-8">
            <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight mb-2">Visual Style</h2>
            <p className="text-sm text-slate-500 font-medium mb-8">Personalize your interface</p>

            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 shadow-sm">
                    {isDark ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 9H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-900 dark:text-white">Nocturnal Mode</p>
                    <p className="text-[10px] text-slate-500 font-medium">{isDark ? 'Active' : 'Inactive'}</p>
                  </div>
                </div>
                <button
                  onClick={toggleTheme}
                  className={`w-12 h-6 rounded-full transition-colors duration-300 relative ${isDark ? 'bg-indigo-600' : 'bg-slate-300'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 ${isDark ? 'left-7' : 'left-1'}`} />
                </button>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3">System Language</label>
                <select className="w-full bg-transparent text-sm font-bold text-slate-900 dark:text-white focus:outline-none appearance-none cursor-pointer">
                  <option>English (Clinical Standard)</option>
                  <option disabled>Spanish (Coming soon)</option>
                  <option disabled>French (Coming soon)</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SettingsContent
