import React, { useState } from 'react'
import {
  Logo,
  UsersIcon,
  InventoryIcon,
  DocumentIcon,
  LogoutIcon,
  ChartIcon,
  GearIcon,
  DrugIcon,
  PackageIcon,
  ChatIcon
} from '../Icons';
import useUser from '../../hooks/useUser'
import { useSystemConfig } from '../../context/SystemConfigContext'
import LogoutModal from '../modals/LogoutModal'

const Sidebar = ({ activeSection, onSectionClick, currentUser }) => {
  const { user, logout, loading } = useUser();
  const { config } = useSystemConfig();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      setShowLogoutModal(false);
    } catch (error) {
      console.error('Logout error:', error);
      alert('Failed to logout. Please try again.');
    }
  };

  const adminSidebarItems = [
    { id: 'overview', name: 'Overview', icon: <ChartIcon className="w-5 h-5" /> },
    { id: 'messages', name: 'Messages', icon: <ChatIcon className="w-5 h-5" /> },
    { id: 'users', name: 'User Management', icon: <UsersIcon className="w-5 h-5" /> },
    { id: 'revenue-analysis', name: 'Financial Oversight', icon: <DrugIcon className="w-5 h-5" /> },
    { id: 'doctor-case-studies', name: 'Doctor Case Studies', icon: <DocumentIcon className="w-5 h-5" /> },
    { id: 'system-settings', name: 'System Settings', icon: <GearIcon className="w-5 h-5" /> },
    { id: 'logout', name: 'Logout', icon: <LogoutIcon className="w-5 h-5" /> },
  ];

  const regularSidebarItems = [
    { id: 'dashboard', name: 'Dashboard', icon: <ChartIcon className="w-5 h-5" /> },
    { id: 'messages', name: 'Messages', icon: <ChatIcon className="w-5 h-5" /> },
    { id: 'case-notes', name: 'Case Notes', icon: <DocumentIcon className="w-5 h-5" />, roles: ['doctor'] },
    { id: 'inventory', name: 'Inventory', icon: <PackageIcon className="w-5 h-5" />, roles: ['admin', 'assistant'] },
    { id: 'pharmacy', name: 'Pharmacy', icon: <DrugIcon className="w-5 h-5" />, roles: ['assistant'] },
    { id: 'settings', name: 'Settings', icon: <GearIcon className="w-5 h-5" /> },
    { id: 'logout', name: 'Logout', icon: <LogoutIcon className="w-5 h-5" /> },
  ];

  const allSidebarItems = user?.role === 'admin' ? adminSidebarItems : regularSidebarItems;

  const sidebarItems = allSidebarItems.filter(item =>
    !item.roles || item.roles.includes(user?.role)
  )

  return (
    <div className="flex flex-col w-[280px] bg-slate-900 shadow-2xl h-screen z-20">
      {/* Logo */}
      <div className="flex items-center px-6 py-10">
        <div className="flex flex-col">
          <Logo className="w-16 mb-1" />
          <span className="text-xs font-black text-indigo-400 uppercase tracking-[0.2em] line-clamp-2">{config.clinicName || 'Korene Eye Clinic'}</span>
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Management System</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
        {sidebarItems.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              if (item.id === 'logout') {
                setShowLogoutModal(true);
              } else {
                onSectionClick(item.id);
              }
            }}
            className={`${activeSection === item.id
              ? 'sidebar-item sidebar-item-active'
              : 'sidebar-item text-slate-400 '
              } group`}
          >
            <span className={`${activeSection === item.id ? 'text-white' : 'text-slate-500 group-hover:text-indigo-400'} transition-colors`}>
              {item.icon}
            </span>
            <span className="text-sm font-semibold tracking-wide">{item.name}</span>
          </button>
        ))}
      </nav>

      {/*  lower buttom divider */}

      <div className="p-6 border-t border-slate-800"></div>

      <LogoutModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleLogout}
        loading={false}
      />
    </div>
  )
}

export default Sidebar
