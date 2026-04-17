// src/pages/PatientProfilePage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useVisits from '../hooks/useVisits';
import useCaseNotes from '../hooks/useCaseNotes';
import usePrescriptions from '../hooks/usePrescriptions';
import LoadingScreen from '../components/LoadingScreen';
import logger from '../utils/logger';

const PatientProfilePage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [patient, setPatient] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('overview');
    const { visits, fetchVisitsByPatient, createVisit } = useVisits();
    const { caseNotes, fetchCaseNotesByPatient, createCaseNote, signCaseNote } = useCaseNotes();
    const { prescriptions, fetchPatientPrescriptions, updateStatus } = usePrescriptions();

    const tabs = [
        { id: 'overview', label: 'Overview', icon: '📋' },
        { id: 'visits', label: 'Visits', icon: '📅' },
        { id: 'caseNotes', label: 'Case Notes', icon: '📝' },
        { id: 'prescriptions', label: 'Prescriptions', icon: '💊' },
        { id: 'documents', label: 'Documents', icon: '📄' }
    ];

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
                        reason: p.reason_for_visit || '',
                        dob: p.dob || '',
                        intake_date: p.intake_date || '',
                        gender: p.gender || '',
                        address: p.address || ''
                    });
                } else {
                    setError(res.error || 'Patient not found');
                }
            } catch (err) {
                logger.error('PatientProfilePage: Error fetching patient', { error: err.message });
                setError('Failed to load patient details');
            } finally {
                setLoading(false);
            }
        };
        if (id) fetchPatient();
    }, [id]);

    useEffect(() => {
        if (id) {
            fetchVisitsByPatient(id);
            fetchCaseNotesByPatient(id);
            fetchPatientPrescriptions(id);
        }
    }, [id, fetchVisitsByPatient, fetchCaseNotesByPatient, fetchPatientPrescriptions]);

    const handleBack = () => navigate(-1);

    const handleNewVisit = async () => {
        const today = new Date().toISOString().slice(0, 10);
        const reason = prompt('Visit reason (optional):') || '';
        const result = await createVisit({
            patient_id: id,
            visit_date: today,
            visit_type: 'follow_up',
            reason,
            payment_status: 'pending',
            amount_paid: 0
        });
        if (result) {
            fetchVisitsByPatient(id);
        }
    };

    const handleSignCaseNote = async (caseNoteId) => {
        const doctor = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
        const result = await signCaseNote(caseNoteId, doctor.id);
        if (result) {
            fetchCaseNotesByPatient(id);
        }
    };

    const handleDispensePrescription = async (prescriptionId) => {
        const result = await updateStatus(prescriptionId, 'dispensed', null);
        if (result) {
            fetchPatientPrescriptions(id);
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return 'N/A';
        return new Date(dateStr).toLocaleDateString();
    };

    const getStatusBadge = (status) => {
        const colors = {
            pending: 'bg-yellow-100 text-yellow-800',
            dispensed: 'bg-green-100 text-green-800',
            signed: 'bg-blue-100 text-blue-800',
            draft: 'bg-gray-100 text-gray-800',
            paid: 'bg-green-100 text-green-800'
        };
        return (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
                {status || 'unknown'}
            </span>
        );
    };

    if (loading) return <LoadingScreen />;
    if (error) return (
        <div className="p-8 text-center text-red-500">
            <h2 className="text-xl font-bold">Error</h2>
            <p>{error}</p>
            <button onClick={handleBack} className="mt-4 text-blue-500 hover:underline">Go Back</button>
        </div>
    );

    return (
        <div className="bg-gray-50 dark:bg-gray-900 min-h-screen">
            <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button onClick={handleBack} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{patient?.name}</h1>
                                <p className="text-sm text-gray-500">ID: {patient?.patient_id} | Since: {formatDate(patient?.intake_date)}</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => navigate(`/case-note/new?patientId=${id}`)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium">
                                + New Case Note
                            </button>
                            <button onClick={handleNewVisit} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium">
                                + New Visit
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-6">
                <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg mb-6 overflow-x-auto">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
                                activeTab === tab.id
                                    ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                            }`}
                        >
                            <span className="mr-2">{tab.icon}</span>
                            {tab.label}
                        </button>
                    ))}
                </div>

                {activeTab === 'overview' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                            <h3 className="text-sm font-medium text-gray-500 mb-1">Total Visits</h3>
                            <p className="text-3xl font-bold text-gray-900 dark:text-white">{visits.length}</p>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                            <h3 className="text-sm font-medium text-gray-500 mb-1">Case Notes</h3>
                            <p className="text-3xl font-bold text-gray-900 dark:text-white">{caseNotes.length}</p>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                            <h3 className="text-sm font-medium text-gray-500 mb-1">Prescriptions</h3>
                            <p className="text-3xl font-bold text-gray-900 dark:text-white">{prescriptions.length}</p>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                            <h3 className="text-sm font-medium text-gray-500 mb-1">Last Visit</h3>
                            <p className="text-lg font-bold text-gray-900 dark:text-white">
                                {visits[0] ? formatDate(visits[0].visit_date) : 'No visits'}
                            </p>
                        </div>
                    </div>
                )}

                {activeTab === 'visits' && (
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Visit History</h2>
                            <button onClick={handleNewVisit} className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium">
                                + New Visit
                            </button>
                        </div>
                        <div className="divide-y divide-gray-200 dark:divide-gray-700">
                            {visits.length === 0 ? (
                                <p className="p-8 text-center text-gray-500">No visits recorded</p>
                            ) : (
                                visits.map(visit => (
                                    <div key={visit.id} className="p-4 flex justify-between items-start">
                                        <div>
                                            <p className="font-medium text-gray-900 dark:text-white">{formatDate(visit.visit_date)}</p>
                                            <p className="text-sm text-gray-500 mt-1">{visit.reason || 'No reason specified'}</p>
                                            <p className="text-xs text-gray-400 mt-1">Type: {visit.visit_type || 'follow_up'}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {getStatusBadge(visit.payment_status)}
                                            {visit.amount_paid > 0 && (
                                                <span className="text-sm font-medium text-green-600">₦{visit.amount_paid.toLocaleString()}</span>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'caseNotes' && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Case Notes</h2>
                            <button
                                onClick={() => navigate(`/case-note/new?patientId=${id}`)}
                                className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
                            >
                                + New Case Note
                            </button>
                        </div>
                        {caseNotes.length === 0 ? (
                            <div className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center text-gray-500">
                                No case notes recorded
                            </div>
                        ) : (
                            caseNotes.map(note => (
                                <div key={note.id} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <p className="font-medium text-gray-900 dark:text-white">{formatDate(note.created_at)}</p>
                                            <p className="text-sm text-gray-500">Doctor: {note.doctor_name || 'Unknown'}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {getStatusBadge(note.status)}
                                            {note.status === 'draft' && (
                                                <button
                                                    onClick={() => handleSignCaseNote(note.id)}
                                                    className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs font-medium"
                                                >
                                                    Sign Off
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    {note.chief_complaint && (
                                        <div className="mb-3">
                                            <p className="text-xs font-medium text-gray-500 uppercase">Chief Complaint</p>
                                            <p className="text-sm text-gray-900 dark:text-gray-200">{note.chief_complaint}</p>
                                        </div>
                                    )}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                                        {note.visual_acuity_od && (
                                            <div>
                                                <p className="text-xs font-medium text-gray-500">VA OD</p>
                                                <p className="text-sm text-gray-900 dark:text-gray-200">{note.visual_acuity_od}</p>
                                            </div>
                                        )}
                                        {note.visual_acuity_os && (
                                            <div>
                                                <p className="text-xs font-medium text-gray-500">VA OS</p>
                                                <p className="text-sm text-gray-900 dark:text-gray-200">{note.visual_acuity_os}</p>
                                            </div>
                                        )}
                                        {note.intraocular_pressure_od && (
                                            <div>
                                                <p className="text-xs font-medium text-gray-500">IOP OD</p>
                                                <p className="text-sm text-gray-900 dark:text-gray-200">{note.intraocular_pressure_od}</p>
                                            </div>
                                        )}
                                        {note.intraocular_pressure_os && (
                                            <div>
                                                <p className="text-xs font-medium text-gray-500">IOP OS</p>
                                                <p className="text-sm text-gray-900 dark:text-gray-200">{note.intraocular_pressure_os}</p>
                                            </div>
                                        )}
                                    </div>
                                    {note.diagnosis && (
                                        <div className="mb-3">
                                            <p className="text-xs font-medium text-gray-500 uppercase">Diagnosis</p>
                                            <p className="text-sm text-gray-900 dark:text-gray-200">{note.diagnosis}</p>
                                        </div>
                                    )}
                                    {note.recommendation && (
                                        <div>
                                            <p className="text-xs font-medium text-gray-500 uppercase">Recommendation</p>
                                            <p className="text-sm text-gray-900 dark:text-gray-200">{note.recommendation}</p>
                                        </div>
                                    )}
                                    {note.next_appointment && (
                                        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                                            <p className="text-xs font-medium text-indigo-600">Next Appointment: {formatDate(note.next_appointment)}</p>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                )}

                {activeTab === 'prescriptions' && (
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Prescriptions</h2>
                        </div>
                        <div className="divide-y divide-gray-200 dark:divide-gray-700">
                            {prescriptions.length === 0 ? (
                                <p className="p-8 text-center text-gray-500">No prescriptions</p>
                            ) : (
                                prescriptions.map(pres => (
                                    <div key={pres.id} className="p-4 flex justify-between items-start">
                                        <div>
                                            <p className="font-medium text-gray-900 dark:text-white">{pres.drug_name || 'Unknown Drug'}</p>
                                            <p className="text-sm text-gray-500 mt-1">Qty: {pres.quantity} | {pres.instructions || 'No instructions'}</p>
                                            <p className="text-xs text-gray-400 mt-1">Date: {formatDate(pres.created_at)}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {getStatusBadge(pres.status)}
                                            {pres.status === 'pending' && (
                                                <button
                                                    onClick={() => handleDispensePrescription(pres.id)}
                                                    className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 text-xs font-medium"
                                                >
                                                    Dispense
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'documents' && (
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center text-gray-500">
                        Documents will be shown here
                    </div>
                )}
            </div>
        </div>
    );
};

export default PatientProfilePage;
