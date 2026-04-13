import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CLIENT_DATA } from '../../utils/constants.js';
import { DeleteIcon, EditIcon, ViewIcon, DrugIcon } from '../../components/Icons';
import PatientQuickViewModal from '../../components/modals/PatientQuickViewModal';
import PrescribeModal from '../../components/modals/PrescribeModal';
import useUser from '../../hooks/useUser';

const DoctorsDashboard = ({ activeSection }) => {
  const { user } = useUser();
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState('');
  const [customDate, setCustomDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [clientList, setClientList] = useState([]);
  const [quickViewPatient, setQuickViewPatient] = useState(null);
  const [prescribePatient, setPrescribePatient] = useState(null);
  const [patientSearchTerm, setPatientSearchTerm] = useState('');
  const getInitialCaseNoteForm = (doctorName = '') => ({
    patientId: '',
    visitDate: '',
    caseDetails: '',
    caseHistory: '',
    ophthalmoscopy: '',
    previousRx: '',
    externals: '',
    visualAcuity: {
      unaided: {
        dist: { re: '', le: '' },
        near: { re: '', le: '' }
      },
      aided: {
        dist: { re: '', le: '' },
        near: { re: '', le: '' }
      }
    },
    objectiveRefraction: {
      re_va: '',
      le_va: ''
    },
    subjectiveRefraction: {
      re_add: '',
      re_va: '',
      le_add: '',
      le_va: ''
    },
    additionalOptions: {
      ret: false,
      autoRef: false
    },
    tonometry: {
      re: '',
      le: '',
      time: ''
    },
    diagnosis: '',
    recommendation: '',
    finalRx: {
      od: '',
      os: ''
    },
    lensType: '',
    nextVisitDate: '',
    doctorName,
    outstandingBill: ''
  });
  const [caseNoteForm, setCaseNoteForm] = useState(() => getInitialCaseNoteForm(user?.name || ''));
  const [savingCaseNote, setSavingCaseNote] = useState(false);
  const [syncStatus, setSyncStatus] = useState('checking');
  const [activePanel, setActivePanel] = useState('dashboard');
  const [dashboardStats, setDashboardStats] = useState({
    totalFulfilledPrescriptions: 0,
    pendingEvaluations: 0, // Mocked or fetched from elsewhere
    daiagnosticYield: 0 // Placeholder for future implementation
  });

  // Helper function to calculate age from DOB
  const calculateAge = (dob) => {
    if (!dob) return '';
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  // Load patients from database
  const loadPatients = async () => {
    try {
      setLoading(true);
      const result = await window.electronAPI.getPatients();

      if (result.success) {
        const transformedPatients = result.patients.map(patient => ({
          id: patient.id,
          name: `${patient.first_name} ${patient.last_name}`,
          dob: patient.dob || '',
          intake_date: patient.intake_date || '',
          case: patient.reason_for_visit || 'Not specified',
          phone: patient.contact || patient.phone_number || '',
          email: patient.email || '',
          patient_id: patient.patient_id || '',
          first_name: patient.first_name || '',
          last_name: patient.last_name || '',
          gender: patient.gender || '',
          address: patient.address || '',
          reason_for_visit: patient.reason_for_visit || ''
        }));

        setClientList(transformedPatients);
      } else {
        setError(result.error || 'Failed to load patients');
      }
    } catch (err) {
      console.error('Failed to load patients:', err);
      setError('Failed to load patients');
    } finally {
      setLoading(false);
    }
  };

  // Get selected patient helper
  const getSelectedPatient = () => {
    return clientList.find(p => p.id === caseNoteForm.patientId) || null;
  };

  const fetchDashboardStats = async () => {
    try {
      if (!window.electronAPI?.getDashboardStats) return;
      const res = await window.electronAPI.getDashboardStats();
      if (res?.success && res.stats) {
        setDashboardStats(prev => ({
          ...prev,
          totalFulfilledPrescriptions: res.stats.totalFulfilledPrescriptions || 0
        }));
      }
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
    }
  };

  useEffect(() => {
    loadPatients();
    fetchDashboardStats();

    if (window.electronAPI?.onIpcEvent) {
      const unsubscribe = window.electronAPI.onIpcEvent('data:update', () => {
        loadPatients();
        fetchDashboardStats();
      });
      return unsubscribe;
    }
  }, []);

  useEffect(() => {
    if (user?.name) {
      setCaseNoteForm(prev => ({
        ...prev,
        doctorName: prev.doctorName || user.name
      }));
    }
  }, [user?.name]);

  useEffect(() => {
    if (activeSection === 'case-note') {
      setActivePanel('case-note');
    }
    if (activeSection === 'dashboard') {
      setActivePanel('dashboard');
    }
  }, [activeSection]);

  // Filter logic
  const filteredClients = clientList.filter(client => {
    const matchesSearch = searchTerm === '' ||
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.case.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesDate = !selectedDate || selectedDate === '' ||
      (selectedDate === 'custom' && customDate ? client.date === customDate : true);

    return matchesSearch && matchesDate;
  });

  const totalPages = Math.ceil(filteredClients.length / rowsPerPage);
  const paginatedClients = filteredClients.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  const handleEdit = (client) => {
    navigate(`/patients/${client.id}`);
  };

  const handleView = (client) => {
    setQuickViewPatient(client);
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      const result = await window.electronAPI.deletePatient(deleteConfirm.id);
      if (result.success) {
        await loadPatients();
        setDeleteConfirm(null);
      }
    } catch (err) {
      setError('Deletion aborted due to system error');
    }
  };

  const saveCaseNote = async () => {
    if (!caseNoteForm.patientId) {
      setError('Select a client before saving case note.');
      return;
    }
    if (!caseNoteForm.visitDate) {
      setError('Visiting Date is required.');
      return;
    }
    if (!caseNoteForm.doctorName || !caseNoteForm.doctorName.trim()) {
      setError("Doctor's Name is required.");
      return;
    }
    const hasClinicalDetail = [
      caseNoteForm.caseDetails,
      caseNoteForm.caseHistory,
      caseNoteForm.ophthalmoscopy,
      caseNoteForm.diagnosis,
      caseNoteForm.recommendation
    ].some(value => String(value || '').trim().length > 0);
    if (!hasClinicalDetail) {
      setError('Enter at least one clinical detail (case details, case history, ophthalmoscopy, diagnosis, or recommendation).');
      return;
    }
    try {
      setSavingCaseNote(true);
      setError('');
      const selectedPatient = clientList.find(p => p.id === caseNoteForm.patientId);
      const payload = {
        source: 'case_note',
        doctor_id: user?.id || null,
        doctor_name: caseNoteForm.doctorName || user?.name || '',
        patient_id: caseNoteForm.patientId,
        patient_name: selectedPatient?.name || '',
        visit_date: caseNoteForm.visitDate || new Date().toISOString(),
        case_details: caseNoteForm.caseDetails,
        case_history: caseNoteForm.caseHistory,
        ophthalmoscopy: caseNoteForm.ophthalmoscopy,
        previous_rx: caseNoteForm.previousRx,
        externals: caseNoteForm.externals,
        visual_acuity: caseNoteForm.visualAcuity,
        objective_refraction: caseNoteForm.objectiveRefraction,
        subjective_refraction: caseNoteForm.subjectiveRefraction,
        additional_options: caseNoteForm.additionalOptions,
        tonometry: caseNoteForm.tonometry,
        diagnosis: caseNoteForm.diagnosis,
        recommendation: caseNoteForm.recommendation,
        final_rx: caseNoteForm.finalRx,
        lens_type: caseNoteForm.lensType,
        next_visit_date: caseNoteForm.nextVisitDate || null,
        outstanding_bill: caseNoteForm.outstandingBill
      };

      const res = await window.electronAPI.createTest({
        patient_id: caseNoteForm.patientId,
        machine_type: 'case_note',
        eye: 'both',
        test_date: caseNoteForm.visitDate || new Date().toISOString(),
        raw_data: JSON.stringify(payload)
      });

      if (!res?.success) {
        setError(res?.error || 'Failed to save case note.');
        return;
      }

      if (caseNoteForm.visitDate && window.electronAPI?.updatePatient) {
        await window.electronAPI.updatePatient(caseNoteForm.patientId, {
          intake_date: caseNoteForm.visitDate
        });
      }

      if (window.electronAPI?.createReport) {
        await window.electronAPI.createReport({
          patient_id: caseNoteForm.patientId,
          report_type: 'case_note_document',
          report_file: JSON.stringify({
            kind: 'case_note_document',
            test_id: res.id,
            patient_name: selectedPatient?.name || '',
            doctor_name: caseNoteForm.doctorName || user?.name || '',
            visit_date: caseNoteForm.visitDate,
            diagnosis: caseNoteForm.diagnosis,
            recommendation: caseNoteForm.recommendation,
            final_rx: caseNoteForm.finalRx,
            lens_type: caseNoteForm.lensType,
            visual_acuity: caseNoteForm.visualAcuity,
            tonometry: caseNoteForm.tonometry,
            case_details: caseNoteForm.caseDetails,
            case_history: caseNoteForm.caseHistory
          })
        });
      }

      setCaseNoteForm(prev => ({
        ...getInitialCaseNoteForm(prev.doctorName || user?.name || ''),
        patientId: prev.patientId,
        visitDate: prev.visitDate
      }));
      await loadPatients();
    } catch (err) {
      setError('Failed to save case note.');
    } finally {
      setSavingCaseNote(false);
    }
  };

  const clearCaseNote = () => {
    setCaseNoteForm(prev => ({
      ...getInitialCaseNoteForm(prev.doctorName || user?.name || ''),
      patientId: prev.patientId
    }));
  };



  return (
    <div className="flex gap-6">
      <div className="flex-1 space-y-10 animate-premium-fade pb-10">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Clinical Informatics</h1>
          <p className="text-slate-500 font-medium mt-1">Diagnostic oversight and patient volume management</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">System Online</span>
          </div>
        </div>
      </div>

      {activePanel === 'case-note' && (
      <div className="space-y-6">
        <div className="card-premium p-6 border border-slate-200/70 dark:border-slate-800/70">
          <div className="flex items-center justify-between mb-6 pb-6 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">New Case Note</h2>
              <p className="text-sm text-slate-500 font-medium mt-1">Record clinical observations and prescription details</p>
            </div>
            <button
              onClick={saveCaseNote}
              disabled={savingCaseNote}
              className="px-6 py-3 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              {savingCaseNote ? 'Saving...' : 'Save Case Note'}
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Patient</label>
                <div className="relative">
                  <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                  <input
                    type="text"
                    value={patientSearchTerm}
                    onChange={(e) => setPatientSearchTerm(e.target.value)}
                    placeholder="Search patient..."
                    className="w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                </div>
                <select
                  value={caseNoteForm.patientId}
                  onChange={(e) => {
                    const selectedPatient = clientList.find(p => p.id === e.target.value);
                    setCaseNoteForm(prev => ({ ...prev, patientId: e.target.value }));
                    if (selectedPatient) {
                      setPatientSearchTerm(selectedPatient.name);
                    }
                  }}
                  className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                >
                  <option value="">Select patient</option>
                  {clientList
                    .filter(p =>
                      patientSearchTerm === '' ||
                      p.name.toLowerCase().includes(patientSearchTerm.toLowerCase()) ||
                      (p.patient_id && p.patient_id.toLowerCase().includes(patientSearchTerm.toLowerCase()))
                    )
                    .map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Patient ID</label>
                  <div className="px-4 py-3.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono text-slate-600 dark:text-slate-300">
                    {getSelectedPatient()?.patient_id || 'Auto-generated'}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Visit Date</label>
                  <input
                    type="date"
                    value={caseNoteForm.visitDate}
                    onChange={(e) => setCaseNoteForm(prev => ({ ...prev, visitDate: e.target.value }))}
                    className="w-full px-4 py-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">DOB</label>
                  <div className="px-4 py-3.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-600 dark:text-slate-300">
                    {getSelectedPatient()?.dob || '-'}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Age</label>
                  <div className="px-4 py-3.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-600 dark:text-slate-300">
                    {getSelectedPatient()?.dob ? calculateAge(getSelectedPatient().dob) : '-'}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Gender</label>
                  <div className="px-4 py-3.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-600 dark:text-slate-300 capitalize">
                    {getSelectedPatient()?.gender || '-'}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Case Details</label>
                <textarea
                  value={caseNoteForm.caseDetails}
                  onChange={(e) => setCaseNoteForm(prev => ({ ...prev, caseDetails: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none"
                  placeholder="Enter case details..."
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Case History</label>
                <textarea
                  value={caseNoteForm.caseHistory}
                  onChange={(e) => setCaseNoteForm(prev => ({ ...prev, caseHistory: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none"
                  placeholder="Enter case history..."
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Ophthalmoscopy</label>
                <textarea
                  value={caseNoteForm.ophthalmoscopy}
                  onChange={(e) => setCaseNoteForm(prev => ({ ...prev, ophthalmoscopy: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none"
                  placeholder="Examination notes..."
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Previous Rx</label>
                  <input
                    value={caseNoteForm.previousRx}
                    onChange={(e) => setCaseNoteForm(prev => ({ ...prev, previousRx: e.target.value }))}
                    className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    placeholder="Rx"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Externals</label>
                  <input
                    value={caseNoteForm.externals}
                    onChange={(e) => setCaseNoteForm(prev => ({ ...prev, externals: e.target.value }))}
                    className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    placeholder="Externals"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <div className="p-5 bg-gradient-to-br from-indigo-50/50 to-purple-50/50 dark:from-indigo-900/10 dark:to-purple-900/10 rounded-2xl border border-indigo-100/50 dark:border-indigo-800/20">
              <h3 className="text-sm font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-widest mb-4">Visual Acuity</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3">Unaided - Distance</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400">RE</label>
                      <input value={caseNoteForm.visualAcuity.unaided.dist.re} onChange={(e) => setCaseNoteForm(prev => ({ ...prev, visualAcuity: { ...prev.visualAcuity, unaided: { ...prev.visualAcuity.unaided, dist: { ...prev.visualAcuity.unaided.dist, re: e.target.value } } } }))} className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500/20" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400">LE</label>
                      <input value={caseNoteForm.visualAcuity.unaided.dist.le} onChange={(e) => setCaseNoteForm(prev => ({ ...prev, visualAcuity: { ...prev.visualAcuity, unaided: { ...prev.visualAcuity.unaided, dist: { ...prev.visualAcuity.unaided.dist, le: e.target.value } } } }))} className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500/20" />
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3">Unaided - Near</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400">RE</label>
                      <input value={caseNoteForm.visualAcuity.unaided.near.re} onChange={(e) => setCaseNoteForm(prev => ({ ...prev, visualAcuity: { ...prev.visualAcuity, unaided: { ...prev.visualAcuity.unaided, near: { ...prev.visualAcuity.unaided.near, re: e.target.value } } } }))} className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500/20" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400">LE</label>
                      <input value={caseNoteForm.visualAcuity.unaided.near.le} onChange={(e) => setCaseNoteForm(prev => ({ ...prev, visualAcuity: { ...prev.visualAcuity, unaided: { ...prev.visualAcuity.unaided, near: { ...prev.visualAcuity.unaided.near, le: e.target.value } } } }))} className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500/20" />
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3">Aided - Distance</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400">RE</label>
                      <input value={caseNoteForm.visualAcuity.aided.dist.re} onChange={(e) => setCaseNoteForm(prev => ({ ...prev, visualAcuity: { ...prev.visualAcuity, aided: { ...prev.visualAcuity.aided, dist: { ...prev.visualAcuity.aided.dist, re: e.target.value } } } }))} className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500/20" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400">LE</label>
                      <input value={caseNoteForm.visualAcuity.aided.dist.le} onChange={(e) => setCaseNoteForm(prev => ({ ...prev, visualAcuity: { ...prev.visualAcuity, aided: { ...prev.visualAcuity.aided, dist: { ...prev.visualAcuity.aided.dist, le: e.target.value } } } }))} className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500/20" />
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3">Aided - Near</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400">RE</label>
                      <input value={caseNoteForm.visualAcuity.aided.near.re} onChange={(e) => setCaseNoteForm(prev => ({ ...prev, visualAcuity: { ...prev.visualAcuity, aided: { ...prev.visualAcuity.aided, near: { ...prev.visualAcuity.aided.near, re: e.target.value } } } }))} className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500/20" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400">LE</label>
                      <input value={caseNoteForm.visualAcuity.aided.near.le} onChange={(e) => setCaseNoteForm(prev => ({ ...prev, visualAcuity: { ...prev.visualAcuity, aided: { ...prev.visualAcuity.aided, near: { ...prev.visualAcuity.aided.near, le: e.target.value } } } }))} className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500/20" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-5 bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-900/10 dark:to-orange-900/10 rounded-2xl border border-amber-100/50 dark:border-amber-800/20">
                <h3 className="text-sm font-black text-amber-700 dark:text-amber-400 uppercase tracking-widest mb-4">Tonometry</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400">RE</label>
                    <input value={caseNoteForm.tonometry.re} onChange={(e) => setCaseNoteForm(prev => ({ ...prev, tonometry: { ...prev.tonometry, re: e.target.value } }))} className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-mono focus:ring-2 focus:ring-amber-500/20" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400">LE</label>
                    <input value={caseNoteForm.tonometry.le} onChange={(e) => setCaseNoteForm(prev => ({ ...prev, tonometry: { ...prev.tonometry, le: e.target.value } }))} className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-mono focus:ring-2 focus:ring-amber-500/20" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400">Time</label>
                    <input value={caseNoteForm.tonometry.time} onChange={(e) => setCaseNoteForm(prev => ({ ...prev, tonometry: { ...prev.tonometry, time: e.target.value } }))} className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-mono focus:ring-2 focus:ring-amber-500/20" />
                  </div>
                </div>
              </div>

              <div className="p-5 bg-gradient-to-br from-emerald-50/50 to-teal-50/50 dark:from-emerald-900/10 dark:to-teal-900/10 rounded-2xl border border-emerald-100/50 dark:border-emerald-800/20">
                <h3 className="text-sm font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest mb-4">Final Prescription</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400">Rx OD</label>
                    <input value={caseNoteForm.finalRx.od} onChange={(e) => setCaseNoteForm(prev => ({ ...prev, finalRx: { ...prev.finalRx, od: e.target.value } }))} className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-mono focus:ring-2 focus:ring-emerald-500/20" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400">Rx OS</label>
                    <input value={caseNoteForm.finalRx.os} onChange={(e) => setCaseNoteForm(prev => ({ ...prev, finalRx: { ...prev.finalRx, os: e.target.value } }))} className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-mono focus:ring-2 focus:ring-emerald-500/20" />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <label className="text-[10px] text-slate-400">Lens Type</label>
                    <input value={caseNoteForm.lensType} onChange={(e) => setCaseNoteForm(prev => ({ ...prev, lensType: e.target.value }))} className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
            <div className="p-5 bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl border border-slate-200/50 dark:border-slate-800/50">
              <h3 className="text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest mb-4">Diagnosis & Recommendation</h3>
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400">Diagnosis</label>
                  <textarea value={caseNoteForm.diagnosis} onChange={(e) => setCaseNoteForm(prev => ({ ...prev, diagnosis: e.target.value }))} rows={2} className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm resize-none focus:ring-2 focus:ring-indigo-500/20" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400">Recommendation</label>
                  <textarea value={caseNoteForm.recommendation} onChange={(e) => setCaseNoteForm(prev => ({ ...prev, recommendation: e.target.value }))} rows={2} className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm resize-none focus:ring-2 focus:ring-indigo-500/20" />
                </div>
              </div>
            </div>

            <div className="p-5 bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl border border-slate-200/50 dark:border-slate-800/50">
              <h3 className="text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest mb-4">Doctor Details</h3>
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400">Doctor's Name</label>
                  <input value={caseNoteForm.doctorName} onChange={(e) => setCaseNoteForm(prev => ({ ...prev, doctorName: e.target.value }))} className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400">Next Visit Date</label>
                  <input type="date" value={caseNoteForm.nextVisitDate} onChange={(e) => setCaseNoteForm(prev => ({ ...prev, nextVisitDate: e.target.value }))} className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400">Outstanding Bill</label>
                  <input value={caseNoteForm.outstandingBill} onChange={(e) => setCaseNoteForm(prev => ({ ...prev, outstandingBill: e.target.value }))} className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20" />
                </div>
              </div>
            </div>

            <div className="flex flex-col justify-end gap-3">
              <button onClick={clearCaseNote} className="w-full py-3.5 px-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                Clear Form
              </button>
            </div>
          </div>
        </div>
      </div>
      )}
      {activePanel === 'dashboard' && (
      <>
      {/* Analytics Micro-Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Today\'s Caseload', value: filteredClients.length, color: 'indigo', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
          { label: 'Pending Evaluations', value: dashboardStats.pendingEvaluations, color: 'amber', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
          { label: 'Fulfilled Drugs', value: dashboardStats.totalFulfilledPrescriptions, color: 'emerald', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
          { label: 'Diagnostic Yield', value: dashboardStats.daiagnosticYield, color: 'rose', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a２ ２ ０ ０１－２ －２z' },
        ].map((stat, i) => (
          <div key={i} className="card-premium p-6 flex items-center gap-5">
            <div className={`w-14 h-14 rounded-2xl bg-${stat.color}-50 dark:bg-${stat.color}-900/20 flex items-center justify-center text-${stat.color}-600 dark:text-${stat.color}-400`}>
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={stat.icon} />
              </svg>
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Card */}
      <div className="card-premium overflow-hidden">
        {/* Table Filters */}
        <div className="p-8 border-b border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-950/20 flex flex-col lg:flex-row gap-6 items-center">
          <div className="relative flex-1 w-full">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-premium pl-12 py-4"
              placeholder="Search by name, client ID, or diagnostic reason..."
            />
          </div>
          <div className="flex gap-4 w-full lg:w-auto">
            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="input-premium py-4 appearance-none pr-10"
            >
              <option value="">Temporal Access (All Time)</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="custom">Specified Range...</option>
            </select>
          </div>
        </div>

        {/* Table Area */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center gap-4">
              <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Accessing Clinical Database...</p>
            </div>
          ) : paginatedClients.length > 0 ? (
            <table className="min-w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800 font-black text-[10px] text-slate-400 uppercase tracking-widest">
                  <th className="px-6 py-4">Client ID</th>
                  <th className="px-6 py-4">Client Name</th>
                  <th className="px-6 py-4">Intake Date</th>
                  <th className="px-6 py-4">Contact</th>
                  <th className="px-6 py-4 text-right">Management</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {paginatedClients.map((client, idx) => (
                  <tr key={idx} className="group hover:bg-slate-50/50 dark:hover:bg-indigo-900/10 transition-colors">
                    <td className="px-6 py-5">
                      <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400">{client.patient_id}</span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-xs group-hover:bg-indigo-200 transition-colors">
                          {client.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900 dark:text-white block">{client.name}</p>
                          <p className="text-xs text-slate-400 capitalize">{client.gender}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-sm font-medium text-slate-600 dark:text-slate-400">{client.intake_date || client.date || 'N/A'}</td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{client.phone}</span>
                        <span className="text-xs text-slate-400 font-medium">{client.email || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => handleView(client)} className="w-9 h-9 rounded-xl flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-400 hover:bg-indigo-500 hover:text-white transition-all shadow-sm" title="View">
                          <ViewIcon />
                        </button>
                        <button onClick={() => handleEdit(client)} className="w-9 h-9 rounded-xl flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-400 hover:bg-emerald-500 hover:text-white transition-all shadow-sm" title="Edit">
                          <EditIcon />
                        </button>
                        <button onClick={() => setPrescribePatient(client)} className="w-9 h-9 rounded-xl flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-400 hover:bg-amber-500 hover:text-white transition-all shadow-sm" title="Prescribe Drug">
                          <DrugIcon className="w-5 h-5" />
                        </button>
                        <button onClick={() => setDeleteConfirm(client)} className="w-9 h-9 rounded-xl flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-400 hover:bg-rose-500 hover:text-white transition-all shadow-sm" title="Delete">
                          <DeleteIcon />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="py-24 flex flex-col items-center justify-center text-center px-10">
              <div className="w-20 h-20 rounded-3xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-200 mb-6">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">System Registry Clear</h3>
              <p className="text-sm text-slate-500 font-medium max-w-sm mt-2">No active records match the current identification parameters.</p>
            </div>
          )}
        </div>

        {/* Dynamic Footer / Pagination */}
        <div className="p-8 border-t border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-950/20 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Density Control</label>
            <select
              value={rowsPerPage}
              onChange={e => setRowsPerPage(Number(e.target.value))}
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
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-400 disabled:opacity-30 transition-all hover:bg-slate-100 active:scale-90 shadow-sm"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || totalPages === 0}
                className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-400 disabled:opacity-30 transition-all hover:bg-slate-100 active:scale-90 shadow-sm"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation & Secondary Modals */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-[150] p-4 animate-premium-fade">
          <div className="card-premium bg-white dark:bg-slate-900 w-full max-w-sm p-8 shadow-2xl animate-premium-slide">
            <div className="w-16 h-16 bg-rose-50 dark:bg-rose-900/10 rounded-2xl flex items-center justify-center text-rose-600 mb-6">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">Revoke Client Record?</h3>
            <p className="text-sm text-slate-500 font-medium mt-2 leading-relaxed">This will permanently purge the record of <b>{deleteConfirm.name}</b> from the clinical database.</p>
            <div className="flex gap-3 mt-10">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl text-xs font-black tracking-widest uppercase hover:bg-slate-200 transition-all">Cancel</button>
              <button onClick={handleDelete} className="flex-1 py-3 bg-rose-500 text-white rounded-xl text-xs font-black tracking-widest uppercase shadow-lg shadow-rose-200 dark:shadow-none hover:bg-rose-600 transition-all active:scale-95">Purge Record</button>
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

      {prescribePatient && (
        <PrescribeModal
          currentUser={user}
          initialPatientId={prescribePatient.id}
          onClose={() => setPrescribePatient(null)}
        />
      )}
      </>
      )}
      </div>
    </div>
  );
}

export default DoctorsDashboard
