import React, { useState, useEffect } from 'react'

const GenerateReportModal = ({ onClose, currentUser }) => {
  const [patients, setPatients] = useState([])
  const [formData, setFormData] = useState({
    patientId: '',
    reportType: '',
    dateFrom: '',
    dateTo: new Date().toISOString().split('T')[0],
    includeTests: true,
    includeImages: false,
    includeNotes: true
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [generatedReport, setGeneratedReport] = useState(null)

  const reportTypes = [
    'Comprehensive Eye Exam Report',
    'Test Results Summary',
    'Treatment Progress Report',
    'Referral Letter',
    'Insurance Report',
    'Custom Report'
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
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setGeneratedReport(null)

    try {
      // Validate required fields
      if (!formData.patientId || !formData.reportType) {
        throw new Error('Patient and report type are required')
      }

      if (formData.dateFrom && formData.dateTo && formData.dateFrom > formData.dateTo) {
        throw new Error('Start date cannot be after end date')
      }

      // Generate report via API
      const reportData = await window.api.generateReport({
        ...formData,
        generatedBy: currentUser.id,
        generatedAt: new Date().toISOString()
      })

      setGeneratedReport(reportData)
    } catch (err) {
      setError(err.message || 'Failed to generate report')
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = () => {
    if (generatedReport) {
      // Create a download link for the report
      const blob = new Blob([generatedReport.content], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${generatedReport.fileName || 'report'}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    }
  }

  const handlePreview = () => {
    if (generatedReport) {
      // Open report in new window for preview
      const blob = new Blob([generatedReport.content], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      window.open(url, '_blank')
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content large">
        <div className="modal-header">
          <h2>Generate Report</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        {!generatedReport ? (
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

            <div className="form-group">
              <label htmlFor="reportType">Report Type *</label>
              <select
                id="reportType"
                name="reportType"
                value={formData.reportType}
                onChange={handleInputChange}
                required
              >
                <option value="">Select report type</option>
                {reportTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="dateFrom">Date From</label>
                <input
                  type="date"
                  id="dateFrom"
                  name="dateFrom"
                  value={formData.dateFrom}
                  onChange={handleInputChange}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="dateTo">Date To</label>
                <input
                  type="date"
                  id="dateTo"
                  name="dateTo"
                  value={formData.dateTo}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Include in Report:</label>
              <div className="checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="includeTests"
                    checked={formData.includeTests}
                    onChange={handleInputChange}
                  />
                  Test Results
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="includeImages"
                    checked={formData.includeImages}
                    onChange={handleInputChange}
                  />
                  Medical Images
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="includeNotes"
                    checked={formData.includeNotes}
                    onChange={handleInputChange}
                  />
                  Clinical Notes
                </label>
              </div>
            </div>

            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Generating...' : 'Generate Report'}
              </button>
            </div>
          </form>
        ) : (
          <div className="report-generated">
            <div className="success-message">
              ✓ Report generated successfully!
            </div>
            
            <div className="report-info">
              <h3>{generatedReport.title}</h3>
              <p>Patient: {generatedReport.patientName}</p>
              <p>Generated: {new Date(generatedReport.generatedAt).toLocaleString()}</p>
              <p>Pages: {generatedReport.pageCount}</p>
            </div>

            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Close
              </button>
              <button type="button" className="btn btn-outline" onClick={handlePreview}>
                Preview
              </button>
              <button type="button" className="btn btn-primary" onClick={handleDownload}>
                Download PDF
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default GenerateReportModal