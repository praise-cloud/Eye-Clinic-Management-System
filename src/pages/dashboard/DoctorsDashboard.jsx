import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CLIENT_DATA } from '../../utils/constants.js';
import { DeleteIcon, EditIcon, ViewIcon } from '../../components/Icons';
import AddPatientModal from '../../components/modals/AddPatientModal';
import PatientQuickViewModal from '../../components/modals/PatientQuickViewModal';
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
  const [showAddPatientModal, setShowAddPatientModal] = useState(false);
  const [syncStatus, setSyncStatus] = useState('checking');

  // Load patients from database
  const loadPatients = async () => {
    try {
      setLoading(true);
      const result = await window.electronAPI.getPatients();

      if (result.success) {
        const transformedPatients = result.patients.map(patient => ({
          id: patient.id,
          name: `${patient.first_name} ${patient.last_name}`,
          date: patient.dob,
          case: patient.reason_for_visit || 'Not specified',
          phone: patient.contact || patient.phone_number || '',
          email: patient.email || '',
          patient_id: patient.patient_id,
          first_name: patient.first_name,
          last_name: patient.last_name,
          gender: patient.gender,
          address: patient.address,
          reason_for_visit: patient.reason_for_visit
        }));

        setClientList(transformedPatients);
      } else {
        setError(result.error || 'Failed to load patients');
      }
    } catch (err) {
      setError('Failed to load patients');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPatients();
  }, []);

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



  return (
    <div className="space-y-10 animate-premium-fade pb-10">
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
          <button
            onClick={() => setShowAddPatientModal(true)}
            className="btn btn-primary px-6 py-3 flex items-center gap-2 shadow-xl shadow-indigo-200 dark:shadow-none"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span className="font-bold">Add Patient</span>
          </button>
        </div>
      </div>

      {/* Analytics Micro-Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Today\'s Caseload', value: filteredClients.length, color: 'indigo', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
          { label: 'Pending Evaluations', value: '4', color: 'amber', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
          { label: 'Diagnostic Yield', value: '94%', color: 'emerald', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
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
              placeholder="Search by name, patient ID, or diagnostic reason..."
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
          ) : filteredClients.length > 0 ? (
            <table className="min-w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800 font-black text-[10px] text-slate-400 uppercase tracking-widest">
                  <th className="px-8 py-5">Full Name</th>
                  <th className="px-8 py-5">Registration Date</th>
                  <th className="px-8 py-5">Diagnostic Intent</th>
                  <th className="px-8 py-5">Telemetry / Contact</th>
                  <th className="px-8 py-5 text-right">Operations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {paginatedClients.map((client, idx) => (
                  <tr key={idx} className="group hover:bg-slate-50/50 dark:hover:bg-indigo-900/10 transition-colors">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 font-black text-xs group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                          {client.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight">{client.name}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{client.patient_id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-sm font-medium text-slate-600 dark:text-slate-400">{client.date}</td>
                    <td className="px-8 py-6">
                      <span className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg text-xs font-bold truncate max-w-[200px] inline-block">
                        {client.case}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{client.phone}</span>
                        <span className="text-[10px] text-slate-400 font-medium truncate max-w-[150px]">{client.email || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => handleView(client)} className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:bg-indigo-500 hover:text-white transition-all shadow-sm">
                          <ViewIcon />
                        </button>
                        <button onClick={() => handleEdit(client)} className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:bg-emerald-500 hover:text-white transition-all shadow-sm">
                          <EditIcon />
                        </button>
                        <button onClick={() => setDeleteConfirm(client)} className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:bg-rose-500 hover:text-white transition-all shadow-sm">
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">Zero Registry Matches</h3>
              <p className="text-sm text-slate-500 font-medium max-w-sm mt-2">No clinical records found matching your specified query parameters.</p>
              <button onClick={() => setSearchTerm('')} className="mt-8 text-xs font-black text-indigo-600 uppercase tracking-widest hover:text-indigo-700 transition-colors underline scale-100 hover:scale-110">Clear Filter Scope</button>
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
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Segment {currentPage} of {totalPages || 1}</span>
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
            <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">Revoke Patient Record?</h3>
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

      {showAddPatientModal && (
        <AddPatientModal
          onClose={() => setShowAddPatientModal(false)}
          currentUser={user}
          onPatientAdded={loadPatients}
        />
      )}
    </div>
  );
}

export default DoctorsDashboard
