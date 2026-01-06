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
    <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex justify-between items-center p-6 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-700 rounded-t-lg">
          <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">Generate Report</h2>
          <button className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 hover:text-red-500 dark:hover:text-red-400 transition-colors duration-200" onClick={onClose}>×</button>
        </div>

        {!generatedReport ? (
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

            <div className="flex flex-col">
              <label htmlFor="reportType" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Report Type *</label>
              <select
                id="reportType"
                name="reportType"
                value={formData.reportType}
                onChange={handleInputChange}
                required
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select report type</option>
                {reportTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col">
                <label htmlFor="dateFrom" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date From</label>
                <input
                  type="date"
                  id="dateFrom"
                  name="dateFrom"
                  value={formData.dateFrom}
                  onChange={handleInputChange}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div className="flex flex-col">
                <label htmlFor="dateTo" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date To</label>
                <input
                  type="date"
                  id="dateTo"
                  name="dateTo"
                  value={formData.dateTo}
                  onChange={handleInputChange}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Include in Report:</label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="includeTests"
                    checked={formData.includeTests}
                    onChange={handleInputChange}
                    className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
                  />
                  <span className="text-gray-700 dark:text-gray-300">Test Results</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="includeImages"
                    checked={formData.includeImages}
                    onChange={handleInputChange}
                    className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
                  />
                  <span className="text-gray-700 dark:text-gray-300">Medical Images</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="includeNotes"
                    checked={formData.includeNotes}
                    onChange={handleInputChange}
                    className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
                  />
                  <span className="text-gray-700 dark:text-gray-300">Clinical Notes</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t dark:border-gray-600">
              <button type="button" className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 dark:bg-gray-500 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors duration-200" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200" disabled={loading}>
                {loading ? 'Generating...' : 'Generate Report'}
              </button>
            </div>
          </form>
        ) : (
          <div className="p-6">
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-4 py-3 rounded-md mb-6 text-sm">
              ✓ Report generated successfully!
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">{generatedReport.title}</h3>
              <p className="text-gray-600 dark:text-gray-400">Patient: {generatedReport.patientName}</p>
              <p className="text-gray-600 dark:text-gray-400">Generated: {new Date(generatedReport.generatedAt).toLocaleString()}</p>
              <p className="text-gray-600 dark:text-gray-400">Pages: {generatedReport.pageCount}</p>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t dark:border-gray-600">
              <button type="button" className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 dark:bg-gray-500 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors duration-200" onClick={onClose}>
                Close
              </button>
              <button type="button" className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors duration-200" onClick={handlePreview}>
                Preview
              </button>
              <button type="button" className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200" onClick={handleDownload}>
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