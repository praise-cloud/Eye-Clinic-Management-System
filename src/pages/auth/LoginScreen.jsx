import React, { useState } from 'react'
import { LoginIcon, UserPlusIcon, ViewIcon } from '../../components/Icons'
import logo from '../../assets/images/logo.png'

const LoginScreen = ({ onLogin, onAddUser }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [errors, setErrors] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [loginError, setLoginError] = useState('')

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const validateForm = () => {
    const newErrors = {}

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid'
    }

    if (!formData.password) {
      newErrors.password = 'Password is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (validateForm()) {
      setIsLoading(true);
      setLoginError('');
      try {
        await onLogin(formData);
        // If successful, the component will unmount due to navigation
      } catch (err) {
        setLoginError(err.message || 'Login failed. Please check your credentials.');
      }
      setIsLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-6 bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="mb-6">
            <img src={logo} alt="Clinic Logo" className="w-20 h-20 mx-auto" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Welcome Back</h1>
          <p className="text-gray-600 dark:text-gray-400">Sign in to your Eye Clinic account</p>
        </div>

        {/* Login Form */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 p-8 animate-fade-in">
          {loginError && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
              <p className="text-sm text-red-600 dark:text-red-400">{loginError}</p>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className={`input dark:bg-gray-700 dark:text-white dark:border-gray-600 ${errors.email ? 'input-error' : ''}`}
                placeholder="Enter your email"
                disabled={isLoading}
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className={`input pr-10 dark:bg-gray-700 dark:text-white dark:border-gray-600 ${errors.password ? 'input-error' : ''}`}
                  placeholder="Enter your password"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <ViewIcon className="w-5 h-5" />
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full btn btn-primary ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Signing in...
                </>
              ) : (
                <>
                  <LoginIcon className="w-4 h-4 mr-2" />
                  Sign In
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 p-4 mb-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Need to add a new team member?
            </p>
            <button
              onClick={onAddUser}
              className="btn btn-outline"
            >
              <UserPlusIcon className="w-4 h-4 mr-2" />
              Add New User
            </button>
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400">
            Need help? Contact your system administrator
          </p>
        </div>

        {/* Demo Credentials (for development) */}
        {/* {process.env.NODE_ENV === 'development' && (
          <div className="mt-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 animate-fade-in" style={{ animationDelay: '0.4s' }}>
            <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-300 mb-2">Demo Credentials</h4>
            <div className="text-xs text-yellow-700 dark:text-yellow-400 space-y-1">
              <p>Doctor: doctor@clinic.com / password123</p>
              <p>Assistant: assistant@clinic.com / password123</p>
            </div>
          </div>
        )} */}
      </div>
    </div>
  )
}

export default LoginScreen
