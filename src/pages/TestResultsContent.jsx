import React, { useState } from 'react';
import { DeleteIcon, EditIcon, ViewIcon } from '../components/Icons';

const TestResultsContent = ({ clientName, onTestCreate }) => {
  const [testResults, setTestResults] = useState([
    { id: 1, patientName: 'Dr. Ammar', testType: 'Vision Test', result: 'Normal', date: '25/01/2024', notes: 'Good vision clarity' },
    { id: 2, patientName: 'Dr. Khan', testType: 'Eye Pressure', result: 'High', date: '24/01/2024', notes: 'Requires monitoring' },
    { id: 3, patientName: 'Dr. Abdullah', testType: 'Retinal Scan', result: 'Abnormal', date: '23/01/2024', notes: 'Follow-up needed' },
    { id: 4, patientName: 'Dr. Alia', testType: 'Color Blindness', result: 'Normal', date: '22/01/2024', notes: 'No issues detected' }
  ]);

  const [showModal, setShowModal] = useState(false);
  const [editingTest, setEditingTest] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [viewingTest, setViewingTest] = useState(null);
  const [formData, setFormData] = useState({
    patientName: clientName || '',
    testType: '',
    result: '',
    date: '',
    notes: ''
  });

  // Create new test result
  const handleCreate = () => {
    setEditingTest(null);
    setFormData({ patientName: clientName || '', testType: '', result: '', date: '', notes: '' });
    setShowModal(true);
  };

  // Edit existing test result
  const handleEdit = (test) => {
    setEditingTest(test);
    setFormData(test);
    setShowModal(true);
  };

  // Save test result (create or update)
  const handleSave = () => {
    if (editingTest) {
      // Update existing
      setTestResults(prev => prev.map(test =>
        test.id === editingTest.id ? { ...formData, id: editingTest.id } : test
      ));
    } else {
      // Create new
      const newTest = { ...formData, id: Date.now() };
      setTestResults(prev => [...prev, newTest]);

      // Notify parent component about new test creation
      if (onTestCreate) {
        onTestCreate(newTest);
      }
    }
    setShowModal(false);
    setEditingTest(null);
  };

  // Delete test result
  const handleDelete = (id) => {
    setTestResults(prev => prev.filter(test => test.id !== id));
    setDeleteConfirm(null);
  };

  // View test result details
  const handleView = (test) => {
    console.log('View button clicked for test:', test);
    console.log('Setting viewingTest to:', test);
    setViewingTest(test);
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const getResultColor = (result) => {
    switch (result.toLowerCase()) {
      case 'normal': return 'text-green-600 bg-green-100';
      case 'abnormal': return 'text-red-600 bg-red-100';
      case 'high': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="flex flex-col w-full p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">Test Results</h1>
        <button
          onClick={handleCreate}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Add New Test Result
        </button>
      </div>

      {/* Test Results Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
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
            {testResults
              .filter(test => !clientName || test.patientName === clientName)
              .map((test) => (
              <tr key={test.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{test.patientName}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{test.testType}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => {
                      console.log('Result badge clicked for:', test);
                      setViewingTest(test);
                    }}
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full cursor-pointer hover:opacity-80 ${getResultColor(test.result)}`}
                  >
                    {test.result}
                  </button>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{test.date}</td>
                <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">{test.notes}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(test)}
                      className="text-green-500 hover:text-green-700 p-1"
                      title="Edit"
                    >
                      <EditIcon />
                    </button>
                    <button
                      onClick={() => handleView(test)}
                      className="text-blue-500 hover:text-blue-700 p-1"
                      title="View"
                    >
                      <ViewIcon />
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
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">
              {editingTest ? 'Edit Test Result' : 'Add New Test Result'}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Patient Name</label>
                <input
                  type="text"
                  value={formData.patientName}
                  onChange={(e) => handleInputChange('patientName', e.target.value)}
                  className="w-full border border-gray-300 rounded-md p-2"
                  placeholder="Enter patient name"
                  disabled={!!clientName}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Test Type</label>
                <select
                  value={formData.testType}
                  onChange={(e) => handleInputChange('testType', e.target.value)}
                  className="w-full border border-gray-300 rounded-md p-2"
                >
                  <option value="">Select test type</option>
                  <option value="Vision Test">Vision Test</option>
                  <option value="Eye Pressure">Eye Pressure</option>
                  <option value="Retinal Scan">Retinal Scan</option>
                  <option value="Color Blindness">Color Blindness</option>
                  <option value="Field Test">Field Test</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Result</label>
                <select
                  value={formData.result}
                  onChange={(e) => handleInputChange('result', e.target.value)}
                  className="w-full border border-gray-300 rounded-md p-2"
                >
                  <option value="">Select result</option>
                  <option value="Normal">Normal</option>
                  <option value="Abnormal">Abnormal</option>
                  <option value="High">High</option>
                  <option value="Low">Low</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => handleInputChange('date', e.target.value)}
                  className="w-full border border-gray-300 rounded-md p-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  className="w-full border border-gray-300 rounded-md p-2 h-20"
                  placeholder="Enter notes or observations"
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                {editingTest ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Delete Test Result</h3>
            <p className="text-gray-600 mb-2">Are you sure you want to delete this test result?</p>
            <p className="text-sm text-gray-500 mb-6">
              <strong>{deleteConfirm.patientName}</strong> - {deleteConfirm.testType}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm.id)}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Modal - Larger and Centered */}
      {viewingTest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setViewingTest(null)}>
          <div className="bg-white rounded-lg p-8 w-full max-w-2xl mx-4 max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-semibold text-gray-800">Test Result Details</h3>
              <button
                onClick={() => setViewingTest(null)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Patient Name</label>
                <p className="text-lg text-gray-900 bg-gray-50 p-3 rounded-lg">{viewingTest.patientName}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Test Type</label>
                <p className="text-lg text-gray-900 bg-gray-50 p-3 rounded-lg">{viewingTest.testType}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Test Result</label>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <span className={`inline-flex px-4 py-2 text-lg font-semibold rounded-full ${getResultColor(viewingTest.result)}`}>
                    {viewingTest.result}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Test Date</label>
                <p className="text-lg text-gray-900 bg-gray-50 p-3 rounded-lg">{viewingTest.date}</p>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes & Observations</label>
                <div className="text-gray-900 bg-gray-50 p-4 rounded-lg min-h-[120px] whitespace-pre-wrap">
                  {viewingTest.notes || 'No notes or observations recorded for this test.'}
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-8 gap-3">
              <button
                onClick={() => {
                  setViewingTest(null);
                  handleEdit(viewingTest);
                }}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Edit Test
              </button>
              <button
                onClick={() => setViewingTest(null)}
                className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TestResultsContent;