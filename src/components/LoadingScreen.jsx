import React from 'react'
import { LoadingIcon } from './Icons'
import logo from '../assets/images/logo.png'

const LoadingScreen = ({ message = 'Loading...' }) => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden relative">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-violet-500/5 blur-[120px] rounded-full" />
      </div>

      <div className="relative z-10 text-center animate-premium-fade">
        {/* Logo with pulse effect */}
        <div className="mb-10 relative inline-block">
          <div className="absolute inset-0 bg-indigo-500/20 blur-2xl rounded-full scale-125 animate-pulse" />
          <img src={logo} alt="Clinic Logo" className="w-24 h-24 mx-auto relative z-10 drop-shadow-2xl opacity-80" />
        </div>

        {/* Loading Message */}
        <div className="space-y-4">
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            System <span className="text-gradient">Initializing</span>
          </h2>
          <p className="text-sm text-slate-500 font-medium tracking-wide max-w-xs mx-auto">
            {message === 'Loading...' ? 'Preparing clinical modules and securing data environments' : message}
          </p>
        </div>

        {/* Unified Loading Indicator */}
        <div className="mt-12 flex flex-col items-center gap-6">
          <div className="flex items-center gap-1.5 h-1">
            <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
            <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
            <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" />
          </div>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Establishing Secure Connection</span>
        </div>
      </div>
    </div>
  )
}

export default LoadingScreen