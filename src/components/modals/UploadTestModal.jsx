import React, { useState, useEffect } from 'react'

const UploadTestModal = ({ onClose, currentUser }) => {
  const [patients, setPatients] = useState([])
  const [formData, setFormData] = useState({
    patientId: '',
    testType: '',
    testDate: new Date().toISOString().split('T')[0],
    testFile: null,
    notes: ''
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const testTypes = [
    'Visual Acuity Test',
    'Refraction Test',
    'Tonometry',
    'Fundoscopy',
    'OCT Scan',
    'Visual Field Test',
    'Slit Lamp Examination',
    'Color Vision Test',
    'Other'
  ]

  useEffect(() => {
    loadPatients()
  }, [])

  const loadPatients = async () => {
    try {
      const patientsData = await window.api.getPatients()
      setPatients(patientsData)
    } catch (err) {
      setError('Failed to load patients')
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    setFormData(prev => ({
      ...prev,
      testFile: file
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Validate required fields
      if (!formData.patientId || !formData.testType || !formData.testFile) {
        throw new Error('Patient, test type, and test file are required')
      }

      // Create FormData for file upload
      const uploadData = new FormData()
      uploadData.append('patientId', formData.patientId)
      uploadData.append('testType', formData.testType)
      uploadData.append('testDate', formData.testDate)
      uploadData.append('testFile', formData.testFile)
      uploadData.append('notes', formData.notes)
      uploadData.append('uploadedBy', currentUser.id)

      // Upload test via API
      await window.api.uploadTest(uploadData)

      // Close modal on success
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to upload test')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex justify-between items-center p-6 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-700 rounded-t-lg">
          <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">Upload Test Results</h2>
          <button className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 hover:text-red-500 dark:hover:text-red-400 transition-colors duration-200" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-md text-sm">{error}</div>}
          
          <div className="flex flex-col">
            <label htmlFor="patientId" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Patient *</label>
            <select
              id="patientId"
              name="patientId"
              value={formData.patientId}
              onChange={handleInputChange}
              required
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select a patient</option>
              {patients.map(patient => (
                <option key={patient.id} value={patient.id}>
                  {patient.firstName} {patient.lastName} - DOB: {patient.dateOfBirth}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col">
              <label htmlFor="testType" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Test Type *</label>
              <select
                id="testType"
                name="testType"
                value={formData.testType}
                onChange={handleInputChange}
                required
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select test type</option>
                {testTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            
            <div className="flex flex-col">
              <label htmlFor="testDate" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Test Date *</label>
              <input
                type="date"
                id="testDate"
                name="testDate"
                value={formData.testDate}
                onChange={handleInputChange}
                required
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex flex-col">
            <label htmlFor="testFile" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Test File *</label>
            <input
              type="file"
              id="testFile"
              name="testFile"
              onChange={handleFileChange}
              accept=".pdf,.jpg,.jpeg,.png,.dcm,.tiff"
              required
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <small className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Accepted formats: PDF, JPG, PNG, DICOM (.dcm), TIFF
            </small>
          </div>

          <div className="flex flex-col">
            <label htmlFor="notes" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              rows="4"
              placeholder="Additional notes about the test..."
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical"
            />
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t dark:border-gray-600">
            <button type="button" className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 dark:bg-gray-500 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors duration-200" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200" disabled={loading}>
              {loading ? 'Uploading...' : 'Upload Test'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default UploadTestModal