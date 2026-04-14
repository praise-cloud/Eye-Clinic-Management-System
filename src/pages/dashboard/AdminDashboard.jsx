import React, { useState } from 'react';
import { UsersIcon, ChartIcon, DocumentIcon, InventoryIcon, AdminIcon, GearIcon } from '../../components/Icons';
import Layout from '../../components/layout/Layout';
import useUser from '../../hooks/useUser';
import { useTheme } from '../../context/ThemeContext';
import { useSystemConfig } from '../../context/SystemConfigContext';
import * as patientService from '../../services/patientService';
import * as inventoryService from '../../services/inventoryService';
import * as testService from '../../services/testService';
import * as revenueService from '../../services/revenueService';
import DynamicTableView from '../../components/DynamicTableView';
import MessagesContent from '../../components/content/MessagesContent';

const AdminDashboard = () => {
  const { user, logout } = useUser();
  const { isDark, toggleTheme } = useTheme();
  const { config, toggleConfig, updateMultipleConfig } = useSystemConfig();
  const [activeTab, setActiveTab] = useState('overview');
  const [revenueLog, setRevenueLog] = useState([]);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configForm, setConfigForm] = useState({});
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [users, setUsers] = useState([]);
  const [editingUser, setEditingUser] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [formData, setFormData] = useState({ firstName: '', lastName: '', email: '', password: '', role: 'doctor', phoneNumber: '', gender: '' });
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalPatients: 0,
    totalTests: 0,
    totalInventory: 0,
    todayAppointments: 0,
    pendingTests: 0,
    todayRevenue: 0,
    todayTransactionCount: 0,
    monthlyRevenue: 0,
    totalRevenue: 0
  });
  const [systemLogs, setSystemLogs] = useState([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminMessage, setAdminMessage] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [activityFilter, setActivityFilter] = useState('24h');
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [caseStudies, setCaseStudies] = useState([]);
  const [caseStudiesTotal, setCaseStudiesTotal] = useState(0);
  const [caseStudiesDoctors, setCaseStudiesDoctors] = useState([]);
  const [caseFilterDoctor, setCaseFilterDoctor] = useState('all');
  const [caseFilterSearch, setCaseFilterSearch] = useState('');
  const [caseStudiesOffset, setCaseStudiesOffset] = useState(0);
  const caseStudiesLimit = 20;

  const handleSectionClick = (section) => {
    if (section === 'system-settings') {
      setActiveTab('settings');
    } else if (section === 'revenue-analysis') {
      setActiveTab('finance');
    } else if (section === 'doctor-case-studies') {
      setActiveTab('case-studies');
    } else {
      setActiveTab(section);
    }
  };

  const loadStats = async () => {
    try {
      if (!window.electronAPI) return;

      const [patients, inventory, tests, activityStats] = await Promise.all([
        patientService.getAllPatients().catch(() => []),
        inventoryService.getInventoryItems().catch(() => []),
        testService.getAllTests().catch(() => []),
        window.electronAPI.getActivityStatistics().catch(() => ({ success: false }))
      ]);

      const pendingTestsCount = tests.filter(t => t.result === 'Pending' || !t.result).length;

      if (activityStats.success && activityStats.stats) {
        setStats({
          ...activityStats.stats,
          totalPatients: patients.length,
          totalTests: tests.length,
          totalInventory: inventory.length,
          pendingTests: pendingTestsCount
        });
      } else {
        // Fallback to manual counts if backend stats fail
        setStats(prev => ({
          ...prev,
          totalUsers: users.length,
          totalPatients: patients.length,
          totalTests: tests.length,
          totalInventory: inventory.length,
          pendingTests: pendingTestsCount
        }));
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
        const mapped = res.logs.slice(0, 50).map((log) => {
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

  const loadRevenueLogs = async () => {
    try {
      const logs = await revenueService.getRevenueLogs({});
      if (Array.isArray(logs)) {
        setRevenueLog(logs);
      }
    } catch (error) {
      console.error('Error loading revenue logs:', error);
    }
  };

  const loadRevenueStats = async () => {
    try {
      const revenueStats = await revenueService.getRevenueStats();
      if (revenueStats) {
        setStats(prev => ({
          ...prev,
          todayRevenue: revenueStats.todayRevenue || 0,
          monthlyRevenue: revenueStats.monthlyRevenue || 0,
          totalRevenue: revenueStats.totalRevenue || 0,
          todayTransactionCount: revenueStats.todayTransactionCount || 0
        }));
      }
    } catch (error) {
      console.error('Error loading revenue stats:', error);
    }
  };

  const loadOnlineUsers = async () => {
    if (!window.electronAPI) return;
    try {
      const res = await window.electronAPI.getOnlineUsersDetailed();
      if (res?.success) {
        setOnlineUsers(res.users || []);
      }
    } catch (error) {
      console.error('Error loading online users:', error);
    }
  };

  const loadFilteredActivityLogs = async (timeRange = '24h') => {
    if (!window.electronAPI) return;
    try {
      const res = await window.electronAPI.getActivityLogsFiltered({ timeRange, limit: 100 });
      if (res?.success && Array.isArray(res.logs)) {
        setFilteredLogs(res.logs);
      }
    } catch (error) {
      console.error('Error loading filtered activity logs:', error);
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
          phone_number: formData.phoneNumber,
          gender: formData.gender,
          password: formData.password || undefined // Only update if provided
        },
        user?.id // Admin user performing the update
      );
      if (res.success) {
        setShowUserModal(false);
        setEditingUser(null);
        setFormData({ firstName: '', lastName: '', email: '', password: '', role: 'doctor', phoneNumber: '', gender: '' });
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
    loadRevenueLogs();
    loadRevenueStats();
    loadOnlineUsers();
    loadFilteredActivityLogs(activityFilter);

    if (window.electronAPI) {
      const unsubscribe = window.electronAPI.onIpcEvent('data:update', (payload) => {
        fetchUsers();
        loadStats();
        loadActivityLogs();
        loadRevenueLogs();
        loadRevenueStats();
        loadOnlineUsers();
      });
      return unsubscribe;
    }
  }, []);

  // Reload online users periodically
  React.useEffect(() => {
    const interval = setInterval(() => {
      loadOnlineUsers();
      loadFilteredActivityLogs(activityFilter);
    }, 10000);
    return () => clearInterval(interval);
  }, [activityFilter]);

  React.useEffect(() => {
    const loadDbPath = async () => {
      try {
        if (!window.electronAPI?.getNetworkDbPath) return;
        const res = await window.electronAPI.getNetworkDbPath();
        if (res?.success && res.path) setNetworkDbPath(res.path);
      } catch { }
    };
    loadDbPath();
  }, []);

  const handleResetPassword = async (targetUser) => {
    if (!window.electronAPI || !targetUser) return;
    const newPassword = window.prompt(`Set a new password for ${targetUser.name}:`);
    if (!newPassword) return;
    const confirm = window.prompt('Confirm new password:');
    if (confirm !== newPassword) {
      alert('Passwords do not match.');
      return;
    }
    if (newPassword.length < 6) {
      alert('Password must be at least 6 characters.');
      return;
    }
    try {
      const res = await window.electronAPI.updateUser(
        targetUser.id,
        { password: newPassword },
        user?.id
      );
      if (res?.success) {
        alert('Password reset successfully.');
        loadActivityLogs();
      } else {
        alert(res?.message || res?.error || 'Password reset failed.');
      }
    } catch (error) {
      alert('Password reset failed: ' + error.message);
    }
  };

  const handleClearDatabase = async () => {
    const confirm = window.confirm('WARNING: This will permanently delete ALL data in the database including users, patients, tests, inventory, and all records. This action cannot be undone.\n\nAre you absolutely sure you want to continue?');
    if (!confirm) return;
    
    const doubleConfirm = window.prompt('Type "DELETE" to confirm database wipe:');
    if (doubleConfirm !== 'DELETE') {
      setAdminMessage('Database clear cancelled.');
      return;
    }
    
    try {
      setAdminLoading(true);
      setAdminMessage('Clearing database...');
      
      if (window.electronAPI?.deleteDatabase) {
        const result = await window.electronAPI.deleteDatabase();
        if (result?.success) {
          setAdminMessage('Database cleared successfully. Restarting application...');
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        } else {
          setAdminMessage('Failed to clear database: ' + (result?.error || 'Unknown error'));
        }
      } else {
        setAdminMessage('Database clear functionality not available.');
      }
    } catch (error) {
      console.error('Error clearing database:', error);
      setAdminMessage('Error clearing database: ' + error.message);
    } finally {
      setAdminLoading(false);
    }
  };

  React.useEffect(() => {
    if (activeTab === 'settings') {
      loadOnlineUsers();
      loadFilteredActivityLogs('24h');
    }
  }, [activeTab]);

  const loadDoctorCaseStudies = async ({ doctor = caseFilterDoctor, search = caseFilterSearch, offset = caseStudiesOffset } = {}) => {
    try {
      if (!window.electronAPI?.getDoctorCaseStudies) return;
      const res = await window.electronAPI.getDoctorCaseStudies({
        doctor,
        search,
        limit: caseStudiesLimit,
        offset
      });
      if (!res?.success) return;
      setCaseStudies(res.data || []);
      setCaseStudiesTotal(Number(res.total || 0));
      setCaseStudiesDoctors(Array.isArray(res.doctors) ? res.doctors : []);
    } catch (err) {
      console.error('Failed to load doctor case studies:', err);
    }
  };

  React.useEffect(() => {
    if (activeTab === 'case-studies') {
      loadDoctorCaseStudies();
    }
  }, [activeTab]);

  const handleToggleConfig = async (configKey) => {
    if (toggleConfig) {
      toggleConfig(configKey);
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Users" value={stats.totalUsers} icon={<UsersIcon className="w-6 h-6 text-blue-600" />} />
        <StatCard title="Total Patients" value={stats.totalPatients} icon={<UsersIcon className="w-6 h-6 text-green-600" />} />
        <StatCard title="Total Results" value={stats.totalTests} icon={<DocumentIcon className="w-6 h-6 text-purple-600" />} />
        <StatCard title="Inventory Items" value={stats.totalInventory} icon={<InventoryIcon className="w-6 h-6 text-orange-600" />} />
        <StatCard title="Today's Results" value={stats.todayAppointments} icon={<ChartIcon className="w-6 h-6 text-red-600" />} />
      </div>

      {/* Online Users Panel */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Online Users</h3>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {onlineUsers.filter(u => u.is_online).length} of {users.length} online
            </span>
            <button
              onClick={() => { loadOnlineUsers(); }}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              Refresh
            </button>
          </div>
        </div>
        <div className="p-6">
          {onlineUsers.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-sm">No users online</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {onlineUsers.map((u) => (
                <div key={u.user_id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
                      {u.name ? u.name.charAt(0).toUpperCase() : '?'}
                    </div>
                    <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                      u.is_online ? 'bg-green-500' : 'bg-gray-400'
                    }`}></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{u.name || 'Unknown'}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{u.role || 'user'}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                      {u.device_name ? `on ${u.device_name}` : (u.is_current_device ? 'This computer' : 'Unknown device')}
                    </p>
                  </div>
                  <div className={`px-2 py-1 text-xs rounded-full ${
                    u.is_online 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' 
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-600 dark:text-gray-300'
                  }`}>
                    {u.is_online ? 'Online' : (u.is_stale ? 'Away' : 'Offline')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Activity Log with Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center flex-wrap gap-3">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">System Activity</h3>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-500 dark:text-gray-400">Filter:</label>
            <select
              value={activityFilter}
              onChange={(e) => {
                setActivityFilter(e.target.value);
                loadFilteredActivityLogs(e.target.value);
              }}
              className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="5m">Last 5 minutes</option>
              <option value="1h">Last hour</option>
              <option value="24h">Last 24 hours</option>
              <option value="7d">Last 7 days</option>
              <option value="all">All time</option>
            </select>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              ({filteredLogs.length} activities)
            </span>
          </div>
        </div>
        <div className="p-6 max-h-96 overflow-y-auto">
          {filteredLogs.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-4">No activities in this time period</p>
          ) : (
            <div className="space-y-3">
              {filteredLogs.map((log) => (
                <div key={log.id} className="flex items-start gap-3 py-2 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
                  <div className={`w-2 h-2 mt-2 rounded-full flex-shrink-0 ${
                    log.action_type === 'error' ? 'bg-red-500' : 
                    log.action_type === 'create' ? 'bg-green-500' :
                    log.action_type === 'update' ? 'bg-blue-500' :
                    log.action_type === 'delete' ? 'bg-red-500' :
                    'bg-gray-400'
                  }`}></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{log.description}</p>
                      <span className={`px-1.5 py-0.5 text-xs rounded capitalize ${
                        log.action_type === 'error' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' :
                        log.action_type === 'create' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                        log.action_type === 'update' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' :
                        log.action_type === 'delete' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' :
                        'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                        {log.action_type}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 dark:text-gray-400">
                      <span>by {log.user_name || log.user_email || 'Unknown'}</span>
                      <span className="text-gray-300 dark:text-gray-600">|</span>
                      <span>{log.entity_type}</span>
                      {log.device_name && (
                        <>
                          <span className="text-gray-300 dark:text-gray-600">|</span>
                          <span className="text-blue-600 dark:text-blue-400">{log.device_name}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
                    {log.time_ago || new Date(log.timestamp).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
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
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${user.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
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
                            firstName: user.first_name || '',
                            lastName: user.last_name || '',
                            email: user.email || '',
                            role: user.role || 'doctor',
                            phoneNumber: user.phone_number || '',
                            gender: user.gender || '',
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
                      <button
                        onClick={() => handleResetPassword(user)}
                        className="text-purple-600 hover:text-purple-900"
                      >
                        Reset Password
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

  const renderFinancialOversight = () => (
    <div className="space-y-6">
      {/* Financial Overview Cards - Indigo/Purple Theme */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-700 rounded-2xl p-6 shadow-lg">
        <h3 className="text-sm font-bold text-indigo-100 uppercase tracking-wider mb-4">Financial Overview</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white/10 backdrop-blur rounded-xl p-4">
            <p className="text-xs text-indigo-100 mb-1">Today's Transactions</p>
            <p className="text-2xl font-black text-white">{stats.todayTransactionCount || 0}</p>
            <p className="text-xs text-indigo-200 mt-1">
              Revenue: ₦{(stats.todayRevenue || 0).toLocaleString()}
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-xl p-4">
            <p className="text-xs text-indigo-100 mb-1">This Month</p>
            <p className="text-2xl font-black text-white">
              ₦{(stats.monthlyRevenue || 0).toLocaleString()}
            </p>
            <p className="text-xs text-indigo-200 mt-1">Monthly revenue</p>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-xl p-4">
            <p className="text-xs text-indigo-100 mb-1">Total Revenue</p>
            <p className="text-2xl font-black text-white">
              ₦{(stats.totalRevenue || 0).toLocaleString()}
            </p>
            <p className="text-xs text-indigo-200 mt-1">All time</p>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-xl p-4">
            <p className="text-xs text-indigo-100 mb-1">Active Transactions</p>
            <p className="text-2xl font-black text-white">{revenueLog.length}</p>
            <p className="text-xs text-indigo-200 mt-1">In ledger</p>
          </div>
        </div>
      </div>

      <div className="card-premium overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Pharmacy Transaction Ledger</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-100 dark:bg-gray-700 font-bold text-[10px] uppercase tracking-widest text-gray-500">
              <tr>
                <th className="px-6 py-4 text-left">Timestamp</th>
                <th className="px-6 py-4 text-left">Entity</th>
                <th className="px-6 py-4 text-left">Description</th>
                <th className="px-6 py-4 text-left">Agent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {revenueLog.map(log => (
                <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4 text-xs font-medium text-gray-500">{new Date(log.timestamp).toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-[10px] font-bold uppercase">{log.entity_type}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{log.description}</td>
                  <td className="px-6 py-4 text-sm font-bold text-gray-900 dark:text-white">{log.first_name} {log.last_name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderDoctorCaseStudiesPage = () => {
    return (
      <div className="space-y-8 max-w-6xl mx-auto pb-10">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Doctor Case Studies</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
              Dedicated admin view for doctor notes and case progression per client.
            </p>
          </div>
          <button
            onClick={() => loadDoctorCaseStudies()}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold uppercase tracking-wider"
          >
            Refresh
          </button>
        </div>

        <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-800">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <select
              value={caseFilterDoctor}
              onChange={(e) => {
                setCaseFilterDoctor(e.target.value);
                setCaseStudiesOffset(0);
                loadDoctorCaseStudies({ doctor: e.target.value, search: caseFilterSearch, offset: 0 });
              }}
              className="px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm"
            >
              <option value="all">All Doctors</option>
              {caseStudiesDoctors.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            <input
              type="text"
              value={caseFilterSearch}
              onChange={(e) => setCaseFilterSearch(e.target.value)}
              placeholder="Search patient, diagnosis, doctor..."
              className="px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm"
            />
            <button
              onClick={() => {
                setCaseStudiesOffset(0);
                loadDoctorCaseStudies({ doctor: caseFilterDoctor, search: caseFilterSearch, offset: 0 });
              }}
              className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold uppercase tracking-wider"
            >
              Apply Filter
            </button>
          </div>

          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
            <table className="min-w-full text-xs">
              <thead className="bg-slate-100 dark:bg-slate-900">
                <tr>
                  <th className="px-3 py-2 text-left">Patient</th>
                  <th className="px-3 py-2 text-left">Doctor</th>
                  <th className="px-3 py-2 text-left">Diagnosis</th>
                  <th className="px-3 py-2 text-left">Treatment Date</th>
                  <th className="px-3 py-2 text-left">Next Visit</th>
                </tr>
              </thead>
              <tbody>
                {caseStudies.map((row, idx) => (
                  <tr key={idx} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="px-3 py-2">{row.patient_name || row.patient_id || '-'}</td>
                    <td className="px-3 py-2">{row.doctor_name || row.doctor_user_name || row.user_id || '-'}</td>
                    <td className="px-3 py-2 max-w-[360px] truncate">{row.diagnosis || '-'}</td>
                    <td className="px-3 py-2">{row.treatment_date || '-'}</td>
                    <td className="px-3 py-2">{row.next_visit_date || '-'}</td>
                  </tr>
                ))}
                {caseStudies.length === 0 && (
                  <tr>
                    <td colSpan="5" className="px-3 py-6 text-center text-slate-400">No case studies found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between mt-4">
            <p className="text-xs text-slate-500">
              Showing {caseStudies.length} of {caseStudiesTotal} cases
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const newOffset = Math.max(0, caseStudiesOffset - caseStudiesLimit);
                  setCaseStudiesOffset(newOffset);
                  loadDoctorCaseStudies({ offset: newOffset });
                }}
                disabled={caseStudiesOffset === 0}
                className="px-3 py-1 border border-slate-300 dark:border-slate-700 rounded text-xs disabled:opacity-40"
              >
                Previous
              </button>
              <button
                onClick={() => {
                  const newOffset = caseStudiesOffset + caseStudiesLimit;
                  setCaseStudiesOffset(newOffset);
                  loadDoctorCaseStudies({ offset: newOffset });
                }}
                disabled={caseStudiesOffset + caseStudiesLimit >= caseStudiesTotal}
                className="px-3 py-1 border border-slate-300 dark:border-slate-700 rounded text-xs disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderSystemSettings = () => (
    <div className="space-y-10 max-w-5xl mx-auto pb-10">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">System Configuration</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Manage clinical identity, network connectivity, and display preferences</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Clinical Profile Card */}
        <div className="card-premium overflow-hidden group">
          <div className="p-1 bg-gradient-to-r from-indigo-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl text-indigo-600 dark:text-indigo-400">
                <AdminIcon className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Clinical Profile</h3>
            </div>
            <div className="space-y-4 mb-8">
              <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-sm font-semibold text-slate-500">Clinic Name</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white">{config.clinicName}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-sm font-semibold text-slate-500">Primary Email</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white">{config.clinicEmail}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-sm font-semibold text-slate-500">Public Phone</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white">{config.clinicPhone}</span>
              </div>
            </div>
            <button
              onClick={() => {
                setConfigForm({ ...config });
                setShowConfigModal(true);
              }}
              className="w-full btn btn-primary py-3 text-xs font-black tracking-widest uppercase shadow-lg shadow-indigo-200 dark:shadow-none transition-all hover:scale-[1.02] active:scale-95"
            >
              Update Clinical Identity
            </button>
          </div>
        </div>

        {/* Display & Experience Card */}
        <div className="card-premium border-slate-200 dark:border-slate-800">
          <div className="p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-amber-50 dark:bg-amber-900/30 rounded-2xl text-amber-600 dark:text-amber-400">
                <ChartIcon className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Display & UI</h3>
            </div>
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">Dark Mode</p>
                  <p className="text-xs text-slate-500 font-medium">Optimum for low-light clinical environments</p>
                </div>
                <button
                  onClick={toggleTheme}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-300 focus:outline-none ${isDark ? 'bg-indigo-600' : 'bg-slate-200'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-300 ${isDark ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">Live Data Updates</p>
                  <p className="text-xs text-slate-500 font-medium">Refresh dashboard stats automatically</p>
                </div>
                <button
                  onClick={() => toggleConfig('autoRefresh')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-300 focus:outline-none ${config.autoRefresh !== false ? 'bg-green-500' : 'bg-slate-200'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-300 ${config.autoRefresh !== false ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Network & Database Settings Card */}
        {String(user?.role || '').toLowerCase() === 'admin' && (
          <div className="card-premium lg:col-span-2 border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-8">
              <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 rounded-2xl text-emerald-600 dark:text-emerald-400">
                  <GearIcon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">System Administration</h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">Manage system settings and network configuration</p>
                </div>
              </div>

              {adminMessage && (
                <div className="mb-8 p-4 bg-indigo-50 dark:bg-indigo-900/10 border-l-4 border-indigo-500 rounded-r-2xl flex items-center gap-3 animate-premium-slide">
                  <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                  <p className="text-sm font-bold text-indigo-700 dark:text-indigo-400">{adminMessage}</p>
                </div>
              )}

              <div className="space-y-6">
                {/* Online Users */}
                <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">Online Users</h4>
                      <p className="text-xs text-slate-500 mt-0.5">Users currently logged into the system</p>
                    </div>
                    <button
                      onClick={loadOnlineUsers}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-all"
                    >
                      Refresh
                    </button>
                  </div>
                  <div className="space-y-2">
                    {onlineUsers.length === 0 ? (
                      <p className="text-sm text-slate-400 text-center py-4">No other users online</p>
                    ) : (
                      onlineUsers.map((u) => (
                        <div key={u.id} className="flex items-center justify-between p-3 bg-white dark:bg-slate-950 rounded-lg border border-slate-100 dark:border-slate-800">
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{u.name}</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase">{u.role}</span>
                          </div>
                          <span className="text-[10px] text-slate-400">{u.device || 'Unknown Device'}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>


                {/* Activity Logs */}
                <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">Activity Logs</h4>
                      <p className="text-xs text-slate-500 mt-0.5">Recent system activity</p>
                    </div>
                  </div>
                  <div className="flex gap-2 mb-4">
                    {['5m', '1h', '24h', '7d', 'all'].map((filter) => (
                      <button
                        key={filter}
                        onClick={() => loadFilteredActivityLogs(filter === 'all' ? null : filter)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                          activityFilter === filter || (filter === 'all' && activityFilter === null)
                            ? 'bg-indigo-600 text-white'
                            : 'bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {filter}
                      </button>
                    ))}
                  </div>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {filteredLogs.slice(0, 20).map((log) => (
                      <div key={log.id} className="flex items-start gap-3 p-3 bg-white dark:bg-slate-950 rounded-lg border border-slate-100 dark:border-slate-800">
                        <div className="flex-1">
                          <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">{log.description}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {log.first_name} {log.last_name} - {new Date(log.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                    {filteredLogs.length === 0 && (
                      <p className="text-sm text-slate-400 text-center py-4">No activity logs found</p>
                    )}
                  </div>
                </div>

                {/* Danger Zone */}
                <div className="bg-rose-50/30 dark:bg-rose-950/10 p-6 rounded-2xl border border-rose-200 dark:border-rose-900/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-rose-700 dark:text-rose-400">Danger Zone</h4>
                      <p className="text-xs text-rose-500 mt-0.5">Irreversible actions - proceed with caution</p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <button
                      onClick={handleClearDatabase}
                      disabled={adminLoading}
                      className="w-full px-4 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-lg"
                    >
                      {adminLoading ? 'Clearing...' : 'Clear Database (Start Fresh)'}
                    </button>
                    <p className="text-[10px] text-rose-500 mt-2 text-center">
                      WARNING: This will permanently delete ALL data and restart the application with a fresh database.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <Layout
      activeSection={activeTab}
      onSectionClick={handleSectionClick}
      searchTerm=""
      onSearchChange={() => { }}
      onActionClick={() => { }}
    >
      <div>
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'messages' && <MessagesContent />}
        {activeTab === 'users' && renderUserManagement()}
        {activeTab === 'finance' && renderFinancialOversight()}
        {activeTab === 'case-studies' && renderDoctorCaseStudiesPage()}
        {activeTab === 'settings' && renderSystemSettings()}
      </div>
    </Layout>
  );
};

export default AdminDashboard;
