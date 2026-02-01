import React, { useState, useEffect } from 'react';
import useUser from '../hooks/useUser';
import Layout from '../components/layout/Layout';

const PatientsScreen = () => {
    const { user } = useUser();

    // State for Patients
    const [patients, setPatients] = useState([]);
    const [loading, setLoading] = useState(false);

    // Layout & Filter State
    const [activeSection, setActiveSection] = useState('patients');
    const [searchTerm, setSearchTerm] = useState('');
    const [genderFilter, setGenderFilter] = useState('');

    // Modal State
    const [showAddEditModal, setShowAddEditModal] = useState(false);
    const [editingPatient, setEditingPatient] = useState(null);
    const [patientFormData, setPatientFormData] = useState({
        patient_id: '', first_name: '', last_name: '', dob: '', gender: '', contact: ''
    });
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);

    // Fetch Patients
    const fetchPatients = async () => {
        if (!window.electronAPI) return;
        setLoading(true);
        try {
            // Construct filters, e.g. { search: searchTerm, gender: genderFilter }
            // Adjust backend expectations as needed. 
            // Assuming backend handles basic string search or we filter locally if backend doesn't support it yet.
            const filters = { search: searchTerm, gender: genderFilter };
            const res = await window.electronAPI.getPatients(filters);
            if (res.success) {
                setPatients(res.patients);
            } else {
                console.error('Failed to fetch patients:', res.error);
            }
        } catch (error) {
            console.error('Error fetching patients:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPatients();

        if (window.electronAPI) {
            const unsubscribe = window.electronAPI.onIpcEvent('data:update', (payload) => {
                if (payload.table === 'patients') {
                    console.log('Realtime patients update received:', payload);
                    fetchPatients();
                }
            });
            return unsubscribe;
        }
    }, [searchTerm, genderFilter]);

    // Handlers
    const handleSectionClick = (sectionId) => {
        setActiveSection(sectionId);
        console.log(`Navigating to ${sectionId}`);
        // If integrated into main router, you would use navigate(sectionId) here
    };

    const handleActionClick = () => {
        // Triggered by Header's "Action" button (e.g. Add Patient if standardized)
        // For now, we can just open the modal
        setEditingPatient(null);
        setPatientFormData({ patient_id: '', first_name: '', last_name: '', dob: '', gender: '', contact: '' });
        setShowAddEditModal(true);
    };

    const handleTableAction = (action, patient) => {
        if (action === 'Edit') {
            setEditingPatient(patient);
            setPatientFormData({
                patient_id: patient.patient_id,
                first_name: patient.first_name,
                last_name: patient.last_name,
                dob: patient.dob,
                gender: patient.gender,
                contact: patient.contact
            });
            setShowAddEditModal(true);
        } else if (action === 'View') {
            alert(`Viewing patient: ${patient.first_name} ${patient.last_name}`);
        } else if (action === 'Delete') {
            setShowDeleteConfirm(patient);
        } else if (action === 'Admit') {
            alert(`Admit functionality for: ${patient.first_name}`);
        }
    };

    const handleAddEditPatient = async () => {
        if (!window.electronAPI) return;
        setLoading(true);
        try {
            let res;
            if (editingPatient) {
                // Determine logic for update: usually requires an ID
                // ensuring patientFormData has the id or we pass editingPatient.id
                res = await window.electronAPI.updatePatient(editingPatient.id, patientFormData);
            } else {
                res = await window.electronAPI.addPatient(patientFormData);
            }

            if (res.success) {
                setShowAddEditModal(false);
                setEditingPatient(null);
                setPatientFormData({ patient_id: '', first_name: '', last_name: '', dob: '', gender: '', contact: '' });
                fetchPatients();
            } else {
                alert(res.error || 'Failed to save patient.');
            }
        } catch (error) {
            console.error('Error saving patient:', error);
            alert('Error saving patient: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDeletePatient = async () => {
        if (!window.electronAPI || !showDeleteConfirm) return;
        setLoading(true);
        try {
            const res = await window.electronAPI.deletePatient(showDeleteConfirm.id);
            if (res.success) {
                setShowDeleteConfirm(null);
                fetchPatients();
            } else {
                alert(res.error || 'Failed to delete patient.');
            }
        } catch (error) {
            console.error('Error deleting patient:', error);
            alert('Error deleting patient: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Layout
            activeSection={activeSection}
            onSectionClick={handleSectionClick}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            onActionClick={handleActionClick} // Optional, if you want header '+' button to do something
        >
            <div className="flex flex-col space-y-6">

                {/* Page Stats / Header Area */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Patients Management</h2>
                        <p className="text-gray-500 dark:text-gray-400 text-sm">View and manage patient records</p>
                    </div>
                    <div className="flex gap-3">
                        <select
                            className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                            value={genderFilter}
                            onChange={(e) => setGenderFilter(e.target.value)}
                        >
                            <option value="">All Genders</option>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                        </select>
                        <button
                            onClick={() => {
                                setEditingPatient(null);
                                setPatientFormData({ patient_id: '', first_name: '', last_name: '', dob: '', gender: '', contact: '' });
                                setShowAddEditModal(true);
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm"
                        >
                            <i className="fas fa-plus"></i>
                            <span>Add Patient</span>
                        </button>
                    </div>
                </div>

                {/* Patients Table Card */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-750">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">ID</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Contact</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Email</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">DOB</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Gender</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                {loading ? (
                                    <tr>
                                        <td colSpan="7" className="px-6 py-10 text-center text-gray-500 dark:text-gray-400">
                                            Loading patients...
                                        </td>
                                    </tr>
                                ) : patients.length > 0 ? (
                                    patients.map((patient) => (
                                        <tr key={patient.id} className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{patient.patient_id}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                                                {patient.first_name} {patient.last_name}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">{patient.contact}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">{patient.email || '-'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">{patient.dob}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400 capitalize">{patient.gender}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium flex gap-2">
                                                <button
                                                    onClick={() => handleTableAction('Edit', patient)}
                                                    className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 p-1"
                                                    title="Edit"
                                                >
                                                    <i className="fas fa-pencil-alt"></i>
                                                </button>
                                                <button
                                                    onClick={() => handleTableAction('View', patient)}
                                                    className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-300 p-1"
                                                    title="View"
                                                >
                                                    <i className="fas fa-eye"></i>
                                                </button>
                                                <button
                                                    onClick={() => handleTableAction('Delete', patient)}
                                                    className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 p-1"
                                                    title="Delete"
                                                >
                                                    <i className="fas fa-trash-alt"></i>
                                                </button>
                                                <button
                                                    onClick={() => handleTableAction('Admit', patient)}
                                                    className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 p-1 text-xs border border-green-200 dark:border-green-800 rounded px-2"
                                                    title="Admit Patient"
                                                >
                                                    Admit
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="7" className="px-6 py-10 text-center text-gray-500 dark:text-gray-400">
                                            No patients found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Add/Edit Patient Modal */}
            {showAddEditModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-md transform transition-all">
                        <h3 className="text-xl font-bold mb-6 text-gray-900 dark:text-white">
                            {editingPatient ? 'Edit Patient' : 'Add New Patient'}
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Patient ID</label>
                                <input
                                    type="text"
                                    placeholder="e.g. PAT-001"
                                    value={patientFormData.patient_id}
                                    onChange={(e) => setPatientFormData({ ...patientFormData, patient_id: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">First Name</label>
                                    <input
                                        type="text"
                                        value={patientFormData.first_name}
                                        onChange={(e) => setPatientFormData({ ...patientFormData, first_name: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Last Name</label>
                                    <input
                                        type="text"
                                        value={patientFormData.last_name}
                                        onChange={(e) => setPatientFormData({ ...patientFormData, last_name: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date of Birth</label>
                                    <input
                                        type="date"
                                        value={patientFormData.dob}
                                        onChange={(e) => setPatientFormData({ ...patientFormData, dob: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Gender</label>
                                    <select
                                        value={patientFormData.gender}
                                        onChange={(e) => setPatientFormData({ ...patientFormData, gender: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    >
                                        <option value="">Select</option>
                                        <option value="male">Male</option>
                                        <option value="female">Female</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Contact</label>
                                <input
                                    type="text"
                                    placeholder="Phone or Email"
                                    value={patientFormData.contact}
                                    onChange={(e) => setPatientFormData({ ...patientFormData, contact: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end space-x-3 mt-8">
                            <button
                                onClick={() => {
                                    setShowAddEditModal(false);
                                    setEditingPatient(null);
                                    setPatientFormData({ patient_id: '', first_name: '', last_name: '', dob: '', gender: '', contact: '' });
                                }}
                                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddEditPatient}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                            >
                                {editingPatient ? 'Update' : 'Add'} Patient
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-sm transform transition-all">
                        <div className="flex flex-col items-center text-center">
                            <div className="bg-red-100 dark:bg-red-900/30 p-3 rounded-full mb-4">
                                <i className="fas fa-exclamation-triangle text-red-600 dark:text-red-400 text-xl"></i>
                            </div>
                            <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">Delete Patient</h3>
                            <p className="text-gray-500 dark:text-gray-400 mb-6">
                                Are you sure you want to delete patient <strong>{showDeleteConfirm.first_name} {showDeleteConfirm.last_name}</strong>? This action cannot be undone.
                            </p>
                        </div>
                        <div className="flex justify-center space-x-3">
                            <button
                                onClick={() => setShowDeleteConfirm(null)}
                                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors w-full"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeletePatient}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-sm w-full"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
};

export default PatientsScreen;
