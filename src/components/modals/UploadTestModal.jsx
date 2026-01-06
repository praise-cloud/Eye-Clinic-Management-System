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
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Upload Test Results</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {error && <div className="error-message">{error}</div>}
          
          <div className="form-group">
            <label htmlFor="patientId">Patient *</label>
            <select
              id="patientId"
              name="patientId"
              value={formData.patientId}
              onChange={handleInputChange}
              required
            >
              <option value="">Select a patient</option>
              {patients.map(patient => (
                <option key={patient.id} value={patient.id}>
                  {patient.firstName} {patient.lastName} - DOB: {patient.dateOfBirth}
                </option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="testType">Test Type *</label>
              <select
                id="testType"
                name="testType"
                value={formData.testType}
                onChange={handleInputChange}
                required
              >
                <option value="">Select test type</option>
                {testTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            
            <div className="form-group">
              <label htmlFor="testDate">Test Date *</label>
              <input
                type="date"
                id="testDate"
                name="testDate"
                value={formData.testDate}
                onChange={handleInputChange}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="testFile">Test File *</label>
            <input
              type="file"
              id="testFile"
              name="testFile"
              onChange={handleFileChange}
              accept=".pdf,.jpg,.jpeg,.png,.dcm,.tiff"
              required
            />
            <small className="form-help">
              Accepted formats: PDF, JPG, PNG, DICOM (.dcm), TIFF
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="notes">Notes</label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              rows="4"
              placeholder="Additional notes about the test..."
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Uploading...' : 'Upload Test'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default UploadTestModal