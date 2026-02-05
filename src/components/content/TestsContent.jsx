import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { DeleteIcon, EditIcon, ViewIcon } from '../Icons';
import useTests from '../../hooks/useTests';
import useUser from '../../hooks/useUser';
import UploadTestModal from '../modals/UploadTestModal';

const DEFAULT_ADDITIONAL_TESTS = [];

const TestsContent = ({ clientName, clientId, additionalTests = DEFAULT_ADDITIONAL_TESTS, mode = 'full' }) => {
  const navigate = useNavigate()
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [viewingTest, setViewingTest] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const { user } = useUser();

  const { tests: dbTests, fetchTests, removeTest } = useTests();

  useEffect(() => {
    fetchTests();
  }, [fetchTests]);

  const mappedDbTests = useMemo(() => dbTests.map(test => {
    return {
      id: test.id,
      patientId: test.patientId || test.patient_id,
      patientName: test.patientName || clientName || 'Unknown Patient',
      testType: test.testType || 'Unknown',
      eye: test.eye || 'both',
      result: test.result || 'Pending',
      date: test.date || 'N/A',
      notes: test.notes || '',
      imageData: test.imageData || null,
      fileName: test.fileName || null
    };
  }), [dbTests, clientName]);

  const allDisplayTests = useMemo(() => {
    // Merge database tests with additional tests
    let list = [...mappedDbTests, ...additionalTests];

    // Filter by mode if specified
    if (mode === 'scheduled') {
      list = list.filter(t => t.result?.toLowerCase() === 'scheduled');
    } else if (mode === 'completed') {
      list = list.filter(t => t.result?.toLowerCase() !== 'scheduled');
    }
    return list;
  }, [mappedDbTests, additionalTests, mode]);

  const totalPages = Math.ceil(allDisplayTests.length / rowsPerPage);
  const paginatedTests = allDisplayTests.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [rowsPerPage]);

  useEffect(() => {
    const maxPage = Math.ceil(allDisplayTests.length / rowsPerPage);
    if (currentPage > maxPage) {
      setCurrentPage(maxPage > 0 ? maxPage : 1);
    }
  }, [allDisplayTests.length, rowsPerPage]);

  const [selectedDate, setSelectedDate] = React.useState('');
  const [customDate, setCustomDate] = React.useState('');

  const getResultColor = (result) => {
    switch (result?.toLowerCase()) {
      case 'normal': return 'text-green-600 bg-green-100';
      case 'abnormal': return 'text-red-600 bg-red-100';
      case 'high': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  }

  return (
    <div className="space-y-6 animate-premium-fade">
      {/* Header with Search and Add Button */}
      <div className="card-premium p-6 flex flex-col md:flex-row gap-6 items-center justify-between">
        <div className="relative flex-1 w-full max-w-xl">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search test records by patient name or modality..."
            className="input-premium pl-12 py-3 shadow-sm"
          />
        </div>

        <button
          onClick={() => setShowUploadModal(true)}
          className="btn btn-primary px-8 py-3 flex items-center gap-3 shadow-xl shadow-indigo-100 dark:shadow-none w-full md:w-auto"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <span className="font-bold">New Test Acquisition</span>
        </button>
      </div>

      {/* Legacy Filter Bar (Keeping for now but styled) */}
      <div className="flex flex-wrap gap-4 px-2">
        <select
          className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-400 focus:ring-2 focus:ring-indigo-500 outline-none transition-all cursor-pointer"
          onChange={e => setSelectedDate(e.target.value)}
          value={selectedDate || ''}
        >
          <option value="">Filter by Date</option>
          <option value="today">Today</option>
          <option value="yesterday">Yesterday</option>
          <option value="this_week">This Week</option>
          <option value="this_month">This Month</option>
          <option value="custom">Custom Range...</option>
        </select>

        {selectedDate && (
          <div className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border border-indigo-100 dark:border-indigo-900/30">
            <span>{selectedDate.replace('_', ' ')}</span>
            <button onClick={() => setSelectedDate('')} className="hover:text-rose-500 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        )}
      </div>

      <div className="card-premium overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 bg-white dark:bg-gray-800 border border-gray-200 dark:border-none rounded-md">
            <thead className="bg-gray-50 dark:bg-gray-700 py-5">
              <tr>
                {(!clientId && !clientName) && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Patient Name</th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Test Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Eye</th>
                {mode !== 'scheduled' && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Result</th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">{mode === 'scheduled' ? 'Scheduled Date' : 'Date'}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Notes</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {paginatedTests
                .filter(test => {
                  if (clientId) return String(test.patientId) === String(clientId);
                  if (clientName) return test.patientName === clientName;
                  return true;
                })
                .map((test) => (
                  <tr key={test.id}>
                    {(!clientId && !clientName) && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{test.patientName}</td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{test.testType}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100 uppercase">{test.eye}</td>
                    {mode !== 'scheduled' && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getResultColor(test.result)}`}>
                          {test.result}
                        </span>
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{test.date}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100 max-w-xs truncate">{test.notes}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex gap-2">
                        <button
                          onClick={() => navigate(`/patients/${test.patientId}?testId=${test.id}`)}
                          className="text-blue-500 hover:text-blue-700 p-1"
                          title="View Details"
                        >
                          <ViewIcon />
                        </button>
                        <button
                          onClick={() => {
                            navigate(`/patients/${test.patientId}?testId=${test.id}`);
                          }}
                          className="text-green-500 hover:text-green-700 p-1"
                          title="Edit"
                        >
                          <EditIcon />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(test)}
                          className="text-red-500 hover:text-red-700 p-1"
                          title="Delete"
                        >
                          <DeleteIcon />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>

          <div className="flex items-center justify-between my-4 mx-5">
            <div className="flex justify-end items-center mb-2 gap-2">
              <label htmlFor="rowsPerPage" className="text-sm text-gray-600">Rows per page:</label>
              <select
                id="rowsPerPage"
                className="border border-gray-300 rounded-md p-1 text-sm dark:text-slate-800"
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
            <div className="flex justify-start items-center gap-2">
              <button
                className={`px-3 py-1 rounded border text-sm ${currentPage === 1 || totalPages === 0 ? 'bg-gray-200 text-gray-400 cursor-not-allowed dark:text-slate-800 ' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1 || totalPages === 0}
              >Previous</button>

              <span className="text-sm text-slate-600">Page {currentPage} of {totalPages || 1}</span>
              <button
                className={`px-3 py-1 rounded border text-sm ${currentPage === totalPages || totalPages === 0 ? 'bg-gray-200 text-gray-400 cursor-not-allowed dark:text-slate-800 ' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || totalPages === 0}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* View Test Details Modal */}
      {viewingTest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setViewingTest(null)}>
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Test Details</h3>
              <button
                onClick={() => setViewingTest(null)}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">Patient Name</label>
                <p className="text-gray-900 bg-gray-50 p-2 rounded">{viewingTest.patientName}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Test Type</label>
                <p className="text-gray-900 bg-gray-50 p-2 rounded">{viewingTest.testType}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Test Date</label>
                <p className="text-gray-900 bg-gray-50 p-2 rounded">{viewingTest.date}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Result</label>
                <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getResultColor(viewingTest.result)}`}>
                  {viewingTest.result}
                </span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Notes</label>
                <p className="text-gray-900 bg-gray-50 p-2 rounded min-h-[60px]">{viewingTest.notes}</p>
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setViewingTest(null)}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-white dark:bg-slate-900 rounded-lg p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-300">Delete Test</h3>
              <button
                onClick={() => setDeleteConfirm(null)}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                ✕
              </button>
            </div>

            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this test for <strong>{deleteConfirm.patientName}</strong>? This action cannot be undone.
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (deleteConfirm?.id) {
                    const success = await removeTest(deleteConfirm.id);
                    if (success) {
                      setDeleteConfirm(null);
                    } else {
                      alert('Failed to delete test from database.');
                    }
                  }
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Upload Test Modal */}
      {showUploadModal && (
        <UploadTestModal
          onClose={() => {
            setShowUploadModal(false);
            fetchTests();
          }}
          currentUser={user}
        />
      )}
    </div>
  );
}
export default TestsContent
