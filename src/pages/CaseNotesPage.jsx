import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useUser from '../hooks/useUser';
import * as testService from '../services/testService';

const CaseNotesPage = () => {
    const { user } = useUser();
    const navigate = useNavigate();
    const [caseNotes, setCaseNotes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingNote, setEditingNote] = useState(null);
    const [patients, setPatients] = useState([]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [deleteConfirm, setDeleteConfirm] = useState(null);

    const [form, setForm] = useState({
        patientId: '',
        visitDate: new Date().toISOString().split('T')[0],
        caseDetails: '',
        caseHistory: '',
        ophthalmoscopy: '',
        previousRx: '',
        externals: '',
        diagnosis: '',
        recommendation: '',
        finalRxOd: '',
        finalRxOs: '',
        lensType: '',
        nextVisitDate: '',
        outstandingBill: ''
    });

    useEffect(() => {
        loadCaseNotes();
        loadPatients();
    }, []);

    const loadCaseNotes = async () => {
        setLoading(true);
        try {
            const data = await testService.getAllTests({ machineType: 'case_note' });
            setCaseNotes(data || []);
        } catch (err) {
            console.error('Error loading case notes:', err);
        } finally {
            setLoading(false);
        }
    };

    const loadPatients = async () => {
        try {
            const res = await window.electronAPI.getPatients();
            if (res?.success) {
                setPatients(res.patients.map(p => ({
                    id: p.id,
                    name: `${p.first_name} ${p.last_name}`,
                    patient_id: p.patient_id
                })));
            }
        } catch (err) {
            console.error('Error loading patients:', err);
        }
    };

    const filteredNotes = caseNotes.filter(note => {
        const raw = note.rawData || {};
        const search = searchTerm.toLowerCase();
        return (
            !search ||
            (raw.patient_name || '').toLowerCase().includes(search) ||
            (raw.doctor_name || '').toLowerCase().includes(search) ||
            (raw.diagnosis || '').toLowerCase().includes(search) ||
            (raw.case_details || '').toLowerCase().includes(search)
        );
    });

    const openCreateModal = () => {
        setEditingNote(null);
        setForm({
            patientId: '',
            visitDate: new Date().toISOString().split('T')[0],
            caseDetails: '',
            caseHistory: '',
            ophthalmoscopy: '',
            previousRx: '',
            externals: '',
            diagnosis: '',
            recommendation: '',
            finalRxOd: '',
            finalRxOs: '',
            lensType: '',
            nextVisitDate: '',
            outstandingBill: ''
        });
        setError('');
        setShowModal(true);
    };

    const openEditModal = (note) => {
        const raw = note.rawData || {};
        setEditingNote(note);
        setForm({
            patientId: raw.patient_id || '',
            visitDate: raw.visit_date?.split('T')[0] || note.testDate?.split('T')[0] || new Date().toISOString().split('T')[0],
            caseDetails: raw.case_details || '',
            caseHistory: raw.case_history || '',
            ophthalmoscopy: raw.ophthalmoscopy || '',
            previousRx: raw.previous_rx || '',
            externals: raw.externals || '',
            diagnosis: raw.diagnosis || '',
            recommendation: raw.recommendation || '',
            finalRxOd: raw.final_rx?.od || '',
            finalRxOs: raw.final_rx?.os || '',
            lensType: raw.lens_type || '',
            nextVisitDate: raw.next_visit_date?.split('T')[0] || '',
            outstandingBill: raw.outstanding_bill || ''
        });
        setError('');
        setShowModal(true);
    };

    const handleSave = async () => {
        if (!form.patientId) {
            setError('Please select a patient');
            return;
        }
        if (!form.visitDate) {
            setError('Visit date is required');
            return;
        }
        if (!form.diagnosis && !form.caseDetails && !form.caseHistory) {
            setError('Please enter at least one clinical detail');
            return;
        }

        setSaving(true);
        setError('');
        try {
            const selectedPatient = patients.find(p => p.id === form.patientId);
            const payload = {
                source: 'case_note',
                doctor_id: user?.id || null,
                doctor_name: user?.name || '',
                patient_id: form.patientId,
                patient_name: selectedPatient?.name || '',
                visit_date: form.visitDate,
                case_details: form.caseDetails,
                case_history: form.caseHistory,
                ophthalmoscopy: form.ophthalmoscopy,
                previous_rx: form.previousRx,
                externals: form.externals,
                diagnosis: form.diagnosis,
                recommendation: form.recommendation,
                final_rx: { od: form.finalRxOd, os: form.finalRxOs },
                lens_type: form.lensType,
                next_visit_date: form.nextVisitDate || null,
                outstanding_bill: form.outstandingBill
            };

            let res;
            if (editingNote) {
                res = await testService.updateTest(editingNote.id, {
                    test_date: form.visitDate,
                    raw_data: JSON.stringify(payload)
                });
            } else {
                res = await testService.createTest({
                    patient_id: form.patientId,
                    machine_type: 'case_note',
                    eye: 'both',
                    test_date: form.visitDate,
                    raw_data: JSON.stringify(payload)
                });
            }

            if (res) {
                await loadCaseNotes();
                setShowModal(false);
            } else {
                setError('Failed to save case note');
            }
        } catch (err) {
            console.error('Error saving case note:', err);
            setError('Failed to save case note');
        } finally {
            setSaving(false);
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return 'N/A';
        const dt = new Date(dateStr);
        if (Number.isNaN(dt.getTime())) return dateStr;
        return dt.toLocaleDateString();
    };

    const handleDelete = async () => {
        if (!deleteConfirm) return;
        try {
            const res = await testService.deleteTest(deleteConfirm.id);
            if (res?.success) {
                await loadCaseNotes();
            } else {
                alert('Failed to delete case note');
            }
        } catch (err) {
            console.error('Error deleting case note:', err);
            alert('Failed to delete case note');
        } finally {
            setDeleteConfirm(null);
        }
    };

    const viewPatient = (patientId) => {
        navigate(`/patients/${patientId}`);
    };

    return (
        <div className="flex-1 p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Case Notes</h1>
                    <p className="text-slate-500 font-medium mt-1">Manage clinical case notes and documentation</p>
                </div>
                <button
                    onClick={openCreateModal}
                    className="px-6 py-3 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20 flex items-center gap-2"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    New Case Note
                </button>
            </div>

            <div className="card-premium">
                <div className="p-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="relative">
                        <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                            placeholder="Search by patient, doctor, diagnosis, or details..."
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center items-center py-24">
                        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : filteredNotes.length === 0 ? (
                    <div className="p-16 text-center">
                        <div className="w-20 h-20 rounded-3xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-200 mx-auto mb-6">
                            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">No Case Notes Yet</h3>
                        <p className="text-sm text-slate-500 font-medium max-w-sm mx-auto mt-2">
                            Create your first case note to start documenting clinical observations.
                        </p>
                        <button
                            onClick={openCreateModal}
                            className="mt-6 px-6 py-3 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20"
                        >
                            + Create First Case Note
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
                        {filteredNotes.map((note) => {
                            const raw = note.rawData || {};
                            const visitDate = raw.visit_date || note.testDate;
                            return (
                                <div key={note.id} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden group flex flex-col">
                                    <div className="p-5 bg-gradient-to-r from-indigo-50/70 to-purple-50/50 dark:from-indigo-900/20 dark:to-purple-900/10 border-b border-slate-100 dark:border-slate-800">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black text-xs">
                                                    {String(raw.doctor_name || 'Dr').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-900 dark:text-white">{raw.doctor_name || 'N/A'}</p>
                                                    <p className="text-[10px] text-slate-500 font-medium">{formatDate(visitDate)}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-5 flex-1 space-y-3">
                                        {raw.patient_name && (
                                            <div className="flex items-center justify-between">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Patient</p>
                                                <button
                                                    onClick={() => viewPatient(raw.patient_id)}
                                                    className="text-sm font-bold text-indigo-600 hover:text-indigo-700"
                                                >
                                                    {raw.patient_name}
                                                </button>
                                            </div>
                                        )}
                                        {raw.diagnosis && (
                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Diagnosis</p>
                                                <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mt-1 line-clamp-2">{raw.diagnosis}</p>
                                            </div>
                                        )}
                                        {raw.case_details && (
                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Case Details</p>
                                                <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">{raw.case_details}</p>
                                            </div>
                                        )}
                                        {(raw.final_rx?.od || raw.final_rx?.os) && (
                                            <div className="flex gap-4">
                                                {raw.final_rx?.od && (
                                                    <div>
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Rx OD</p>
                                                        <p className="text-sm font-mono font-bold text-slate-700 dark:text-slate-300">{raw.final_rx.od}</p>
                                                    </div>
                                                )}
                                                {raw.final_rx?.os && (
                                                    <div>
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Rx OS</p>
                                                        <p className="text-sm font-mono font-bold text-slate-700 dark:text-slate-300">{raw.final_rx.os}</p>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        {raw.lens_type && (
                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Lens</p>
                                                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{raw.lens_type}</p>
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                        <button
                                            onClick={() => viewPatient(raw.patient_id)}
                                            className="px-4 py-2 text-xs font-bold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition-all"
                                        >
                                            View Patient
                                        </button>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => openEditModal(note)}
                                                className="px-4 py-2 text-xs font-bold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-all"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => setDeleteConfirm(note)}
                                                className="px-4 py-2 text-xs font-bold rounded-lg bg-rose-600 text-white hover:bg-rose-700 transition-all"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-black text-slate-900 dark:text-white">
                                    {editingNote ? 'Edit Case Note' : 'New Case Note'}
                                </h2>
                                <p className="text-sm text-slate-500 mt-1">
                                    {editingNote ? 'Update clinical observations' : 'Record clinical observations'}
                                </p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-700">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="p-6 space-y-6">
                            {error && (
                                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                                    <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                                </div>
                            )}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Patient *</label>
                                    <select
                                        value={form.patientId}
                                        onChange={(e) => setForm(prev => ({ ...prev, patientId: e.target.value }))}
                                        disabled={!!editingNote}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
                                    >
                                        <option value="">Select patient...</option>
                                        {patients.map(p => (
                                            <option key={p.id} value={p.id}>{p.name} ({p.patient_id})</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Visit Date *</label>
                                    <input
                                        type="date"
                                        value={form.visitDate}
                                        onChange={(e) => setForm(prev => ({ ...prev, visitDate: e.target.value }))}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Case Details</label>
                                    <textarea
                                        value={form.caseDetails}
                                        onChange={(e) => setForm(prev => ({ ...prev, caseDetails: e.target.value }))}
                                        rows={3}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm resize-none focus:ring-2 focus:ring-indigo-500"
                                        placeholder="Enter case details..."
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Case History</label>
                                    <textarea
                                        value={form.caseHistory}
                                        onChange={(e) => setForm(prev => ({ ...prev, caseHistory: e.target.value }))}
                                        rows={3}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm resize-none focus:ring-2 focus:ring-indigo-500"
                                        placeholder="Enter case history..."
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Ophthalmoscopy</label>
                                    <textarea
                                        value={form.ophthalmoscopy}
                                        onChange={(e) => setForm(prev => ({ ...prev, ophthalmoscopy: e.target.value }))}
                                        rows={2}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm resize-none focus:ring-2 focus:ring-indigo-500"
                                        placeholder="Examination notes..."
                                    />
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Previous Rx</label>
                                        <input
                                            value={form.previousRx}
                                            onChange={(e) => setForm(prev => ({ ...prev, previousRx: e.target.value }))}
                                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
                                            placeholder="Previous prescription"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Externals</label>
                                        <input
                                            value={form.externals}
                                            onChange={(e) => setForm(prev => ({ ...prev, externals: e.target.value }))}
                                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
                                            placeholder="External observations"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Final Rx OD</label>
                                    <input
                                        value={form.finalRxOd}
                                        onChange={(e) => setForm(prev => ({ ...prev, finalRxOd: e.target.value }))}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono"
                                        placeholder="Right eye"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Final Rx OS</label>
                                    <input
                                        value={form.finalRxOs}
                                        onChange={(e) => setForm(prev => ({ ...prev, finalRxOs: e.target.value }))}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono"
                                        placeholder="Left eye"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Lens Type</label>
                                    <input
                                        value={form.lensType}
                                        onChange={(e) => setForm(prev => ({ ...prev, lensType: e.target.value }))}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
                                        placeholder="Lens type"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Diagnosis</label>
                                    <textarea
                                        value={form.diagnosis}
                                        onChange={(e) => setForm(prev => ({ ...prev, diagnosis: e.target.value }))}
                                        rows={2}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm resize-none focus:ring-2 focus:ring-indigo-500"
                                        placeholder="Diagnosis..."
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Recommendation</label>
                                    <textarea
                                        value={form.recommendation}
                                        onChange={(e) => setForm(prev => ({ ...prev, recommendation: e.target.value }))}
                                        rows={2}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm resize-none focus:ring-2 focus:ring-indigo-500"
                                        placeholder="Recommendations..."
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Next Visit Date</label>
                                    <input
                                        type="date"
                                        value={form.nextVisitDate}
                                        onChange={(e) => setForm(prev => ({ ...prev, nextVisitDate: e.target.value }))}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Outstanding Bill</label>
                                    <input
                                        value={form.outstandingBill}
                                        onChange={(e) => setForm(prev => ({ ...prev, outstandingBill: e.target.value }))}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
                                        placeholder="Amount owed"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                            <button
                                onClick={() => setShowModal(false)}
                                className="px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-sm font-bold hover:bg-slate-200 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="px-6 py-3 bg-indigo-600 text-white rounded-xl text-sm font-black hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20"
                            >
                                {saving ? 'Saving...' : (editingNote ? 'Update Case Note' : 'Save Case Note')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {deleteConfirm && (
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md">
                        <div className="p-6">
                            <div className="w-16 h-16 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-black text-slate-900 dark:text-white text-center mb-2">Delete Case Note?</h3>
                            <p className="text-sm text-slate-500 text-center mb-6">
                                This action cannot be undone. The case note will be permanently removed.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setDeleteConfirm(null)}
                                    className="flex-1 px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-sm font-bold hover:bg-slate-200 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDelete}
                                    className="flex-1 px-6 py-3 bg-rose-600 text-white rounded-xl text-sm font-bold hover:bg-rose-700 transition-all"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CaseNotesPage;
