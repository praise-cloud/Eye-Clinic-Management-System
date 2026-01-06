import React, { useState, useEffect } from 'react'
import { CLIENT_DATA } from '../../utils/constants.js';
import { DeleteIcon, EditIcon, ViewIcon } from '../../components/Icons';
import ClientDetailContent from '../ClientDetailContent';
import AddPatientModal from '../../components/modals/AddPatientModal';
import useUser from '../../hooks/useUser';

const DoctorsDashboard = ({activeSection}) => {
  const { user } = useUser();
  const [selectedDate, setSelectedDate] = React.useState('');
  const [customDate, setCustomDate] = React.useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [clientList, setClientList] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [viewingClient, setViewingClient] = useState(null);
  const [showAddPatientModal, setShowAddPatientModal] = useState(false);
  const [syncStatus, setSyncStatus] = useState('checking');
  const [lastSyncTime, setLastSyncTime] = useState(null);

  // Filter clients based on search and date
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

  // Function to load patients from database
  const loadPatients = async () => {
    try {
      setLoading(true);
      const result = await window.electronAPI.getPatients();

      if (result.success) {
        // Transform database patients to match table structure
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
        setError('');
      } else {
        setError(result.error || 'Failed to load patients');
      }
    } catch (err) {
      console.error('Error loading patients:', err);
      setError('Failed to load patients');
    } finally {
      setLoading(false);
    }
  };

  // Function to check sync status
  const checkSyncStatus = async () => {
    try {
      const result = await window.electronAPI.checkOnlineStatus();
      if (result.success) {
        setSyncStatus(result.isOnline ? 'online' : 'offline');
      } else {
        setSyncStatus('offline');
      }
    } catch (err) {
      console.error('Error checking sync status:', err);
      setSyncStatus('offline');
    }
  };

  // Load patients from database on component mount
  useEffect(() => {
    loadPatients();
    checkSyncStatus();
  }, []);

  // Reset to first page if rowsPerPage changes
  useEffect(() => {
    setCurrentPage(1);
  }, [rowsPerPage]);

  // Handle delete
  const handleDelete = async () => {
    if (!deleteConfirm || !deleteConfirm.client) return;

    try {
      const result = await window.electronAPI.deletePatient(deleteConfirm.client.id);

      if (result.success) {
        // Refresh the patient list
        await loadPatients();
        setDeleteConfirm(null);
      } else {
        setError(result.error || 'Failed to delete patient');
        setDeleteConfirm(null);
      }
    } catch (err) {
      console.error('Error deleting patient:', err);
      setError('Failed to delete patient');
      setDeleteConfirm(null);
    }
  };

  // Handle edit - navigate to client detail
  const handleEdit = (client) => {
    setSelectedClient(client);
  };

  // Handle save from client detail - update the client data
  const handleClientSave = async (updatedClient) => {
    try {
      // Map the updated client data to database format
      const patientData = {
        patient_id: updatedClient.patient_id || selectedClient.patient_id,
        first_name: updatedClient.first_name || selectedClient.first_name,
        last_name: updatedClient.last_name || selectedClient.last_name,
        dob: updatedClient.date || selectedClient.date,
        gender: updatedClient.gender || selectedClient.gender,
        contact: updatedClient.phone || selectedClient.phone,
        email: updatedClient.email || selectedClient.email,
        address: updatedClient.address || selectedClient.address,
        reason_for_visit: updatedClient.reason_for_visit || selectedClient.reason_for_visit
      };

      const result = await window.electronAPI.updatePatient(selectedClient.id, patientData);

      if (result.success) {
        // Refresh the patient list to show updated data
        await loadPatients();
        setSelectedClient(null);
      } else {
        setError(result.error || 'Failed to update patient');
      }
    } catch (err) {
      console.error('Error updating patient:', err);
      setError('Failed to update patient');
    }
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

  return(
    <div className="flex flex-col mx-auto justify-center w-full">
        <div className="space-y-6">
          <div className="flex my-4">
            <div className="flex flex-col gap-4 bg-white dark:bg-gray-800 w-full rounded-md shadow px-5 py-4">
              <div className="flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <span className="text-xl font-semibold text-gray-600 dark:text-gray-300">Patient's of the day</span>
                    {/* Sync Status Indicator */}
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${
                        syncStatus === 'online' ? 'bg-green-500' :
                        syncStatus === 'offline' ? 'bg-red-500' :
                        'bg-yellow-500'
                      }`}></div>
                      <span className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                        {syncStatus === 'online' ? 'Synced' : syncStatus === 'offline' ? 'Offline' : 'Checking...'}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowAddPatientModal(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add Patient
                  </button>
              </div>

              <div className="flex items-center gap-5 w-2/3">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md p-3 w-full"
                  placeholder="name of case or clients name..."
                />

                <div className="flex items-center gap-3">
                  <div className="flex">
                  <p>Filter</p>
                </div>
                  {/* Date filter dropdown */}
                  <div className="relative">
                    <select
                      className="border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md p-2"
                      onChange={e => setSelectedDate(e.target.value)}
                      value={selectedDate || ''}
                    >
                      <option value="">Date</option>
                      <option value="today">Today</option>
                      <option value="yesterday">Yesterday</option>
                      <option value="this_week">This Week</option>
                      <option value="this_month">This Month</option>
                      <option value="custom">Custom...</option>
                    </select>
                    {/* If custom, show date picker */}
                    {selectedDate === 'custom' && (
                      <input
                        type="date"
                        className="absolute top-full left-0 mt-2 border border-gray-300 dark:border-gray-600 rounded-md p-2 bg-white dark:bg-gray-700 dark:text-white z-10"
                        onChange={e => setCustomDate(e.target.value)}
                        value={customDate || ''}
                      />
                    )}
                  </div>
              </div>

              {/* Show selected date filter with close icon */}
              {selectedDate && selectedDate !== '' && (
                <div className="flex w-56 items-center justify-center gap-1 bg-blue-50 border border-blue-200 rounded px-2 py-1 text-sm">
                  <span className="flex">
                    {selectedDate === 'custom' && customDate ? customDate : selectedDate.replace('_', ' ')}
                  </span>
                  <button
                    className="ml-1 text-blue-500 hover:text-blue-700"
                    onClick={() => {
                      setSelectedDate('');
                      setCustomDate('');
                    }}
                    aria-label="Remove date filter"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Client table or empty message */}
        {filteredClients.length > 0 ? (
          <div className="overflow-x-auto mt-4">

            <table className="min-w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md divide-y divide-gray-200 dark:divide-gray-700">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700 py-2">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300">Reason for Visit</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300">Phone Number</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300">Action</th>
                </tr>
              </thead>
              <tbody>
                {paginatedClients.map((client, idx) => (
                  <tr key={idx} className="border-t dark:border-gray-700">
                    <td className="px-6 py-3 text-sm text-gray-800 dark:text-gray-200">{client.name}</td>
                    <td className="px-6 py-3 text-sm text-gray-800 dark:text-gray-200">{client.date}</td>
                    <td className="px-6 py-3 text-sm text-gray-800 dark:text-gray-200 truncate max-w-xs">{client.case}</td>
                    <td className="px-6 py-3 text-sm text-gray-800 dark:text-gray-200">{client.phone}</td>
                    <td className="px-6 py-3 text-sm text-gray-800 dark:text-gray-200">{client.email}</td>
                    <td className="px-6 py-3 text-sm flex gap-3">
                      <button
                        className="text-red-500 hover:text-red-700"
                        title="Delete"
                        onClick={() => setDeleteConfirm({client, index: (currentPage - 1) * rowsPerPage + idx})}
                      >
                        <DeleteIcon />
                      </button>
                      <button
                        className="text-green-500 hover:text-green-700"
                        title="Edit"
                        onClick={() => handleEdit(client)}
                      >
                        <EditIcon />
                      </button>
                      <button
                        className="text-blue-500 hover:text-blue-700"
                        title="View"
                        onClick={() => handleView(client)}
                      >
                        <ViewIcon />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex items-center justify-between mt-4">
                  {/* Rows per page selector */}
                <div className="flex justify-end items-center mb-2 gap-2">
                  <label htmlFor="rowsPerPage" className="text-sm text-gray-600 dark:text-gray-400">Rows per page:</label>
                  <select
                    id="rowsPerPage"
                    className="border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md p-1 text-sm"
                    value={rowsPerPage}
                    onChange={e => setRowsPerPage(Number(e.target.value))}
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                </div>

                {/* Pagination controls */}
                <div className="flex justify-end items-center gap-2">
                  <button
                    className={`px-3 py-1 rounded border text-sm ${currentPage === 1 ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </button>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    className={`px-3 py-1 rounded border text-sm ${currentPage === totalPages ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </button>
                </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12">
            <span className="text-gray-400 dark:text-gray-500 text-lg font-semibold opacity-60">
              {searchTerm || selectedDate ? 'No matching patients found' : 'No Client Yet'}
            </span>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4 dark:text-white">Delete Patient Record</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-2">Are you sure you want to delete this patient record?</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6"><strong>{deleteConfirm.client.name}</strong> - {deleteConfirm.client.case}</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {viewingClient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setViewingClient(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold dark:text-white">Patient Details</h3>
              <button
                onClick={() => setViewingClient(null)}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
                <p className="text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 p-2 rounded">{viewingClient.name}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Date</label>
                <p className="text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 p-2 rounded">{viewingClient.date}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Phone Number</label>
                <p className="text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 p-2 rounded">{viewingClient.phone}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                <p className="text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 p-2 rounded">{viewingClient.email}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Case Description</label>
                <p className="text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 p-2 rounded min-h-[60px]">{viewingClient.case}</p>
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setViewingClient(null)}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Patient Modal */}
      {showAddPatientModal && (
        <AddPatientModal
          onClose={() => setShowAddPatientModal(false)}
          currentUser={user}
          onPatientAdded={loadPatients}
        />
      )}
    </div>

  )
}

export default DoctorsDashboard
