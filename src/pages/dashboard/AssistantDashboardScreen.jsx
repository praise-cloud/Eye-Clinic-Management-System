import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DeleteIcon, EditIcon, ViewIcon } from '../../components/Icons';
import AddPatientModal from '../../components/modals/AddPatientModal';
import PatientQuickViewModal from '../../components/modals/PatientQuickViewModal';
import useUser from '../../hooks/useUser';
import usePrescriptions from '../../hooks/usePrescriptions';

const AssistantDashboardScreen = () => {
    const { user } = useUser();
    const navigate = useNavigate();
    const [statsData, setStatsData] = useState([
        { label: 'Total Clients', number: '0', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z', color: 'indigo' },
        { label: "Today's Intake", number: '0', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z', color: 'emerald' },
        { label: 'Pending Results', number: '0', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4', color: 'amber' },
        { label: 'Clinical Revenue', number: '₦0', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z', color: 'rose' },
    ]);

    const [patients, setPatients] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(5);
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [quickViewPatient, setQuickViewPatient] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showAddPatientModal, setShowAddPatientModal] = useState(false);
    const [notification, setNotification] = useState(null);
    const { prescriptions: pendingPrescriptions, fetchPendingPrescriptions, updateStatus, loading: prescriptionsLoading } = usePrescriptions();

    const loadPatients = async () => {
        try {
            setLoading(true);
            const result = await window.electronAPI.getPatients();
            if (result.success) {
                const transformed = result.patients.map(patient => ({
                    id: patient.id,
                    name: `${patient.first_name} ${patient.last_name}`,
                    date: patient.dob,
                    case: patient.reason_for_visit || 'Routine Checkup',
                    phone: patient.contact || patient.phone_number || 'N/A',
                    email: patient.email || 'N/A',
                    patient_id: patient.patient_id,
                    first_name: patient.first_name,
                    last_name: patient.last_name,
                    gender: patient.gender,
                    address: patient.address,
                    reason_for_visit: patient.reason_for_visit
                }));
                setPatients(transformed);
                setError('');
            } else {
                setError(result.error || 'Database connection error');
            }
        } catch (err) {
            setError('System fault: Unable to access patient registry');
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            if (!window.electronAPI?.getDashboardStats) return;
            const result = await window.electronAPI.getDashboardStats();
            if (result?.success && result.stats) {
                const stats = result.stats;
                const currency = new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 });
                setStatsData([
                    { label: 'Total Clients', number: String(stats.totalPatients || 0), icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z', color: 'indigo' },
                    { label: "Today's Intake", number: String(stats.todayPatientIntake || 0), icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z', color: 'emerald' },
                    { label: "Today's Results", number: String(stats.todayAppointments || 0), icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4', color: 'amber' },
                    { label: 'Clinical Revenue', number: currency.format(Number(stats.monthlyRevenue || 0)), icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z', color: 'rose' },
                ]);
            }
        } catch (error) {
            console.error('Failed to load dashboard stats:', error);
        }
    };

    useEffect(() => {
        if (notification) {
            const timer = setTimeout(() => setNotification(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [notification]);

    useEffect(() => {
        loadPatients();
        fetchStats();
        fetchPendingPrescriptions();
        if (window.electronAPI?.onIpcEvent) {
            const unsubscribe = window.electronAPI.onIpcEvent('data:update', (payload) => {
                fetchStats();
                if (payload && payload.table === 'prescriptions') {
                    fetchPendingPrescriptions();
                }
            });
            return () => {
                unsubscribe?.();
            };
        }
    }, [fetchPendingPrescriptions]);

    const handleDelete = async () => {
        if (!deleteConfirm) return;
        try {
            const result = await window.electronAPI.deletePatient(deleteConfirm.id);
            if (result.success) {
                await loadPatients();
                setDeleteConfirm(null);
            }
        } catch (err) {
            setDeleteConfirm(null);
        }
    };

    const filteredPatients = patients.filter(patient =>
        searchTerm === '' ||
        patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.case.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalPages = Math.ceil(filteredPatients.length / rowsPerPage);
    const paginatedPatients = filteredPatients.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

    return (
        <div className="space-y-10 animate-premium-fade pb-10">
            {/* Context Header */}
            <div>
                <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Clinical Administration</h1>
                <p className="text-slate-500 font-medium mt-1">Operational overview and client intake control</p>
            </div>

            {/* Performance Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {statsData.map((stat, index) => (
                    <div key={index} className="card-premium p-6 flex flex-col gap-4">
                        <div className={`w-12 h-12 rounded-2xl bg-${stat.color}-50 dark:bg-${stat.color}-900/10 flex items-center justify-center text-${stat.color}-600 dark:text-${stat.color}-400`}>
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={stat.icon} />
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5">{stat.label}</h3>
                            <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{stat.number}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Pending Prescriptions Section */}
            <div className="space-y-6">
                <div className="flex items-center justify-between px-2">
                    <div>
                        <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Pending Prescriptions</h2>
                        <p className="text-sm text-slate-500 font-medium">Pharmacy fulfillment queue from clinical staff</p>
                    </div>
                    {pendingPrescriptions.length > 0 && (
                        <div className="px-3 py-1 bg-amber-500 text-white rounded-lg text-[10px] font-black uppercase tracking-widest animate-pulse">
                            {pendingPrescriptions.length} Waiting
                        </div>
                    )}
                </div>

                {notification && (
                    <div className={`mx-2 mb-6 p-4 rounded-xl flex items-center gap-3 animate-premium-fade shadow-sm ${notification.type === 'success'
                        ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 border border-emerald-100 dark:border-emerald-900/30'
                        : 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 border border-rose-100 dark:border-rose-900/30'
                        }`}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {notification.type === 'success' ? (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                            )}
                        </svg>
                        <span className="font-bold text-sm">{notification.message}</span>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {prescriptionsLoading ? (
                        <div className="col-span-full py-12 flex flex-col items-center justify-center gap-4 card-premium">
                            <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Accessing Pharmacy Queue...</p>
                        </div>
                    ) : pendingPrescriptions.length > 0 ? (
                        pendingPrescriptions.map((p) => (
                            <div key={p.id} className="card-premium p-5 flex flex-col gap-4 group hover:border-amber-400/50 transition-all duration-300 animate-premium-slide">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/10 text-amber-600 flex items-center justify-center font-black text-xs">
                                            {p.drug_name[0]}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight">{p.drug_name}</p>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{p.strength}</p>
                                        </div>
                                    </div>
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{new Date(p.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                                <div className="space-y-2">
                            <div className="flex justify-between text-xs">
                                <span className="font-bold text-slate-500 uppercase tracking-tight">Client:</span>
                                <span className="font-black text-slate-900 dark:text-white">{p.patient_first_name} {p.patient_last_name}</span>
                            </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="font-bold text-slate-500 uppercase tracking-tight">Quantity:</span>
                                        <span className="font-black text-indigo-500">×{p.quantity} Units</span>
                                    </div>
                                </div>
                                <div className="p-3 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-100 dark:border-slate-800">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 leading-none">Usage Route</p>
                                    <p className="text-xs text-slate-600 dark:text-slate-400 italic font-medium leading-relaxed">{p.instructions || 'Standard dosage instructions apply.'}</p>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={async () => {
                                            try {
                                                const success = await updateStatus(p.id, 'dispensed', user?.id);
                                                if (success) {
                                                    setNotification({ type: 'success', message: `Successfully dispensed ${p.drug_name} for ${p.patient_first_name}.` });
                                                    fetchStats();
                                                } else {
                                                    setNotification({ type: 'error', message: 'Failed to dispense medication. Please check stock levels.' });
                                                }
                                            } catch (err) {
                                                setNotification({ type: 'error', message: err.message || 'Dispensing failed due to a system error.' });
                                            }
                                        }}
                                        className="flex-1 py-2.5 bg-indigo-500 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-md active:scale-95 disabled:opacity-50"
                                        disabled={prescriptionsLoading}
                                    >
                                        {prescriptionsLoading ? 'Processing...' : 'Dispensed'}
                                    </button>
                                    <button
                                        onClick={() => updateStatus(p.id, 'cancelled', user?.id)}
                                        className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-rose-50 hover:text-rose-500 transition-all active:scale-95"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="col-span-full card-premium p-12 text-center border-dashed">
                            <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800/50 rounded-2xl flex items-center justify-center text-slate-200 mx-auto mb-4">
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                            </div>
                            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No Pending Prescriptions</p>
                            <p className="text-xs text-slate-400 mt-1">Queue is currently clear.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Main Operational Card */}
            <div className="card-premium overflow-hidden">
                <div className="p-8 border-b border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-950/20 flex flex-col md:flex-row gap-6 items-center justify-between">
                    <div className="relative flex-1 w-full max-w-xl">
                        <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Identify subject by name, clinical reason, or telemetry..."
                            className="input-premium pl-12 py-4 shadow-sm"
                        />
                    </div>
                    <button
                        onClick={() => setShowAddPatientModal(true)}
                        className="btn btn-primary px-8 py-4 flex items-center gap-3 shadow-xl shadow-indigo-100 dark:shadow-none w-full md:w-auto"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        <span className="font-bold">New Subject Intake</span>
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800 font-black text-[10px] text-slate-400 uppercase tracking-widest">
                                <th className="px-8 py-5">Client Dossier</th>
                                <th className="px-8 py-5">Intake Date</th>
                                <th className="px-8 py-5">Diagnostic Focus</th>
                                <th className="px-8 py-5">Telemetry</th>
                                <th className="px-8 py-5 text-right">Management</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {paginatedPatients.length > 0 ? paginatedPatients.map((patient, idx) => (
                                <tr key={idx} className="group hover:bg-slate-50/50 dark:hover:bg-indigo-900/10 transition-colors">
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 font-black text-xs group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                                                {patient.name.split(' ').map(n => n[0]).join('')}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight">{patient.name}</p>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{patient.patient_id}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-sm font-medium text-slate-600 dark:text-slate-400">{patient.date}</td>
                                    <td className="px-8 py-6">
                                        <span className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg text-xs font-bold truncate max-w-[200px] inline-block">
                                            {patient.case}
                                        </span>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{patient.phone}</span>
                                            <span className="text-[10px] text-slate-400 font-medium">{patient.email}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => setQuickViewPatient(patient)}
                                                className="w-9 h-9 rounded-xl flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-400 hover:bg-indigo-500 hover:text-white transition-all shadow-sm"
                                                title="Quick View"
                                            >
                                                <ViewIcon />
                                            </button>
                                            <button
                                                onClick={() => navigate(`/patients/${patient.id}`)}
                                                className="w-9 h-9 rounded-xl flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-400 hover:bg-emerald-500 hover:text-white transition-all shadow-sm"
                                                title="Full Client Record"
                                            >
                                                <EditIcon />
                                            </button>
                                            <button onClick={() => setDeleteConfirm(patient)} className="w-9 h-9 rounded-xl flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-400 hover:bg-rose-500 hover:text-white transition-all shadow-sm">
                                                <DeleteIcon />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="5" className="py-24 text-center">
                                        <div className="w-20 h-20 rounded-3xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-200 mx-auto mb-6">
                                            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                            </svg>
                                        </div>
                                        <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">System Registry Clear</h3>
                                        <p className="text-sm text-slate-500 font-medium max-w-sm mx-auto mt-2">No active records match the current identification parameters.</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="p-8 border-t border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-950/20 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Density Control</label>
                        <select
                            value={rowsPerPage}
                            onChange={(e) => setRowsPerPage(Number(e.target.value))}
                            className="bg-transparent border-none text-sm font-bold text-slate-600 dark:text-slate-400 focus:ring-0 cursor-pointer"
                        >
                            <option value={5}>5 Units</option>
                            <option value={10}>10 Units</option>
                            <option value={20}>20 Units</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-4">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono">Segment {currentPage} / {totalPages || 1}</span>
                        <div className="flex gap-2">
                            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-400 disabled:opacity-30 transition-all hover:bg-slate-100 active:scale-90 shadow-sm">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
                            </button>
                            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0} className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-400 disabled:opacity-30 transition-all hover:bg-slate-100 active:scale-90 shadow-sm">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Premium Intelligence Overlays */}
            {deleteConfirm && (
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4 animate-premium-fade">
                    <div className="card-premium bg-white dark:bg-slate-900 w-full max-w-sm p-8 shadow-2xl animate-premium-slide">
                        <div className="w-16 h-16 bg-rose-50 dark:bg-rose-900/10 rounded-2xl flex items-center justify-center text-rose-600 mb-6 font-black scale-110">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">Data Revocation</h3>
                        <p className="text-sm text-slate-500 font-medium mt-3 leading-relaxed">Confirm deletion of clinical dossier for <b>{deleteConfirm.name}</b>. This action is final.</p>
                        <div className="flex gap-3 mt-10">
                            <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl text-xs font-black tracking-widest uppercase hover:bg-slate-200 transition-all">Abort</button>
                            <button onClick={handleDelete} className="flex-1 py-3 bg-rose-500 text-white rounded-xl text-xs font-black tracking-widest uppercase shadow-lg shadow-rose-200 dark:shadow-none hover:bg-rose-600 transition-all active:scale-95">Purge</button>
                        </div>
                    </div>
                </div>
            )}

            {quickViewPatient && (
                <PatientQuickViewModal
                    patient={quickViewPatient}
                    onClose={() => setQuickViewPatient(null)}
                />
            )}

            {showAddPatientModal && (
                <AddPatientModal
                    onClose={() => setShowAddPatientModal(false)}
                    currentUser={user}
                    onPatientAdded={loadPatients}
                />
            )}
        </div>
    );
};

export default AssistantDashboardScreen;
