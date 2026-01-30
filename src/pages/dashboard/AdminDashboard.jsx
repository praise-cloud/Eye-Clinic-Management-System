import React, { useState } from 'react';
import { UsersIcon, ChartIcon, DocumentIcon, InventoryIcon, AdminIcon } from '../../components/Icons';
import Layout from '../../components/layout/Layout';
import useUser from '../../hooks/useUser';
import { useTheme } from '../../context/ThemeContext';
import { useSystemConfig } from '../../context/SystemConfigContext';

const AdminDashboard = () => {
  const { user, logout } = useUser();
  const { isDark, toggleTheme } = useTheme();
  const { config, toggleConfig, updateMultipleConfig } = useSystemConfig();
  const [activeTab, setActiveTab] = useState('overview');
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configForm, setConfigForm] = useState({});
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [users, setUsers] = useState([]);
  const [editingUser, setEditingUser] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [formData, setFormData] = useState({ firstName: '', lastName: '', email: '', password: '', role: 'doctor' });
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalPatients: 0,
    totalTests: 0,
    totalInventory: 0,
    todayAppointments: 0,
    pendingTests: 0
  });
  const [systemLogs, setSystemLogs] = useState([]);
  const [networkDbPath, setNetworkDbPath] = useState('');
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminMessage, setAdminMessage] = useState(null);

  const handleSectionClick = (section) => {
    if (section === 'system-settings') {
      setActiveTab('settings');
    } else {
      setActiveTab(section);
    }
  };

  const loadStats = async () => {
    if (!window.electronAPI || !window.electronAPI.getActivityStatistics) return;
    try {
      const res = await window.electronAPI.getActivityStatistics();
      if (res?.success && res.stats) {
        setStats((prev) => ({ ...prev, ...res.stats, totalUsers: users.length || res.stats.totalUsers }));
      }
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
    }
  };

  const loadActivityLogs = async () => {
    if (!window.electronAPI || !window.electronAPI.getActivityLogs) return;
    try {
      const res = await window.electronAPI.getActivityLogs({});
      if (res?.success && Array.isArray(res.logs)) {
        const mapped = res.logs.slice(0, 10).map((log) => {
          const name =
            (log.first_name || log.last_name)
              ? `${log.first_name || ''} ${log.last_name || ''}`.trim()
              : '';
          return {
            id: log.id,
            action: log.description || `${log.action_type} ${log.entity_type}`,
            user: name || log.email || 'Unknown',
            timestamp: log.timestamp ? new Date(log.timestamp).toLocaleString() : '',
            status: log.action_type === 'error' ? 'error' : 'success'
          };
        });
        setSystemLogs(mapped);
      }
    } catch (error) {
      console.error('Error loading activity logs:', error);
    }
  };

  const handleAddUser = async () => {
    if (!window.electronAPI) return;
    try {
      const res = await window.electronAPI.createUserAdmin({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password,
        role: formData.role
      }, user?.id);
      console.log('Create user response:', res);
      if (res.success) {
        alert('User created successfully!');
        setShowUserModal(false);
        setFormData({ firstName: '', lastName: '', email: '', password: '', role: 'doctor' });
        fetchUsers();
        loadStats();
        loadActivityLogs();
      } else {
        alert(res.error || res.message || 'Failed to add user.');
      }
    } catch (error) {
      console.error('Error adding user:', error);
      alert('Error adding user: ' + error.message);
    }
  };

  const handleEditUser = async () => {
    if (!window.electronAPI || !editingUser) return;
    try {
      const res = await window.electronAPI.updateUser(
        editingUser.id,
        {
          first_name: formData.firstName,
          last_name: formData.lastName,
          email: formData.email,
          role: formData.role,
          password: formData.password || undefined // Only update if provided
        },
        user?.id // Admin user performing the update
      );
      if (res.success) {
        setShowUserModal(false);
        setEditingUser(null);
        setFormData({ firstName: '', lastName: '', email: '', password: '', role: 'doctor' });
        fetchUsers(); // Re-fetch users to include the updated user
        loadStats();
        loadActivityLogs();
      } else {
        alert(res.message || 'Failed to update user.');
      }
    } catch (error) {
      console.error('Error updating user:', error);
      alert('Error updating user: ' + error.message);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.electronAPI) return;
    try {
      const res = await window.electronAPI.deleteUser(userId, user?.id);
      if (res.success) {
        setUsers(users.filter(u => u.id !== userId));
        setShowDeleteModal(null);
        loadStats();
        loadActivityLogs();
      } else {
        alert(res.message || 'Failed to delete user.');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Error deleting user: ' + error.message);
    }
  };

  const handleToggleStatus = async (userId) => {
    if (!window.electronAPI) return;
    try {
      const userToToggle = users.find(u => u.id === userId);
      if (!userToToggle) return;

      const newStatus = userToToggle.status === 'active' ? false : true;
      const res = await window.electronAPI.updateUserStatus(userId, newStatus, user?.id);
      if (res.success) {
        fetchUsers(); // Re-fetch users to reflect the status change
        loadStats();
        loadActivityLogs();
      } else {
        alert(res.message || 'Failed to update user status.');
      }
    } catch (error) {
      console.error('Error toggling user status:', error);
      alert('Error toggling user status: ' + error.message);
    }
  };

  // Fetch users from backend
  const fetchUsers = async () => {
    if (!window.electronAPI) return;
    try {
      const res = await window.electronAPI.getAllUsersDetailed();
      if (res.success) {
        // Map backend user fields to frontend display fields
        setUsers(res.users.map(u => ({
          id: u.id,
          name: `${u.first_name} ${u.last_name}`,
          email: u.email,
          role: u.role,
          status: u.status,
          created: new Date(u.created_at).toLocaleDateString(),
          first_name: u.first_name, // Keep for editing
          last_name: u.last_name, // Keep for editing
          phone_number: u.phone_number, // Keep for editing
          gender: u.gender // Keep for editing
        })));
      } else {
        console.error('Failed to fetch users:', res.error);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  // Initial fetch and real-time listener for users
  React.useEffect(() => {
    fetchUsers();
    loadStats();
    loadActivityLogs();

    if (window.electronAPI) {
      const unsubscribe = window.electronAPI.onIpcEvent('data:update', (payload) => {
        if (payload.table === 'users') {
          console.log('Realtime user update received:', payload);
          fetchUsers(); // Re-fetch users to reflect changes
        }
      });
      return unsubscribe;
    }
  }, []);

  React.useEffect(() => {
    const loadDbPath = async () => {
      try {
        if (!window.electronAPI?.getNetworkDbPath) return;
        const res = await window.electronAPI.getNetworkDbPath();
        if (res?.success && res.path) setNetworkDbPath(res.path);
      } catch {}
    };
    loadDbPath();
  }, []);

  const handleAdminImportDb = async () => {
    try {
      if (!window.electronAPI?.selectFile || !window.electronAPI?.importDb) return;
      setAdminLoading(true);
      const result = await window.electronAPI.selectFile({
        title: 'Choose database or data file',
        filters: [{ name: 'Data Files', extensions: ['db', 'sqlite', 'csv', 'json'] }]
      });
      const chosen = result?.filePath || result?.path || result?.file || null;
      if (!chosen) {
        setAdminLoading(false);
        return;
      }
      const res = await window.electronAPI.importDb(chosen);
      if (res?.success) {
        if (res.mode === 'switch') {
          setNetworkDbPath(res.path);
          setAdminMessage('Now using selected database via LAN. Restart app on all computers.');
        } else {
          const counts = res.imported || {};
          setAdminMessage(`Imported: users ${counts.users || 0}, patients ${counts.patients || 0}, tests ${counts.tests || 0}, inventory ${counts.inventory || 0}, chat ${counts.chat || 0}`);
        }
      } else {
        setAdminMessage(res?.error || 'Import failed');
      }
    } catch (err) {
      console.error('Admin import error:', err);
      setAdminMessage('Failed to import database');
    } finally {
      setAdminLoading(false);
      setTimeout(() => setAdminMessage(null), 5000);
    }
  };

  const handleAdminSaveNetworkPath = async () => {
    try {
      if (!window.electronAPI?.setNetworkDbPath) return;
      setAdminLoading(true);
      const res = await window.electronAPI.setNetworkDbPath(networkDbPath || '');
      if (res?.success) {
        setAdminMessage('Network database path saved. Restart app on all computers.');
      } else {
        setAdminMessage(res?.error || 'Failed to save network path');
      }
    } catch (err) {
      console.error('Admin save network path error:', err);
      setAdminMessage('Failed to save network path');
    } finally {
      setAdminLoading(false);
      setTimeout(() => setAdminMessage(null), 5000);
    }
  };

  const handleAdminDeleteDb = async () => {
    try {
      if (!window.electronAPI?.deleteDb) return;
      setAdminLoading(true);
      const res = await window.electronAPI.deleteDb();
      if (res?.success) {
        setAdminMessage('Database deleted. Restart the app to recreate a fresh database.');
      } else {
        setAdminMessage(res?.error || 'Failed to delete database');
      }
    } catch (err) {
      console.error('Admin delete database error:', err);
      setAdminMessage('Failed to delete database');
    } finally {
      setAdminLoading(false);
      setTimeout(() => setAdminMessage(null), 5000);
    }
  };

  const handleAdminUpdateDb = async () => {
    try {
      if (!window.electronAPI?.updateDb) return;
      setAdminLoading(true);
      const res = await window.electronAPI.updateDb({});
      if (res?.success) {
        setAdminMessage('Database updated and optimized.');
      } else {
        setAdminMessage(res?.error || 'Failed to update database');
      }
    } catch (err) {
      console.error('Admin update database error:', err);
      setAdminMessage('Failed to update database');
    } finally {
      setAdminLoading(false);
      setTimeout(() => setAdminMessage(null), 5000);
    }
  };



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
                        setFormData({
                          firstName: user.first_name,
                          lastName: user.last_name,
                          email: user.email,
                          role: user.role,
                          password: '' // Password should not be pre-filled for security
                        });
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

        </div>
      </div>

      {String(user?.role || '').toLowerCase() === 'admin' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Database Administration</h3>
          {adminMessage && (
            <div className="mb-4 p-3 rounded bg-blue-50 dark:bg-gray-900 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-gray-700">
              {adminMessage}
            </div>
          )}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Shared database path (UNC or mapped drive)</label>
              <input
                type="text"
                value={networkDbPath}
                onChange={(e) => setNetworkDbPath(e.target.value)}
                placeholder="e.g. \\ClinicServer\\EyeClinic\\data\\eye_clinic.db"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleAdminImportDb}
                disabled={adminLoading}
                className="px-4 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-white"
              >
                {adminLoading ? 'Working...' : 'Import Local Database'}
              </button>
              <button
                onClick={handleAdminSaveNetworkPath}
                disabled={adminLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Save Network Path
              </button>
              <button
                onClick={handleAdminDeleteDb}
                disabled={adminLoading}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Delete Current Database
              </button>
              <button
                onClick={handleAdminUpdateDb}
                disabled={adminLoading}
                className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700"
              >
                Update Database
              </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              After saving, restart the app on all computers so they use the same DB via the router.
            </p>
          </div>
        </div>
      )}
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
                placeholder="First Name"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
              />
              <input
                type="text"
                placeholder="Last Name"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
              />
              <input
                type="email"
                placeholder="Email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
              />
              <input
                type="password"
                placeholder="Password (leave blank to keep current)"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
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
