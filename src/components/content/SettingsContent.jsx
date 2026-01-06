import React, { useState, useEffect } from 'react'
import { useTheme } from '../../context/ThemeContext'
import useUser from '../../hooks/useUser'

const SettingsContent = () => {
  const { isDark, toggleTheme } = useTheme()
  const { user } = useUser()
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
    emailAlerts: true
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
  }, [user])

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSettingToggle = (field) => {
    setSettings(prev => ({ ...prev, [field]: !prev[field] }))
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
      // Save profile logic here
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
      // Change password logic here
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
    <div className="space-y-6">
      {/* Success Message */}
      {showSuccess && (
        <div className="fixed top-4 right-4 z-50 bg-green-500 text-white px-6 py-4 rounded-lg shadow-2xl flex items-center gap-3 animate-slide-in">
          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
            <i className="fas fa-check text-green-500 text-xl"></i>
          </div>
          <div>
            <p className="font-bold text-lg">Success!</p>
            <p className="text-sm">{successMessage}</p>
          </div>
        </div>
      )}
      {/* Profile Section */}
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 transition-all duration-300 ${
        isEditing ? 'ring-2 ring-blue-500 shadow-blue-500/20' : ''
      }`}>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Profile Information</h2>
            {isEditing && <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">✏️ Editing mode - Make your changes below</p>}
          </div>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 flex items-center gap-2 shadow-md hover:shadow-lg transition-all"
            >
              <i className="fas fa-edit"></i>
              Edit Profile
            </button>
          )}
        </div>
        <div className="flex flex-col md:flex-row gap-8">
          <div className="flex flex-col items-center">
            <div className="relative">
              <div
                onClick={isEditing ? handleImageSelect : undefined}
                className={`w-36 h-36 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center overflow-hidden transition-all duration-300 ${
                  isEditing ? 'cursor-pointer hover:scale-105 ring-4 ring-blue-500 ring-offset-4 shadow-xl' : 'shadow-md'
                }`}
              >
                {profileImage ? (
                  <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <i className="fas fa-user text-6xl text-gray-400"></i>
                )}
                {isEditing && (
                  <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <i className="fas fa-camera text-white text-3xl"></i>
                  </div>
                )}
              </div>
            </div>
            {isEditing && (
              <button onClick={handleImageSelect} className="mt-4 px-4 py-2 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-800 font-medium transition-all">
                <i className="fas fa-camera mr-2"></i>
                Change Photo
              </button>
            )}
          </div>
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className={`block text-sm font-semibold mb-2 transition-colors ${
                isEditing ? 'text-blue-700 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'
              }`}>Full Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                disabled={!isEditing}
                className={`w-full px-4 py-3 rounded-lg transition-all duration-200 ${
                  isEditing
                    ? 'border-2 border-blue-500 bg-blue-50 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-4 focus:ring-blue-300 dark:focus:ring-blue-600 shadow-md hover:shadow-lg'
                    : 'border-0 bg-gray-50 dark:bg-gray-900 dark:text-white cursor-default font-medium'
                }`}
              />
            </div>
            <div>
              <label className={`block text-sm font-semibold mb-2 transition-colors ${
                isEditing ? 'text-blue-700 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'
              }`}>Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                disabled={!isEditing}
                className={`w-full px-4 py-3 rounded-lg transition-all duration-200 ${
                  isEditing
                    ? 'border-2 border-blue-500 bg-blue-50 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-4 focus:ring-blue-300 dark:focus:ring-blue-600 shadow-md hover:shadow-lg'
                    : 'border-0 bg-gray-50 dark:bg-gray-900 dark:text-white cursor-default font-medium'
                }`}
              />
            </div>
            <div>
              <label className={`block text-sm font-semibold mb-2 transition-colors ${
                isEditing ? 'text-blue-700 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'
              }`}>Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                disabled={!isEditing}
                className={`w-full px-4 py-3 rounded-lg transition-all duration-200 ${
                  isEditing
                    ? 'border-2 border-blue-500 bg-blue-50 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-4 focus:ring-blue-300 dark:focus:ring-blue-600 shadow-md hover:shadow-lg'
                    : 'border-0 bg-gray-50 dark:bg-gray-900 dark:text-white cursor-default font-medium'
                }`}
              />
            </div>
            <div>
              <label className={`block text-sm font-semibold mb-2 transition-colors ${
                isEditing ? 'text-blue-700 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'
              }`}>Gender</label>
              {isEditing ? (
                <select
                  value={formData.gender}
                  onChange={(e) => handleInputChange('gender', e.target.value)}
                  className="w-full px-4 py-3 rounded-lg transition-all duration-200 capitalize border-2 border-blue-500 bg-blue-50 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-4 focus:ring-blue-300 dark:focus:ring-blue-600 shadow-md hover:shadow-lg"
                >
                  <option value="">Select Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              ) : (
                <div className="w-full px-4 py-3 rounded-lg border-0 bg-gray-50 dark:bg-gray-900 dark:text-white font-medium capitalize">
                  {formData.gender || 'Not specified'}
                </div>
              )}
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">Role</label>
              <div className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 rounded-lg border-0 capitalize font-medium text-gray-900 dark:text-white flex items-center gap-2">
                <i className="fas fa-user-tag text-blue-600"></i>
                {user?.role || ''}
              </div>
            </div>
          </div>
        </div>
        {isEditing && (
          <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handleCancelEdit}
              disabled={loading}
              className="px-6 py-2.5 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 font-medium transition-all"
            >
              <i className="fas fa-times mr-2"></i>
              Cancel
            </button>
            <button
              onClick={handleSaveProfile}
              disabled={loading}
              className="px-6 py-2.5 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 disabled:opacity-50 font-medium shadow-md hover:shadow-lg transition-all"
            >
              {loading ? (
                <><i className="fas fa-spinner fa-spin mr-2"></i>Saving...</>
              ) : (
                <><i className="fas fa-check mr-2"></i>Save Changes</>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Change Password Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Security</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage your password and security settings</p>
          </div>
          {!isChangingPassword && (
            <button
              onClick={() => setIsChangingPassword(true)}
              className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 flex items-center gap-2 shadow-md hover:shadow-lg transition-all"
            >
              <i className="fas fa-key"></i>
              Change Password
            </button>
          )}
        </div>

        {isChangingPassword ? (
          <div className="border-2 border-purple-500 rounded-lg p-6 bg-purple-50 dark:bg-gray-900">
            <p className="text-purple-700 dark:text-purple-400 mb-4 flex items-center gap-2">
              <i className="fas fa-shield-alt"></i>
              Enter your current password and choose a new one
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-purple-700 dark:text-purple-400 mb-2">Current Password</label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={formData.currentPassword}
                    onChange={(e) => handleInputChange('currentPassword', e.target.value)}
                    placeholder="Enter current password"
                    className="w-full px-4 py-3 pr-12 border-2 border-purple-400 dark:border-purple-500 bg-white dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-4 focus:ring-purple-300 dark:focus:ring-purple-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-600 hover:text-purple-800 dark:text-purple-400"
                  >
                    <i className={`fas ${showCurrentPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-purple-700 dark:text-purple-400 mb-2">New Password</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={formData.newPassword}
                    onChange={(e) => handleInputChange('newPassword', e.target.value)}
                    placeholder="Enter new password"
                    className="w-full px-4 py-3 pr-12 border-2 border-purple-400 dark:border-purple-500 bg-white dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-4 focus:ring-purple-300 dark:focus:ring-purple-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-600 hover:text-purple-800 dark:text-purple-400"
                  >
                    <i className={`fas ${showNewPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-purple-700 dark:text-purple-400 mb-2">Confirm Password</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                    placeholder="Confirm new password"
                    className="w-full px-4 py-3 pr-12 border-2 border-purple-400 dark:border-purple-500 bg-white dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-4 focus:ring-purple-300 dark:focus:ring-purple-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-600 hover:text-purple-800 dark:text-purple-400"
                  >
                    <i className={`fas ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                  </button>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-purple-300 dark:border-purple-700">
              <button
                onClick={() => {
                  setIsChangingPassword(false)
                  setFormData(prev => ({ ...prev, currentPassword: '', newPassword: '', confirmPassword: '' }))
                }}
                disabled={loading}
                className="px-6 py-2.5 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 font-medium transition-all"
              >
                <i className="fas fa-times mr-2"></i>
                Cancel
              </button>
              <button
                onClick={handleChangePassword}
                disabled={loading}
                className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 disabled:opacity-50 font-medium shadow-md hover:shadow-lg transition-all"
              >
                {loading ? (
                  <><i className="fas fa-spinner fa-spin mr-2"></i>Changing...</>
                ) : (
                  <><i className="fas fa-check mr-2"></i>Update Password</>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
              <i className="fas fa-lock text-purple-600 dark:text-purple-400 text-xl"></i>
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Password Protection</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Your password is encrypted and secure</p>
            </div>
          </div>
        )}
      </div>



      {/* Preferences Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Preferences</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Email Notifications</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Receive email alerts for important updates</p>
            </div>
            <button
              onClick={() => handleSettingToggle('emailAlerts')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.emailAlerts ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.emailAlerts ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Push Notifications</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Get notified about appointments and tasks</p>
            </div>
            <button
              onClick={() => handleSettingToggle('notifications')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.notifications ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.notifications ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          {user?.role === 'doctor' && (
            <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Auto Backup</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Automatically backup patient data daily</p>
              </div>
              <button
                onClick={() => handleSettingToggle('autoBackup')}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.autoBackup ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.autoBackup ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          )}
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Dark Mode</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Switch between light and dark theme</p>
            </div>
            <button
              onClick={toggleTheme}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                isDark ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isDark ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SettingsContent