import React from 'react'
import { UsersIcon, ChartIcon, DocumentIcon, ChatIcon, ArrowRightIcon } from '../components/Icons'

const WelcomeScreen = ({ onGetStarted }) => {
  const features = [
    {
      icon: <UsersIcon className="w-8 h-8 text-blue-600" />,
      title: 'Patient Management',
      description: 'Comprehensive patient records and history'
    },
    {
      icon: <ChartIcon className="w-8 h-8 text-green-600" />,
      title: 'Visual Field Tests',
      description: 'Advanced test analysis and tracking'
    },
    {
      icon: <DocumentIcon className="w-8 h-8 text-purple-600" />,
      title: 'Reports & Analytics',
      description: 'Detailed insights and PDF reports'
    },
    {
      icon: <ChatIcon className="w-8 h-8 text-orange-600" />,
      title: 'Team Communication',
      description: 'Secure doctor-assistant messaging'
    }
  ]

  return (
    <div className="relative flex items-center justify-center min-h-screen p-6 overflow-hidden">
      {/* Full background logo */}
      <div className="absolute inset-0">
        <img
          src="../assets/images/logo.png"
          alt="Background Logo"
          className="w-full h-full object-cover opacity-15"
        />
      </div>

      {/* Background text close to logo */}
      <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none select-none z-0">
        <div className="">
          <h1 className="text-6xl font-extrabold tracking-wide">KORENYE CLINIC</h1>
          <h2 className="text-3xl">NIG. LTD.</h2>
        </div>
      </div>

      {/* Foreground content */}
      <div className="relative w-full max-w-4xl z-10">
        <div className="text-center mb-12 animate-fade-in">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Eye Clinic Management System
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Professional visual field test management for medical professionals.
            Streamline your clinic operations with comprehensive patient care tools.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 animate-fade-in border border-gray-100"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="flex flex-col items-center text-center">
                <div className="mb-4">{feature.icon}</div>
                <h3 className="font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Call to Action */}
        <div className="text-center animate-fade-in" style={{ animationDelay: '0.6s' }}>
          <button
            onClick={onGetStarted}
            className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 text-lg"
          >
            <span>Get Started</span>
            <ArrowRightIcon className="ml-3 w-6 h-6" />
          </button>
          <p className="mt-4 text-gray-500 text-sm">
            Set up your account in just a few simple steps
          </p>
        </div>
      </div>
    </div>
  )
}

export default WelcomeScreen
