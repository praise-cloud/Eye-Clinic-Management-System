import React, { useState, useEffect } from 'react';
import { DeleteIcon, EditIcon, ViewIcon } from '../components/Icons';
import { getAllTests, createTest } from '../services/testService';

const TestResultsContent = ({ clientName, onTestCreate, initialEditTest }) => {
  const [testResults, setTestResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTest, setEditingTest] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [viewingTest, setViewingTest] = useState(null);

  // Form state — no patientId anymore
  const [formData, setFormData] = useState({
    patientName: clientName || '',
    testType: '',
    eye: 'both',
    result: '',
    date: '',
    notes: ''
  });

  // Fetch real tests from DB
  const fetchTests = async () => {
    setLoading(true);
    try {
      // Filter by patient name if provided
      const filters = clientName ? { patientName: clientName } : {};
      const tests = await getAllTests(filters);
      setTestResults(tests);
    } catch (err) {
      console.error('Failed to load tests:', err);
      alert('Could not load test results. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTests();
  }, [clientName]);

  // Handle initial edit from parent
  useEffect(() => {
    if (initialEditTest) {
      setEditingTest(initialEditTest);
      setFormData(initialEditTest);
      setShowModal(true);
    }
  }, [initialEditTest]);

  const handleCreate = () => {
    setEditingTest(null);
    setFormData({
      patientName: clientName || '',
      testType: '',
      eye: 'both',
      result: '',
      date: '',
      notes: ''
    });
    setShowModal(true);
  };

  const handleEdit = (test) => {
    setEditingTest(test);
    setFormData(test);
    setShowModal(true);
  };

  const handleSave = async () => {
    try {
      // Prepare data for backend (no patientId needed)
      const testData = {
        patient_name: formData.patientName,  // ← We use name instead
        machine_type: formData.testType,
        eye: formData.eye,
        test_date: formData.date,
        raw_data: JSON.stringify({
          result: formData.result,
          notes: formData.notes
        })
      };

      if (editingTest) {
        console.log('Update not implemented yet');
      } else {
        const newTest = await createTest(testData);
        // Refresh list after create
        await fetchTests();

        if (onTestCreate) onTestCreate(newTest);
      }

      setShowModal(false);
      setEditingTest(null);
    } catch (error) {
      console.error('Save error:', error);
      alert('Failed to save test result. Please try again.');
    }
  };

  const handleDelete = (id) => {
    // TODO: Add real delete via electronAPI.deleteTest(id)
    setTestResults(prev => prev.filter(t => t.id !== id));
    setDeleteConfirm(null);
  };

  const handleView = (test) => {
    setViewingTest(test);
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const getResultColor = (result) => {
    switch (result?.toLowerCase()) {
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

      {/* Table / Loading / Empty */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-6 text-center text-gray-500">Loading test results...</div>
        ) : testResults.length === 0 ? (
          <div className="p-6 text-center text-gray-500">No test results yet. Add one!</div>
        ) : (
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
              {testResults.map((test) => (
                <tr key={test.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{test.patientName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{test.testType}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getResultColor(test.result)}`}>
                      {test.result || 'Pending'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{test.date}</td>
                  <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">{test.notes}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex gap-2">
                      <button onClick={() => handleEdit(test)} className="text-green-500 hover:text-green-700 p-1" title="Edit">
                        <EditIcon />
                      </button>
                      <button onClick={() => handleView(test)} className="text-blue-500 hover:text-blue-700 p-1" title="View">
                        <ViewIcon />
                      </button>
                      <button onClick={() => setDeleteConfirm(test)} className="text-red-500 hover:text-red-700 p-1" title="Delete">
                        <DeleteIcon />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
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
                  disabled={!!clientName} // Prevent changing if pre-filled
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Eye</label>
                <select
                  value={formData.eye}
                  onChange={(e) => handleInputChange('eye', e.target.value)}
                  className="w-full border border-gray-300 rounded-md p-2"
                >
                  <option value="both">Both Eyes</option>
                  <option value="left">Left Eye</option>
                  <option value="right">Right Eye</option>
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

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Delete Test Result?</h3>
            <p className="text-gray-600 mb-6">
              Are you sure? This cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-gray-600 border rounded hover:bg-gray-50"
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

      {/* View Modal */}
      {viewingTest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setViewingTest(null)}>
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Test Details</h3>
              <button onClick={() => setViewingTest(null)} className="text-2xl">✕</button>
            </div>
            <div className="space-y-3">
              <p><strong>Patient Name:</strong> {viewingTest.patientName}</p>
              <p><strong>Test Type:</strong> {viewingTest.testType}</p>
              <p><strong>Result:</strong>
                <span className={`ml-2 inline-flex px-3 py-1 rounded-full text-sm ${getResultColor(viewingTest.result)}`}>
                  {viewingTest.result || 'Pending'}
                </span>
              </p>
              <p><strong>Date:</strong> {viewingTest.date}</p>
              <p><strong>Notes:</strong> {viewingTest.notes || 'None'}</p>
            </div>
            <div className="flex justify-end mt-6">
              <button onClick={() => setViewingTest(null)} className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">
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