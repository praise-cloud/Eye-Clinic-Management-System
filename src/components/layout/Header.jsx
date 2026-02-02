import React, { useState, useRef } from 'react';
import useUser from '../../hooks/useUser';
import LogoutModal from '../modals/LogoutModal';
import OnlineStatusIndicator from '../OnlineStatusIndicator';

const Header = ({ activeSection, currentUser, searchTerm, onSearchChange, onSectionClick }) => {
  const { logout, loading } = useUser();
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const userRef = useRef();

  const handleLogout = async () => {
    try {
      await logout();
      setShowLogoutModal(false);
    } catch (error) {
      console.error('Logout error:', error);
      alert('Failed to logout. Please try again.');
    }
  };

  const userMenuItems = [
    { label: 'Settings', id: 'settings' },
    { label: 'Logout', id: 'logout' }
  ];

  const handleUserMenuClick = (item) => {
    setShowUserDropdown(false);
    if (item.id === 'logout') {
      setShowLogoutModal(true);
    } else if (item.id === 'settings') {
      if (onSectionClick) {
        onSectionClick('settings');
      }
    }
  };

  return (
    <header className="glass-effect sticky top-0 z-10 border-b border-slate-200/60 dark:border-slate-800/60">
      <div className="w-full px-8 py-4 flex items-center justify-end">

        <div className="flex items-center gap-6">
          <div className="relative" ref={userRef}>
            <button
              className="flex items-center gap-3 p-1.5 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-300"
              onClick={() => setShowUserDropdown(!showUserDropdown)}
            >
              <div className="relative">
                <img
                  src={currentUser?.avatar || 'https://ui-avatars.com/api/?name=' + (currentUser?.name || 'User') + '&background=6366f1&color=fff'}
                  alt="avatar"
                  className="w-10 h-10 rounded-xl border-2 border-white dark:border-slate-700 shadow-sm"
                />
                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-white dark:border-slate-800 rounded-full"></div>
              </div>
              <div className="hidden md:flex flex-col text-left">
                <span className="text-sm font-bold text-slate-900 dark:text-white leading-tight">{currentUser?.name || 'User'}</span>
                <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{currentUser?.role || 'Clinician'}</span>
              </div>
              <svg className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${showUserDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
            </button>
            {showUserDropdown && (
              <div className="absolute right-0 mt-3 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl shadow-slate-200/50 dark:shadow-none z-20 overflow-hidden animate-premium-fade">
                <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                  <p className="text-xs font-semibold text-slate-500 uppercase">Account Information</p>
                </div>
                {userMenuItems.map((item) => (
                  <button
                    key={item.label}
                    className="w-full text-left px-4 py-3 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-slate-700 dark:text-slate-200 flex items-center gap-3 transition-colors"
                    onClick={() => handleUserMenuClick(item)}
                  >
                    <span className="text-sm font-semibold">{item.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <LogoutModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleLogout}
        loading={false}
      />
    </header>
  );
};


export default Header
