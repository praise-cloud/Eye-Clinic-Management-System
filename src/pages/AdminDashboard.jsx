import React, { useState } from 'react';
import { UsersIcon, ChartIcon, DocumentIcon, InventoryIcon, AdminIcon } from '../components/Icons';
import Layout from '../components/layout/Layout';
import useUser from '../hooks/useUser';
import { useTheme } from '../context/ThemeContext';
import { useSystemConfig } from '../context/SystemConfigContext';

const AdminDashboard = () => {
  const { user, logout } = useUser();
  const { isDark, toggleTheme } = useTheme();
  const { config, toggleConfig, updateMultipleConfig } = useSystemConfig();
  const [activeTab, setActiveTab] = useState('overview');
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configForm, setConfigForm] = useState({});
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [users, setUsers] = useState([
    { id: 1, name: 'Dr. Sarah Johnson', role: 'doctor', email: 'sarah@clinic.com', status: 'active', created: '2024-01-15' },
    { id: 2, name: 'Mike Assistant', role: 'assistant', email: 'mike@clinic.com', status: 'active', created: '2024-01-14' },
    { id: 3, name: 'Lisa Admin', role: 'admin', email: 'lisa@clinic.com', status: 'inactive', created: '2024-01-13' }
  ]);
  const [editingUser, setEditingUser] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', role: 'doctor' });

  const handleSectionClick = (section) => {
    if (section === 'system-settings') {
      setActiveTab('settings');
    } else {
      setActiveTab(section);
    }
  };

  const stats = {
    totalUsers: users.length,
    totalPatients: 156,
    totalTests: 89,
    totalInventory: 45,
    todayAppointments: 8,
    pendingTests: 12
  };

  const handleAddUser = () => {
    const newUser = {
      id: users.length + 1,
      ...formData,
      created: new Date().toISOString().split('T')[0],
      status: 'active'
    };
    setUsers([...users, newUser]);
    setShowUserModal(false);
    setFormData({ name: '', email: '', role: 'doctor' });
    
    const newLog = {
      id: systemLogs.length + 1,
      action: 'User Created',
      user: user?.name || 'Admin',
      timestamp: new Date().toLocaleString(),
      status: 'success'
    };
    setSystemLogs(prev => [newLog, ...prev].slice(0, 10));
  };

  const handleEditUser = () => {
    setUsers(users.map(u => u.id === editingUser.id ? { ...u, ...formData } : u));
    setEditingUser(null);
    setShowUserModal(false);
    setFormData({ name: '', email: '', role: 'doctor' });
  };

  const handleDeleteUser = (userId) => {
    const deletedUser = users.find(u => u.id === userId);
    setUsers(users.filter(u => u.id !== userId));
    setShowDeleteModal(null);
    
    const newLog = {
      id: systemLogs.length + 1,
      action: 'User Deleted',
      user: user?.name || 'Admin',
      timestamp: new Date().toLocaleString(),
      status: 'success'
    };
    setSystemLogs(prev => [newLog, ...prev].slice(0, 10));
  };

  const handleToggleStatus = (userId) => {
    setUsers(users.map(u => 
      u.id === userId ? { ...u, status: u.status === 'active' ? 'inactive' : 'active' } : u
    ));
  };

  const [systemLogs, setSystemLogs] = useState([
    { id: 1, action: 'User Login', user: 'Dr. Sarah Johnson', timestamp: '2024-01-15 09:30', status: 'success' },
    { id: 2, action: 'Patient Added', user: 'Mike Assistant', timestamp: '2024-01-15 09:15', status: 'success' },
    { id: 3, action: 'Test Uploaded', user: 'Dr. Sarah Johnson', timestamp: '2024-01-15 08:45', status: 'success' },
    { id: 4, action: 'Login Failed', user: 'Unknown', timestamp: '2024-01-15 08:30', status: 'error' }
  ]);

  // Track user logins
  React.useEffect(() => {
    const handleUserLogin = (event) => {
      const { userName, timestamp, status } = event.detail;
      const newLog = {
        id: systemLogs.length + 1,
        action: 'User Login',
        user: userName,
        timestamp: timestamp || new Date().toLocaleString(),
        status: status || 'success'
      };
      setSystemLogs(prev => [newLog, ...prev].slice(0, 10));
    };

    window.addEventListener('userLogin', handleUserLogin);
    return () => window.removeEventListener('userLogin', handleUserLogin);
  }, [systemLogs.length]);



  const StatCard = ({ title, value, icon, color = 'blue' }) => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border-l-4 border-blue-500">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{value}</p>
        </div>
        <div className={`p-3 rounded-full bg-${color}-100`}>
          {icon}
        </div>
      </div>
    </div>
  );

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard title="Total Users" value={stats.totalUsers} icon={<UsersIcon className="w-6 h-6 text-blue-600" />} />
        <StatCard title="Total Patients" value={stats.totalPatients} icon={<UsersIcon className="w-6 h-6 text-green-600" />} />
        <StatCard title="Total Tests" value={stats.totalTests} icon={<DocumentIcon className="w-6 h-6 text-purple-600" />} />
        <StatCard title="Inventory Items" value={stats.totalInventory} icon={<InventoryIcon className="w-6 h-6 text-orange-600" />} />
        <StatCard title="Today's Appointments" value={stats.todayAppointments} icon={<ChartIcon className="w-6 h-6 text-red-600" />} />
        <StatCard title="Pending Tests" value={stats.pendingTests} icon={<DocumentIcon className="w-6 h-6 text-yellow-600" />} />
      </div>

      {/* Recent Activity */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent System Activity</h3>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {systemLogs.map((log) => (
              <div key={log.id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
                <div className="flex items-center space-x-3">
                  <div className={`w-2 h-2 rounded-full ${log.status === 'success' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{log.action}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">by {log.user}</p>
                  </div>
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">{log.timestamp}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderUserManagement = () => {
    const filteredUsers = users.filter(u =>
      userSearchTerm === '' ||
      u.name.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      u.role.toLowerCase().includes(userSearchTerm.toLowerCase())
    );
    
    return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">User Management</h3>
          <button 
            onClick={() => {
              setEditingUser(null);
              setFormData({ name: '', email: '', role: 'doctor' });
              setShowUserModal(true);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Add New User
          </button>
        </div>
        <input
          type="text"
          value={userSearchTerm}
          onChange={(e) => setUserSearchTerm(e.target.value)}
          placeholder="Search by name, email, or role..."
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Created</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {filteredUsers.length > 0 ? filteredUsers.map((user) => (
              <tr key={user.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{user.name}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 capitalize">
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{user.email}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    user.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {user.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{user.created}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => {
                        setEditingUser(user);
                        setFormData({ name: user.name, email: user.email, role: user.role });
                        setShowUserModal(true);
                      }}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      Edit
                    </button>
                    <button 
                      onClick={() => handleToggleStatus(user.id)}
                      className="text-yellow-600 hover:text-yellow-900"
                    >
                      {user.status === 'active' ? 'Deactivate' : 'Activate'}
                    </button>
                    <button 
                      onClick={() => setShowDeleteModal(user)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan="6" className="px-6 py-8 text-center text-gray-400 dark:text-gray-500">
                  {userSearchTerm ? 'No matching users found' : 'No users available'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
    );
  };

  const renderSystemSettings = () => (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Appearance</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Dark Mode</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Switch between light and dark theme</p>
            </div>
            <button
              onClick={toggleTheme}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                isDark ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isDark ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">System Configuration</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Automatic Backups</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Daily system backups at 2:00 AM</p>
            </div>
            <button
              onClick={() => toggleConfig('autoBackups')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                config.autoBackups ? 'bg-green-600' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  config.autoBackups ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Email Notifications</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Send notifications for important events</p>
            </div>
            <button
              onClick={() => toggleConfig('emailNotifications')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                config.emailNotifications ? 'bg-green-600' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  config.emailNotifications ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Two-Factor Authentication</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Require 2FA for all admin accounts</p>
            </div>
            <button
              onClick={() => toggleConfig('twoFactorAuth')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                config.twoFactorAuth ? 'bg-green-600' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  config.twoFactorAuth ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Clinic Information</h3>
        <button
          onClick={() => {
            setConfigForm({
              clinicName: config.clinicName,
              clinicEmail: config.clinicEmail,
              clinicPhone: config.clinicPhone,
              clinicAddress: config.clinicAddress,
              appointmentDuration: config.appointmentDuration,
              workingHoursStart: config.workingHoursStart,
              workingHoursEnd: config.workingHoursEnd
            });
            setShowConfigModal(true);
          }}
          className="w-full p-4 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-left"
        >
          <p className="font-medium text-gray-900 dark:text-white">Configure Clinic Settings</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Update clinic information and working hours</p>
        </button>
      </div>
    </div>
  );

  return (
    <Layout
      activeSection={activeTab}
      onSectionClick={handleSectionClick}
      searchTerm=""
      onSearchChange={() => {}}
      onActionClick={() => {}}
    >
      <div>
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'users' && renderUserManagement()}
        {activeTab === 'settings' && renderSystemSettings()}
      </div>

      {/* User Modal */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4 dark:text-white">{editingUser ? 'Edit User' : 'Add New User'}</h3>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
              />
              <input
                type="email"
                placeholder="Email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
              />
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
              >
                <option value="doctor">Doctor</option>
                <option value="assistant">Assistant</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <button
                onClick={() => {
                  setShowUserModal(false);
                  setEditingUser(null);
                  setFormData({ name: '', email: '', role: 'doctor' });
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-white"
              >
                Cancel
              </button>
              <button
                onClick={editingUser ? handleEditUser : handleAddUser}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                {editingUser ? 'Update' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4 dark:text-white">Delete User</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">Are you sure you want to delete {showDeleteModal.name}?</p>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowDeleteModal(null)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteUser(showDeleteModal.id)}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Config Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4 dark:text-white">Clinic Configuration</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Clinic Name</label>
                <input
                  type="text"
                  value={configForm.clinicName}
                  onChange={(e) => setConfigForm({ ...configForm, clinicName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                <input
                  type="email"
                  value={configForm.clinicEmail}
                  onChange={(e) => setConfigForm({ ...configForm, clinicEmail: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
                <input
                  type="tel"
                  value={configForm.clinicPhone}
                  onChange={(e) => setConfigForm({ ...configForm, clinicPhone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address</label>
                <textarea
                  value={configForm.clinicAddress}
                  onChange={(e) => setConfigForm({ ...configForm, clinicAddress: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                  rows="3"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Working Hours Start</label>
                  <input
                    type="time"
                    value={configForm.workingHoursStart}
                    onChange={(e) => setConfigForm({ ...configForm, workingHoursStart: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Working Hours End</label>
                  <input
                    type="time"
                    value={configForm.workingHoursEnd}
                    onChange={(e) => setConfigForm({ ...configForm, workingHoursEnd: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Appointment Duration (minutes)</label>
                <input
                  type="number"
                  value={configForm.appointmentDuration}
                  onChange={(e) => setConfigForm({ ...configForm, appointmentDuration: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <button
                onClick={() => setShowConfigModal(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  updateMultipleConfig(configForm);
                  setShowConfigModal(false);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default AdminDashboard;