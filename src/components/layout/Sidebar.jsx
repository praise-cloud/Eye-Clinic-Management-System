import React, { useState } from 'react'
import {
  Logo,
  UsersIcon,
  InventoryIcon,
  DocumentIcon,
  ScheduleIcon,
  ReportIcon,
  LogoutIcon,
  PharmacyIcon,
  ChartIcon,
  GearIcon,
  DrugIcon,
  PackageIcon
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
    { id: 'users', name: 'User Management', icon: <UsersIcon className="w-5 h-5" /> },
    { id: 'system-settings', name: 'System Settings', icon: <GearIcon className="w-5 h-5" /> },
    { id: 'logout', name: 'Logout', icon: <LogoutIcon className="w-5 h-5" /> },
  ];

  const regularSidebarItems = [
    { id: 'dashboard', name: 'Dashboard', icon: <ChartIcon className="w-5 h-5" /> },
    { id: 'messages', name: 'Messages', icon: <ChatIcon className="w-5 h-5" /> },
    { id: 'tests', name: 'Test', icon: <DocumentIcon className="w-5 h-5" /> },
    { id: 'inventory', name: 'Inventory', icon: <PackageIcon className="w-5 h-5" />, roles: ['admin', 'doctor', 'receptionist'] },
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
              : 'sidebar-item text-slate-400 hover:text-white hover:bg-slate-800'
              } group`}
          >
            <span className={`${activeSection === item.id ? 'text-white' : 'text-slate-500 group-hover:text-indigo-400'} transition-colors`}>
              {item.icon}
            </span>
            <span className="text-sm font-semibold tracking-wide">{item.name}</span>
          </button>
        ))}
      </nav>

      {/* Bottom Profile/Status (Optional placeholder if needed) */}
      <div className="p-6 border-t border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/20">
            {user?.first_name?.[0]}{user?.last_name?.[0]}
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="text-sm font-bold text-white truncate">{user?.first_name} {user?.last_name}</span>
            <span className="text-[10px] text-slate-500 uppercase font-black tracking-tighter">{user?.role}</span>
          </div>
        </div>
      </div>

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
