import React, { useState } from 'react'
import Header from './Header'
import Sidebar from './Sidebar'
import useUser from '../../hooks/useUser'

const Layout = ({ children, activeSection, onSectionClick, searchTerm, onSearchChange, onActionClick }) => {
  const { user: currentUser } = useUser()

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950">
      <Sidebar
        activeSection={activeSection}
        onSectionClick={onSectionClick}
        currentUser={currentUser}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          activeSection={activeSection}
          onActionClick={onActionClick}
          currentUser={currentUser}
          searchTerm={searchTerm}
          onSearchChange={onSearchChange}
          onSectionClick={onSectionClick}
        />
        <main className="flex-1 overflow-auto p-8 animate-premium-fade">
          {['dashboard', 'tests', 'settings', 'inventory'].includes(activeSection) && (
            <div className="flex flex-col gap-1 mb-10">
              <span className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.3em] mb-1">
                {activeSection === 'dashboard' ? 'Overview' : activeSection}
              </span>
              <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {activeSection === 'dashboard' && 'Welcome back'}
                {activeSection === 'tests' && 'Clinical Tests'}
                {activeSection === 'settings' && 'System Settings'}
                {activeSection === 'inventory' && 'Medical Inventory'}
              </h1>
              <p className="text-sm text-slate-500 font-medium">
                Manage your clinic operations with precision and ease.
              </p>
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  )
}

export default Layout