import React, { useState, useEffect } from 'react'
import * as patientService from '../../services/patientService'
import * as testService from '../../services/testService'

const UploadResultModal = ({ onClose, currentUser }) => {
  const [patients, setPatients] = useState([])
  const [formData, setFormData] = useState({
    patientId: '',
    patientName: '',
    patientDob: '',
    patientAge: '',
    testType: '',
    testDate: new Date().toISOString().split('T')[0],
    testFile: null,
    eye: 'both',
    result: 'Completed',
    notes: '',
    cvfTestId: ''
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [cvfTests, setCvfTests] = useState([])
  const [cvfLoading, setCvfLoading] = useState(false)
  const [selectedCvf, setSelectedCvf] = useState(null)
  const [patientSearchTerm, setPatientSearchTerm] = useState('')

  const calculateAge = (dob) => {
    if (!dob) return '';
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const getSelectedPatient = () => {
    return patients.find(p => String(p.id) === String(formData.patientId)) || null;
  };

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

  useEffect(() => {
    const loadCvfTests = async () => {
      if (!formData.patientId) {
        setCvfTests([])
        setSelectedCvf(null)
        return
      }
      try {
        setCvfLoading(true)
        const tests = await testService.getAllTests({ patientId: formData.patientId })
        const filtered = (tests || []).filter(t => (
          t.machineType === 'henson_8000' ||
          t.rawData?.source === 'henson_8000' ||
          t.rawData?.machine_type === 'henson_8000'
        )).sort((a, b) => new Date(b.testDate || 0) - new Date(a.testDate || 0))
        setCvfTests(filtered)
        setSelectedCvf(null)
      } catch (err) {
        setCvfTests([])
        setSelectedCvf(null)
      } finally {
        setCvfLoading(false)
      }
    }

    loadCvfTests()
  }, [formData.patientId])

  const loadPatients = async () => {
    try {
      const patientsData = await patientService.getAllPatients()
      setPatients(patientsData || [])
    } catch (err) {
      setError('Failed to load clients')
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target

    if (name === "patientId") {
      const selectedPatient = patients.find(p => String(p.id) === String(value));
      const nameStr = selectedPatient
        ? (selectedPatient.name || `${selectedPatient.first_name || ''} ${selectedPatient.last_name || ''}`.trim())
        : '';
      const dob = selectedPatient?.dob || selectedPatient?.date_of_birth || '';
      setFormData(prev => ({
        ...prev,
        patientId: value,
        patientName: nameStr,
        patientDob: dob,
        patientAge: dob ? calculateAge(dob) : ''
      }));
      if (selectedPatient) {
        setPatientSearchTerm(nameStr);
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }))
    }
  }

  const handleSelectCvf = (cvfId) => {
    setFormData(prev => ({ ...prev, cvfTestId: cvfId }))
    const selected = cvfTests.find(t => String(t.id) === String(cvfId))
    setSelectedCvf(selected || null)
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      const dataUrl = event.target.result
      setFormData(prev => ({
        ...prev,
        testFile: file,
        imageData: dataUrl
      }))
    }
    if (file.type && file.type.startsWith('image/')) {
      reader.readAsDataURL(file)
    } else {
      setFormData(prev => ({
        ...prev,
        testFile: file,
        imageData: null
      }))
    }
  }

  const handleAcquireResult = () => {
    setLoading(true)

    const simulatedResult = `Acquired ${formData.testType || 'Scan'} Data: Normal parameters detected.`

    const newResult = {
      id : Date.now(),
      name : `${formData.testType || 'Test'}_Result_${new Date().getHours()}${new Date().getMinutes()}.pdf`,
      result : simulatedResult,
      eye : formData.eye,
      notes : formData.notes
    }

    setFormData(prev => ({
      ...prev,
      result : newResult.result,
      notes : newResult.notes
    }))
    setScannedResults(prev => [...prev, newResult])
    setLoading(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (currentUser?.role !== 'doctor') {
        throw new Error('Only doctors can create test results')
      }
      if (!formData.patientId || !formData.patientName || !formData.testType) {
        throw new Error('Client and result type are required')
      }

      const testData = {
        patient_id: formData.patientId,
        patient_name: formData.patientName,
        machine_type: formData.testType,
        test_date: formData.testDate,
        eye: formData.eye,
        raw_data: JSON.stringify({
          notes: formData.notes,
          fileName: formData.testFile ? formData.testFile.name : null,
          result: formData.result,
          eye: formData.eye,
          imageData: formData.imageData || null,
          cvf_test_id: formData.cvfTestId || null,
          cvf_summary: selectedCvf
            ? {
              id: selectedCvf.id,
              result: selectedCvf.rawData?.result || selectedCvf.result || null,
              diagnosis: selectedCvf.rawData?.diagnosis || null,
              testDate: selectedCvf.testDate || null
            }
            : null
        }),
        uploaded_by: currentUser?.id
      }

      await testService.createTest(testData)
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to create test')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-premium-fade">
      <div className="card-premium w-full max-w-2xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xl animate-premium-slide">
        {/* Header */}
        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-950/30">
          <div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Clinical Test Acquisition</h2>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Upload and digitize client diagnostic results</p>
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

        <form onSubmit={handleSubmit} className="p-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
          {error && (
            <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-900/10 border-l-4 border-rose-500 rounded-r-xl flex items-center gap-3 animate-premium-slide">
              <div className="p-1.5 bg-rose-100 dark:bg-rose-900/30 rounded-lg text-rose-600 dark:text-rose-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-sm font-bold text-rose-700 dark:text-rose-400">{error}</p>
            </div>
          )}

          <div className="space-y-8">
            {/* Subject Selection */}
            <div>
              <label className="block text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-4">Diagnostic Client</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 flex flex-col">
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Search Client *</label>
                  <input
                    type="text"
                    value={patientSearchTerm}
                    onChange={(e) => setPatientSearchTerm(e.target.value)}
                    placeholder="Search by name or ID..."
                    list="test-patient-list"
                    className="input-premium mb-2"
                  />
                  <datalist id="test-patient-list">
                    {patients.map((p) => (
                      <option key={p.id} value={p.name || `${p.first_name || ''} ${p.last_name || ''}`.trim()} />
                    ))}
                  </datalist>
                  <select
                    name="patientId"
                    value={formData.patientId}
                    onChange={handleInputChange}
                    required
                    className="input-premium appearance-none"
                  >
                    <option value="">Choose client...</option>
                    {patients
                      .filter(p => 
                        patientSearchTerm === '' || 
                        (p.name || `${p.first_name || ''} ${p.last_name || ''}`.trim()).toLowerCase().includes(patientSearchTerm.toLowerCase()) ||
                        (p.patient_id && p.patient_id.toLowerCase().includes(patientSearchTerm.toLowerCase()))
                      )
                      .map(patient => (
                        <option key={patient.id} value={patient.id}>
                          {patient.name || `${patient.first_name || ''} ${patient.last_name || ''}`.trim()} {patient.patient_id ? `(ID: ${patient.patient_id})` : ''}
                        </option>
                      ))}
                  </select>
                </div>
                <div className="flex flex-col">
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Date of Birth</label>
                  <input
                    type="text"
                    value={getSelectedPatient()?.dob || getSelectedPatient()?.date_of_birth || ''}
                    readOnly
                    placeholder="Auto-filled"
                    className="input-premium bg-slate-50 dark:bg-slate-800"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Age</label>
                  <input
                    type="text"
                    value={formData.patientAge || ''}
                    readOnly
                    placeholder="--"
                    className="input-premium bg-slate-50 dark:bg-slate-800"
                  />
                </div>
              </div>
            </div>

            {/* Test Parameters */}
            <div>
              <label className="block text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-4">Procedure Detail</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Modality / Result Type *</label>
                  <select
                    name="testType"
                    value={formData.testType}
                    onChange={handleInputChange}
                    required
                    className="input-premium appearance-none"
                  >
                    <option value="">Select modality...</option>
                    {testTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Examination Date *</label>
                  <input
                    type="date"
                    name="testDate"
                    value={formData.testDate}
                    onChange={handleInputChange}
                    required
                    className="input-premium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Eye Examined *</label>
                  <select
                    name="eye"
                    value={formData.eye}
                    onChange={handleInputChange}
                    required
                    className="input-premium appearance-none"
                  >
                    <option value="both">Both Eyes</option>
                    <option value="left">Left Eye</option>
                    <option value="right">Right Eye</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Test Result Status *</label>
                  <select
                    name="result"
                    value={formData.result}
                    onChange={handleInputChange}
                    required
                    className="input-premium appearance-none"
                  >
                    <option value="Completed">Completed</option>
                    <option value="Normal">Normal</option>
                    <option value="Abnormal">Abnormal</option>
                    <option value="High">High</option>
                    <option value="Low">Low</option>
                    <option value="Scheduled">Scheduled</option>
                  </select>
                </div>
              </div>
            </div>

            {/* CVF Attachment */}
            <div>
              <label className="block text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-4">Attach CVF Result (Optional)</label>
              <select
                name="cvfTestId"
                value={formData.cvfTestId}
                onChange={(e) => handleSelectCvf(e.target.value)}
                disabled={!formData.patientId || cvfLoading}
                className="input-premium appearance-none"
              >
                <option value="">{cvfLoading ? 'Loading CVF results...' : 'No CVF result attached'}</option>
                {cvfTests.map((t) => {
                  const labelDate = t.testDate ? new Date(t.testDate).toLocaleDateString() : 'Unknown date'
                  const labelResult = t.rawData?.result || t.rawData?.diagnosis || 'No summary'
                  return (
                    <option key={t.id} value={t.id}>
                      {labelDate} — {labelResult}
                    </option>
                  )
                })}
              </select>
              {selectedCvf && (
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="card-premium p-3 border border-slate-200 dark:border-slate-800">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">CVF Result</p>
                    <p className="mt-2 font-semibold">{selectedCvf.rawData?.result || 'Pending'}</p>
                  </div>
                  <div className="card-premium p-3 border border-slate-200 dark:border-slate-800">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">CVF Diagnosis</p>
                    <p className="mt-2 font-semibold">{selectedCvf.rawData?.diagnosis || 'Not recorded'}</p>
                  </div>
                </div>
              )}
            </div>

            {/* File Acquisition */}
            <div>
              <label className="block text-[10px] font-black text-amber-500 uppercase tracking-widest mb-4">Data Acquisition</label>
              <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center transition-colors hover:border-indigo-500 group relative">
                <input
                  type="file"
                  name="testFile"
                  onChange={handleFileChange}
                  accept=".pdf,.jpg,.jpeg,.png,.dcm,.tiff"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/30 group-hover:text-indigo-600 mb-4 transition-colors">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white capitalize">
                    {formData.testFile ? formData.testFile.name : 'Select clinical document or image'}
                  </p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2 px-10">
                    PDF, DICOM (.dcm), TIFF, or Standard Images (JPEG/PNG)
                  </p>
                </div>
              </div>
            </div>

            {/* Observations */}
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Clinical Observations / Notes</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows="3"
                placeholder="Enter clinical notes or preliminary findings..."
                className="input-premium resize-none"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-4 mt-8">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-6 py-4 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl text-xs font-black tracking-widest uppercase hover:bg-slate-100 dark:hover:bg-slate-700 transition-all border border-slate-200 dark:border-slate-700 active:scale-95"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 btn btn-primary py-4 text-xs font-black tracking-widest uppercase shadow-xl shadow-indigo-200 dark:shadow-none hover:scale-[1.02] active:scale-95 transition-all"
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Digitizing...</span>
                  </div>
                ) : (
                  'Acquire Result'
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

export default UploadResultModal
