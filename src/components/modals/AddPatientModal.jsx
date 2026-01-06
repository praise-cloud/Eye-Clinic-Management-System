import React, { useState } from 'react'

const AddPatientModal = ({ onClose, currentUser, onPatientAdded }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    gender: '',
    email: '',
    phoneNumber: '',
    address: '',
    reasonForVisit: ''
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
      // Validate required fields
      if (!formData.firstName || !formData.lastName || !formData.dateOfBirth) {
        throw new Error('First name, last name, and date of birth are required')
      }
      
      const patientData = {
        patient_id: `P${Date.now()}`, // Generate a simple patient ID
        first_name: formData.firstName,
        last_name: formData.lastName,
        dob: formData.dateOfBirth,
        gender: formData.gender || 'other', // Ensure gender is never empty
        contact: formData.phoneNumber || null,
        email: formData.email || null,
        address: formData.address || null,
        reason_for_visit: formData.reasonForVisit || null
      }
      
      console.log('Creating patient with data:', patientData);
      
      // Add patient via API - map form fields to database fields
      const result = await window.electronAPI.createPatient(patientData)
      
      console.log('Create patient result:', result);

      if (result?.success) {
        // Close modal on success
        onClose()
        
        // Notify parent component to refresh patient list
        if (onPatientAdded) {
          onPatientAdded()
        }
      } else {
        throw new Error(result?.error || 'Failed to add patient')
      }
    } catch (err) {
      setError(err.message || 'Failed to add patient')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex justify-between items-center p-6 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-700 rounded-t-lg">
          <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">Add New Patient</h2>
          <button
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 hover:text-red-500 dark:hover:text-red-400 transition-colors duration-200"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-md mb-6 text-sm">
              {error}
            </div>
          )}

          {/* Personal Details */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-blue-600 dark:text-blue-400 mb-4 pb-2 border-b-2 border-gray-200 dark:border-gray-600">Personal Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="flex flex-col">
                <label htmlFor="firstName" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">First Name *</label>
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  placeholder="John"
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div className="flex flex-col">
                <label htmlFor="lastName" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Last Name *</label>
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  placeholder="Doe"
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div className="flex flex-col">
                <label htmlFor="dateOfBirth" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date of Birth *</label>
                <input
                  type="date"
                  id="dateOfBirth"
                  name="dateOfBirth"
                  value={formData.dateOfBirth}
                  onChange={handleInputChange}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div className="flex flex-col">
                <label htmlFor="gender" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Gender</label>
                <select
                  id="gender"
                  name="gender"
                  value={formData.gender}
                  onChange={handleInputChange}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">- select -</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="flex flex-col">
                <label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="john.doe@example.com"
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex flex-col">
                <label htmlFor="phoneNumber" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone Number</label>
                <input
                  type="tel"
                  id="phoneNumber"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleInputChange}
                  placeholder="(123) 456-7890"
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="flex flex-col">
                <label htmlFor="address" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address</label>
                <textarea
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  rows="3"
                  placeholder="Enter full address"
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical"
                />
              </div>

              <div className="flex flex-col">
                <label htmlFor="reasonForVisit" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reason for Visit</label>
                <textarea
                  id="reasonForVisit"
                  name="reasonForVisit"
                  value={formData.reasonForVisit}
                  onChange={handleInputChange}
                  rows="2"
                  placeholder="e.g., Routine checkup, Blurred vision, Eye pain, etc."
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t dark:border-gray-600">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 dark:bg-gray-500 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {loading ? 'Adding...' : 'Add Patient'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
export default AddPatientModal
