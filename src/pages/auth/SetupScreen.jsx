import React from 'react';
import { ArrowLeftIcon } from '../../components/Icons';
import logo from '../../assets/images/logo.png';

const SetupScreen = ({ onSelectRole, onBack }) => {
  const roles = [
    { id: 'doctor', name: 'Doctor', description: 'Medical practitioner with full access' },
    { id: 'assistant', name: 'Clinic Assistant', description: 'Administrative and patient care support' },
    { id: 'admin', name: 'Admin', description: 'System administrator with management access' }
  ];

  return (
    <div className="flex items-center justify-center min-h-screen p-6 bg-slate-50 dark:bg-slate-950 overflow-hidden relative">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-violet-500/5 blur-[120px] rounded-full" />
      </div>

      <div className="w-full max-w-2xl relative z-10">
        <div className="text-center mb-10 animate-premium-fade">
          <div className="mb-8 relative inline-block">
            <div className="absolute inset-0 bg-indigo-500/20 blur-2xl rounded-full scale-150 animate-pulse" />
            <img src={logo} alt="Clinic Logo" className="w-24 h-24 mx-auto relative z-10 drop-shadow-2xl" />
          </div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white mb-3 tracking-tight">
            Role <span className="text-gradient">Selection</span>
          </h1>
          <p className="text-sm text-slate-500 font-medium tracking-wide">Select the professional classification for the new account</p>
        </div>

        <div className="card-premium p-10 animate-premium-fade" style={{ animationDelay: '0.1s' }}>
          <div className="grid gap-6">
            {roles.map((role) => (
              <button
                key={role.id}
                onClick={() => onSelectRole(role.name)}
                className="group relative p-8 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-2xl hover:bg-white dark:hover:bg-slate-800 hover:border-indigo-500 hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-300 text-left overflow-hidden active:scale-[0.98]"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-3xl rounded-full translate-x-16 -translate-y-16 group-hover:bg-indigo-500/10 transition-colors" />
                <div className="relative z-10 flex items-start gap-6">
                  <div className="w-14 h-14 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center justify-center text-indigo-600 shadow-sm group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500">
                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-black text-slate-900 dark:text-white mb-1 group-hover:text-indigo-600 transition-colors tracking-tight">{role.name}</h3>
                    <p className="text-sm text-slate-500 font-medium leading-relaxed">{role.description}</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0 transition-all text-indigo-600">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {onBack && (
            <div className="mt-10 pt-8 border-t border-slate-100 dark:border-slate-800 text-center">
              <button
                onClick={onBack}
                className="inline-flex items-center gap-2 text-xs font-black text-slate-400 hover:text-indigo-500 uppercase tracking-widest transition-colors"
              >
                <ArrowLeftIcon className="w-4 h-4" />
                Return to Entrance
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SetupScreen;
