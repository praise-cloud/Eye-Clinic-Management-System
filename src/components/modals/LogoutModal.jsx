import React from 'react';

const LogoutModal = ({ isOpen, onClose, onConfirm, loading = false }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4 animate-premium-fade">
      <div className="card-premium bg-white dark:bg-slate-900 w-full max-w-md p-8 shadow-2xl animate-premium-slide" onClick={(e) => e.stopPropagation()}>
        <div className="flex flex-col items-center text-center">
          <div className="w-20 h-20 bg-rose-50 dark:bg-rose-900/10 rounded-3xl flex items-center justify-center mb-6 group transition-all duration-500 hover:scale-110">
            <div className="w-14 h-14 bg-rose-100 dark:bg-rose-900/20 rounded-2xl flex items-center justify-center text-rose-600 transition-colors group-hover:bg-rose-500 group-hover:text-white">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </div>
          </div>

          <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-2">Session Termination</h3>
          <p className="text-sm text-slate-500 font-medium mb-10 max-w-[280px]">
            You are about to terminate your current clinical session. All unsaved telemetry may be lost.
          </p>

          <div className="flex flex-col w-full gap-3">
            <button
              onClick={onConfirm}
              disabled={loading}
              className="w-full py-4 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-black tracking-widest uppercase shadow-xl shadow-rose-200 dark:shadow-none transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Suspending...</span>
                </>
              ) : (
                'Confirm Termination'
              )}
            </button>
            <button
              onClick={onClose}
              disabled={loading}
              className="w-full py-4 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl text-xs font-black tracking-widest uppercase hover:bg-slate-100 dark:hover:bg-slate-700 transition-all border border-slate-200 dark:border-slate-700 active:scale-95 disabled:opacity-50"
            >
              Return to System
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LogoutModal;