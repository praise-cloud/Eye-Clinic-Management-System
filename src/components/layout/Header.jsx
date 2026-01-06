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
    { label: 'Profile', id: 'profile' },
    { label: 'Settings', id: 'settings' },
    { label: 'Logout', id: 'logout' }
  ];

  const handleUserMenuClick = (item) => {
    setShowUserDropdown(false);
    if (item.id === 'logout') {
      setShowLogoutModal(true);
    } else if (item.id === 'settings' || item.id === 'profile') {
      if (onSectionClick) {
        onSectionClick('settings');
      }
    }
  };

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div className="w-full px-6 py-4 flex items-center justify-end">

        {/* Right: User Info Dropdown */}
        <div className="relative" ref={userRef}>
          <button
            className="flex items-center space-x-2 px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
            onClick={() => setShowUserDropdown(!showUserDropdown)}
          >
            <img
              src={currentUser?.avatar || 'https://ui-avatars.com/api/?name=' + (currentUser?.name || 'User')}
              alt="avatar"
              className="w-8 h-8 rounded-full border ml-2"
            />
            <div className="flex flex-col text-right">
              <span className="font-medium text-gray-700 dark:text-gray-200">{currentUser?.name || 'User'}</span>
              <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">{currentUser?.role || 'Unknown'}</span>
            </div>
            <svg className="w-4 h-4 ml-1 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          </button>
          {showUserDropdown && (
            <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded shadow-lg z-10">
              {userMenuItems.map((item) => (
                <button
                  key={item.label}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-200 flex items-center"
                  onClick={() => handleUserMenuClick(item)}
                >
                  <span className="mr-2">{item.label}</span>
                </button>
              ))}
            </div>
          )}
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