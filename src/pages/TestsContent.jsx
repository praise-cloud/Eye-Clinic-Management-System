import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { DeleteIcon, EditIcon, ViewIcon } from '../components/Icons';
import useTests from '../hooks/useTests';

const TestsContent = ({ clientName, additionalTests = [] }) => {
  const navigate = useNavigate()
  const [tests, setTests] = useState([])
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [viewingTest, setViewingTest] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const { tests: dbTests, fetchTests } = useTests();

  useEffect(() => {
    fetchTests();
  }, [fetchTests]);

  const mappedDbTests = useMemo(() => dbTests.map(test => ({
    id: test.id,
    patientName: `${test.first_name} ${test.last_name}`,
    testType: test.machine_type || 'Unknown',
    result: 'Completed',
    date: test.test_date ? new Date(test.test_date).toLocaleDateString() : '',
    notes: `${test.eye} eye test`
  })), [dbTests]);

  const totalPages = Math.ceil(tests.length / rowsPerPage);
  const paginatedTests = tests.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [rowsPerPage]);

  useEffect(() => {
    const maxPage = Math.ceil(tests.length / rowsPerPage);
    if (currentPage > maxPage) {
      setCurrentPage(maxPage > 0 ? maxPage : 1);
    }
  }, [tests.length, rowsPerPage]);

  const [selectedDate, setSelectedDate] = React.useState('');
  const [customDate, setCustomDate] = React.useState('');

  const additionalTestsRef = useRef(additionalTests);

  useEffect(() => {
    // Merge database tests with additional tests from TestResultsContent
    const allTests = [...mappedDbTests, ...additionalTests];
    // setTests(allTests);
  }, [mappedDbTests, additionalTests])
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
    <div className="">
      <div className="flex my-5">
        <div className="flex flex-col gap-4 bg-white  dark:bg-gray-800 w-full rounded-md shadow px-5 py-4">
          <div className="flex items-center gap-5 w-2/3">
            <input type="text" className="border border-gray-300  dark:bg-gray-700 dark:text-gray-600 rounded-md p-3 w-full" placeholder="name of case or clients name..." />
            <div className="flex items-center gap-3">
              <div className="flex">
                <p className="dark:text-gray-600">Filter</p>
              </div>
              {/* Date filter dropdown */}
              <div className="relative">
                <select
                  className="border border-gray-300 rounded-md p-2 dark:bg-gray-700 dark:text-white"

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
                    className="absolute top-full left-0 mt-2 border border-gray-300 rounded-md p-2 bg-white  z-10"
                    onChange={e => setCustomDate(e.target.value)}
                    value={customDate || ''}
                  />
                )}
              </div>
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
      <div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 bg-white border border-gray-200 dark:border-none rounded-md">
            <thead className="bg-gray-50 dark:bg-gray-800 py-5">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Patient Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Test Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Result</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedTests
                .filter(test => !clientName || test.patientName === clientName)
                .map((test) => (
                <tr key={test.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{test.patientName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{test.testType}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getResultColor(test.result)}`}>
                      {test.result}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{test.date}</td>
                  <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">{test.notes}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex gap-2">
                      <button
                        onClick={() => setViewingTest(test)}
                        className="text-blue-500 hover:text-blue-700 p-1"
                        title="View Details"
                      >
                        <ViewIcon />
                      </button>
                      <button
                        onClick={() => navigate(`/tests/edit/${test.id}`)}
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

          <div className="flex items-center justify-between mt-4">
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
                className={`px-3 py-1 rounded border text-sm ${currentPage === 1 || totalPages === 0 ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1 || totalPages === 0}
              >
                Previous
              </button>
              <span className="text-sm text-gray-600">                Page {currentPage} of {totalPages || 1}
              </span>
              <button
                className={`px-3 py-1 rounded border text-sm ${currentPage === totalPages || totalPages === 0 ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
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
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Delete Test</h3>
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
                onClick={() => {
                  setTests(tests.filter(t => t.id !== deleteConfirm.id));
                  setDeleteConfirm(null);
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default TestsContent
