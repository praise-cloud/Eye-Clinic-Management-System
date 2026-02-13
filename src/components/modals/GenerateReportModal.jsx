import React, { useState, useEffect } from 'react'
import * as patientService from '../../services/patientService'

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
      const patientsData = await patientService.getAllPatients()
      setPatients(patientsData)
    } catch (err) {
      setError('Failed to load clinical subjects')
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
      if (!formData.patientId || !formData.reportType) {
        throw new Error('Client and report type are required')
      }

      if (formData.dateFrom && formData.dateTo && formData.dateFrom > formData.dateTo) {
        throw new Error('Chronological error: Start date exceeds end date')
      }

      if (window.electronAPI?.generateReport) {
        const reportData = await window.electronAPI.generateReport({
          ...formData,
          generatedBy: currentUser?.id,
          generatedAt: new Date().toISOString()
        })
        setGeneratedReport(reportData)
      } else {
        // Mock for dev if not in electron
        setTimeout(() => {
          setGeneratedReport({
            title: formData.reportType,
            patientName: patients.find(p => p.id === formData.patientId)?.name || 'Client',
            generatedAt: new Date().toISOString(),
            pageCount: 3,
            content: 'PDF_DUMMY_CONTENT',
            fileName: `Report_${formData.patientId}_${Date.now()}`
          })
          setLoading(false)
        }, 1500)
        return // Handle async in setGeneratedReport
      }

    } catch (err) {
      setError(err.message || 'Failed to synthesize report')
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = () => {
    if (generatedReport) {
      const blob = new Blob([generatedReport.content], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${generatedReport.fileName || 'medical_report'}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    }
  }

  const handlePreview = () => {
    if (generatedReport) {
      const blob = new Blob([generatedReport.content], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      window.open(url, '_blank')
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-premium-fade">
      <div className="card-premium w-full max-w-2xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xl animate-premium-slide">
        {/* Header */}
        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-950/30">
          <div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Report Synthesis</h2>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Generate professional medical documentation</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-all duration-200 group"
          >
            <svg className="w-6 h-6 text-slate-400 group-hover:text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
          {!generatedReport ? (
            <form onSubmit={handleSubmit} className="space-y-8">
              {error && (
                <div className="p-4 bg-rose-50 dark:bg-rose-900/10 border-l-4 border-rose-500 rounded-r-xl flex items-center gap-3 animate-premium-slide">
                  <div className="p-1.5 bg-rose-100 dark:bg-rose-900/30 rounded-lg text-rose-600 dark:text-rose-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-sm font-bold text-rose-700 dark:text-rose-400">{error}</p>
                </div>
              )}

              {/* Data Scope Section */}
              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-4">Target Intelligence</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Clinical Subject (Patient) *</label>
                      <select
                        name="patientId"
                        value={formData.patientId}
                        onChange={handleInputChange}
                        required
                        className="input-premium appearance-none"
                      >
                        <option value="">Select subject...</option>
                        {patients.map(patient => (
                          <option key={patient.id} value={patient.id}>
                            {patient.name || `${patient.first_name || ''} ${patient.last_name || ''}`.trim()} — DOB: {patient.dob}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Report Document Archetype *</label>
                      <select
                        name="reportType"
                        value={formData.reportType}
                        onChange={handleInputChange}
                        required
                        className="input-premium appearance-none"
                      >
                        <option value="">Select archetype...</option>
                        {reportTypes.map(type => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Temporal Start (From)</label>
                      <input
                        type="date"
                        name="dateFrom"
                        value={formData.dateFrom}
                        onChange={handleInputChange}
                        className="input-premium"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Temporal End (To)</label>
                      <input
                        type="date"
                        name="dateTo"
                        value={formData.dateTo}
                        onChange={handleInputChange}
                        className="input-premium"
                      />
                    </div>
                  </div>
                </div>

                {/* Inclusion Matrix */}
                <div>
                  <label className="block text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-4">Inclusion Matrix</label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                      { id: 'includeTests', label: 'Diagnostics', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
                      { id: 'includeImages', label: 'Imaging', icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' },
                      { id: 'includeNotes', label: 'Clinical Notes', icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z' }
                    ].map(item => (
                      <label
                        key={item.id}
                        className={`flex items-center gap-3 p-4 rounded-xl border transition-all cursor-pointer ${formData[item.id] ? 'bg-indigo-50 border-indigo-200 dark:bg-indigo-900/20 dark:border-indigo-800' : 'bg-slate-50 border-slate-100 dark:bg-slate-800/50 dark:border-slate-800'}`}
                      >
                        <input
                          type="checkbox"
                          name={item.id}
                          checked={formData[item.id]}
                          onChange={handleInputChange}
                          className="hidden"
                        />
                        <div className={`p-2 rounded-lg ${formData[item.id] ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400' : 'bg-slate-200 text-slate-400 dark:bg-slate-700'}`}>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                          </svg>
                        </div>
                        <span className={`text-xs font-bold uppercase tracking-widest ${formData[item.id] ? 'text-indigo-900 dark:text-indigo-200' : 'text-slate-500'}`}>{item.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 pt-6">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-6 py-4 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl text-xs font-black tracking-widest uppercase hover:bg-slate-100 dark:hover:bg-slate-700 transition-all border border-slate-200 dark:border-slate-700 active:scale-95"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-[2] btn btn-primary py-4 text-xs font-black tracking-widest uppercase shadow-xl shadow-indigo-200 dark:shadow-none hover:scale-[1.02] active:scale-95"
                >
                  {loading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Synthesizing...</span>
                    </div>
                  ) : (
                    'Generate Clinical Report'
                  )}
                </button>
              </div>
            </form>
          ) : (
            <div className="py-6 animate-premium-fade">
              <div className="mb-8 p-6 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800 rounded-2xl flex items-center gap-5">
                <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center text-emerald-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-black text-emerald-900 dark:text-emerald-400 leading-tight">Synthesis Complete</h3>
                  <p className="text-xs text-emerald-600 dark:text-emerald-500 font-bold uppercase tracking-widest mt-0.5">Medical file has been successfully generated</p>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-950/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4 mb-10">
                <div className="flex justify-between items-center pb-4 border-b border-slate-200/50 dark:border-slate-800">
                  <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Document Title</span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white">{generatedReport.title}</span>
                </div>
                <div className="flex justify-between items-center pb-4 border-b border-slate-200/50 dark:border-slate-800">
                  <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Clinical Subject</span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white">{generatedReport.patientName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Volume (Length)</span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white">{generatedReport.pageCount} Pages</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={handlePreview}
                  className="px-6 py-4 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl text-xs font-black tracking-widest uppercase hover:bg-slate-100 dark:hover:bg-slate-700 transition-all border border-slate-200 dark:border-slate-700 active:scale-95"
                >
                  Deep Preview
                </button>
                <button
                  onClick={handleDownload}
                  className="btn btn-primary py-4 text-xs font-black tracking-widest uppercase shadow-xl shadow-indigo-200 dark:shadow-none hover:scale-[1.02] active:scale-95 transition-all"
                >
                  Download PDF
                </button>
              </div>

              <button
                onClick={onClose}
                className="w-full mt-4 py-3 text-xs font-black text-slate-400 uppercase tracking-[0.2em] hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                Close Synthesis Lab
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default GenerateReportModal
