import React, { useState } from 'react';
import { ArrowLeftIcon } from '../components/Icons';

const ClientDetailContent = ({ client, onBack, onSave }) => {
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    name: client?.name || '',
    phone: client?.phone || '',
    email: client?.email || '',
    case: client?.case || '',
    date: client?.date || ''
  });

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
          <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">Client Details</h2>
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
            {editMode ? <input type="text" value={formData.name} onChange={(e) => handleInputChange('name', e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 rounded-md p-2 dark:bg-gray-700 dark:text-white" /> : <p className="text-gray-900 dark:text-gray-100">{formData.name}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
            {editMode ? <input type="text" value={formData.phone} onChange={(e) => handleInputChange('phone', e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 rounded-md p-2 dark:bg-gray-700 dark:text-white" /> : <p className="text-gray-900 dark:text-gray-100">{formData.phone}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
            {editMode ? <input type="email" value={formData.email} onChange={(e) => handleInputChange('email', e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 rounded-md p-2 dark:bg-gray-700 dark:text-white" /> : <p className="text-gray-900 dark:text-gray-100">{formData.email}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
            {editMode ? <input type="text" value={formData.date} onChange={(e) => handleInputChange('date', e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 rounded-md p-2 dark:bg-gray-700 dark:text-white" /> : <p className="text-gray-900 dark:text-gray-100">{formData.date}</p>}
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Current Case</label>
            {editMode ? <textarea value={formData.case} onChange={(e) => handleInputChange('case', e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 rounded-md p-2 h-20 dark:bg-gray-700 dark:text-white" /> : <p className="text-gray-900 dark:text-gray-100">{formData.case}</p>}
          </div>
        </div>
      </div>
    </div>
  );
};


export default ClientDetailContent;
