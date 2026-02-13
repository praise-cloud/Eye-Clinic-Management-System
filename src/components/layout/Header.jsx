import React, { useState, useRef, useEffect } from 'react';
import useUser from '../../hooks/useUser';
import useNotifications from '../../hooks/useNotifications';
import LogoutModal from '../modals/LogoutModal';
import OnlineStatusIndicator from '../OnlineStatusIndicator';

const Header = ({ activeSection, currentUser, searchTerm, onSearchChange, onSectionClick }) => {
  const { logout, loading } = useUser();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications(currentUser?.id);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const userRef = useRef();
  const notificationRef = useRef();

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userRef.current && !userRef.current.contains(event.target)) {
        setShowUserDropdown(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const handleNotificationClick = (n) => {
    markAsRead(n.id);
    if (n.type === 'prescription_new' && onSectionClick) {
      onSectionClick('pharmacy');
    }
    setShowNotifications(false);
  };

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
          {/* Notifications Bell */}
          <div className="relative" ref={notificationRef}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-all relative group"
            >
              <svg className="w-6 h-6 group-hover:text-indigo-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-5 h-5 bg-rose-500 text-white text-[10px] font-black flex items-center justify-center rounded-full border-2 border-white dark:border-slate-900 animate-pulse">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-3 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-20 overflow-hidden animate-premium-fade">
                <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                  <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Notifications</p>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-[10px] font-black text-indigo-500 hover:text-indigo-600 uppercase tracking-widest"
                    >
                      Mark all as read
                    </button>
                  )}
                </div>
                <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                  {notifications.length > 0 ? (
                    notifications.map((n) => (
                      <button
                        key={n.id}
                        onClick={() => handleNotificationClick(n)}
                        className={`w-full text-left px-5 py-4 border-b border-slate-50 dark:border-slate-800/50 flex flex-col gap-1 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 ${n.status === 'unread' ? 'bg-indigo-50/30' : ''}`}
                      >
                        <div className="flex justify-between items-start gap-2">
                          <span className={`text-sm font-bold ${n.status === 'unread' ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}>
                            {n.title}
                          </span>
                          {n.status === 'unread' && <div className="w-2 h-2 bg-indigo-500 rounded-full mt-1.5 flex-shrink-0" />}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{n.message}</p>
                        <span className="text-[10px] font-medium text-slate-400 mt-1">
                          {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </button>
                    ))
                  ) : (
                    <div className="px-5 py-12 text-center">
                      <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-300">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                      </div>
                      <p className="text-sm font-medium text-slate-400">No recent notifications</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

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
              <div className="absolute right-0 mt-3 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-20 overflow-hidden animate-premium-fade">
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
