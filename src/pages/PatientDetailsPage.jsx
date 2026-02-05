import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import ClientDetailContent from './ClientDetailContent';
import * as patientService from '../services/patientService';
import * as testService from '../services/testService';
import EditTestModal from '../components/modals/EditTestModal';
import LoadingScreen from '../components/LoadingScreen';

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
    const [editingTestId, setEditingTestId] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);
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
                        gender: p.gender || '',
                        address: p.address || ''
                    });
                } else {
                    setError(res.error || 'Patient not found');
                }
            } catch (err) {
                console.error('Error fetching patient:', err);
                setError('Failed to load patient details');
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
        if (id) fetchPatientTests();
    }, [id]);

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

    const handleBack = () => {
        navigate(-1);
    };

    const handleSave = async (updatedData) => {
        try {
            const res = await window.electronAPI.updatePatient(id, {
                first_name: updatedData.first_name || patient.first_name,
                last_name: updatedData.last_name || patient.last_name,
                dob: updatedData.date || patient.date,
                contact: updatedData.phone || patient.phone,
                email: updatedData.email || patient.email,
                reason_for_visit: updatedData.case || patient.case,
                gender: updatedData.gender || patient.gender
            });
            if (res.success) {
                // Refresh local state
                setPatient(prev => ({ ...prev, ...updatedData }));
            } else {
                alert('Update failed: ' + res.error);
            }
        } catch (err) {
            console.error('Error updating patient:', err);
            alert('Error updating patient');
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

    return (
        <div className="bg-gray-50 dark:bg-gray-900 min-h-screen">
            <ClientDetailContent
                client={patient}
                onBack={handleBack}
                onSave={handleSave}
            />
            <div className="max-w-7xl mx-auto px-6 pb-12 space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Test Results</h2>
                        <p className="text-sm text-slate-500 font-medium mt-1">All diagnostic tests for this patient</p>
                    </div>
                </div>
                <div className="card-premium">
                    {testsLoading ? (
                        <div className="flex justify-center items-center py-16">
                            <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : tests.length === 0 ? (
                        <div className="p-10 text-center">
                            <p className="text-sm font-bold text-slate-600 dark:text-slate-400">No test records found</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
                            {tests.map(t => (
                                <div
                                    key={t.id}
                                    ref={(node) => setCardRef(t.id, node)}
                                    className={`rounded-xl border ${String(t.id) === String(editingTestId) ? 'md:col-span-2 lg:col-span-3 border-indigo-400' : 'border-slate-200 dark:border-slate-800'} bg-white dark:bg-slate-900 overflow-hidden group flex flex-col`}
                                >
                                    <div className="p-5 flex items-center justify-between bg-gradient-to-r from-slate-50/70 to-slate-100/50 dark:from-slate-800/40 dark:to-slate-900/30 border-b border-slate-100 dark:border-slate-800">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 flex items-center justify-center font-black text-xs">
                                                {String(t.testType || 'Test').split(' ').map(n => n[0]).join('')}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-900 dark:text-white">{t.testType}</p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Eye: {t.eye?.toUpperCase()}</span>
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Date: {t.date}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getResultColor(t.result)}`}>
                                                {t.result}
                                            </span>
                                            <button
                                                className="px-3 py-1 text-xs font-bold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
                                                onClick={() => startEditTest(t.id)}
                                            >
                                                Edit
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
                                                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{t.notes || '—'}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                {showEditModal && editingTestId && (
                    <EditTestModal
                        testId={editingTestId}
                        onClose={() => { setShowEditModal(false); setEditingTestId(null); }}
                        onSaved={async () => {
                            const data = await testService.getAllTests({ patientId: id });
                            setTests(data || []);
                        }}
                    />
                )}
            </div>
        </div>
    );
}

export default PatientDetailsPage;
