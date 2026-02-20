import React, { useState } from 'react';
import { UsersIcon, ChartIcon, DocumentIcon, InventoryIcon, AdminIcon } from '../../components/Icons';
import Layout from '../../components/layout/Layout';
import useUser from '../../hooks/useUser';
import { useTheme } from '../../context/ThemeContext';
import { useSystemConfig } from '../../context/SystemConfigContext';
import * as patientService from '../../services/patientService';
import * as inventoryService from '../../services/inventoryService';
import * as testService from '../../services/testService';
import DynamicTableView from '../../components/DynamicTableView';
import MessagesContent from '../../components/content/MessagesContent';
import CVFWorkspaceContent from '../../components/content/CVFWorkspaceContent';

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
  const [importedTables, setImportedTables] = useState([]);
  const [selectedImportedTable, setSelectedImportedTable] = useState('');
  const [batchImportSummary, setBatchImportSummary] = useState(null);
  const [hensonImportSummary, setHensonImportSummary] = useState(null);
  const [hensonFolderPath, setHensonFolderPath] = useState('');
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
    } else if (section === 'cvf-case-studies') {
      setActiveTab('cvf-case-studies');
    } else if (section === 'doctor-case-studies') {
      setActiveTab('case-studies');
    } else if (section === 'revenue-analysis') {
      setActiveTab('finance');
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
    if (!window.electronAPI || !window.electronAPI.getActivityLogs) return;
    try {
      const res = await window.electronAPI.getActivityLogs({});
      if (res?.success && Array.isArray(res.logs)) {
        // Filter for pharmacy related actions
        const filtered = res.logs.filter(log =>
          log.entity_type === 'prescription' ||
          log.entity_type === 'pharmacy_dispensation' ||
          log.action_type === 'dispense'
        );
        setRevenueLog(filtered);
      }
    } catch (error) {
      console.error('Error loading revenue logs:', error);
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
    loadRevenueLogs();

    if (window.electronAPI) {
      const unsubscribe = window.electronAPI.onIpcEvent('data:update', (payload) => {
        fetchUsers();
        loadStats();
        loadActivityLogs();
        loadRevenueLogs();
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
      } catch { }
    };
    loadDbPath();
  }, []);

  const loadDoctorCaseStudies = async ({ doctor = caseFilterDoctor, search = caseFilterSearch, offset = caseStudiesOffset } = {}) => {
    try {
      if (!window.electronAPI?.getDoctorCaseStudies) return;
      const res = await window.electronAPI.getDoctorCaseStudies({
        doctor,
        search,
        limit: caseStudiesLimit,
        offset
      });
      if (!res?.success) {
        return;
      }
      setCaseStudies(res.data || []);
      setCaseStudiesTotal(Number(res.total || 0));
      setCaseStudiesDoctors(Array.isArray(res.doctors) ? res.doctors : []);
    } catch (err) {
      console.error('Failed to load doctor case studies:', err);
    }
  };

  React.useEffect(() => {
    if (activeTab === 'settings' || activeTab === 'case-studies') {
      loadDoctorCaseStudies();
    }
  }, [activeTab]);

  const renderDoctorCaseStudiesPage = () => (
    <div className="space-y-8 max-w-6xl mx-auto pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Doctor Case Studies</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
            Dedicated admin view for doctor notes and case progression per client.
          </p>
        </div>
      </div>

      <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Doctor Case Studies</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">Review each doctor&apos;s case notes per client from imported legacy records.</p>
          </div>
          <button
            onClick={() => loadDoctorCaseStudies({ offset: caseStudiesOffset })}
            disabled={adminLoading}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold uppercase tracking-wider"
          >
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <select
            value={caseFilterDoctor}
            onChange={(e) => {
              const val = e.target.value;
              setCaseFilterDoctor(val);
              setCaseStudiesOffset(0);
              loadDoctorCaseStudies({ doctor: val, search: caseFilterSearch, offset: 0 });
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
                <tr key={`${row.case_id || idx}-${idx}`} className="border-t border-slate-200 dark:border-slate-800">
                  <td className="px-3 py-2">{row.patient_name || row.patient_id || '-'}</td>
                  <td className="px-3 py-2">{row.doctor_name || row.doctor_user_name || row.user_id || '-'}</td>
                  <td className="px-3 py-2 max-w-[360px] truncate" title={row.diagnosis || ''}>{row.diagnosis || '-'}</td>
                  <td className="px-3 py-2">{row.treatment_date || '-'}</td>
                  <td className="px-3 py-2">{row.next_visit_date || '-'}</td>
                </tr>
              ))}
              {!caseStudies.length && (
                <tr>
                  <td className="px-3 py-4 text-center text-slate-500" colSpan={5}>No case studies found yet. Import legacy case data first.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between mt-3">
          <p className="text-xs text-slate-500">Showing {caseStudies.length} of {caseStudiesTotal} cases</p>
          <div className="flex gap-2">
            <button
              onClick={() => {
                const nextOffset = Math.max(0, caseStudiesOffset - caseStudiesLimit);
                setCaseStudiesOffset(nextOffset);
                loadDoctorCaseStudies({ offset: nextOffset });
              }}
              disabled={caseStudiesOffset === 0}
              className="px-3 py-1 border border-slate-300 dark:border-slate-700 rounded text-xs disabled:opacity-40"
            >
              Previous
            </button>
            <button
              onClick={() => {
                const nextOffset = caseStudiesOffset + caseStudiesLimit;
                setCaseStudiesOffset(nextOffset);
                loadDoctorCaseStudies({ offset: nextOffset });
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

  const handleAdminImportDb = async () => {
    try {
      setAdminLoading(true);
      const result = await window.electronAPI.selectFile({
        title: 'Choose SQLite or Backup File for Import',
        filters: [
          { name: 'Database Files', extensions: ['sqlite', 'db', 'bak', 'csv', 'json'] },
        ],
      });

      let filePath = result?.filePath || result?.path || result?.file || null;
      if (!filePath) {
        setAdminMessage('No file selected.');
        return;
      }

      // Use the new comprehensive import handler that includes auto-conversion and schema sync
      console.log('[AdminDashboard] Starting import with auto-conversion and schema sync:', filePath);
      setAdminMessage('Processing... this may take a few minutes for large files.');

      const importResult = await window.electronAPI.importExternalWithSync(filePath);

      if (!importResult?.success) {
        setAdminMessage(importResult?.error || 'Failed to import the database.');
        return;
      }

      // Build success message with summary
      const summary = importResult?.summary || {};
      const schemaTables = importResult?.import?.schemaSyncResult?.analysis?.tables || [];
      const normalizedTables = schemaTables
        .map((t) => ({
          tableName: t?.tableName || '',
          rowCount: t?.rowCount || 0,
          columnCount: t?.columnCount || 0
        }))
        .filter((t) => t.tableName);
      setImportedTables(normalizedTables);
      setSelectedImportedTable(normalizedTables[0]?.tableName || '');
      const detailedMessage = `
✓ Import Successful!

File: ${summary.file_analyzed}
Size: ${summary.file_size_mb} MB
Format: ${summary.format_detected}
Auto-Conversion: ${summary.was_converted}

Schema Changes:
- Tables Created: ${summary.tables_created}
- Tables Modified: ${summary.tables_modified}
- Sync Errors: ${summary.sync_errors}

Please restart the application to load all imported data.
      `.trim();

      setAdminMessage(detailedMessage);
      console.log('[AdminDashboard] Import complete:', importResult);
    } catch (error) {
      console.error('[AdminDashboard] Import error:', error);
      setAdminMessage('An error occurred while importing the database: ' + error.message);
    } finally {
      setAdminLoading(false);
    }
  };

  const handleAnalyzeBakFile = async () => {
    try {
      setAdminLoading(true);
      const result = await window.electronAPI.selectFile({
        title: 'Select BAK file to analyze',
        filters: [
          { name: 'BAK Files', extensions: ['bak', 'db', 'sqlite', 'sql', 'csv'] },
        ],
      });

      const chosen = result?.filePath || result?.path || result?.file || null;
      if (!chosen) {
        setAdminMessage('No file selected.');
        return;
      }

      console.log(`Analyzing file: ${chosen}`);
      setAdminMessage('Analyzing file format... Please wait.');

      const analysis = await window.electronAPI.analyzeBakFile(chosen);

      if (!analysis?.success) {
        setAdminMessage(`Analysis Error: ${analysis?.error || 'Unknown error'}`);
        return;
      }

      // Create a detailed report
      let report = `📋 FILE ANALYSIS REPORT\n`;
      report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

      report += `📁 File Information:\n`;
      report += `   Name: ${analysis.file?.name}\n`;
      report += `   Size: ${analysis.file?.size_mb} MB (${analysis.file?.size_bytes} bytes)\n\n`;

      report += `🔍 Format Detected: ${analysis.format_detected || 'Unknown'}\n\n`;

      if (analysis.details?.sqlite?.is_valid) {
        report += `✅ SQLite Database Found!\n`;
        report += `   Tables: ${analysis.details.sqlite.table_count}\n`;
        if (analysis.details.sqlite.tables?.length > 0) {
          report += `   Tables: ${analysis.details.sqlite.tables.join(', ')}\n`;
        }
        report += `\n   ✓ This file can be imported directly!\n`;
      } else if (analysis.details?.text?.format_type === 'SQL') {
        report += `✅ SQL Dump File Detected!\n`;
        report += `   First Line: ${analysis.details.text.first_line?.substring(0, 80)}\n`;
        report += `\n   ✓ Will parse SQL and create SQLite database\n`;
      } else if (analysis.details?.text?.format_type === 'CSV') {
        report += `✅ CSV/Delimited File Detected!\n`;
        report += `   Separator: ${analysis.details.text.separator || ','}\n`;
        report += `   Columns: ${analysis.details.text.columns || 'Unknown'}\n`;
        report += `   First Line: ${analysis.details.text.first_line?.substring(0, 80)}\n`;
        report += `\n   ✓ Will extract data and create SQLite database\n`;
      } else if (analysis.details?.text?.format_type === 'JSON') {
        report += `ℹ️ JSON File Detected!\n`;
        report += `   Note: JSON import may need special handling\n`;
      } else if (analysis.format_detected === 'Bzip2 Compressed Archive' ||
                 analysis.format_detected === 'Gzip Compressed Archive' ||
                 analysis.format_detected === 'ZIP Archive') {
        report += `📦 Compressed Archive Detected!\n`;
        report += `   Type: ${analysis.format_detected}\n`;
        report += `\n   ⚠️  Please extract the archive first\n`;
      } else if (analysis.details?.binary_analysis) {
        report += `⚠️  Unknown Binary Format\n`;
        report += `   This may be a SQL Server backup or proprietary format\n`;
        report += `\n   Recommendations:\n`;
        report += `   1. Export from original system as CSV\n`;
        report += `   2. Export from original system as SQL dump\n`;
        report += `   3. Check if file is corrupted\n`;
      } else if (analysis.details?.text?.is_readable) {
        report += `📄 Text File Detected!\n`;
        report += `   Format: Not clearly identified\n`;
        report += `   First Line: ${analysis.details.text.first_line?.substring(0, 80)}\n`;
        report += `\n   Try these formats:\n`;
        report += `   • CSV (comma-separated or tab-separated)\n`;
        report += `   • SQL dump file\n`;
      }

      report += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;

      setAdminMessage(report);
    } catch (error) {
      console.error('Error analyzing BAK file:', error);
      setAdminMessage(`Analysis failed: ${error.message}`);
    } finally {
      setAdminLoading(false);
    }
  };

  const handleAdminBatchImportDb = async () => {
    try {
      setAdminLoading(true);
      setBatchImportSummary(null);
      const selection = await window.electronAPI.selectFile({
        title: 'Choose Multiple Backup/Database Files',
        filters: [
          { name: 'Database & Backup Files', extensions: ['bak', 'sqlite', 'db', 'csv', 'json'] },
        ],
        properties: ['openFile', 'multiSelections']
      });

      const pickedFiles = selection?.filePaths || (selection?.filePath ? [selection.filePath] : []);
      if (!pickedFiles.length) {
        setAdminMessage('No files selected.');
        return;
      }

      setAdminMessage(`Starting batch import for ${pickedFiles.length} file(s). This may take time.`);
      const result = await window.electronAPI.importExternalBatchWithSync(pickedFiles);
      if (!result?.summary) {
        setAdminMessage(result?.error || 'Batch import failed.');
        return;
      }

      const summary = result.summary;
      setBatchImportSummary(summary);
      setAdminMessage(
        `Batch import complete: ${summary.success_files}/${summary.total_files} succeeded. ` +
        `Created tables: ${summary.tables_created}, modified: ${summary.tables_modified}, sync errors: ${summary.sync_errors}.`
      );

      const importedTableMap = new Map();
      (result.results || []).forEach((entry) => {
        const tables = entry?.import?.schemaSyncResult?.analysis?.tables || [];
        tables.forEach((t) => {
          if (!t?.tableName) return;
          importedTableMap.set(t.tableName, {
            tableName: t.tableName,
            rowCount: t.rowCount || 0,
            columnCount: t.columnCount || 0
          });
        });
      });
      const mergedTables = Array.from(importedTableMap.values());
      if (mergedTables.length) {
        setImportedTables(mergedTables);
        setSelectedImportedTable((prev) => prev || mergedTables[0].tableName);
      }
      loadDoctorCaseStudies({ offset: 0 });
      setCaseStudiesOffset(0);
    } catch (error) {
      console.error('[AdminDashboard] Batch import error:', error);
      setAdminMessage('An error occurred while running batch import: ' + error.message);
    } finally {
      setAdminLoading(false);
    }
  };

  const handleAnalyzeHensonExport = async () => {
    try {
      setAdminLoading(true);
      const selection = await window.electronAPI.selectFile({
        title: 'Select Henson 8000 Export File',
        filters: [
          { name: 'Henson Export Files', extensions: ['csv', 'txt', 'json', 'sqlite', 'db', 'pdf'] },
        ],
      });

      const filePath = selection?.filePath || selection?.path || null;
      if (!filePath) {
        setAdminMessage('No Henson export file selected.');
        return;
      }

      const analysis = await window.electronAPI.analyzeHensonExport(filePath);
      if (!analysis?.success) {
        setAdminMessage(analysis?.error || 'Failed to analyze Henson export.');
        return;
      }

      setAdminMessage(
        `Henson analysis: ${analysis.file?.name} (${analysis.source_type}) · ` +
        `estimated records: ${analysis.estimate_records} · ` +
        `compatible: ${analysis.henson_compatible ? 'yes' : 'no'}`
      );
    } catch (error) {
      console.error('[AdminDashboard] Henson analyze error:', error);
      setAdminMessage('Failed to analyze Henson export: ' + error.message);
    } finally {
      setAdminLoading(false);
    }
  };

  const handleImportHensonExport = async () => {
    try {
      setAdminLoading(true);
      setHensonImportSummary(null);
      const selection = await window.electronAPI.selectFile({
        title: 'Import Henson 8000 Export',
        filters: [
          { name: 'Henson Export Files', extensions: ['csv', 'txt', 'json', 'sqlite', 'db', 'pdf'] },
        ],
      });

      const filePath = selection?.filePath || selection?.path || null;
      if (!filePath) {
        setAdminMessage('No Henson export file selected.');
        return;
      }

      const result = await window.electronAPI.importHensonExport({ filePath });
      if (!result?.success) {
        setAdminMessage(result?.error || 'Henson import failed.');
        return;
      }

      setHensonImportSummary({
        mode: 'single',
        file_name: result?.summary?.file_name,
        source_type: result?.summary?.source_type,
        imported_tests: result?.summary?.imported_tests || 0,
        patients_created: result?.summary?.patients_created || 0,
        skipped_duplicates: result?.summary?.skipped_duplicates || 0,
        skipped_invalid: result?.summary?.skipped_invalid || 0,
        warnings: result?.summary?.warnings || []
      });

      setAdminMessage(
        `Henson import complete: ${result?.summary?.imported_tests || 0} tests imported, ` +
        `${result?.summary?.patients_created || 0} patients created, ` +
        `${result?.summary?.skipped_duplicates || 0} duplicates skipped.`
      );
    } catch (error) {
      console.error('[AdminDashboard] Henson import error:', error);
      setAdminMessage('Failed to import Henson export: ' + error.message);
    } finally {
      setAdminLoading(false);
    }
  };

  const handleImportHensonFolder = async () => {
    try {
      setAdminLoading(true);
      setHensonImportSummary(null);

      let folderPath = hensonFolderPath;
      if (!folderPath) {
        const selection = await window.electronAPI.selectFile({
          title: 'Select Henson Export Folder',
          properties: ['openDirectory']
        });
        folderPath = selection?.filePath || selection?.path || null;
        if (!folderPath) {
          setAdminMessage('No folder selected.');
          return;
        }
        setHensonFolderPath(folderPath);
      }

      const result = await window.electronAPI.importHensonFolder({ folderPath });
      if (!result?.success && !result?.summary) {
        setAdminMessage(result?.error || 'Henson folder import failed.');
        return;
      }

      const summary = result?.summary || {};
      setHensonImportSummary({
        mode: 'folder',
        ...summary
      });
      setAdminMessage(
        `Henson folder import complete: ${summary.success_files || 0}/${summary.total_files || 0} files succeeded, ` +
        `${summary.imported_tests || 0} tests imported.`
      );
    } catch (error) {
      console.error('[AdminDashboard] Henson folder import error:', error);
      setAdminMessage('Failed to import Henson folder: ' + error.message);
    } finally {
      setAdminLoading(false);
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

  const handleToggleConfig = async (configKey) => {
    if (!window.electronAPI?.toggleConfig) return;
    setAdminLoading(true);
    const res = await window.electronAPI.toggleConfig(configKey);
    if (res?.success) {
      setAdminMessage(`Config ${configKey} toggled successfully`);
    } else {
      setAdminMessage(res?.error || 'Failed to toggle config');
    }
    setAdminLoading(false);
    setTimeout(() => setAdminMessage(null), 5000);
  };

  const handleRestoreBackup = async () => {
    try {
      if (!window.electronAPI || !window.electronAPI.restoreBackup) {
        throw new Error('Backup restoration is not supported in this environment.');
      }

      setAdminLoading(true);
      const selection = await window.electronAPI.selectFile({
        title: 'Select Backup File',
        filters: [
          { name: 'Backup Files', extensions: ['sqlite', 'db', 'bak'] },
        ],
      });
      const filePath = selection?.filePath || selection?.path || null;
      if (!filePath) {
        setAdminMessage('No backup file selected.');
        return;
      }

      const result = await window.electronAPI.restoreBackup(filePath);

      if (result?.success) {
        setAdminMessage('Backup restored successfully. Please restart the application.');
      } else {
        setAdminMessage(result?.error || 'Failed to restore backup.');
      }
    } catch (error) {
      console.error('Error restoring backup:', error);
      setAdminMessage('An error occurred while restoring the backup.');
    } finally {
      setAdminLoading(false);
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

  const renderFinancialOversight = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card-premium p-6 bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-800">
          <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Aggregate Monthly Revenue</p>
          <h3 className="text-3xl font-black text-slate-900 dark:text-white mt-2">₦{stats.monthlyRevenue?.toLocaleString()}</h3>
        </div>
        <div className="card-premium p-6 bg-indigo-50 dark:bg-indigo-900/10 border-indigo-100 dark:border-indigo-800">
          <p className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Active Transactions</p>
          <h3 className="text-3xl font-black text-slate-900 dark:text-white mt-2">{revenueLog.length}</h3>
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

        {/* Network & Infrastructure Card */}
        {String(user?.role || '').toLowerCase() === 'admin' && (
          <div className="card-premium lg:col-span-2 border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-8">
              <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 rounded-2xl text-emerald-600 dark:text-emerald-400">
                  <DocumentIcon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Network & Database Architecture</h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">Configure shared clinical data across your local area network (LAN)</p>
                </div>
              </div>

              {adminMessage && (
                <div className="mb-8 p-4 bg-indigo-50 dark:bg-indigo-900/10 border-l-4 border-indigo-500 rounded-r-2xl flex items-center gap-3 animate-premium-slide">
                  <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                  <p className="text-sm font-bold text-indigo-700 dark:text-indigo-400">{adminMessage}</p>
                </div>
              )}

              <div className="space-y-8">
                <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Authorize Network DB Path (UNC/Mapped Drive)</label>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={networkDbPath}
                      onChange={(e) => setNetworkDbPath(e.target.value)}
                      placeholder="e.g. \\ClinicServer\EyeClinic\data\eye_clinic.db"
                      className="flex-1 px-5 py-3.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-300 dark:placeholder:text-slate-700"
                    />
                    <button
                      onClick={handleAdminSaveNetworkPath}
                      disabled={adminLoading}
                      className="px-8 py-3.5 bg-indigo-600 hover:bg-slate-900 text-white rounded-xl text-xs font-black tracking-widest uppercase transition-all shadow-lg shadow-indigo-200 dark:shadow-none"
                    >
                      Initialize Link
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mt-4 flex items-center gap-2">
                    <svg className="w-3 h-3 text-indigo-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
                    All units must restart after link initialization for multi-terminal synchronization.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <button
                    onClick={handleAnalyzeBakFile}
                    disabled={adminLoading}
                    className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-left hover:border-cyan-500 hover:shadow-xl hover:shadow-cyan-500/5 transition-all group"
                  >
                    <div className="p-2 bg-cyan-50 dark:bg-cyan-900/30 rounded-lg text-cyan-600 dark:text-cyan-400 w-fit mb-4">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight">Analyze BAK File Format</p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest mt-1">Detect & Diagnose File Type</p>
                  </button>

                  <button
                    onClick={handleAdminImportDb}
                    disabled={adminLoading}
                    className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-left hover:border-indigo-500 hover:shadow-xl hover:shadow-indigo-500/5 transition-all group"
                  >
                    <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400 w-fit mb-4">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                    </div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight">Import External Intelligence</p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest mt-1">Supports .bak, CSV, JSON, SQL</p>
                  </button>

                  <button
                    onClick={handleAnalyzeHensonExport}
                    disabled={adminLoading}
                    className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-left hover:border-blue-500 hover:shadow-xl hover:shadow-blue-500/5 transition-all group"
                  >
                    <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400 w-fit mb-4">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2a4 4 0 014-4h8m0 0l-3-3m3 3l-3 3M5 3v4M3 5h4m-4 6h10M3 17h6" /></svg>
                    </div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight">Analyze Henson 8000 Export</p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest mt-1">Strict compatibility + record estimate</p>
                  </button>

                  <button
                    onClick={handleImportHensonExport}
                    disabled={adminLoading}
                    className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-left hover:border-sky-500 hover:shadow-xl hover:shadow-sky-500/5 transition-all group"
                  >
                    <div className="p-2 bg-sky-50 dark:bg-sky-900/30 rounded-lg text-sky-600 dark:text-sky-400 w-fit mb-4">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m0 0l4-4m-4 4l-4-4M4 4h16v16H4z" /></svg>
                    </div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight">Import Henson 8000 File</p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest mt-1">Doctor-first test mapping + dedup</p>
                  </button>

                  <button
                    onClick={handleAdminBatchImportDb}
                    disabled={adminLoading}
                    className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-left hover:border-fuchsia-500 hover:shadow-xl hover:shadow-fuchsia-500/5 transition-all group"
                  >
                    <div className="p-2 bg-fuchsia-50 dark:bg-fuchsia-900/30 rounded-lg text-fuchsia-600 dark:text-fuchsia-400 w-fit mb-4">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h6l2 2h10v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" /></svg>
                    </div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight">Batch Import Multiple Files</p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest mt-1">Queue .bak/.sqlite files at once</p>
                  </button>

                  <button
                    onClick={handleAdminUpdateDb}
                    disabled={adminLoading}
                    className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-left hover:border-emerald-500 hover:shadow-xl hover:shadow-emerald-500/5 transition-all group"
                  >
                    <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg text-emerald-600 dark:text-emerald-400 w-fit mb-4">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A 8.001 8.001 0 0 0 4.582 9m0 0H9m11 11v-5h-.581m0 0a 8.003 8.003 0 0 1-15.357-2m15.357 2H15" /></svg>
                    </div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight">Optimize Clinical Tables</p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest mt-1">Maintenance & WAL Vacuuming</p>
                  </button>

                  <button
                    onClick={handleRestoreBackup}
                    disabled={adminLoading}
                    className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-left hover:border-violet-500 hover:shadow-xl hover:shadow-violet-500/5 transition-all group"
                  >
                    <div className="p-2 bg-violet-50 dark:bg-violet-900/30 rounded-lg text-violet-600 dark:text-violet-400 w-fit mb-4">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M12 4v12m0 0l4-4m-4 4l-4-4" /></svg>
                    </div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight">Restore Backup File</p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest mt-1">Recover from .db/.sqlite/.bak export</p>
                  </button>

                  <button
                    onClick={handleImportHensonFolder}
                    disabled={adminLoading}
                    className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-left hover:border-teal-500 hover:shadow-xl hover:shadow-teal-500/5 transition-all group"
                  >
                    <div className="p-2 bg-teal-50 dark:bg-teal-900/30 rounded-lg text-teal-600 dark:text-teal-400 w-fit mb-4">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h6l2 2h10v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7zm5 8h8" /></svg>
                    </div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight">Import Henson Folder</p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest mt-1">Bulk sync CSV/JSON/SQLite exports</p>
                  </button>

                  <button
                    onClick={handleAdminDeleteDb}
                    disabled={adminLoading}
                    className="p-6 bg-rose-50/30 dark:bg-rose-950/10 border border-rose-100 dark:border-rose-900/30 rounded-2xl text-left hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all group"
                  >
                    <div className="p-2 bg-rose-100 dark:bg-rose-900/30 rounded-lg text-rose-600 dark:text-rose-400 w-fit mb-4">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A 2 2 0 0 1 16.138 21H7.862a 2 2 0 0 1-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a 1 1 0 0 0-1-1h-4a 1 1 0 0 0-1 1v3M4 7h16" /></svg>
                    </div>
                    <p className="text-sm font-bold text-rose-700 dark:text-rose-400 leading-tight">Purge System Instance</p>
                    <p className="text-[10px] text-rose-400 dark:text-slate-500 font-bold uppercase tracking-widest mt-1">Hard reset current deployment</p>
                  </button>
                </div>

                {batchImportSummary && (
                  <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider mb-3">Batch Import Summary</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                      <div className="p-3 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                        <p className="text-slate-500">Files</p><p className="font-bold">{batchImportSummary.total_files}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                        <p className="text-slate-500">Succeeded</p><p className="font-bold">{batchImportSummary.success_files}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                        <p className="text-slate-500">Failed</p><p className="font-bold">{batchImportSummary.failed_files}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                        <p className="text-slate-500">Input Size (GB)</p><p className="font-bold">{batchImportSummary.total_input_size_gb}</p>
                      </div>
                    </div>
                    {batchImportSummary.large_batch_notice && (
                      <p className="mt-3 text-xs font-bold text-amber-600 dark:text-amber-400">
                        Large batch detected (&gt;=50GB). Keep enough free disk space and run imports in stages for safety.
                      </p>
                    )}
                  </div>
                )}

                <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider mb-3">Henson 8000 Folder Sync</h4>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={hensonFolderPath}
                      onChange={(e) => setHensonFolderPath(e.target.value)}
                      placeholder="Path to Henson export folder (optional)"
                      className="flex-1 px-4 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm"
                    />
                    <button
                      onClick={handleImportHensonFolder}
                      disabled={adminLoading}
                      className="px-5 py-2 bg-teal-600 text-white rounded-xl text-xs font-black uppercase tracking-wider"
                    >
                      Sync Folder
                    </button>
                  </div>
                  <p className="mt-2 text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest">
                    Uses strict validation and skips duplicates to protect doctors from duplicate chart entries.
                  </p>
                </div>

                {hensonImportSummary && (
                  <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider mb-3">Henson Import Summary</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                      <div className="p-3 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                        <p className="text-slate-500">Imported Tests</p>
                        <p className="font-bold">{hensonImportSummary.imported_tests || 0}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                        <p className="text-slate-500">Patients Created</p>
                        <p className="font-bold">{hensonImportSummary.patients_created || 0}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                        <p className="text-slate-500">Duplicates Skipped</p>
                        <p className="font-bold">{hensonImportSummary.skipped_duplicates || 0}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                        <p className="text-slate-500">Invalid Skipped</p>
                        <p className="font-bold">{hensonImportSummary.skipped_invalid || 0}</p>
                      </div>
                    </div>
                    {Array.isArray(hensonImportSummary.warnings) && hensonImportSummary.warnings.length > 0 && (
                      <div className="mt-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                        <p className="text-[10px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-1">Warnings</p>
                        <p className="text-xs text-amber-700 dark:text-amber-300">
                          {hensonImportSummary.warnings.slice(0, 3).join(' | ')}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {importedTables.length > 0 && (
                  <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between gap-4 mb-4">
                      <div>
                        <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Imported Tables Browser</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Preview synchronized tables and data after import.</p>
                      </div>
                      <select
                        value={selectedImportedTable}
                        onChange={(e) => setSelectedImportedTable(e.target.value)}
                        className="px-4 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold"
                      >
                        {importedTables.map((table) => (
                          <option key={table.tableName} value={table.tableName}>
                            {table.tableName}
                          </option>
                        ))}
                      </select>
                    </div>

                    {selectedImportedTable && (
                      <DynamicTableView
                        tableName={selectedImportedTable}
                        metadata={importedTables.find((t) => t.tableName === selectedImportedTable) || null}
                        onClose={() => setSelectedImportedTable('')}
                      />
                    )}
                  </div>
                )}

                <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                    <div>
                      <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Doctor Case Studies</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Review each doctor&apos;s case notes per client from imported legacy records.</p>
                    </div>
                    <button
                      onClick={() => loadDoctorCaseStudies({ offset: caseStudiesOffset })}
                      disabled={adminLoading}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold uppercase tracking-wider"
                    >
                      Refresh
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                    <select
                      value={caseFilterDoctor}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCaseFilterDoctor(val);
                        setCaseStudiesOffset(0);
                        loadDoctorCaseStudies({ doctor: val, search: caseFilterSearch, offset: 0 });
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
                          <tr key={`${row.case_id || idx}-${idx}`} className="border-t border-slate-200 dark:border-slate-800">
                            <td className="px-3 py-2">{row.patient_name || row.patient_id || '-'}</td>
                            <td className="px-3 py-2">{row.doctor_name || row.doctor_user_name || row.user_id || '-'}</td>
                            <td className="px-3 py-2 max-w-[360px] truncate" title={row.diagnosis || ''}>{row.diagnosis || '-'}</td>
                            <td className="px-3 py-2">{row.treatment_date || '-'}</td>
                            <td className="px-3 py-2">{row.next_visit_date || '-'}</td>
                          </tr>
                        ))}
                        {!caseStudies.length && (
                          <tr>
                            <td className="px-3 py-4 text-center text-slate-500" colSpan={5}>No case studies found yet. Import legacy case data first.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex items-center justify-between mt-3">
                    <p className="text-xs text-slate-500">Showing {caseStudies.length} of {caseStudiesTotal} cases</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          const nextOffset = Math.max(0, caseStudiesOffset - caseStudiesLimit);
                          setCaseStudiesOffset(nextOffset);
                          loadDoctorCaseStudies({ offset: nextOffset });
                        }}
                        disabled={caseStudiesOffset === 0}
                        className="px-3 py-1 border border-slate-300 dark:border-slate-700 rounded text-xs disabled:opacity-40"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => {
                          const nextOffset = caseStudiesOffset + caseStudiesLimit;
                          setCaseStudiesOffset(nextOffset);
                          loadDoctorCaseStudies({ offset: nextOffset });
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
        {activeTab === 'cvf-case-studies' && <CVFWorkspaceContent />}
        {activeTab === 'finance' && renderFinancialOversight()}
        {activeTab === 'case-studies' && renderDoctorCaseStudiesPage()}
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
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-[100] p-6">
          <div className="card-premium w-full max-w-2xl bg-white dark:bg-slate-900 animate-premium-slide border-slate-200 dark:border-slate-800">
            <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Clinical Identity</h3>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-0.5">Global organization configuration</p>
              </div>
              <button onClick={() => setShowConfigModal(false)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors">
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Institution Name</label>
                  <input
                    type="text"
                    value={configForm.clinicName}
                    onChange={(e) => setConfigForm({ ...configForm, clinicName: e.target.value })}
                    className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Electronic Mail</label>
                  <input
                    type="email"
                    value={configForm.clinicEmail}
                    onChange={(e) => setConfigForm({ ...configForm, clinicEmail: e.target.value })}
                    className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Phone System</label>
                  <input
                    type="tel"
                    value={configForm.clinicPhone}
                    onChange={(e) => setConfigForm({ ...configForm, clinicPhone: e.target.value })}
                    className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Physical Address</label>
                  <textarea
                    value={configForm.clinicAddress}
                    onChange={(e) => setConfigForm({ ...configForm, clinicAddress: e.target.value })}
                    className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all resize-none"
                    rows="3"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Slot Duration (Min)</label>
                  <input
                    type="number"
                    value={configForm.appointmentDuration}
                    onChange={(e) => setConfigForm({ ...configForm, appointmentDuration: parseInt(e.target.value) })}
                    className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                  />
                </div>
                <div className="flex gap-3 items-end">
                  <div className="flex-1">
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Clinical Shift</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="time"
                        value={configForm.workingHoursStart}
                        onChange={(e) => setConfigForm({ ...configForm, workingHoursStart: e.target.value })}
                        className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold"
                      />
                      <span className="text-slate-400 text-xs font-black">TO</span>
                      <input
                        type="time"
                        value={configForm.workingHoursEnd}
                        onChange={(e) => setConfigForm({ ...configForm, workingHoursEnd: e.target.value })}
                        className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-8 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex gap-4">
              <button
                onClick={() => setShowConfigModal(false)}
                className="flex-1 px-6 py-4 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl text-xs font-black tracking-widest uppercase hover:bg-slate-100 dark:hover:bg-slate-700 transition-all border border-slate-200 dark:border-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  updateMultipleConfig(configForm);
                  setShowConfigModal(false);
                }}
                className="flex-1 btn btn-primary py-4 text-xs font-black tracking-widest uppercase shadow-xl shadow-indigo-200 dark:shadow-none"
              >
                Commit Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {adminMessage && (
        <div className="mt-4 text-sm text-green-600">
          {adminMessage}
        </div>
      )}
    </Layout>
  );
};

export default AdminDashboard;
