import React, { useEffect, useImperativeHandle, forwardRef } from 'react';
import usePatients from '../../hooks/usePatients';

const PatientsContent = forwardRef(({ searchTerm }, ref) => {
  const {
    patients,
    loading,
    error,
    fetchPatients,
    removePatient,
    // addPatient, editPatient, searchPatients, setPatients
  } = usePatients();

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  // Listen for patient added events
  useEffect(() => {
    const handlePatientAdded = () => {
      console.log('Patient added event received, refreshing patient list...');
      fetchPatients();
    };
    window.addEventListener('patientAdded', handlePatientAdded);
    return () => window.removeEventListener('patientAdded', handlePatientAdded);
  }, [fetchPatients]);

  // Expose refresh method to parent component
  useImperativeHandle(ref, () => ({
    refreshPatients: () => {
      console.log('RefreshPatients called via ref');
      fetchPatients();
    }
  }), [fetchPatients]);

  const filteredPatients = patients.filter(patient => {
    const name = patient.name || `${patient.first_name || ''} ${patient.last_name || ''}`.trim();
    return name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
      <div className="p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Patients</h2>
        {loading && <div className="text-gray-400 dark:text-gray-500">Loading...</div>}
        {error && <div className="text-red-500 dark:text-red-400">Error loading patients</div>}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Age</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Phone</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Last Visit</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredPatients.map((patient) => {
                const patientName = patient.name || `${patient.first_name || ''} ${patient.last_name || ''}`.trim();
                const patientAge = patient.age || (patient.dob ? new Date().getFullYear() - new Date(patient.dob).getFullYear() : '-');
                const patientPhone = patient.phone || patient.contact || '-';
                
                return (
                  <tr key={patient.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">{patientName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{patientAge}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{patientPhone}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{patient.lastVisit || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 mr-3">View</button>
                      <button className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 mr-3">Edit</button>
                      <button className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300" onClick={() => removePatient(patient.id)}>Delete</button>
                    </td>
                  </tr>
                );
              })}
              {filteredPatients.length === 0 && !loading && (
                <tr>
                  <td colSpan="5" className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                    {searchTerm ? 'No patients found matching your search.' : 'No patients added yet.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
});

PatientsContent.displayName = 'PatientsContent';

export default PatientsContent;