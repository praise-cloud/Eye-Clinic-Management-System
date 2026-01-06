import React from 'react'
import { LoadingIcon } from './Icons'
import logo from '../assets/images/logo.png'

const LoadingScreen = ({ message = 'Loading...' }) => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="text-center animate-fade-in">
        {/* Logo */}
        <div className="mb-8">
          <img src={logo} alt="Clinic Logo" className="w-20 h-20 mx-auto" />
        </div>

        {/* Loading Spinner */}
        <div className="mb-6">
          <LoadingIcon className="w-12 h-12 text-blue-600 dark:text-blue-400 mx-auto" />
        </div>

        {/* Loading Message */}
        <h2 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
          {message}
        </h2>

        <p className="text-gray-600 dark:text-gray-400 max-w-sm mx-auto">
          Please wait while we set up everything for you...
        </p>

        {/* Progress Dots */}
        <div className="flex justify-center space-x-2 mt-8">
          <div className="w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full animate-pulse"></div>
          <div className="w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
          <div className="w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
        </div>
      </div>
    </div>
  )
}

export default LoadingScreen