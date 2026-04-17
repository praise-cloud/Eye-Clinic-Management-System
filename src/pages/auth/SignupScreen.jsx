import React, { useState, useEffect } from 'react'
import AssistantForm from '../../components/forms/AssistantForm'
import DoctorForm from '../../components/forms/DoctorForm'
import AdminForm from '../../components/forms/AdminForm'
import logger from '../../utils/logger';

const SignupScreen = ({ selectedRole, onComplete, onBack, onBackToWelcome }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    gender: '',
    password: '',
    confirmPassword: ''
  })

  const [localSelectedRole, setLocalSelectedRole] = useState(selectedRole)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  // Use localSelectedRole if selectedRole not provided
  const currentRole = localSelectedRole || selectedRole

  // Normalize role to proper title case (handles multi-word like 'clinic assistant' → 'Clinic Assistant')
  const normalizedRole = currentRole
    ? currentRole.replace(/\b\w/g, l => l.toUpperCase())
    : null

  // Default props
  const handleBack = onBack || (() => logger.warn('SignupScreen: onBack not provided'))
  const handleBackToWelcome = onBackToWelcome || (() => logger.warn('SignupScreen: onBackToWelcome not provided'))

  // One-time log on mount/update
  useEffect(() => {
    if (currentRole) {
      logger.debug('SignupScreen: Raw selectedRole', { selectedRole, normalized: normalizedRole });
    }
  }, [selectedRole, normalizedRole, currentRole]);

  const roles = [
    { id: 'doctor', name: 'Doctor', description: 'Medical practitioner with full access' },
    { id: 'assistant', name: 'Clinic Assistant', description: 'Administrative and patient care support' },
    { id: 'admin', name: 'Admin', description: 'System administrator with management access' }
  ];

  const handleRoleSelect = (roleName) => {
    setLocalSelectedRole(roleName);
  };

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
    } else {
      logger.warn('SignupScreen: Fallback validation for unknown role', { normalizedRole })
    }

    if (errors.length > 0) {
      setError(errors.join('. '))
      return false
    }
    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (validateForm()) {
      setIsLoading(true)
      setError('')
      try {
        // Pass clinic data and admin data to complete setup
        await onComplete({}, { role: normalizedRole, ...formData })
        // If successful, navigation will occur
      } catch (err) {
        setError(err.message || 'Failed to create user. Please try again.')
      }
      setIsLoading(false)
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
        logger.error('SignupScreen: Render error: Unknown role', { normalizedRole })
        return <p>Invalid role: {normalizedRole}. Please go back and select again.</p>
    }
  }

  // If no role selected, show role selection
  if (!currentRole) {
    return (
      <div className="flex items-center justify-center min-h-screen p-6 bg-gray-50 dark:bg-gray-900">
        <div className="w-full max-w-2xl">
          <div className="text-center mb-8 animate-fade-in">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Choose Your Role</h1>
            <p className="text-gray-600 dark:text-gray-400">Select the role for the new team member</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 p-8 animate-fade-in">
            <div className="grid gap-4">
              {roles.map((role) => (
                <button
                  key={role.id}
                  onClick={() => handleRoleSelect(role.name)}
                  className="p-6 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all text-left"
                >
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{role.name}</h3>
                  <p className="text-gray-600 dark:text-gray-400">{role.description}</p>
                </button>
              ))}
            </div>

            <div className="mt-6 text-center">
              <button
                onClick={handleBack}
                className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 flex items-center justify-center mx-auto text-sm font-medium"
              >
                ← Back
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Role selected, show form
  return (
    <div className="flex items-center justify-center min-h-screen p-6 bg-slate-50 dark:bg-slate-950 overflow-hidden relative">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-violet-500/5 blur-[120px] rounded-full" />
      </div>

      <div className="w-full max-w-2xl relative z-10">
        {/* Header */}
        <div className="text-center mb-10 animate-premium-fade">
          <h1 className="text-4xl font-black text-slate-900 dark:text-white mb-3 tracking-tight">
            Account <span className="text-gradient">Provisioning</span>
          </h1>
          <p className="text-sm text-slate-500 font-medium tracking-wide first-letter:uppercase">Registering new {normalizedRole} identity in the clinical system</p>
        </div>

        {/* Form Card */}
        <div className="card-premium p-10 animate-premium-fade" style={{ animationDelay: '0.1s' }}>
          {error && (
            <div className="mb-8 p-4 bg-rose-50 dark:bg-rose-900/10 border-l-4 border-rose-500 rounded-r-xl flex items-center gap-3 animate-premium-slide">
              <svg className="w-5 h-5 text-rose-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <p className="text-sm font-bold text-rose-700 dark:text-rose-400">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            {renderFormFields()}

            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={handleBack}
                className="flex-1 px-6 py-3.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-black tracking-widest uppercase hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 btn btn-primary py-3.5 text-xs font-black tracking-widest uppercase shadow-xl shadow-indigo-200 dark:shadow-none transition-all hover:scale-[1.02] active:scale-95 group"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center gap-3">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Processing...</span>
                  </div>
                ) : (
                  'Create Account'
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Back to Login */}
        <div className="text-center mt-12 animate-premium-fade" style={{ animationDelay: '0.2s' }}>
          <button
            type="button"
            onClick={handleBackToWelcome}
            className="inline-flex items-center gap-2 text-xs font-black text-slate-400 hover:text-indigo-500 uppercase tracking-widest transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14" /></svg>
            Existing Identity? Sign In
          </button>
        </div>
      </div>
    </div>
  )
}

export default SignupScreen
