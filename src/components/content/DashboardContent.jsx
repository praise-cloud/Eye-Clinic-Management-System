import React, { useState, useEffect } from 'react'
import logger from '../../utils/logger';
import { CLIENT_DATA } from '../../utils/constants'
import { DeleteIcon, EditIcon, ViewIcon } from '../Icons';
import ClientDetailContent from '../../pages/ClientDetailContent';
import usePatients from '../../hooks/usePatients';
import useTests from '../../hooks/useTests';
import { useNavigate } from 'react-router-dom';

const DashboardContent = ({ activeSection }) => {
  const navigate = useNavigate();
  const { patients, fetchPatients, removePatient, loading: patientsLoading } = usePatients();
  const { tests, fetchTests, loading: testsLoading } = useTests();
  const [selectedDate, setSelectedDate] = React.useState('');
  const [customDate, setCustomDate] = React.useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [viewingClient, setViewingClient] = useState(null);

  useEffect(() => {
    fetchPatients();
    fetchTests();
  }, [fetchPatients, fetchTests]);

  // Derived data for "Patients of the day" (showing all patients for now, sorted by newest)
  const clientList = React.useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());

    return patients.map(p => ({
      id: p.id,
      patient_id: p.patient_id || 'N/A',
      name: p.name || `${p.first_name || ''} ${p.last_name || ''}`.trim(),
      date: p.created_at ? new Date(p.created_at).toLocaleDateString() : 'N/A',
      case: p.reason_for_visit || 'No reason provided',
      phone: p.phone || p.contact || 'N/A',
      email: p.email || 'N/A',
      gender: p.gender || 'N/A',
      dob: p.dob || 'N/A',
      address: p.address || 'N/A',
      raw: p
    })).filter(p => {
      if (searchTerm) {
        const s = searchTerm.toLowerCase();
        if (!p.name.toLowerCase().includes(s) && !p.patient_id.toLowerCase().includes(s) && !p.case.toLowerCase().includes(s)) return false;
      }
      if (!selectedDate) return true;
      const pDate = p.raw.created_at ? new Date(p.raw.created_at) : null;
      if (!pDate) return true;
      if (selectedDate === 'today') return pDate >= todayStart;
      if (selectedDate === 'yesterday') return pDate >= yesterdayStart && pDate < todayStart;
      if (selectedDate === 'this_week') return pDate >= weekStart;
      if (selectedDate === 'custom' && customDate) {
        const cStart = new Date(customDate);
        const cEnd = new Date(customDate);
        cEnd.setDate(cEnd.getDate() + 1);
        return pDate >= cStart && pDate < cEnd;
      }
      return true;
    }).sort((a, b) => new Date(b.raw.created_at) - new Date(a.raw.created_at));
  }, [patients, searchTerm, selectedDate, customDate]);

  const todayNewClients = React.useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    return patients.filter(p => p.created_at && new Date(p.created_at) >= todayStart).length;
  }, [patients]);

  const totalPages = Math.ceil(clientList.length / rowsPerPage);
  const paginatedClients = clientList.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  // Reset to first page if rowsPerPage changes
  useEffect(() => {
    setCurrentPage(1);
  }, [rowsPerPage]);

  // Handle delete
  const handleDelete = async (id) => {
    const success = await removePatient(id);
    if (success) {
      setDeleteConfirm(null);
    } else {
      alert('Failed to delete client record');
    }
  };

  // Handle edit - navigate to patient detail page
  const handleEdit = (client) => {
    navigate(`/patients/${client.id}`);
  };

  // Handle save from patient detail - not used since we navigate
  const handleClientSave = (updatedClient) => {
    logger.debug('Client update triggered', { clientId: updatedClient?.id });
  };

  // Handle back from client detail
  const handleBackToDashboard = () => {
    setSelectedClient(null);
  };

  // Handle view - show client details in modal
  const handleView = (client) => {
    setViewingClient(client);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Completed': return 'text-green-600 bg-green-100'
      case 'In Progress': return 'text-yellow-600 bg-yellow-100'
      case 'Pending': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }
  // Show client detail page if a client is selected
  if (selectedClient) {
    return <ClientDetailContent client={selectedClient} onBack={handleBackToDashboard} onSave={handleClientSave} />;
  }

  return (
    <div className="space-y-10 max-w-7xl">
      {/* Stats Overview */}
      <div className="dashboard-grid h-auto">
        <div className="card-premium p-6 flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-sm">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
          </div>
          <div>
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Total Clients</p>
            <h3 className="text-3xl font-black text-slate-900 dark:text-white">{patients.length}</h3>
          </div>
        </div>
        <div className="card-premium p-6 flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 shadow-sm">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <div>
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Tests Conducted</p>
            <h3 className="text-3xl font-black text-slate-900 dark:text-white">{tests.length}</h3>
          </div>
        </div>
        <div className="card-premium p-6 flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 shadow-sm">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <div>
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Recent Activity</p>
            <h3 className="text-3xl font-black text-slate-900 dark:text-white">Live</h3>
          </div>
        </div>
        <div className="card-premium p-6 flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-cyan-50 flex items-center justify-center text-cyan-600 shadow-sm">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
          </div>
          <div>
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">New Clients Today</p>
            <h3 className="text-3xl font-black text-slate-900 dark:text-white">{todayNewClients}</h3>
          </div>
        </div>
      </div>

      <div className="card-premium overflow-hidden">
        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Today's Client Roster</h2>
            <p className="text-sm text-slate-500 font-medium mt-1">Real-time queue of clinical registrations</p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="relative group">
              <input
                type="text"
                className="input-premium pl-10 pr-4 py-2.5 text-sm w-full md:w-64"
                placeholder="Find client..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <svg className="absolute left-3.5 top-3 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>

            <div className="flex items-center gap-2">
              <select
                className="input-premium py-2.5 text-sm px-4 pr-10 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22currentColor%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%20%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25em_1.25em] bg-[right_0.5rem_center] bg-no-repeat"
                onChange={e => setSelectedDate(e.target.value)}
                value={selectedDate || ''}
              >
                <option value="">All Time</option>
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="this_week">This Week</option>
                <option value="custom">Custom Date</option>
              </select>
              {selectedDate === 'custom' && (
                <input
                  type="date"
                  className="input-premium py-2.5 text-sm px-4"
                  value={customDate}
                  onChange={e => setCustomDate(e.target.value)}
                />
              )}
            </div>
          </div>
        </div>

        {/* Client table or empty message */}
        {(patientsLoading || testsLoading) ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : clientList.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Client ID</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Client Name</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Registration Date</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Reason for Visit</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Contact Information</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {paginatedClients.map((client, idx) => (
                  <tr key={idx} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-5">
                      <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400">{client.patient_id}</span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-xs">
                          {client.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </div>
                        <div>
                          <span className="text-sm font-bold text-slate-900 dark:text-white block">{client.name}</span>
                          <span className="text-xs text-slate-400 capitalize">{client.gender}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-sm font-medium text-slate-600 dark:text-slate-400">{client.date}</td>
                    <td className="px-6 py-5 text-sm font-medium text-slate-600 dark:text-slate-400 truncate max-w-xs">{client.case}</td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{client.phone}</span>
                        <span className="text-xs text-slate-400">{client.email}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          className="w-9 h-9 rounded-xl flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-900/40 transition-all"
                          title="View Profile"
                          onClick={() => handleView(client)}
                        >
                          <ViewIcon className="w-4 h-4" />
                        </button>
                        <button
                          className="w-9 h-9 rounded-xl flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-900/40 transition-all"
                          title="Edit Records"
                          onClick={() => handleEdit(client)}
                        >
                          <EditIcon className="w-4 h-4" />
                        </button>
                        <button
                          className="w-9 h-9 rounded-xl flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-900/40 transition-all"
                          title="Erase Data"
                          onClick={() => setDeleteConfirm({ client, id: client.id })}
                        >
                          <DeleteIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="p-8 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-500 font-medium">Displaying</span>
                <select
                  className="input-premium py-1.5 px-3 text-sm pr-8"
                  value={rowsPerPage}
                  onChange={e => setRowsPerPage(Number(e.target.value))}
                >
                  <option value={5}>5 records</option>
                  <option value={10}>10 records</option>
                  <option value={20}>20 records</option>
                </select>
              </div>

              <div className="flex items-center gap-4">
                <span className="text-sm text-slate-500 font-bold">
                  Page <span className="text-indigo-600">{currentPage}</span> of {totalPages}
                </span>
                <div className="flex gap-2">
                  <button
                    className="btn btn-ghost px-4 bg-slate-50 disabled:opacity-30"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </button>
                  <button
                    className="btn btn-primary px-6"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next Page
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-300 mb-4">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            </div>
            <p className="text-slate-400 font-bold tracking-tight">No registered clients found</p>
            <p className="text-sm text-slate-400 mt-1">Try adjusting your search or filters</p>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 animate-premium-fade" onClick={() => setDeleteConfirm(null)}>
          <div className="card-premium p-8 max-w-md w-full mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-6">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">Erase Client Record?</h3>
            <p className="text-slate-500 font-medium mb-6">This action is irreversible. All medical history associated with <span className="text-slate-900 dark:text-white font-bold">{deleteConfirm.client.name}</span> will be permanently removed.</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="btn btn-ghost px-6"
              >
                No, Keep it
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm.id)}
                className="btn bg-rose-600 text-white hover:bg-rose-700 shadow-lg shadow-rose-200 px-8"
              >
                Yes, Erase Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {viewingClient && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 animate-premium-fade" onClick={() => setViewingClient(null)}>
          <div className="card-premium p-0 w-full max-w-lg mx-4 overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-8 bg-indigo-600 text-white">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-2xl font-black">
                    {viewingClient.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <h3 className="text-2xl font-black tracking-tight">{viewingClient.name}</h3>
                    <p className="text-white/70 font-bold uppercase text-[10px] tracking-widest mt-1">Client Profile</p>
                  </div>
                </div>
                <button
                  onClick={() => setViewingClient(null)}
                  className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-8 space-y-6 bg-white dark:bg-slate-900">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Client ID</label>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">#{viewingClient.id.toString().slice(-6)}</p>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Client Contact</label>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{viewingClient.phone}</p>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Clinical Details</label>
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400 leading-relaxed">{viewingClient.case}</p>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  onClick={() => setViewingClient(null)}
                  className="btn btn-primary px-10"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>

  )
}

export default DashboardContent
