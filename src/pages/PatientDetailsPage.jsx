import React, { useState, useEffect, useRef, useCallback } from 'react';
import { jsPDF } from 'jspdf';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import ClientDetailContent from './ClientDetailContent';
import * as patientService from '../services/patientService';
import * as testService from '../services/testService';
import EditTestModal from '../components/modals/EditTestModal';
import LoadingScreen from '../components/LoadingScreen';
import usePrescriptions from '../hooks/usePrescriptions';

const PatientDetailsPage = () => {
    const { id } = useParams();
    const location = useLocation();
    const searchParams = new URLSearchParams(location.search);
    const selectedTestId = searchParams.get('testId');
    const navigate = useNavigate();
    const [patient, setPatient] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [tests, setTests] = useState([]);
    const [testsLoading, setTestsLoading] = useState(false);
    const [documents, setDocuments] = useState([]);
    const [documentsLoading, setDocumentsLoading] = useState(false);
    const [editingTestId, setEditingTestId] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [viewingTest, setViewingTest] = useState(null);
    const [viewingDocument, setViewingDocument] = useState(null);
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const { prescriptions, fetchPatientPrescriptions, loading: prescriptionsLoading } = usePrescriptions();
    const activeRefs = useRef({});
    const setCardRef = useCallback((tid, node) => {
        if (node) activeRefs.current[tid] = node;
    }, []);

    useEffect(() => {
        const fetchPatient = async () => {
            setLoading(true);
            try {
                const res = await window.electronAPI.getPatient(id);
                if (res.success) {
                    const p = res.patient;
                    setPatient({
                        id: p.id,
                        patient_id: p.patient_id,
                        name: `${p.first_name} ${p.last_name}`,
                        first_name: p.first_name,
                        last_name: p.last_name,
                        phone: p.contact || '',
                        email: p.email || '',
                        case: p.reason_for_visit || '',
                        date: p.dob || '',
                        intake_date: p.intake_date || '',
                        gender: p.gender || '',
                        address: p.address || ''
                    });
                } else {
                    setError(res.error || 'Client not found');
                }
            } catch (err) {
                console.error('Error fetching patient:', err);
                setError('Failed to load client details');
            } finally {
                setLoading(false);
            }
        };
        if (id) fetchPatient();
    }, [id]);

    useEffect(() => {
        const fetchPatientTests = async () => {
            setTestsLoading(true);
            try {
                const data = await testService.getAllTests({ patientId: id });
                setTests(data || []);
            } catch (err) {
                console.error('Error fetching tests for patient:', err);
            } finally {
                setTestsLoading(false);
            }
        };
        const fetchPatientDocuments = async () => {
            setDocumentsLoading(true);
            try {
                const res = await window.electronAPI.getReports({ patientId: id });
                if (!res?.success) {
                    setDocuments([]);
                    return;
                }

                const mapped = (res.reports || []).map((report) => {
                    let payload = null;
                    try {
                        payload = typeof report.report_file === 'string'
                            ? JSON.parse(report.report_file)
                            : report.report_file;
                    } catch {
                        payload = null;
                    }
                    const isCvfAttachment = report.report_type === 'cvf_case_study_attachment'
                        || payload?.kind === 'cvf_case_study_attachment';
                    return {
                        ...report,
                        payload,
                        isCvfAttachment
                    };
                }).sort((a, b) => new Date(b.report_date || b.created_at || 0) - new Date(a.report_date || a.created_at || 0));

                setDocuments(mapped);
            } catch (err) {
                console.error('Error fetching patient documents:', err);
                setDocuments([]);
            } finally {
                setDocumentsLoading(false);
            }
        };
        const fetchPrescriptions = async () => {
            await fetchPatientPrescriptions(id);
        };
        if (id) {
            fetchPatientTests();
            fetchPatientDocuments();
            fetchPrescriptions();
        }

        // Listen for real-time updates
        if (window.electronAPI && window.electronAPI.onIpcEvent) {
            const unsubscribe = window.electronAPI.onIpcEvent('data:update', (payload) => {
                // Refresh if the update might affect this patient's data
                if (!payload || payload.patient_id === id || ['prescriptions', 'tests', 'patients', 'reports'].includes(payload.table)) {
                    fetchPatientTests();
                    fetchPatientDocuments();
                    fetchPrescriptions();
                }
            });
            return unsubscribe;
        }
    }, [id, fetchPatientPrescriptions]);

    useEffect(() => {
        if (selectedTestId && tests.length) {
            setEditingTestId(selectedTestId);
            const el = activeRefs.current[selectedTestId];
            if (el && el.scrollIntoView) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            setShowEditModal(true);
        }
    }, [selectedTestId, tests]);

    const startEditTest = (tid) => {
        setEditingTestId(tid);
        setShowEditModal(true);
    };

    const refreshTests = async () => {
        try {
            const data = await testService.getAllTests({ patientId: id });
            setTests(data || []);
        } catch (err) {
            console.error('Error refreshing tests for patient:', err);
        }
    };

    const handleDeleteConfirmed = async () => {
        if (!deleteConfirm) return;
        const success = await testService.deleteTest(deleteConfirm.id);
        if (success) {
            if (String(editingTestId) === String(deleteConfirm.id)) {
                setShowEditModal(false);
                setEditingTestId(null);
            }
            await refreshTests();
            setDeleteConfirm(null);
        } else {
            alert('Failed to delete test');
        }
    };

    const handleBack = () => {
        navigate(-1);
    };

    const handleSave = async (updatedData) => {
        try {
            const nameParts = (updatedData.name || '').trim().split(/\s+/);
            const first_name = nameParts[0] || '';
            const last_name = nameParts.slice(1).join(' ') || '';
            
            const res = await window.electronAPI.updatePatient(id, {
                patient_id: patient.patient_id,
                first_name: first_name || patient.first_name,
                last_name: last_name || patient.last_name,
                dob: updatedData.dob || patient.dob,
                intake_date: updatedData.intake_date || patient.intake_date,
                contact: updatedData.phone || patient.contact,
                email: updatedData.email || patient.email,
                reason_for_visit: updatedData.case || patient.reason_for_visit,
                gender: updatedData.gender || patient.gender,
                address: updatedData.address || patient.address
            });
            if (res.success) {
                setPatient(prev => ({ ...prev, ...res.patient, updated_at: new Date().toISOString() }));
            } else {
                alert('Update failed: ' + res.error);
            }
        } catch (err) {
            console.error('Error updating client:', err);
            alert('Error updating client');
        }
    };

    if (loading) return <LoadingScreen />;
    if (error) return (
        <div className="p-8 text-center text-red-500">
            <h2 className="text-xl font-bold">Error</h2>
            <p>{error}</p>
            <button onClick={handleBack} className="mt-4 text-blue-500 hover:underline">Go Back</button>
        </div>
    );

    const getResultColor = (result) => {
        const r = String(result || '').toLowerCase();
        if (r === 'normal') return 'text-green-600 bg-green-100';
        if (r === 'abnormal') return 'text-red-600 bg-red-100';
        if (r === 'high') return 'text-yellow-600 bg-yellow-100';
        if (r === 'low') return 'text-blue-600 bg-blue-100';
        if (r === 'scheduled' || r === 'pending') return 'text-indigo-600 bg-indigo-100';
        return 'text-gray-600 bg-gray-100';
    };

    const formatDate = (value) => {
        if (!value) return 'N/A';
        const dt = new Date(value);
        if (Number.isNaN(dt.getTime())) return value;
        return dt.toLocaleDateString();
    };

    const downloadDocument = async (doc) => {
        if (!doc) return;
        if (doc.isCvfAttachment) {
            const fileName = `cvf_case_study_${doc.patient_id || id}_${(doc.report_date || '').split('T')[0] || 'document'}.json`;
            const json = JSON.stringify(doc.payload || {}, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            a.click();
            URL.revokeObjectURL(url);
            return;
        }
        try {
            await window.electronAPI.exportReport(doc.id, 'pdf');
        } catch (error) {
            console.error('Failed to export document:', error);
            alert('Failed to export document');
        }
    };

    return (
        <div className="bg-gray-50 dark:bg-gray-900 min-h-screen">
            <ClientDetailContent
                client={patient}
                onBack={handleBack}
                onSave={handleSave}
            />
            <div className="mx-auto px-6 pb-12 space-y-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Client Results</h2>
                        <p className="text-sm text-slate-500 font-medium mt-1">All diagnostic test outcomes for this client</p>
                    </div>
                </div>
                <div className="card-premium">
                    {testsLoading ? (
                        <div className="flex justify-center items-center py-16">
                            <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : tests.length === 0 ? (
                        <div className="p-10 text-center">
                            <p className="text-sm font-bold text-slate-600 dark:text-slate-400">No result records found</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
                            {tests.map(t => (
                                <div
                                    key={t.id}
                                    ref={(node) => setCardRef(t.id, node)}
                                    className={`rounded-xl border ${String(t.id) === String(editingTestId) ? 'md:col-span-2 lg:col-span-3 border-indigo-400' : 'border-slate-200 dark:border-slate-800'} bg-white dark:bg-slate-900 overflow-hidden group flex flex-col`}
                                >
                                    <div className="p-5 flex flex-col items-start justify-between bg-gradient-to-r from-slate-50/70 to-slate-100/50 dark:from-slate-800/40 dark:to-slate-900/30 border-b border-slate-100 dark:border-slate-800 w-full">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 flex items-center justify-center font-black text-xs">
                                                {String(t.testType || 'Test').split(' ').map(n => n[0]).join('')}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-900 dark:text-white">{t.testType}</p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Date: {t.date}</span>
                                                    <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Eye: {t.eye?.toUpperCase()}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex py-4">
                                            <span className={`inline-flex px-4 py-2 text-xs font-semibold rounded-full ${getResultColor(t.result)}`}>
                                                {t.result}
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <button
                                                className="px-4 py-2 text-xs font-bold rounded-lg bg-slate-300 text-slate-700 hover:bg-slate-200"
                                                onClick={() => setViewingTest(t)}
                                            >
                                                View
                                            </button>
                                            <button
                                                className="px-4 py-2 text-xs font-bold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
                                                onClick={() => startEditTest(t.id)}
                                            >
                                                Edit
                                            </button>
                                            <button
                                                className="px-4 py-2 text-xs font-bold rounded-lg bg-rose-600 text-white hover:bg-rose-700"
                                                onClick={() => setDeleteConfirm(t)}
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                    <div className="p-5 space-y-3">
                                        <div className="flex flex-col gap-4">
                                            <div>
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Modality</label>
                                                <p className="text-sm font-bold text-slate-900 dark:text-white">{t.testType}</p>
                                            </div>
                                            {t.imageData ? (
                                                <div className="mt-2">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Image</label>
                                                    <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800">
                                                        <img src={t.imageData} alt={t.fileName || 'Test Image'} className={`w-full ${String(t.id) === String(editingTestId) ? 'h-80' : 'h-56'} object-cover transition-transform duration-300 group-hover:scale-[1.02]`} />
                                                    </div>
                                                    {t.fileName && <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">File: <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">{t.fileName}</span></p>}
                                                </div>
                                            ) : null}
                                            <div>
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Notes</label>
                                                <p className="text-sm font-medium text-slate-600 dark:text-slate-400 truncate">{t.notes || '-'}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Client Documents Section */}
                <div>
                    <div>
                        <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Client Documents</h2>
                        <p className="text-sm text-slate-500 font-medium mt-1">Attached reports and CVF case-study documents for this client</p>
                    </div>
                </div>
                <div className="card-premium overflow-hidden">
                    {documentsLoading ? (
                        <div className="flex justify-center items-center py-16">
                            <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : documents.length === 0 ? (
                        <div className="p-10 text-center">
                            <p className="text-sm font-bold text-slate-600 dark:text-slate-400">No client documents found</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-left">
                                <thead>
                                    <tr className="bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800 font-black text-[10px] text-slate-400 uppercase tracking-widest">
                                        <th className="px-8 py-5">Title</th>
                                        <th className="px-8 py-5">Type</th>
                                        <th className="px-8 py-5">Date</th>
                                        <th className="px-8 py-5">Source</th>
                                        <th className="px-8 py-5 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {documents.map((doc) => {
                                        const isCaseNote = doc.report_type === 'case_note_document';
                                        const caseNoteData = isCaseNote ? (doc.payload || {}) : {};
                                        return (
                                        <tr key={doc.id} className="hover:bg-slate-50/50 dark:hover:bg-indigo-900/10 transition-colors">
                                            <td className="px-8 py-6">
                                                <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                                                    {isCaseNote ? `Case Note - ${formatDate(caseNoteData.visit_date)}` : (doc.title || 'Untitled Document')}
                                                </p>
                                                {isCaseNote && caseNoteData.doctor_name && (
                                                    <p className="text-xs text-slate-500 font-medium mt-0.5">By Dr. {caseNoteData.doctor_name}</p>
                                                )}
                                            </td>
                                            <td className="px-8 py-6">
                                                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                                                    doc.isCvfAttachment
                                                        ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
                                                        : isCaseNote
                                                        ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400'
                                                        : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                                }`}>
                                                    {doc.isCvfAttachment ? 'CVF Case Study' : isCaseNote ? 'Case Note' : (doc.report_type || 'report')}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6 text-[11px] font-black text-slate-500 uppercase tracking-widest">
                                                {new Date(doc.report_date || doc.created_at || Date.now()).toLocaleString()}
                                            </td>
                                            <td className="px-8 py-6 text-xs text-slate-600 dark:text-slate-400">
                                                {doc.isCvfAttachment ? 'Henson 8000' : isCaseNote ? 'Doctor Note' : 'Clinical Report'}
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        className="px-4 py-2 text-xs font-bold rounded-lg bg-slate-200 text-slate-700 hover:bg-slate-300"
                                                        onClick={() => setViewingDocument(doc)}
                                                    >
                                                        View
                                                    </button>
                                                    <button
                                                        className="px-4 py-2 text-xs font-bold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
                                                        onClick={() => downloadDocument(doc)}
                                                    >
                                                        Download
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Client Medication History Section */}
                <div>
                    <div>
                        <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Medication History</h2>
                        <p className="text-sm text-slate-500 font-medium mt-1">Prescribed drugs and medication history for this client</p>
                    </div>
                </div>
                <div className="card-premium overflow-hidden">
                    {prescriptionsLoading ? (
                        <div className="flex justify-center items-center py-16">
                            <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : prescriptions.length === 0 ? (
                        <div className="p-10 text-center">
                            <p className="text-sm font-bold text-slate-600 dark:text-slate-400">No prescription history found</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-left">
                                <thead>
                                    <tr className="bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800 font-black text-[10px] text-slate-400 uppercase tracking-widest">
                                        <th className="px-8 py-5">Medication</th>
                                        <th className="px-8 py-5">Quantity</th>
                                        <th className="px-8 py-5">Prescribed By</th>
                                        <th className="px-8 py-5">Status</th>
                                        <th className="px-8 py-5">Instructions</th>
                                        <th className="px-8 py-5 text-right">Date</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {prescriptions.map((p) => (
                                        <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-amber-900/10 transition-colors">
                                            <td className="px-8 py-6">
                                                <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight">{p.drug_name}</p>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{p.strength}</p>
                                            </td>
                                            <td className="px-8 py-6 text-sm font-medium text-slate-600 dark:text-slate-400">{p.quantity} Units</td>
                                            <td className="px-8 py-6 text-sm font-medium text-slate-600 dark:text-slate-400">Dr. {p.doctor_first_name} {p.doctor_last_name}</td>
                                            <td className="px-8 py-6">
                                                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${p.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                                                    p.status === 'dispensed' ? 'bg-emerald-100 text-emerald-700' :
                                                        'bg-rose-100 text-rose-700'
                                                    }`}>
                                                    {p.status}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6 text-xs text-slate-500 italic max-w-xs truncate">{p.instructions || 'No instructions'}</td>
                                            <td className="px-8 py-6 text-[10px] font-black text-slate-400 text-right uppercase tracking-widest">
                                                {new Date(p.created_at).toLocaleDateString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
                {viewingTest && (
                    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4" onClick={() => setViewingTest(null)}>
                        <div className="card-premium w-full max-w-3xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
                            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">{viewingTest.testType}</h3>
                                    <div className="flex items-center gap-3 mt-2">
                                        <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${getResultColor(viewingTest.result)}`}>
                                            {viewingTest.result}
                                        </span>
                                        <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Eye: {viewingTest.eye?.toUpperCase()}</span>
                                        <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Date: {viewingTest.date}</span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setViewingTest(null)}
                                    className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600"
                                >
                                    ✕
                                </button>
                            </div>
                            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                                {viewingTest.imageData && (
                                    <div>
                                        <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 mb-3">
                                            <img src={viewingTest.imageData} alt={viewingTest.fileName || 'Test Image'} className="w-full max-h-[420px] object-contain bg-slate-950" />
                                        </div>
                                        {viewingTest.fileName && (
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                File: <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">{viewingTest.fileName}</span>
                                            </p>
                                        )}
                                    </div>
                                )}
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Notes</p>
                                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300 whitespace-pre-line">
                                        {viewingTest.notes || 'No notes recorded for this test.'}
                                    </p>
                                </div>
                            </div>
                            <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 bg-slate-50/60 dark:bg-slate-950/40">
                                <button
                                    onClick={() => setViewingTest(null)}
                                    className="px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                {viewingDocument && (
                    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-[115] p-4" onClick={() => setViewingDocument(null)}>
                        <div className="card-premium w-full max-w-3xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
                            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                                        {viewingDocument.report_type === 'case_note_document' ? `Case Note - ${formatDate(viewingDocument.payload?.visit_date)}` : (viewingDocument.title || 'Client Document')}
                                    </h3>
                                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mt-2">
                                        {viewingDocument.isCvfAttachment ? 'CVF Case Study Attachment' : viewingDocument.report_type === 'case_note_document' ? 'Case Note Document' : (viewingDocument.report_type || 'Report')}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setViewingDocument(null)}
                                    className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600"
                                >
                                    x
                                </button>
                            </div>
                            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                                {viewingDocument.isCvfAttachment ? (
                                    <>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Result</p>
                                                <p className="text-sm font-bold text-slate-900 dark:text-white">{viewingDocument.payload?.result || 'Pending'}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Diagnosis</p>
                                                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{viewingDocument.payload?.diagnosis || '-'}</p>
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Case Study</p>
                                            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 whitespace-pre-line">
                                                {viewingDocument.payload?.caseStudy || 'No case study text provided.'}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Notes</p>
                                            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 whitespace-pre-line">
                                                {viewingDocument.payload?.notes || 'No notes provided.'}
                                            </p>
                                        </div>
                                    </>
                                ) : viewingDocument.report_type === 'case_note_document' ? (
                                    <>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Doctor</p>
                                                <p className="text-sm font-bold text-slate-900 dark:text-white">Dr. {viewingDocument.payload?.doctor_name || 'N/A'}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Visit Date</p>
                                                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{formatDate(viewingDocument.payload?.visit_date)}</p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Diagnosis</p>
                                                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{viewingDocument.payload?.diagnosis || '-'}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Recommendation</p>
                                                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{viewingDocument.payload?.recommendation || '-'}</p>
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Case Details</p>
                                            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 whitespace-pre-line">{viewingDocument.payload?.case_details || '-'}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Case History</p>
                                            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 whitespace-pre-line">{viewingDocument.payload?.case_history || '-'}</p>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Final Rx OD</p>
                                                <p className="text-sm font-mono text-slate-700 dark:text-slate-300">{viewingDocument.payload?.final_rx?.od || '-'}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Final Rx OS</p>
                                                <p className="text-sm font-mono text-slate-700 dark:text-slate-300">{viewingDocument.payload?.final_rx?.os || '-'}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Lens Type</p>
                                                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{viewingDocument.payload?.lens_type || '-'}</p>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div>
                                        <p className="text-sm text-slate-600 dark:text-slate-300">
                                            This is a generated clinical report. Use Download to export the file.
                                        </p>
                                    </div>
                                )}
                            </div>
                            <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 bg-slate-50/60 dark:bg-slate-950/40">
                                <button
                                    onClick={() => downloadDocument(viewingDocument)}
                                    className="px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest bg-indigo-600 text-white hover:bg-indigo-700"
                                >
                                    Download
                                </button>
                                <button
                                    onClick={() => setViewingDocument(null)}
                                    className="px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                {deleteConfirm && (
                    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-[120] p-4" onClick={() => setDeleteConfirm(null)}>
                        <div className="card-premium w-full max-w-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
                            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">Delete Test Result</h3>
                                <button
                                    onClick={() => setDeleteConfirm(null)}
                                    className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600"
                                >
                                    ✕
                                </button>
                            </div>
                            <div className="p-6 space-y-3">
                                <p className="text-sm text-slate-700 dark:text-slate-300">
                                    This will permanently remove the selected test result
                                    {deleteConfirm?.testType ? ` (${deleteConfirm.testType})` : ''}.
                                </p>
                                <p className="text-xs font-black text-rose-500 uppercase tracking-widest">
                                    This action cannot be undone.
                                </p>
                            </div>
                            <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 bg-slate-50/60 dark:bg-slate-950/40">
                                <button
                                    onClick={() => setDeleteConfirm(null)}
                                    className="px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDeleteConfirmed}
                                    className="px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest bg-rose-600 text-white hover:bg-rose-700"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                {showEditModal && editingTestId && (
                    <EditTestModal
                        testId={editingTestId}
                        onClose={() => {
                            setShowEditModal(false);
                            setEditingTestId(null);
                            if (selectedTestId) {
                                navigate(location.pathname, { replace: true });
                            }
                        }}
                        onSaved={refreshTests}
                    />
                )}
            </div>
        </div>
    );
}

export default PatientDetailsPage;
