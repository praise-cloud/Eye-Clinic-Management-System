import React, { useState, useEffect } from 'react'
import AssistantForm from '../../components/forms/AssistantForm'
import DoctorForm from '../../components/forms/DoctorForm'
import AdminForm from '../../components/forms/AdminForm'

const SignupScreen = ({ selectedRole, onComplete, onBack, onBackToWelcome }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    gender: '',
    password: '',
    confirmPassword: '',
    permissions: ''
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
  const handleBack = onBack || (() => console.warn('onBack not provided'))
  const handleBackToWelcome = onBackToWelcome || (() => console.warn('onBackToWelcome not provided'))

  // One-time log on mount/update
  useEffect(() => {
    if (currentRole) {
      console.log('Raw selectedRole:', selectedRole, 'Normalized:', normalizedRole);
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
    } else if (lowerRole === 'admin') {
      // Admin: Optional gender/phone; require permissions
      if (!formData.permissions) errors.push('Permissions are required (e.g., users,patients)')
    } else {
      console.warn('Fallback validation for unknown role:', normalizedRole)
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
        console.error('Render error: Unknown role', normalizedRole)  // Log for debug
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
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-6">
            {renderFormFields()}

            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={() => setLocalSelectedRole(null)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className={`flex-1 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2 inline-block"></div>
                    Creating Account...
                  </>
                ) : (
                  'Continue'
                )}
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
              handleBackToWelcome();
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
