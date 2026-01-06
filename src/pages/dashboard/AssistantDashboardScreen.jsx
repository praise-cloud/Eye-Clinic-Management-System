import React, { useState, useEffect } from 'react';
import { DeleteIcon, EditIcon, ViewIcon } from '../../components/Icons';
import ClientDetailContent from '../ClientDetailContent';

const getStatClasses = (color) => {
    if (color.includes('blue')) return { icon: 'text-blue-600', bg: 'bg-blue-100' };
    if (color.includes('green')) return { icon: 'text-green-600', bg: 'bg-green-100' };
    if (color.includes('yellow')) return { icon: 'text-yellow-600', bg: 'bg-yellow-100' };
    if (color.includes('red')) return { icon: 'text-red-600', bg: 'bg-red-100' };
    return {};
};

const App = () => {
    const statsData = [
        { label: 'Total Patients', number: '0', icon: 'fas fa-users', color: 'text-blue-500' },
        { label: "Today's Appointments", number: '0', icon: 'fas fa-calendar-check', color: 'text-green-500' },
        { label: 'Pending Appointments', number: '0', icon: 'fas fa-clock', color: 'text-yellow-500' },
        { label: 'Monthly Revenue', number: '₦0', icon: 'fa-solid fa-coins', color: 'text-red-500' },
    ];

    const [patients, setPatients] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(5);
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [viewingPatient, setViewingPatient] = useState(null);
    const [selectedClient, setSelectedClient] = useState(null);

    const handleDelete = (patientIndex) => {
        setPatients(prev => prev.filter((_, index) => index !== patientIndex));
        setDeleteConfirm(null);
    };

    const handleView = (patient) => {
        setViewingPatient(patient);
    };

    const handleEdit = (patient) => {
        setSelectedClient(patient);
    };

    const handleClientSave = (updatedClient) => {
        setPatients(prev => prev.map(patient =>
            patient.name === selectedClient.name && patient.email === selectedClient.email
                ? { ...patient, ...updatedClient }
                : patient
        ));
    };

    const handleBackToDashboard = () => {
        setSelectedClient(null);
    };
    
    const filteredPatients = patients.filter(patient => 
        searchTerm === '' ||
        patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.case.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    const totalPages = Math.ceil(filteredPatients.length / rowsPerPage);
    const paginatedPatients = filteredPatients.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

    if (selectedClient) {
        return <ClientDetailContent client={selectedClient} onBack={handleBackToDashboard} onSave={handleClientSave} />;
    }

    const DashboardSection = () => (
        <div className="w-full">
            <div className="mb-6">
                <p className="text-gray-300 text-sm italic">Overview of your eye clinic operations and quick access tools.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {statsData.map((stat, index) => {
                    const { icon: iconClass, bg: bgClass } = getStatClasses(stat.color);
                    return (
                        <div key={index} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md flex items-center gap-4 hover:shadow-lg transition-shadow">
                            <div className={`p-4 rounded-lg ${bgClass}`}>
                                <i className={`${stat.icon} text-2xl ${iconClass}`}></i>
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">{stat.label}</h3>
                                <span className="text-3xl font-bold text-gray-900 dark:text-white">{stat.number}</span>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                <div className="mb-4 pb-4 border-b-2 border-gray-200 dark:border-gray-700">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Patient's of the day</h3>
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search by name, case, or email..."
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <table style={{width: '100%', borderCollapse: 'collapse'}} className="dark:text-white">
                    <thead>
                        <tr className="bg-gray-50 dark:bg-gray-700" style={{borderBottom: '2px solid #dee2e6'}}>
                            <th className="dark:text-gray-300" style={{padding: '12px', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#6c757d'}}>Name</th>
                            <th className="dark:text-gray-300" style={{padding: '12px', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#6c757d'}}>Date</th>
                            <th className="dark:text-gray-300" style={{padding: '12px', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#6c757d'}}>Case</th>
                            <th className="dark:text-gray-300" style={{padding: '12px', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#6c757d'}}>Phone</th>
                            <th className="dark:text-gray-300" style={{padding: '12px', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#6c757d'}}>Email</th>
                            <th className="dark:text-gray-300" style={{padding: '12px', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#6c757d'}}>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedPatients.length > 0 ? paginatedPatients.map((patient, idx) => (
                            <tr key={idx} className="dark:border-gray-700" style={{borderBottom: '1px solid #dee2e6'}}>
                                <td style={{padding: '12px', fontSize: '0.875rem'}}>{patient.name}</td>
                                <td style={{padding: '12px', fontSize: '0.875rem'}}>{patient.date}</td>
                                <td style={{padding: '12px', fontSize: '0.875rem'}}>{patient.case}</td>
                                <td style={{padding: '12px', fontSize: '0.875rem'}}>{patient.phone}</td>
                                <td style={{padding: '12px', fontSize: '0.875rem'}}>{patient.email}</td>
                                <td style={{padding: '12px', fontSize: '0.875rem', display: 'flex', gap: '8px'}}>
                                    <button onClick={() => setDeleteConfirm({patient, index: (currentPage - 1) * rowsPerPage + idx})} style={{color: '#dc3545', background: 'none', border: 'none', cursor: 'pointer'}} title="Delete">
                                        <DeleteIcon />
                                    </button>
                                    <button onClick={() => handleEdit(patient)} style={{color: '#28a745', background: 'none', border: 'none', cursor: 'pointer'}} title="Edit">
                                        <EditIcon />
                                    </button>
                                    <button onClick={() => handleView(patient)} style={{color: '#007bff', background: 'none', border: 'none', cursor: 'pointer'}} title="View">
                                        <ViewIcon />
                                    </button>
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan="6" style={{padding: '24px', textAlign: 'center'}}>
                                    <span className="text-gray-400 dark:text-gray-500">
                                        {searchTerm ? 'No matching patients found' : 'No patients available'}
                                    </span>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem'}}>
                    <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                        <label className="dark:text-gray-400" style={{fontSize: '0.875rem', color: '#6c757d'}}>Rows per page:</label>
                        <select value={rowsPerPage} onChange={(e) => setRowsPerPage(Number(e.target.value))} className="dark:bg-gray-700 dark:text-white dark:border-gray-600" style={{padding: '4px 8px', border: '1px solid #dee2e6', borderRadius: '4px'}}>
                            <option value={5}>5</option>
                            <option value={10}>10</option>
                            <option value={20}>20</option>
                        </select>
                    </div>
                    <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                        <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="dark:bg-gray-700 dark:text-white dark:border-gray-600" style={{padding: '6px 12px', border: '1px solid #dee2e6', borderRadius: '4px', background: currentPage === 1 ? '#e9ecef' : 'white', cursor: currentPage === 1 ? 'not-allowed' : 'pointer'}}>Previous</button>
                        <span className="dark:text-gray-400" style={{fontSize: '0.875rem', color: '#6c757d'}}>Page {currentPage} of {totalPages}</span>
                        <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="dark:bg-gray-700 dark:text-white dark:border-gray-600" style={{padding: '6px 12px', border: '1px solid #dee2e6', borderRadius: '4px', background: currentPage === totalPages ? '#e9ecef' : 'white', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'}}>Next</button>
                    </div>
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {deleteConfirm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setDeleteConfirm(null)}>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-lg font-semibold mb-4 dark:text-white">Delete Patient Record</h3>
                        <p className="text-gray-600 dark:text-gray-300 mb-2">Are you sure you want to delete this patient record?</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6"><strong>{deleteConfirm.patient.name}</strong> - {deleteConfirm.patient.case}</p>
                        <div className="flex gap-3 justify-end">
                            <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50">Cancel</button>
                            <button onClick={() => handleDelete(deleteConfirm.index)} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">Delete</button>
                        </div>
                    </div>
                </div>
            )}

            {/* View Modal */}
            {viewingPatient && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setViewingPatient(null)}>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold dark:text-white">Patient Details</h3>
                            <button onClick={() => setViewingPatient(null)} className="text-gray-500 hover:text-gray-700 text-xl">✕</button>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
                                <p className="text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 p-2 rounded">{viewingPatient.name}</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Date</label>
                                <p className="text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 p-2 rounded">{viewingPatient.date}</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Phone Number</label>
                                <p className="text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 p-2 rounded">{viewingPatient.phone}</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                                <p className="text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 p-2 rounded">{viewingPatient.email}</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Case Description</label>
                                <p className="text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 p-2 rounded min-h-[60px]">{viewingPatient.case}</p>
                            </div>
                        </div>
                        <div className="flex justify-end mt-6">
                            <button onClick={() => setViewingPatient(null)} className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );



    return <DashboardSection />;
};

export default App;
