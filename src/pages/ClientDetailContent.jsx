import React, { useState } from 'react';
import { ArrowLeftIcon } from '../components/Icons';

const ClientDetailContent = ({ client, onBack, onSave }) => {
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    name: client?.name || `${client?.first_name || ''} ${client?.last_name || ''}`.trim() || '',
    phone: client?.phone || client?.contact || '',
    email: client?.email || '',
    dob: client?.date || client?.dob || '',
    intake_date: client?.intake_date || '',
    gender: client?.gender || '',
    address: client?.address || '',
    patient_id: client?.patient_id || ''
  });

  const formatDate = (value) => {
    if (!value) return 'N/A';
    const dt = new Date(value);
    if (Number.isNaN(dt.getTime())) return value;
    return dt.toLocaleDateString();
  };

  const handleSave = () => {
    if (onSave) {
      onSave(formData);
    }
    setEditMode(false);
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="flex flex-col w-full p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-800 dark:hover:text-white"
        >
          <ArrowLeftIcon className="w-5 h-5" />
          Back
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">Client Details</h2>
            <p className="text-sm text-gray-500 mt-1">ID: {formData.patient_id || 'N/A'}</p>
          </div>
          <div className="flex gap-2">
            {editMode ? (
              <>
                <button onClick={() => setEditMode(false)} className="px-4 py-2 text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
                <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Save Changes</button>
              </>
            ) : (
              <button onClick={() => setEditMode(true)} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">Edit Information</button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Patient ID</label>
            <p className="text-gray-900 dark:text-gray-100 font-mono">{formData.patient_id || 'N/A'}</p>
          </div>
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
            {editMode ? <input type="text" value={formData.name} onChange={(e) => handleInputChange('name', e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 rounded-md p-2 dark:bg-gray-700 dark:text-white" /> : <p className="text-gray-900 dark:text-gray-100 font-semibold">{formData.name}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date of Birth</label>
            {editMode ? <input type="date" value={formData.dob} onChange={(e) => handleInputChange('dob', e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 rounded-md p-2 dark:bg-gray-700 dark:text-white" /> : <p className="text-gray-900 dark:text-gray-100">{formatDate(formData.dob)}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Intake Date</label>
            {editMode ? <input type="date" value={formData.intake_date} onChange={(e) => handleInputChange('intake_date', e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 rounded-md p-2 dark:bg-gray-700 dark:text-white" /> : <p className="text-gray-900 dark:text-gray-100">{formatDate(formData.intake_date)}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Gender</label>
            {editMode ? (
              <select value={formData.gender} onChange={(e) => handleInputChange('gender', e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 rounded-md p-2 dark:bg-gray-700 dark:text-white">
                <option value="">Select</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            ) : <p className="text-gray-900 dark:text-gray-100 capitalize">{formData.gender || 'N/A'}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
            {editMode ? <input type="text" value={formData.phone} onChange={(e) => handleInputChange('phone', e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 rounded-md p-2 dark:bg-gray-700 dark:text-white" /> : <p className="text-gray-900 dark:text-gray-100">{formData.phone}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
            {editMode ? <input type="email" value={formData.email} onChange={(e) => handleInputChange('email', e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 rounded-md p-2 dark:bg-gray-700 dark:text-white" /> : <p className="text-gray-900 dark:text-gray-100">{formData.email}</p>}
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address</label>
            {editMode ? <input type="text" value={formData.address} onChange={(e) => handleInputChange('address', e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 rounded-md p-2 dark:bg-gray-700 dark:text-white" /> : <p className="text-gray-900 dark:text-gray-100">{formData.address}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Last Updated</label>
            <p className="text-indigo-600 dark:text-indigo-400 font-semibold">{formatDate(client?.updated_at)}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientDetailContent;
