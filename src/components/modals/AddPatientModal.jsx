import React, { useState } from 'react'

const AddPatientModal = ({ onClose, currentUser, onPatientAdded, editPatientData = null }) => {
  const [formData, setFormData] = useState({
    firstName: editPatientData?.first_name || '',
    lastName: editPatientData?.last_name || '',
    dateOfBirth: editPatientData?.dob || '',
    gender: editPatientData?.gender || '',
    email: editPatientData?.email || '',
    phoneNumber: editPatientData?.contact || '',
    address: editPatientData?.address || '',
    reasonForVisit: editPatientData?.reason_for_visit || ''
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (!formData.firstName || !formData.lastName || !formData.dateOfBirth) {
        throw new Error('First name, last name, and date of birth are required')
      }

      const patientData = {
        patient_id: editPatientData?.patient_id || `P${Date.now()}`,
        first_name: formData.firstName,
        last_name: formData.lastName,
        dob: formData.dateOfBirth,
        gender: formData.gender || 'other',
        contact: formData.phoneNumber || null,
        email: formData.email || null,
        address: formData.address || null,
        reason_for_visit: formData.reasonForVisit || null
      }

      let result;
      if (editPatientData) {
        result = await window.electronAPI.updatePatient(editPatientData.id, patientData)
      } else {
        result = await window.electronAPI.createPatient(patientData)
      }

      if (result?.success) {
        onClose()
        if (onPatientAdded) onPatientAdded()
      } else {
        throw new Error(result?.error || `Failed to ${editPatientData ? 'update' : 'add'} client`)
      }
    } catch (err) {
      setError(err.message || `Failed to ${editPatientData ? 'update' : 'add'} client`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-premium-fade">
      <div className="card-premium w-full max-w-2xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xl animate-premium-slide">
        {/* Modal Header */}
        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-950/30">
          <div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {editPatientData ? 'Update Clinical Record' : 'Register New Client'}
            </h2>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">
              {editPatientData ? 'Modify existing client information' : 'Create a new medical file for admission'}
            </p>
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
            {/* Essential Identity Section */}
            <div>
              <label className="block text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-4">Client Identity & Demographics</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">First Given Name *</label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    placeholder="Enter first name"
                    className="input-premium"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Family Surname *</label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    placeholder="Enter last name"
                    className="input-premium"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Birth Date *</label>
                  <input
                    type="date"
                    name="dateOfBirth"
                    value={formData.dateOfBirth}
                    onChange={handleInputChange}
                    className="input-premium"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Gender Identification</label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleInputChange}
                    className="input-premium appearance-none"
                  >
                    <option value="">Select Gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Contact Information Section */}
            <div>
              <label className="block text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-4">Communications & Contact</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Email Address</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="example@mail.com"
                    className="input-premium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Phone System Number</label>
                  <input
                    type="tel"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleInputChange}
                    placeholder="+234-XXX-XXX-XXXX"
                    className="input-premium"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Residential Address</label>
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    rows="2"
                    placeholder="Enter full physical address"
                    className="input-premium resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Clinical Context Section */}
            <div>
              <label className="block text-[10px] font-black text-amber-500 uppercase tracking-widest mb-4">Clinical Context</label>
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Primary Reason for Visit</label>
                <textarea
                  name="reasonForVisit"
                  value={formData.reasonForVisit}
                  onChange={handleInputChange}
                  rows="3"
                  placeholder="Describe the primary complaint or reason for clinical assessment..."
                  className="input-premium resize-none"
                />
              </div>
            </div>
          </div>
        </form>

        {/* Modal Actions */}
        <div className="p-8 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 flex gap-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-6 py-4 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl text-xs font-black tracking-widest uppercase hover:bg-slate-100 dark:hover:bg-slate-700 transition-all border border-slate-200 dark:border-slate-700 active:scale-95"
          >
            Discard Changes
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 btn btn-primary py-4 text-xs font-black tracking-widest uppercase shadow-xl shadow-indigo-200 dark:shadow-none hover:scale-[1.02] active:scale-95"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Processing...</span>
              </div>
            ) : (
              editPatientData ? 'Update Client Record' : 'Commit Client Data'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default AddPatientModal
