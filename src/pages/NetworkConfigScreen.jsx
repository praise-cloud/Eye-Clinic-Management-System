import React, { useState, useEffect } from 'react';
import { CloseIcon, WifiIcon, WifiOffIcon, RefreshIcon, CheckCircleIcon, XCircleIcon, AlertCircleIcon, FolderIcon } from '../components/Icons';

const NetworkConfigScreen = ({ onClose, onSave }) => {
    const [config, setConfig] = useState({
        isNetworkMode: false,
        serverPath: '',
        autoSync: true,
        presenceInterval: 5000,
        cvfWatchPath: ''
    });
    const [syncStatus, setSyncStatus] = useState(null);
    const [testing, setTesting] = useState(false);
    const [cvfTesting, setCvfTesting] = useState(false);
    const [testResult, setTestResult] = useState(null);
    const [cvfTestResult, setCvfTestResult] = useState(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [availableDrives, setAvailableDrives] = useState([]);
    const [pathWarning, setPathWarning] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    useEffect(() => {
        loadConfig();
        loadSyncStatus();
        loadCvfWatchPath();
    }, []);

    const loadConfig = async () => {
        try {
            if (window.electronAPI?.getNetworkConfig) {
                const result = await window.electronAPI.getNetworkConfig();
                if (result.success) {
                    setConfig(prev => ({ ...prev, ...result.config }));
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
                    setAvailableDrives(result.status?.availableDrives || []);
                    
                    if (result.status?.pathNeedsUpdate && result.status?.pathValidationMessage) {
                        setPathWarning(result.status.pathValidationMessage);
                    }
                }
            }
        } catch (err) {
            console.error('Failed to load sync status:', err);
        }
    };

    const loadCvfWatchPath = async () => {
        try {
            if (window.electronAPI?.getCvfWatchPath) {
                const result = await window.electronAPI.getCvfWatchPath();
                if (result?.success && result.path) {
                    setConfig(prev => ({ ...prev, cvfWatchPath: result.path }));
                }
            }
        } catch (err) {
            console.error('Failed to load CVF watch path:', err);
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

    const handleTestCvfFolder = async () => {
        if (!config.cvfWatchPath) {
            setError('Please enter a CVF watch folder path');
            return;
        }

        setCvfTesting(true);
        setCvfTestResult(null);

        try {
            const result = await window.electronAPI.testNetworkConnection(config.cvfWatchPath);
            setCvfTestResult(result);
        } catch (err) {
            setCvfTestResult({ success: false, error: err.message });
        } finally {
            setCvfTesting(false);
        }
    };

    const handleBrowse = async () => {
        try {
            const result = await window.electronAPI.selectNetworkFolder();
            if (result.success && result.path) {
                setConfig({ ...config, serverPath: result.path });
                setTestResult(null);
                setPathWarning('');
            }
        } catch (err) {
            setError('Failed to select folder');
        }
    };

    const handleBrowseCvfFolder = async () => {
        try {
            const result = await window.electronAPI.selectNetworkFolder();
            if (result.success && result.path) {
                setConfig({ ...config, cvfWatchPath: result.path });
                setCvfTestResult(null);
            }
        } catch (err) {
            setError('Failed to select folder');
        }
    };

    const handleSave = async () => {
        if (config.isNetworkMode && !config.serverPath) {
            setError('Server path is required when network mode is enabled');
            return;
        }

        setSaving(true);
        setError('');
        setSuccessMessage('');

        try {
            const result = await window.electronAPI.saveNetworkConfig(config);
            if (result.success) {
                if (config.cvfWatchPath) {
                    await window.electronAPI.setCvfWatchPath?.(config.cvfWatchPath);
                }
                setSuccessMessage('Configuration saved! Changes will take effect immediately.');
                if (onSave) onSave(config);
                setTimeout(() => {
                    if (onClose) onClose();
                }, 1500);
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
            presenceInterval: 5000,
            cvfWatchPath: ''
        });
        setTestResult(null);
        setCvfTestResult(null);
        setSuccessMessage('');
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
                                    {config.isNetworkMode 
                                        ? 'All computers share one database on the network path' 
                                        : 'Using local database (each computer has its own data)'}
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
                                    Shared Database Network Path
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={config.serverPath}
                                        onChange={(e) => {
                                            setConfig({ ...config, serverPath: e.target.value });
                                            setTestResult(null);
                                            setPathWarning('');
                                        }}
                                        placeholder="\\SERVERNAME\SharedFolder"
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
                                    Example: \\192.168.1.100\EyeClinic or \\DESKTOP-PC\EyeClinicShared
                                </p>
                            </div>

                            {pathWarning && (
                                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-600 rounded-lg">
                                    <div className="flex items-center gap-2 mb-2">
                                        <AlertCircleIcon className="w-5 h-5 text-yellow-500" />
                                        <p className="text-sm font-medium text-yellow-700 dark:text-yellow-400">
                                            Path Warning
                                        </p>
                                    </div>
                                    <p className="text-sm text-yellow-600 dark:text-yellow-300">
                                        {pathWarning}
                                    </p>
                                </div>
                            )}

                            {availableDrives.length > 0 && (
                                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Available Drives
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {availableDrives.map((drive) => (
                                            <button
                                                key={drive.letter}
                                                onClick={() => {
                                                    setConfig({ ...config, serverPath: drive.path });
                                                    setPathWarning('');
                                                    setTestResult(null);
                                                }}
                                                className={`px-3 py-1 text-sm rounded border ${
                                                    config.serverPath === drive.path
                                                        ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-600 text-blue-700 dark:text-blue-300'
                                                        : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-blue-300'
                                                }`}
                                            >
                                                {drive.letter} ({drive.type})
                                                {drive.volumeName && <span className="ml-1 text-gray-500">- {drive.volumeName}</span>}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

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

                            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                                <div className="flex items-start gap-3">
                                    <WifiIcon className="w-5 h-5 text-blue-500 mt-0.5" />
                                    <div>
                                        <p className="font-medium text-blue-800 dark:text-blue-300 mb-1">
                                            How Network Mode Works
                                        </p>
                                        <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
                                            <li>All computers access the same database file on the shared folder</li>
                                            <li>No data sync/export needed - changes are saved directly to the shared database</li>
                                            <li>Place your existing database file (eye_clinic.db) in the shared folder, or it will be created automatically</li>
                                            <li>Each computer shows online users from other computers in the Admin Dashboard</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {!config.isNetworkMode && (
                        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                            <div className="flex items-center gap-2">
                                <WifiOffIcon className="w-5 h-5 text-gray-400" />
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    <strong>Local Mode:</strong> Each computer has its own database. 
                                    Enable Network Mode to share a single database across multiple computers on the same network.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* CVF Watch Folder Section */}
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                            <FolderIcon className="w-5 h-5 text-green-500" />
                            CVF Machine Integration
                        </h3>
                        
                        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700 mb-4">
                            <div className="flex items-start gap-3">
                                <FolderIcon className="w-5 h-5 text-green-500 mt-0.5" />
                                <div>
                                    <p className="font-medium text-green-800 dark:text-green-300 mb-1">
                                        Henson 8000 PDF Folder
                                    </p>
                                    <p className="text-sm text-green-700 dark:text-green-400">
                                        Set the network path where the Henson 8000 exports PDF results.
                                        New PDFs will appear in the CVF Workspace for review and linking to patients.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                CVF PDF Watch Folder
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={config.cvfWatchPath}
                                    onChange={(e) => {
                                        setConfig({ ...config, cvfWatchPath: e.target.value });
                                        setCvfTestResult(null);
                                    }}
                                    placeholder="\\192.168.1.100\PDF-CVFResults"
                                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:text-white"
                                />
                                <button
                                    onClick={handleBrowseCvfFolder}
                                    className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                                >
                                    Browse
                                </button>
                            </div>
                            <p className="mt-1 text-sm text-gray-500">
                                Example: {config.cvfWatchPath || '\\192.168.1.100\\PDF-CVFResults'}
                            </p>
                        </div>

                        <div className="flex gap-2 mt-4">
                            <button
                                onClick={handleTestCvfFolder}
                                disabled={cvfTesting || !config.cvfWatchPath}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
                            >
                                {cvfTesting ? (
                                    <RefreshIcon className="w-4 h-4 animate-spin" />
                                ) : (
                                    <FolderIcon className="w-4 h-4" />
                                )}
                                {cvfTesting ? 'Testing...' : 'Test CVF Folder'}
                            </button>
                        </div>

                        {cvfTestResult && (
                            <div className={`mt-4 p-4 rounded-lg ${cvfTestResult.success ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
                                <div className="flex items-center gap-2">
                                    {cvfTestResult.success ? (
                                        <CheckCircleIcon className="w-5 h-5 text-green-500" />
                                    ) : (
                                        <XCircleIcon className="w-5 h-5 text-red-500" />
                                    )}
                                    <p className={cvfTestResult.success ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}>
                                        {cvfTestResult.message || cvfTestResult.error}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {error && (
                        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                            <div className="flex items-center gap-2">
                                <XCircleIcon className="w-5 h-5 text-red-500" />
                                <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                            </div>
                        </div>
                    )}

                    {successMessage && (
                        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                            <div className="flex items-center gap-2">
                                <CheckCircleIcon className="w-5 h-5 text-green-500" />
                                <p className="text-sm text-green-700 dark:text-green-400">{successMessage}</p>
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
