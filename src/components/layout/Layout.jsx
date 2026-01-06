import React, { useState } from 'react'
import Header from './Header'
import Sidebar from './Sidebar'
import useUser from '../../hooks/useUser'

const Layout = ({ children, activeSection, onSectionClick, searchTerm, onSearchChange, onActionClick }) => {
  const { user: currentUser } = useUser()

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
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
        <main className="flex-1 overflow-auto p-6">
          {['dashboard', 'tests', 'settings', 'inventory'].includes(activeSection) && (
            <div className="flex flex-col gap-2 mb-2">
              <span className="text-2xl font-medium text-gray-900 dark:text-white">
                {activeSection === 'dashboard' && 'Good day'}
                {activeSection === 'tests' && 'Tests'}
                {activeSection === 'settings' && 'Settings'}
                {activeSection === 'inventory' && 'Inventory'}
              </span>
              {activeSection === 'dashboard' ? (
                <span className="text-sm text-gray-400">{currentUser?.name || 'John Doe'}</span>
              ) : (
                currentUser?.name ? <span className="text-sm text-gray-400">{currentUser.name}</span> : null
              )}
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  )
}

export default Layout