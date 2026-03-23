import React, { useState, useEffect } from 'react';
import { CloseIcon, WifiIcon, WifiOffIcon, RefreshIcon, CheckCircleIcon, XCircleIcon, AlertCircleIcon } from '../components/Icons';

const NetworkConfigScreen = ({ onClose, onSave }) => {
    const [config, setConfig] = useState({
        isNetworkMode: false,
        serverPath: '',
        autoSync: true,
        syncInterval: 30000,
        lastSync: null,
        connectionStatus: 'disconnected'
    });
    const [syncStatus, setSyncStatus] = useState(null);
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState(null);
    const [saving, setSaving] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [syncMessage, setSyncMessage] = useState('');
    const [conflicts, setConflicts] = useState([]);
    const [showConflicts, setShowConflicts] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        loadConfig();
        loadSyncStatus();
    }, []);

    const loadConfig = async () => {
        try {
            if (window.electronAPI?.getNetworkConfig) {
                const result = await window.electronAPI.getNetworkConfig();
                if (result.success) {
                    setConfig(result.config);
                }
            }
        } catch (err) {
            console.error('Failed to load network config:', err);
        }
    };

    const loadSyncStatus = async () => {
        try {
            if (window.electronAPI?.getSyncStatus) {
                const result = await window.electronAPI.getSyncStatus();
                if (result.success) {
                    setSyncStatus(result.status);
                }
            }
            if (window.electronAPI?.getConflicts) {
                const result = await window.electronAPI.getConflicts();
                if (result.success) {
                    setConflicts(result.conflicts || []);
                }
            }
        } catch (err) {
            console.error('Failed to load sync status:', err);
        }
    };

    const handleTestConnection = async () => {
        if (!config.serverPath) {
            setError('Please enter a server path');
            return;
        }

        setTesting(true);
        setTestResult(null);
        setError('');

        try {
            const result = await window.electronAPI.testNetworkConnection(config.serverPath);
            setTestResult(result);
        } catch (err) {
            setTestResult({ success: false, error: err.message });
        } finally {
            setTesting(false);
        }
    };

    const handleBrowse = async () => {
        try {
            const result = await window.electronAPI.selectNetworkFolder();
            if (result.success && result.path) {
                setConfig({ ...config, serverPath: result.path });
                setTestResult(null);
            }
        } catch (err) {
            setError('Failed to select folder');
        }
    };

    const handleSync = async () => {
        if (syncing) return;
        
        setSyncing(true);
        setSyncMessage('');
        
        try {
            const result = await window.electronAPI.performSync();
            if (result.success) {
                setSyncMessage(`Synced! Exported: ${result.exported}, Imported: ${result.imported}`);
                await loadSyncStatus();
            } else {
                setSyncMessage(result.error || 'Sync failed');
            }
        } catch (err) {
            setSyncMessage('Sync error: ' + err.message);
        } finally {
            setSyncing(false);
        }
    };

    const handleResolveConflict = async (id, resolution) => {
        try {
            const result = await window.electronAPI.resolveConflict(id, resolution);
            if (result.success) {
                await loadSyncStatus();
            }
        } catch (err) {
            console.error('Failed to resolve conflict:', err);
        }
    };

    const handleSave = async () => {
        if (config.isNetworkMode && !config.serverPath) {
            setError('Server path is required when network mode is enabled');
            return;
        }

        setSaving(true);
        setError('');

        try {
            const result = await window.electronAPI.saveNetworkConfig(config);
            if (result.success) {
                if (onSave) onSave(config);
                if (onClose) onClose();
            } else {
                setError(result.error || 'Failed to save configuration');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleReset = async () => {
        setConfig({
            isNetworkMode: false,
            serverPath: '',
            autoSync: true,
            syncInterval: 30000
        });
        setTestResult(null);
        setSyncMessage('');
    };

    const formatLastSync = (lastSync) => {
        if (!lastSync) return 'Never';
        const date = new Date(lastSync);
        return date.toLocaleString();
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800">
                    <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
                        Network Configuration
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
                    >
                        <CloseIcon className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <div className="flex items-center gap-3">
                            {config.isNetworkMode ? (
                                <WifiIcon className="w-6 h-6 text-blue-500" />
                            ) : (
                                <WifiOffIcon className="w-6 h-6 text-gray-400" />
                            )}
                            <div>
                                <p className="font-medium text-gray-800 dark:text-white">
                                    Network Mode
                                </p>
                                <p className="text-sm text-gray-500">
                                    {config.isNetworkMode ? 'Using shared database' : 'Using local database'}
                                </p>
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={config.isNetworkMode}
                                onChange={(e) => setConfig({ ...config, isNetworkMode: e.target.checked })}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                        </label>
                    </div>

                    {config.isNetworkMode && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Server Network Path
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={config.serverPath}
                                        onChange={(e) => {
                                            setConfig({ ...config, serverPath: e.target.value });
                                            setTestResult(null);
                                        }}
                                        placeholder="\\SERVERNAME\EyeClinicDB"
                                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                    />
                                    <button
                                        onClick={handleBrowse}
                                        className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                                    >
                                        Browse
                                    </button>
                                </div>
                                <p className="mt-1 text-sm text-gray-500">
                                    Example: \\192.168.1.100\EyeClinicDB or \\DESKTOP-SERVER\EyeClinicDB
                                </p>
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={handleTestConnection}
                                    disabled={testing || !config.serverPath}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
                                >
                                    {testing ? (
                                        <RefreshIcon className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <WifiIcon className="w-4 h-4" />
                                    )}
                                    {testing ? 'Testing...' : 'Test Connection'}
                                </button>
                            </div>

                            {testResult && (
                                <div className={`p-4 rounded-lg ${testResult.success ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
                                    <div className="flex items-center gap-2">
                                        {testResult.success ? (
                                            <CheckCircleIcon className="w-5 h-5 text-green-500" />
                                        ) : (
                                            <XCircleIcon className="w-5 h-5 text-red-500" />
                                        )}
                                        <p className={testResult.success ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}>
                                            {testResult.message || testResult.error}
                                        </p>
                                    </div>
                                </div>
                            )}

                            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <RefreshIcon className="w-5 h-5 text-gray-400" />
                                        <div>
                                            <p className="font-medium text-gray-800 dark:text-white">Auto Sync</p>
                                            <p className="text-sm text-gray-500">Sync data automatically</p>
                                        </div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={config.autoSync}
                                            onChange={(e) => setConfig({ ...config, autoSync: e.target.checked })}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                                    </label>
                                </div>

                                <div className="text-sm text-gray-600 dark:text-gray-400">
                                    <span className="font-medium">Last Sync:</span> {formatLastSync(syncStatus?.lastSync)}
                                </div>

                                {syncStatus?.isAutoSyncRunning && (
                                    <div className="text-sm text-blue-600 dark:text-blue-400 flex items-center gap-1">
                                        <RefreshIcon className="w-3 h-3 animate-spin" />
                                        Auto-sync active
                                    </div>
                                )}

                                <button
                                    onClick={handleSync}
                                    disabled={syncing}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 transition"
                                >
                                    {syncing ? (
                                        <RefreshIcon className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <RefreshIcon className="w-4 h-4" />
                                    )}
                                    {syncing ? 'Syncing...' : 'Sync Now'}
                                </button>

                                {syncMessage && (
                                    <div className="text-sm text-gray-600 dark:text-gray-400 text-center">
                                        {syncMessage}
                                    </div>
                                )}
                            </div>

                            {conflicts.length > 0 && (
                                <div className="border border-yellow-300 dark:border-yellow-600 rounded-lg overflow-hidden">
                                    <button
                                        onClick={() => setShowConflicts(!showConflicts)}
                                        className="w-full flex items-center justify-between p-4 bg-yellow-50 dark:bg-yellow-900/20 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition"
                                    >
                                        <div className="flex items-center gap-2">
                                            <AlertCircleIcon className="w-5 h-5 text-yellow-500" />
                                            <span className="font-medium text-yellow-800 dark:text-yellow-200">
                                                {conflicts.length} Sync Conflict{conflicts.length > 1 ? 's' : ''}
                                            </span>
                                        </div>
                                        <RefreshIcon className={`w-4 h-4 text-yellow-500 transition ${showConflicts ? 'rotate-180' : ''}`} />
                                    </button>
                                    
                                    {showConflicts && (
                                        <div className="p-4 space-y-3 max-h-60 overflow-y-auto">
                                            {conflicts.map((conflict) => (
                                                <div key={conflict.id} className="p-3 bg-white dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600">
                                                    <div className="text-sm font-medium text-gray-800 dark:text-white mb-2">
                                                        {conflict.table_name}: {conflict.record_id}
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => handleResolveConflict(conflict.id, 'keep_local')}
                                                            className="flex-1 px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                                                        >
                                                            Keep Local
                                                        </button>
                                                        <button
                                                            onClick={() => handleResolveConflict(conflict.id, 'apply_remote')}
                                                            className="flex-1 px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600"
                                                        >
                                                            Use Remote
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}

                    {!config.isNetworkMode && (
                        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                            <div className="flex items-center gap-2">
                                <AlertCircleIcon className="w-5 h-5 text-yellow-500" />
                                <p className="text-sm text-yellow-700 dark:text-yellow-400">
                                    Each computer will have its own local database. Enable network mode to share a single database across multiple computers.
                                </p>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                            <div className="flex items-center gap-2">
                                <XCircleIcon className="w-5 h-5 text-red-500" />
                                <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 sticky bottom-0">
                    <button
                        onClick={handleReset}
                        className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white transition"
                    >
                        Reset
                    </button>
                    <div className="flex gap-2">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition"
                        >
                            {saving ? 'Saving...' : 'Save Configuration'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NetworkConfigScreen;
