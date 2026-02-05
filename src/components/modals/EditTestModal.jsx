import React, { useEffect, useState } from 'react'
import * as testService from '../../services/testService'

const EditTestModal = ({ testId, onClose, onSaved }) => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    result: '',
    notes: '',
    imageData: null,
    fileName: null,
    machine_type: '',
    eye: 'both',
    test_date: ''
  })

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const full = await testService.getTestById(testId)
        if (!full) throw new Error('Test not found')
        let parsed = {}
        try { parsed = JSON.parse(full.raw_data || '{}') } catch { parsed = {} }
        setFormData({
          result: String(parsed.result || ''),
          notes: String(parsed.notes || ''),
          imageData: parsed.imageData || null,
          fileName: parsed.fileName || null,
          machine_type: full.machine_type || '',
          eye: full.eye || 'both',
          test_date: full.test_date || ''
        })
      } catch (e) {
        setError(e.message || 'Failed to load test')
      } finally {
        setLoading(false)
      }
    }
    if (testId) load()
  }, [testId])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSave = async () => {
    setLoading(true)
    setError('')
    try {
      const full = await testService.getTestById(testId)
      if (!full) throw new Error('Test not found')
      let parsed = {}
      try { parsed = JSON.parse(full.raw_data || '{}') } catch { parsed = {} }
      const updatedRaw = JSON.stringify({
        ...parsed,
        result: formData.result || parsed.result || '',
        notes: formData.notes || parsed.notes || '',
        imageData: formData.imageData || parsed.imageData || null,
        fileName: formData.fileName || parsed.fileName || null
      })
      await testService.updateTest(testId, {
        machine_type: formData.machine_type || full.machine_type,
        eye: formData.eye || full.eye,
        test_date: formData.test_date || full.test_date,
        raw_data: updatedRaw
      })
      if (onSaved) onSaved()
      onClose()
    } catch (e) {
      setError(e.message || 'Failed to update test')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-premium-fade">
      <div className="card-premium w-full max-w-2xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xl animate-premium-slide">
        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-950/30">
          <div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Edit Test Result</h2>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Update the recorded diagnostic details</p>
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

          {loading ? (
            <div className="flex justify-center py-10">
              <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Result</label>
                  <select
                    name="result"
                    value={formData.result}
                    onChange={handleInputChange}
                    className="input-premium appearance-none"
                  >
                    <option value="">Select result...</option>
                    <option value="Normal">Normal</option>
                    <option value="Abnormal">Abnormal</option>
                    <option value="High">High</option>
                    <option value="Low">Low</option>
                    <option value="Scheduled">Scheduled</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Eye</label>
                  <select
                    name="eye"
                    value={formData.eye}
                    onChange={handleInputChange}
                    className="input-premium appearance-none"
                  >
                    <option value="both">Both Eyes</option>
                    <option value="left">Left Eye</option>
                    <option value="right">Right Eye</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Date</label>
                  <input
                    type="date"
                    name="test_date"
                    value={formData.test_date ? String(formData.test_date).slice(0,10) : ''}
                    onChange={handleInputChange}
                    className="input-premium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Modality</label>
                  <input
                    type="text"
                    name="machine_type"
                    value={formData.machine_type}
                    onChange={handleInputChange}
                    className="input-premium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Notes</label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  rows="3"
                  className="input-premium resize-none"
                />
              </div>

              {formData.imageData && (
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Image Preview</label>
                  <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800">
                    <img src={formData.imageData} alt={formData.fileName || 'Test Image'} className="w-full h-56 object-cover" />
                  </div>
                  {formData.fileName && (
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">
                      File: <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">{formData.fileName}</span>
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-8 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 flex gap-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-6 py-4 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl text-xs font-black tracking-widest uppercase hover:bg-slate-100 dark:hover:bg-slate-700 transition-all border border-slate-200 dark:border-slate-700 active:scale-95"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex-1 btn btn-primary py-4 text-xs font-black tracking-widest uppercase shadow-xl shadow-indigo-200 dark:shadow-none hover:scale-[1.02] active:scale-95"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Saving...</span>
              </div>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default EditTestModal
