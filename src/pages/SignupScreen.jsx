import React, { useState, useEffect } from 'react'
import AssistantForm from './forms/AssistantForm'
import DoctorForm from './forms/DoctorForm'
import AdminForm from './forms/AdminForm'

const SignupScreen = ({ selectedRole, onComplete, onBack, onBackToWelcome }) => {
  const [formData, setFormData] = useState({})

  // Normalize role to proper title case (handles multi-word like 'clinic assistant' → 'Clinic Assistant')
  const normalizedRole = selectedRole
    ? selectedRole.replace(/\b\w/g, l => l.toUpperCase())
    : 'Unknown'

  // One-time log on mount/update
  useEffect(() => {
    console.log('Raw selectedRole:', selectedRole, 'Normalized:', normalizedRole);
  }, [selectedRole, normalizedRole]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const validateForm = () => {
    const errors = []

    // Always required: Name, email, password match
    if (!formData.firstName || !formData.lastName) errors.push('First and Last Name are required')
    if (!formData.email || !formData.email.includes('@')) errors.push('Valid Email is required')
    if (!formData.password) errors.push('Password is required')
    if (formData.password !== formData.confirmPassword) errors.push('Passwords do not match')

    // Role-specific required fields (use normalizedRole safely)
    const lowerRole = normalizedRole.toLowerCase()
    if (lowerRole === 'doctor' || lowerRole === 'clinic assistant') {
      // Clinical roles: Require gender, phone
      if (!formData.gender) errors.push('Gender is required')
      if (!formData.phoneNumber) errors.push('Phone Number is required')
    } else if (lowerRole === 'admin') {
      // Admin: Optional gender/phone; require permissions
      if (!formData.permissions) errors.push('Permissions are required (e.g., users,patients)')
    } else {
      console.warn('Fallback validation for unknown role:', normalizedRole)
    }

    if (errors.length > 0) {
      alert(errors.join('\n'))
      return false
    }
    return true
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (validateForm()) {
      // Pass clinic data and admin data to complete setup
      onComplete({}, { role: normalizedRole, ...formData })
    }
  }

  const renderFormFields = () => {
    const lowerRole = normalizedRole.toLowerCase()  // Safe use
    switch (normalizedRole) {
      case 'Clinic Assistant':
        return <AssistantForm formData={formData} onChange={handleChange} />
      case 'Doctor':
        return <DoctorForm formData={formData} onChange={handleChange} />
      case 'Admin':
        return <AdminForm formData={formData} onChange={handleChange} />
      default:
        console.error('Render error: Unknown role', normalizedRole)  // Log for debug
        return <p>Invalid role: {normalizedRole}. Please go back and select again.</p>
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-6 bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-3xl">
        {/* Header */}
        <div className="text-center mb-8 animate-fade-in">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Add {normalizedRole || 'User'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">Create a new {normalizedRole} account</p>
        </div>

        {/* Form Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 p-8 animate-fade-in">
          <form onSubmit={handleSubmit} className="space-y-6">
            {renderFormFields()}

            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={onBack}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Back
              </button>
              <button
                type="submit"
                className="flex-1 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Continue
              </button>
            </div>
          </form>
        </div>

        {/* Back to Login */}
        <div className="text-center mt-6 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <button
            type="button"
            onClick={() => {
              console.log('Back to Login clicked');
              onBackToWelcome();
            }}
            className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 text-sm font-medium"
          >
            ← I have an account, Login
          </button>
        </div>
      </div>
    </div>
  )
}

export default SignupScreen