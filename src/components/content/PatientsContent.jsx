import React, { useEffect, useImperativeHandle, forwardRef, useState } from 'react';
import usePatients from '../../hooks/usePatients';
import AddPatientModal from '../modals/AddPatientModal';
import PatientQuickViewModal from '../modals/PatientQuickViewModal';
import { useNavigate } from 'react-router-dom';

const PatientsContent = forwardRef(({ searchTerm }, ref) => {
  const navigate = useNavigate();
  const {
    patients,
    loading,
    error,
    fetchPatients,
    removePatient,
  } = usePatients();

  const [editingPatient, setEditingPatient] = useState(null);
  const [quickViewPatient, setQuickViewPatient] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  // Expose refresh method to parent component
  useImperativeHandle(ref, () => ({
    refreshPatients: () => {
      fetchPatients();
    }
  }), [fetchPatients]);

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    await removePatient(deleteConfirm.id);
    setDeleteConfirm(null);
  };

  const filteredPatients = patients.filter(patient => {
    const name = patient.name || `${patient.first_name || ''} ${patient.last_name || ''}`.trim();
    return name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const handleExportCSV = () => {
    if (filteredPatients.length === 0) return;

    const headers = ['Name', 'Age', 'Phone', 'Address', 'Email', 'Last Visit', 'Reason'];
    const csvRows = filteredPatients.map(p => [
      p.name || `${p.first_name} ${p.last_name}`,
      p.age || (p.dob ? new Date().getFullYear() - new Date(p.dob).getFullYear() : 'N/A'),
      p.phone || p.contact || 'N/A',
      `"${p.address || ''}"`,
      p.email || 'N/A',
      p.lastVisit || 'N/A',
      `"${p.reason_for_visit || ''}"`
    ].join(','));

    const csvContent = [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `patients_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.click();
  };

  return (
    <div className="card-premium overflow-hidden">
      <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Clinical Registry</h2>
          <p className="text-sm text-slate-500 font-medium mt-1">Directory of all registered eye clinic patients</p>
        </div>
        <button
          onClick={handleExportCSV}
          className="btn btn-primary px-6 flex items-center gap-3"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          <span className="font-bold">Export Dataset</span>
        </button>
      </div>

      <div className="overflow-x-auto">
        {(loading) ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : filteredPatients.length > 0 ? (
          <table className="min-w-full text-left">
            <thead className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Patient Profile</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Age</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Contact</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Recent Visit</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Management</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredPatients.map((patient) => {
                const patientName = patient.name || `${patient.first_name || ''} ${patient.last_name || ''}`.trim();
                const patientAge = patient.age || (patient.dob ? new Date().getFullYear() - new Date(patient.dob).getFullYear() : 'N/A');
                const patientPhone = patient.phone || patient.contact || 'N/A';

                return (
                  <tr key={patient.id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 font-bold text-xs flex items-center justify-center">
                          {patientName.split(' ').map(n => n[0]).join('')}
                        </div>
                        <span className="text-sm font-bold text-slate-900 dark:text-white">{patientName}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-sm font-medium text-slate-600 dark:text-slate-400">{patientAge} yrs</td>
                    <td className="px-8 py-5">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{patientPhone}</span>
                        <span className="text-xs text-slate-400">{patient.email || 'No email'}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-sm font-medium text-slate-600 dark:text-slate-400">{patient.lastVisit || 'N/A'}</td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setQuickViewPatient(patient)}
                          className="w-9 h-9 rounded-xl flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-900/40 transition-all"
                          title="View Quick Profile"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        </button>
                        <button
                          onClick={() => navigate(`/patients/${patient.id}`)}
                          className="w-9 h-9 rounded-xl flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-900/40 transition-all"
                          title="Full Patient Record"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                        <button
                          className="w-9 h-9 rounded-xl flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-900/40 transition-all"
                          onClick={() => setDeleteConfirm(patient)}
                          title="Delete Record"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-300 mb-4">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            </div>
            <p className="text-slate-400 font-bold tracking-tight">No clinical matches found</p>
            <p className="text-sm text-slate-400 mt-1">Refine your search parameters or add a new client</p>
          </div>
        )}
      </div>

      {editingPatient && (
        <AddPatientModal
          onClose={() => setEditingPatient(null)}
          editPatientData={editingPatient}
          onPatientAdded={() => fetchPatients()}
        />
      )}

      {quickViewPatient && (
        <PatientQuickViewModal
          patient={quickViewPatient}
          onClose={() => setQuickViewPatient(null)}
        />
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4 animate-premium-fade">
          <div className="card-premium bg-white dark:bg-slate-900 w-full max-w-sm p-8 shadow-2xl animate-premium-slide">
            <div className="w-16 h-16 bg-rose-50 dark:bg-rose-900/10 rounded-2xl flex items-center justify-center text-rose-600 mb-6 font-black scale-110">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">Revoke Registry Entrance</h3>
            <p className="text-sm text-slate-500 font-medium mt-3 leading-relaxed">Confirm deletion of clinical dossier for <b>{deleteConfirm.name || `${deleteConfirm.first_name} ${deleteConfirm.last_name}`}</b>. This action is terminal.</p>
            <div className="flex gap-3 mt-10">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl text-xs font-black tracking-widest uppercase hover:bg-slate-200 transition-all">Cancel</button>
              <button onClick={handleDelete} className="flex-1 py-3 bg-rose-500 text-white rounded-xl text-xs font-black tracking-widest uppercase shadow-lg shadow-rose-200 dark:shadow-none hover:bg-rose-600 transition-all active:scale-95">Purge Record</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

PatientsContent.displayName = 'PatientsContent';

export default PatientsContent;
