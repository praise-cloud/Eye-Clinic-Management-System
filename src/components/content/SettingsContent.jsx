import React, { useState, useEffect } from 'react'
import { useTheme } from '../../context/ThemeContext'
import useUser from '../../hooks/useUser'

const SettingsContent = () => {
  const { isDark, toggleTheme } = useTheme()
  const { user, updateProfile } = useUser()
  const [loading, setLoading] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [profileImage, setProfileImage] = useState(null)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    gender: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [settings, setSettings] = useState({
    notifications: true,
    autoBackup: true,
    emailAlerts: true,
    dbPath: ''
  })

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
    const loadDbPath = async () => {
      try {
        const result = await (window.electronAPI?.getNetworkDbPath?.() ?? null)
        if (result?.success && result.path) {
          setSettings(prev => ({ ...prev, dbPath: result.path }))
        }
      } catch { }
    }
    loadDbPath()
  }, [user])

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSettingToggle = (field) => {
    setSettings(prev => ({ ...prev, [field]: !prev[field] }))
  }

  const handleDbPathChange = (value) => {
    setSettings(prev => ({ ...prev, dbPath: value }))
  }

  const handleSaveDbPath = async () => {
    try {
      if (!window.electronAPI?.setNetworkDbPath) return
      await window.electronAPI.setNetworkDbPath(settings.dbPath || '')
      setSuccessMessage('Network database path saved. Restart application to apply.')
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 3000)
    } catch (error) {
      console.error('Error saving DB path:', error)
      alert('Failed to save network database path')
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
      if (updateProfile) {
        await updateProfile(updates)
      } else if (window.electronAPI?.updateUser) {
        await window.electronAPI.updateUser(user.id, updates, user.id)
      }
      setIsEditing(false)
      setSuccessMessage('Profile updated successfully')
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 3000)
    } catch (error) {
      console.error('Error saving profile:', error)
      alert('Failed to update profile')
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
      if (window.electronAPI?.updateUser) {
        await window.electronAPI.updateUser(user.id, { password: formData.newPassword }, user.id)
      }
      setFormData(prev => ({ ...prev, currentPassword: '', newPassword: '', confirmPassword: '' }))
      setIsChangingPassword(false)
      setSuccessMessage('Password changed successfully')
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 3000)
    } catch (error) {
      console.error('Error changing password:', error)
      alert('Failed to change password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8 animate-premium-fade pb-10">
      {/* Success Notification */}
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
        {/* Left Column: Profile & Security */}
        <div className="lg:col-span-2 space-y-8">
          {/* Identity Section */}
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

          {/* Security Section */}
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

        {/* Right Column: System & Preferences */}
        <div className="space-y-8">
          <div className="card-premium p-8">
            <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight mb-2">Environment</h2>
            <p className="text-sm text-slate-500 font-medium mb-8">Clinical network configuration</p>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Shared Database Path</label>
                <input
                  type="text"
                  value={settings.dbPath}
                  onChange={(e) => handleDbPathChange(e.target.value)}
                  className="input-premium text-xs font-mono"
                  placeholder="\\Server\Clinic\database.db"
                />
              </div>
              <button onClick={handleSaveDbPath} className="w-full btn btn-primary py-3.5">
                Update Network Path
              </button>
              <button
                className="w-full btn btn-ghost bg-slate-50 py-3.5 text-xs font-bold ring-1 ring-slate-200"
                onClick={async () => {
                  try {
                    if (!window.electronAPI?.selectFile) return;
                    const result = await window.electronAPI.selectFile({
                      title: 'Choose SQLite database',
                      filters: [{ name: 'SQLite', extensions: ['db', 'sqlite','bak'] }]
                    });
                    const chosen = result?.filePath || result?.path || result?.file || null;
                    if (!chosen) return;
                    if (!window.electronAPI?.importDb) return;
                    const res = await window.electronAPI.importDb(chosen);
                    if (res?.success) {
                      setSuccessMessage('Database context switched successfully.');
                      setShowSuccess(true);
                      setTimeout(() => setShowSuccess(false), 4000);
                    }
                  } catch (err) { }
                }}
              >
                Import Local Context
              </button>
            </div>
          </div>

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
  );
};

export default SettingsContent;
