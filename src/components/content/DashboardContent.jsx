import React, { useState, useEffect } from 'react'
import { CLIENT_DATA } from '../../utils/constants'
import { DeleteIcon, EditIcon, ViewIcon } from '../Icons';
import ClientDetailContent from '../../pages/ClientDetailContent';

const DashboardContent = ({activeSection}) => {
  const [selectedDate, setSelectedDate] = React.useState('');
  const [customDate, setCustomDate] = React.useState('');
  // Use client data from constants
  const clients = [
    { name: 'Dr. Ammar', date: '25/01/2024', case: 'Some pain in the eye ...', phone: '+0123456789', email: 'ammar@gmail.com' },
    { name: 'Dr. Khan', date: '25/01/2024', case: 'Some pain in the eye ...', phone: '+0123456789', email: 'khan@gmail.com' },
    { name: 'Dr. Abdullah', date: '24/01/2024', case: 'Some pain in the eye ...', phone: '+0123456789', email: 'abdullah@gmail.com' },
    { name: 'Dr. Alia', date: '13/01/2024', case: 'Some pain in the eye ...', phone: '+0123456789', email: 'ali@gmail.com' },
    { name: 'Dr. Ammar', date: '25/01/2024', case: 'Some pain in the eye ...', phone: '+0123456789', email: 'ammar@gmail.com' },
    { name: 'Dr. Khan', date: '25/01/2024', case: 'Some pain in the eye ...', phone: '+0123456789', email: 'khan@gmail.com' },
    { name: 'Dr. Abdullah', date: '24/01/2024', case: 'Some pain in the eye ...', phone: '+0123456789', email: 'abdullah@gmail.com' },
    { name: 'Dr. Alia', date: '13/01/2024', case: 'Some pain in the eye ...', phone: '+0123456789', email: 'ali@gmail.com' },
    { name: 'Dr. Ammar', date: '25/01/2024', case: 'Some pain in the eye ...', phone: '+0123456789', email: 'ammar@gmail.com' },
    { name: 'Dr. Khan', date: '25/01/2024', case: 'Some pain in the eye ...', phone: '+0123456789', email: 'khan@gmail.com' },
    { name: 'Dr. Abdullah', date: '24/01/2024', case: 'Some pain in the eye ...', phone: '+0123456789', email: 'abdullah@gmail.com' },
    { name: 'Dr. Alia', date: '13/01/2024', case: 'Some pain in the eye ...', phone: '+0123456789', email: 'ali@gmail.com' },
  ];

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [clientList, setClientList] = useState(clients);
  const [selectedClient, setSelectedClient] = useState(null);
  const [viewingClient, setViewingClient] = useState(null);
  const totalPages = Math.ceil(clientList.length / rowsPerPage);
  const paginatedClients = clientList.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  // Reset to first page if rowsPerPage changes
  useEffect(() => {
    setCurrentPage(1);
  }, [rowsPerPage]);

  // Handle delete
  const handleDelete = (clientIndex) => {
    setClientList(prev => prev.filter((_, index) => index !== clientIndex));
    setDeleteConfirm(null);
  };

  // Handle edit - navigate to client detail
  const handleEdit = (client) => {
    setSelectedClient(client);
  };

  // Handle save from client detail - update the client data
  const handleClientSave = (updatedClient) => {
    // Update in local state
    setClientList(prev => prev.map(client =>
      client.name === selectedClient.name && client.email === selectedClient.email
        ? { ...client, ...updatedClient }
        : client
    ));

    // Here you would typically save to backend/database
    // await api.updateClient(updatedClient);

    console.log('Client updated across application:', updatedClient);
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
            <div className="flex flex-col gap-4 bg-white w-full rounded-md shadow px-5 py-4">
              <div>
                  <span className="text-xl font-semibold text-gray-600">Patient's of the day</span>
              </div>

              <div className="flex items-center gap-5 w-2/3">
                <input type="text" className="border border-gray-300 rounded-md p-3 w-full" placeholder="name of case or clients name..." />

                <div className="flex items-center gap-3">
                  <div className="flex">
                  <p>Filter</p>
                </div>
                  {/* Date filter dropdown */}
                  <div className="relative">
                    <select
                      className="border border-gray-300 rounded-md p-2"
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
                        className="absolute top-full left-0 mt-2 border border-gray-300 rounded-md p-2 bg-white z-10"
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
        {clients.length > 0 ? (
          <div className="overflow-x-auto mt-4">

            <table className="min-w-full bg-white border border-gray-200 rounded-md divide-y divide-gray-200 ">
              <thead>
                <tr className="bg-gray-50 py-2">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Case</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Phone Number</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Action</th>
                </tr>
              </thead>
              <tbody>
                {paginatedClients.map((client, idx) => (
                  <tr key={idx} className="border-t">
                    <td className="px-6 py-3 text-sm text-gray-800">{client.name}</td>
                    <td className="px-6 py-3 text-sm text-gray-800">{client.date}</td>
                    <td className="px-6 py-3 text-sm text-gray-800 truncate max-w-xs">{client.case}</td>
                    <td className="px-6 py-3 text-sm text-gray-800">{client.phone}</td>
                    <td className="px-6 py-3 text-sm text-gray-800">{client.email}</td>
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
                  <label htmlFor="rowsPerPage" className="text-sm text-gray-600">Rows per page:</label>
                  <select
                    id="rowsPerPage"
                    className="border border-gray-300 rounded-md p-1 text-sm"
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
                  <span className="text-sm text-gray-600">
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
            <span className="text-gray-400 text-lg font-semibold opacity-60">No Client Yet</span>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">Delete Patient Record</h3>
            <p className="text-gray-600 mb-2">Are you sure you want to delete this patient record?</p>
            <p className="text-sm text-gray-500 mb-6"><strong>{deleteConfirm.client.name}</strong> - {deleteConfirm.client.case}</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm.index)}
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
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Patient Details</h3>
              <button
                onClick={() => setViewingClient(null)}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <p className="text-gray-900 bg-gray-50 p-2 rounded">{viewingClient.name}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Date</label>
                <p className="text-gray-900 bg-gray-50 p-2 rounded">{viewingClient.date}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                <p className="text-gray-900 bg-gray-50 p-2 rounded">{viewingClient.phone}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <p className="text-gray-900 bg-gray-50 p-2 rounded">{viewingClient.email}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Case Description</label>
                <p className="text-gray-900 bg-gray-50 p-2 rounded min-h-[60px]">{viewingClient.case}</p>
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
    </div>

  )
}

export default DashboardContent