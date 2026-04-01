import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { DeleteIcon, EditIcon, ViewIcon, CloseIcon } from '../Icons';
import useTests from '../../hooks/useTests';
import useUser from '../../hooks/useUser';
import UploadTestModal from '../modals/UploadTestModal';

const DEFAULT_ADDITIONAL_TESTS = [];

const TestsContent = ({ clientName, clientId, additionalTests = DEFAULT_ADDITIONAL_TESTS, mode = 'full' }) => {
  const navigate = useNavigate()
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [viewingResult, setViewingResult] = useState(null);
  const [editingResult, setEditingResult] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [notification, setNotification] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const { user } = useUser();

  const { tests: dbTests, fetchTests, removeTest, updateTest } = useTests();

  useEffect(() => {
    fetchTests();
  }, [fetchTests]);

  const mappedDbTests = useMemo(() => dbTests.map(test => {
    return {
      id: test.id,
      patientId: test.patientId || test.patient_id,
      patientName: test.patientName || test.patient_name || clientName || 'Unknown Client',
      testType: test.testType || test.machine_type || 'Visual Field',
      eye: test.eye || 'both',
      result: test.result || 'Pending',
      date: test.date || test.test_date || 'N/A',
      notes: test.notes || '',
      rawData: test.rawData || test.raw_data || {},
      imageData: test.imageData || null,
      fileName: test.fileName || null
    };
  }), [dbTests, clientName]);

  const allDisplayTests = useMemo(() => {
    let list = [...mappedDbTests, ...additionalTests];

    if (mode === 'scheduled') {
      list = list.filter(t => t.result?.toLowerCase() === 'scheduled');
    } else if (mode === 'completed') {
      list = list.filter(t => t.result?.toLowerCase() !== 'scheduled');
    }
    return list;
  }, [mappedDbTests, additionalTests, mode]);

  const filteredTests = useMemo(() => {
    if (!searchTerm) return allDisplayTests;
    const term = searchTerm.toLowerCase();
    return allDisplayTests.filter(t =>
      t.patientName?.toLowerCase().includes(term) ||
      t.testType?.toLowerCase().includes(term) ||
      t.result?.toLowerCase().includes(term)
    );
  }, [allDisplayTests, searchTerm]);

  const totalPages = Math.ceil(filteredTests.length / rowsPerPage);
  const paginatedTests = filteredTests.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [rowsPerPage, searchTerm]);

  useEffect(() => {
    const maxPage = Math.ceil(filteredTests.length / rowsPerPage);
    if (currentPage > maxPage) {
      setCurrentPage(maxPage > 0 ? maxPage : 1);
    }
  }, [filteredTests.length, rowsPerPage]);

  const [selectedDate, setSelectedDate] = React.useState('');

  const getResultColor = (result) => {
    switch (result?.toLowerCase()) {
      case 'normal': return 'text-green-600 bg-green-100 dark:bg-green-900/30';
      case 'abnormal': return 'text-red-600 bg-red-100 dark:bg-red-900/30';
      case 'high': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30';
      case 'low': return 'text-blue-600 bg-blue-100 dark:bg-blue-900/30';
      case 'pending': return 'text-gray-600 bg-gray-100 dark:bg-gray-700';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-700';
    }
  }

  const handleDelete = async (testId) => {
    try {
      if (window.electronAPI?.deleteTest) {
        const result = await window.electronAPI.deleteTest(testId);
        if (result.success) {
          setDeleteConfirm(null);
          setNotification({ type: 'success', message: 'Result deleted successfully.' });
          fetchTests();
        } else {
          setNotification({ type: 'error', message: result.error || 'Failed to delete result.' });
        }
      } else {
        const success = await removeTest(testId);
        if (success) {
          setDeleteConfirm(null);
          setNotification({ type: 'success', message: 'Result deleted successfully.' });
          fetchTests();
        } else {
          setNotification({ type: 'error', message: 'Failed to delete result.' });
        }
      }
    } catch (err) {
      console.error('Delete error:', err);
      setNotification({ type: 'error', message: 'Error deleting result.' });
    }
  };

  const handleEdit = async () => {
    if (!editingResult) return;
    try {
      let rawData = editingResult.rawData;
      if (typeof rawData === 'string') {
        rawData = JSON.parse(rawData);
      }
      rawData = rawData || {};
      rawData.result = editingResult.result;
      rawData.notes = editingResult.notes;

      if (window.electronAPI?.updateTest) {
        const result = await window.electronAPI.updateTest(editingResult.id, {
          eye: editingResult.eye,
          machine_type: editingResult.testType,
          raw_data: JSON.stringify(rawData)
        });
        if (result.success) {
          setEditingResult(null);
          setNotification({ type: 'success', message: 'Result updated successfully.' });
          fetchTests();
        } else {
          setNotification({ type: 'error', message: result.error || 'Failed to update result.' });
        }
      }
    } catch (err) {
      console.error('Update error:', err);
      setNotification({ type: 'error', message: 'Error updating result.' });
    }
  };

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
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search results by patient name, type, or status..."
            className="input-premium pl-12 py-3 shadow-sm"
          />
        </div>

        {(user?.role === 'doctor' || user?.role === 'assistant') && (
          <button
            onClick={() => setShowUploadModal(true)}
            className="btn btn-primary px-8 py-3 flex items-center gap-3 shadow-xl shadow-indigo-100 dark:shadow-none w-full md:w-auto"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span className="font-bold">New Result</span>
          </button>
        )}
      </div>

      {notification && (
        <div className={`card-premium p-4 flex items-center gap-3 ${notification.type === 'success'
          ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 border border-emerald-100 dark:border-emerald-900/30'
          : 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 border border-rose-100 dark:border-rose-900/30'
          }`}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {notification.type === 'success' ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            )}
          </svg>
          <span className="font-bold text-sm">{notification.message}</span>
        </div>
      )}

      {/* Filter Bar */}
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Client Name</th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Eye</th>
                {mode !== 'scheduled' && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Result</th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">{mode === 'scheduled' ? 'Scheduled Date' : 'Date'}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {paginatedTests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    <div className="flex flex-col items-center">
                      <svg className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="font-medium">No results found</p>
                      <p className="text-sm text-gray-400 mt-1">Results will appear here when created</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedTests
                  .filter(test => {
                    if (clientId) return String(test.patientId) === String(clientId);
                    if (clientName) return test.patientName === clientName;
                    
                    // Date filtering
                    if (selectedDate) {
                      const testDate = new Date(test.date);
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      
                      if (selectedDate === 'today') {
                        const testDay = new Date(testDate);
                        testDay.setHours(0, 0, 0, 0);
                        return testDay.getTime() === today.getTime();
                      } else if (selectedDate === 'yesterday') {
                        const yesterday = new Date(today);
                        yesterday.setDate(yesterday.getDate() - 1);
                        const testDay = new Date(testDate);
                        testDay.setHours(0, 0, 0, 0);
                        return testDay.getTime() === yesterday.getTime();
                      } else if (selectedDate === 'this_week') {
                        const weekAgo = new Date(today);
                        weekAgo.setDate(weekAgo.getDate() - 7);
                        return testDate >= weekAgo;
                      } else if (selectedDate === 'this_month') {
                        const monthAgo = new Date(today);
                        monthAgo.setMonth(monthAgo.getMonth() - 1);
                        return testDate >= monthAgo;
                      }
                    }
                    return true;
                  })
                  .map((test) => (
                    <tr key={test.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      {(!clientId && !clientName) && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{test.patientName}</td>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100 max-w-52">{test.testType}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100 uppercase">{test.eye}</td>
                      {mode !== 'scheduled' && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getResultColor(test.result)}`}>
                            {test.result}
                          </span>
                        </td>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{test.date}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex gap-2">
                          <button
                            onClick={() => setViewingResult(test)}
                            className="text-blue-500 hover:text-blue-700 p-1"
                            title="View Details"
                          >
                            <ViewIcon />
                          </button>
                          {(user?.role === 'doctor' || user?.role === 'assistant') && (
                            <>
                              <button
                                onClick={() => setEditingResult({ ...test })}
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
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>

          <div className="flex items-center justify-between my-4 mx-5">
            <div className="flex justify-end items-center mb-2 gap-2">
              <label htmlFor="rowsPerPage" className="text-sm text-gray-600 dark:text-gray-400">Rows per page:</label>
              <select
                id="rowsPerPage"
                className="border border-gray-300 rounded-md p-1 text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                value={rowsPerPage}
                onChange={e => setRowsPerPage(Number(e.target.value))}
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
            <div className="flex justify-start items-center gap-2">
              <button
                className={`px-3 py-1 rounded border text-sm ${currentPage === 1 || totalPages === 0 ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-100 dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600'}`}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1 || totalPages === 0}
              >Previous</button>

              <span className="text-sm text-slate-600 dark:text-gray-400">Page {currentPage} of {totalPages || 1}</span>
              <button
                className={`px-3 py-1 rounded border text-sm ${currentPage === totalPages || totalPages === 0 ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-100 dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600'}`}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || totalPages === 0}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* View Result Details Modal */}
      {viewingResult && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setViewingResult(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 w-full max-w-md mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Result Details</h3>
              <button
                onClick={() => setViewingResult(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Client Name</label>
                <p className="text-gray-900 dark:text-white font-medium">{viewingResult.patientName}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Type</label>
                  <p className="text-gray-900 dark:text-white">{viewingResult.testType}</p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Eye</label>
                  <p className="text-gray-900 dark:text-white uppercase">{viewingResult.eye}</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Result</label>
                <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getResultColor(viewingResult.result)}`}>
                  {viewingResult.result}
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Date</label>
                <p className="text-gray-900 dark:text-white">{viewingResult.date}</p>
              </div>

              {viewingResult.notes && (
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Notes</label>
                  <p className="text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-slate-700 p-3 rounded-lg text-sm">{viewingResult.notes}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end mt-6 gap-3">
              <button
                onClick={() => setViewingResult(null)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300"
              >
                Close
              </button>
              {(user?.role === 'doctor' || user?.role === 'assistant') && (
                <button
                  onClick={() => {
                    setViewingResult(null);
                    setEditingResult({ ...viewingResult });
                  }}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                >
                  Edit Result
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Result Modal */}
      {editingResult && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setEditingResult(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 w-full max-w-md mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Edit Result</h3>
              <button
                onClick={() => setEditingResult(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Client</label>
                <p className="text-gray-900 dark:text-white font-medium">{editingResult.patientName}</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Type</label>
                <select
                  value={editingResult.testType}
                  onChange={(e) => setEditingResult({ ...editingResult, testType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-slate-700 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Visual Acuity Test">Visual Acuity Test</option>
                  <option value="Refraction Test">Refraction Test</option>
                  <option value="Intraocular Pressure">Intraocular Pressure</option>
                  <option value="Visual Field Test">Visual Field Test</option>
                  <option value="Color Vision Test">Color Vision Test</option>
                  <option value="Henson 8000">Henson 8000</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Eye</label>
                <select
                  value={editingResult.eye}
                  onChange={(e) => setEditingResult({ ...editingResult, eye: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-slate-700 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="left">Left</option>
                  <option value="right">Right</option>
                  <option value="both">Both</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Result Status</label>
                <select
                  value={editingResult.result}
                  onChange={(e) => setEditingResult({ ...editingResult, result: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-slate-700 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Pending">Pending</option>
                  <option value="Normal">Normal</option>
                  <option value="Abnormal">Abnormal</option>
                  <option value="High">High</option>
                  <option value="Low">Low</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Notes</label>
                <textarea
                  value={editingResult.notes || ''}
                  onChange={(e) => setEditingResult({ ...editingResult, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-slate-700 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="Add clinical notes..."
                />
              </div>
            </div>

            <div className="flex justify-end mt-6 gap-3">
              <button
                onClick={() => setEditingResult(null)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleEdit}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 font-medium"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 w-full max-w-md mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Delete Result</h3>
              <button
                onClick={() => setDeleteConfirm(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>

            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete this result for <strong className="text-gray-900 dark:text-white">{deleteConfirm.patientName}</strong>? This action cannot be undone.
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm.id)}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Result Modal */}
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
