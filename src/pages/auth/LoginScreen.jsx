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
    <div className="flex items-center justify-center min-h-screen p-6 bg-slate-50 dark:bg-slate-950 overflow-hidden relative">
      {/* Decorative background elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-violet-500/5 blur-[120px] rounded-full" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Header */}
        <div className="text-center mb-10 animate-premium-fade">
          <div className="mb-8 relative inline-block">
            <div className="absolute inset-0 bg-indigo-500/20 blur-2xl rounded-full scale-150 animate-pulse" />
            <img src={logo} alt="Clinic Logo" className="w-24 h-24 mx-auto relative z-10 drop-shadow-2xl" />
          </div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white mb-3 tracking-tight">
            Clinical <span className="text-gradient">Portal</span>
          </h1>
          <p className="text-sm text-slate-500 font-medium tracking-wide first-letter:uppercase">Secure access to patient management systems</p>
        </div>

        {/* Login Form */}
        <div className="card-premium p-10 animate-premium-fade" style={{ animationDelay: '0.1s' }}>
          {loginError && (
            <div className="mb-8 p-4 bg-rose-50 dark:bg-rose-900/10 border-l-4 border-rose-500 rounded-r-xl flex items-center gap-3 animate-premium-slide">
              <svg className="w-5 h-5 text-rose-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <p className="text-sm font-bold text-rose-700 dark:text-rose-400">{loginError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-2">
              <label htmlFor="email" className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">
                Professional Identifier
              </label>
              <div className="relative group">
                <input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className={`input-premium py-4 pl-12 text-sm font-bold ${errors.email ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/10' : ''}`}
                  placeholder="name@clinic.com"
                  disabled={isLoading}
                />
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                </div>
              </div>
              {errors.email && (
                <p className="pl-1 text-xs font-bold text-rose-500">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center px-1">
                <label htmlFor="password" className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Encryption Key
                </label>
                <button type="button" className="text-[10px] font-black text-indigo-500 hover:text-indigo-600 uppercase tracking-widest transition-colors">Forgot?</button>
              </div>
              <div className="relative group">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className={`input-premium py-4 pl-12 pr-12 text-sm font-bold ${errors.password ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/10' : ''}`}
                  placeholder="••••••••"
                  disabled={isLoading}
                />
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 00-2 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" /></svg>
                  ) : (
                    <ViewIcon className="w-5 h-5" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="pl-1 text-xs font-bold text-rose-500">{errors.password}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full btn btn-primary py-4 text-sm font-black tracking-widest uppercase shadow-xl shadow-indigo-200 dark:shadow-none transition-all hover:scale-[1.02] active:scale-95 group"
            >
              {isLoading ? (
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span className="opacity-80">Authorizing...</span>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <LoginIcon className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  <span>Initiate Login</span>
                </div>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center mt-12 animate-premium-fade" style={{ animationDelay: '0.3s' }}>
          <div className="glass-effect dark:bg-slate-900/50 rounded-2xl border border-slate-200/50 dark:border-slate-800 p-8 mb-8">
            <h3 className="text-sm font-black text-slate-900 dark:text-white mb-2 tracking-tight">Access Control</h3>
            <p className="text-xs text-slate-500 font-medium mb-6">Unauthorized access is strictly prohibited and monitored.</p>
            <button
              onClick={onAddUser}
              className="px-6 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-black tracking-widest uppercase hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex items-center mx-auto gap-2"
            >
              <UserPlusIcon className="w-4 h-4" />
              Provision Account
            </button>
          </div>

          <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">
            Eye Clinic Management Suite <span className="mx-2">•</span> v2.4.0
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
