import React, { useState } from 'react';

<<<<<<< HEAD
const patientsData = [];
=======
// --- MOCK DATA ---
const patientsData = [
    {
        id: 1,
        name: 'Uzair Uzair',
        phone: '+0123456789',
        email: 'uzair619@gmail.com',
        dob: '1/Jan/1999',
        gender: 'Male',
    },
    {
        id: 2,
        name: 'Haric Haric',
        phone: '+0123456789',
        email: 'haric633@gmail.com',
        dob: '1/Dec/1991',
        gender: 'Male',
    },
    {
        id: 3,
        name: 'Hamza Hamza',
        phone: '+0123456789',
        email: 'hamza644@gmail.com',
        dob: '1/Jan/2001',
        gender: 'Male',
    },
];
>>>>>>> d7adb94f093a3e0b1314671557a7ee3c3ed7e9e9

// --- STYLES COMPONENT (ALL CSS FROM ORIGINAL FILE) ---
const AppStyles = () => (
    <style>
        {`
        /* Import Font Awesome - kept for icons */
        @import url("https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css");
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');

        /* General Body & Reset */
        :root {
            --primary-color: #3742fa; /* Bright Blue */
            --secondary-color: #6c757d;
            --text-color: #2c3e50;
            --light-text-color: #7f8c8d;
            --border-color: #dee2e6;
            --bg-light: #f8f9fa;
            --bg-white: #ffffff;
        }

        .dark {
            --primary-color: #5b6efc;
            --secondary-color: #9ca3af;
            --text-color: #e5e7eb;
            --light-text-color: #9ca3af;
            --border-color: #374151;
            --bg-light: #111827;
            --bg-white: #1f2937;
            
            /* RESTORED ORIGINAL THEME COLORS */
            --sidebar-bg: #764ba2; /* Original Purple */
            --sidebar-text: #bdc3c7;
            --sidebar-active-bg: #3742fa; /* Original Bright Blue */
            --accent-color: #ffd700;
            --header-bg: linear-gradient(135deg, #667eea 0%, #764ba2 100%); /* Original Gradient */
            
            --card-bg: #ffffff;
            --shadow-light: rgba(0, 0, 0, 0.05);
            --danger-color: #dc3545;
            --warning-color: #ffc107;
            --info-color: #17a2b8;
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Poppins', sans-serif;
            background-color: var(--bg-light);
            color: var(--text-color);
            overflow: hidden;
            height: 100vh;
            -webkit-font-smoothing: antialiased;
        }

        .app-container {
            height: 100vh;
            display: flex;
            flex-direction: column; 
        }

        /* FIX: New Wrapper for Sidebar and Content */
        .main-content-wrapper {
            display: flex;
            flex: 1; 
            overflow: hidden; 
        }

        /* Header Styling */
        .app-header {
            background: var(--header-bg);
            color: white;
            padding: 1rem 2rem;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            z-index: 1000;
        }

        .header-content {
            display: flex;
            justify-content: space-between;
            align-items: center;
            max-width: 1200px;
            margin: 0 auto;
        }

        .logo {
            display: flex; 
            align-items: center; 
            gap: 10px; 
        }

        .logo i {
            font-size: 2rem;
            color: var(--accent-color);
        }

        .logo h1 {
            font-size: 1.5rem;
            font-weight: 600;
        }

        .user-info {
            display: flex;
            align-items: center;
            gap: 10px;
            color: white; 
            font-weight: 500;
        }

        .user-info .avatar {
            width: 30px;
            height: 30px;
            border-radius: 50%;
            object-fit: cover;
            border: 1px solid rgba(255, 255, 255, 0.5);
        }

        /* Sidebar Styling */
        .sidebar {
            width: 250px;
            background-color: var(--sidebar-bg);
            color: white;
            height: 100%; 
            overflow-y: auto;
            box-shadow: 2px 0 10px rgba(0,0,0,0.1);
            flex-shrink: 0; /* Prevents shrinking in flex layout */
        }

        .nav-menu {
            list-style: none;
            padding: 1rem 0;
        }

        .nav-item {
            margin: 0;
        }

        .nav-link{
            display: flex;
            align-items: center;
            gap: 1rem;
            padding: 1rem 1.5rem;
            color: var(--sidebar-text);
            text-decoration: none;
            transition: all 0.3s ease;
            border-left: 3px solid transparent;
        }

        .nav-link:hover {
            background-color: var(--sidebar-active-bg);
            color: white;
            border-left-color: var(--accent-color);
        }

        /* Specific logout hover style */
        .nav-link:has(i.fa-sign-out-alt):hover {
            color: white !important;
            background-color: var(--danger-color);
            border-left-color: var(--danger-color);
        }

        .nav-item.active .nav-link {
            background-color: var(--sidebar-active-bg);
            color: white;
            border-left-color: var(--accent-color);
        }

        .nav-link i {
            font-size: 1.1rem;
            width: 20px;
        }

        /* Main Content Area */
        .content-area {
            flex: 1; 
            padding: 2rem;
            overflow-y: auto;
            background-color: var(--bg-light);
        }

        /* Patients Section */
        .patients-section {
            padding: 0; /* Adjusted padding to better fit content area */
            flex-grow: 1;
        }

        .card {
            background-color: var(--card-bg);
            border-radius: 8px;
            box-shadow: 0 8px 15px var(--shadow-light);
            padding: 25px;
            /* Removed negative margin: margin: -60px; */
            border: 1px solid var(--border-color);
        }

        .card-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
        }

        .card-header h3 {
            font-size: 1.8rem; /* Adjusted down slightly for better fit */
            font-weight: 700;
            color: var(--text-color);
        }

        .card-controls {
            display: flex;
            flex-wrap: wrap;
            gap: 15px;
            margin-bottom: 25px;
            align-items: center;
        }

        .search-bar {
            position: relative;
            flex-grow: 1;
            max-width: 300px;
        }

        .search-bar input {
            width: 100%;
            padding: 10px 15px 10px 40px;
            border: 1px solid var(--border-color);
            border-radius: 8px; /* Slightly more rounded */
            font-size: 0.9em;
            color: var(--text-color);
            background-color: var(--bg-white);
            transition: border-color 0.3s ease;
        }

        .search-bar input::placeholder {
            color: var(--light-text-color);
        }

        .search-bar input:focus {
            outline: none;
            border-color: var(--primary-color);
            box-shadow: 0 0 0 3px rgba(55, 66, 250, 0.2);
        }

        .search-bar i {
            position: absolute;
            left: 15px;
            top: 50%;
            transform: translateY(-50%);
            color: var(--light-text-color);
            font-size: 0.9em;
        }

        .filters {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
        }

        .dropdown button {
            background-color: var(--bg-white);
            border: 1px solid var(--border-color);
            padding: 10px 15px;
            border-radius: 8px; /* Slightly more rounded */
            cursor: pointer;
            font-size: 0.9em;
            color: var(--text-color);
            display: flex;
            align-items: center;
            gap: 8px;
            transition: all 0.3s ease;
        }

        .dropdown button:hover {
            border-color: var(--primary-color);
            color: var(--primary-color);
        }

        .dropdown button i {
            font-size: 0.7em;
        }

        /* Buttons */
        .btn {
            padding: 10px 20px;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 0.9em;
            font-weight: 600; /* Made slightly bolder */
            display: flex;
            align-items: center;
            gap: 8px;
            transition: background-color 0.3s ease, color 0.3s ease, transform 0.1s ease;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
        }
        .btn:active {
            transform: translateY(1px);
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
        }

        .btn-primary {
            background-color: var(--primary-color);
            color: #ffffff;
        }

        .btn-primary:hover {
            background-color: #2e3af7; /* Slightly darker primary */
        }

        .btn-secondary {
            background-color: #e2e6ea;
            color: var(--secondary-color);
            border: 1px solid #ced4da; /* Consistent border */
            padding: 8px 15px;
            font-size: 0.85em;
            box-shadow: none;
        }

        .btn-secondary:hover {
            background-color: var(--secondary-color);
            color: #ffffff;
            border-color: var(--secondary-color);
        }

        /* Table Styling */
        .table-responsive {
            overflow-x: auto;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
            background-color: var(--bg-white);
            border-radius: 8px;
            overflow: hidden; /* Ensures rounded corners on table */
        }

        table thead tr {
            background-color: var(--bg-light);
            border-bottom: 2px solid var(--border-color);
        }

        table th,
        table td {
            padding: 15px;
            text-align: left;
            border-bottom: 1px solid #f1f1f1; /* Lighter row separator */
            font-size: 0.9em;
        }

        table th {
            font-weight: 700; /* Bolder headers */
            color: var(--light-text-color);
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        table tbody tr:hover {
            background-color: var(--bg-light);
        }

        .action-buttons {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .icon-btn {
            background: none;
            border: none;
            font-size: 1.1em;
            cursor: pointer;
            padding: 8px;
            border-radius: 6px;
            transition: color 0.2s ease, background-color 0.2s ease;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .icon-btn.edit { color: var(--warning-color); }
        .icon-btn.delete { color: var(--danger-color); }
        .icon-btn.view { color: var(--info-color); }

        .icon-btn:hover {
            background-color: rgba(0, 0, 0, 0.08);
        }

        /* Responsive Adjustments (minor style consistency updates) */
        @media (max-width: 992px) {
            .sidebar {
                width: 80px;
                padding: 15px 0;
            }
            .nav-link {
                justify-content: center;
                padding: 10px 0;
            }
            .nav-link span { 
                display: none; 
            } 
            .nav-link i {
                margin: 0;
            }
            .nav-link:hover,
            .nav-item.active .nav-link {
                border-left: none;
                border-right: 3px solid var(--accent-color);
                background-color: var(--sidebar-active-bg);
            }

            .content-area {
                padding: 1rem;
            }

            .card-controls {
                flex-direction: column;
                align-items: stretch;
            }

            .search-bar {
                max-width: 100%;
            }

            .filters {
                width: 100%;
                justify-content: space-between;
                gap: 5px;
            }

            .filters .dropdown {
                flex-basis: calc(33.3% - 5px);
            }

            .btn-primary {
                width: 100%;
                justify-content: center;
            }

            table th, table td {
                padding: 10px;
                font-size: 0.85em;
            }

            .action-buttons {
                gap: 5px;
            }
        }

        @media (max-width: 768px) {
            /* Keep sidebar visible but condensed for better touch target */
            .sidebar {
                 width: 80px;
            }
            
            .filters {
                flex-direction: column;
                gap: 10px;
            }

            .filters .dropdown {
                flex-basis: 100%;
            }
        }
        `}
    </style>
);

// --- MAIN REACT COMPONENT ---
const App = () => {
<<<<<<< HEAD
    const [patients, setPatients] = useState([]); // State to hold patient data
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [genderFilter, setGenderFilter] = useState('');
    const [showAddEditModal, setShowAddEditModal] = useState(false);
    const [editingPatient, setEditingPatient] = useState(null);
    const [patientFormData, setPatientFormData] = useState({
      patient_id: '', first_name: '', last_name: '', dob: '', gender: '', contact: ''
    });
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);

    // Hardcoded active section for the Patients view
    const [activeSection, setActiveSection] = useState('patients'); 

    // Fetch patients from backend
    const fetchPatients = async () => {
      if (!window.electronAPI) return;
      setLoading(true);
      try {
        const filters = {
          search: searchQuery,
          gender: genderFilter
        };
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

    // Initial fetch and real-time listener for patients
    React.useEffect(() => {
      fetchPatients();

      if (window.electronAPI) {
        const unsubscribe = window.electronAPI.onIpcEvent('data:update', (payload) => {
          if (payload.table === 'patients') {
            console.log('Realtime patient update received:', payload);
            fetchPatients(); // Re-fetch patients to reflect changes
          }
        });
        return unsubscribe;
      }
    }, [searchQuery, genderFilter]); // Re-fetch when filters change
=======
    // Hardcoded active section for the Patients view
    const [activeSection, setActiveSection] = useState('patients'); 

>>>>>>> d7adb94f093a3e0b1314671557a7ee3c3ed7e9e9
    // Navigation Items
    const navItems = [
        { id: 'dashboard', icon: 'fas fa-th-large', label: 'Dashboard', href: '../eye-clinic/index.html' },
        { id: 'patients', icon: 'fas fa-users', label: 'Patients', href: '#' },
        { id: 'messages', icon: 'fas fa-envelope', label: 'Messages', href: '#' },
        { id: 'tests', icon: 'fas fa-clipboard-check', label: 'Tests', href: '#' },
        { id: 'inventory', icon: 'fas fa-box-open', label: 'Inventory', href: '#' },
        { id: 'reports', icon: 'fas fa-chart-bar', label: 'Reports', href: '#' },
        { id: 'settings', icon: 'fas fa-cog', label: 'Settings', href: '#' },
        { id: 'logout', icon: 'fas fa-sign-out-alt', label: 'Logout', href: '#' },
    ];

    const handleNavClick = (sectionId) => {
        // In a real React app, you would use a router, but here we just update state
        if (sectionId === 'logout') {
            console.log('Logging out...');
            // In a real app, this would trigger a sign out
        }
        setActiveSection(sectionId);
    };

<<<<<<< HEAD
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
            console.log('View patient details for:', patient.id);
            // In a real app, this would navigate to a patient detail screen
            alert(`Viewing patient: ${patient.first_name} ${patient.last_name}`);
        } else if (action === 'Delete') {
            setShowDeleteConfirm(patient);
        }
    };

    const handleAddEditPatient = async () => {
      if (!window.electronAPI) return;
      setLoading(true);
      try {
        let res;
        if (editingPatient) {
          res = await window.electronAPI.updatePatient(editingPatient.id, patientFormData);
        } else {
          res = await window.electronAPI.createPatient(patientFormData);
        }
        
        if (res.success) {
          setShowAddEditModal(false);
          setEditingPatient(null);
          setPatientFormData({patient_id: '', first_name: '', last_name: '', dob: '', gender: '', contact: ''});
          fetchPatients(); // Re-fetch to update the list
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
          fetchPatients(); // Re-fetch to update the list
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

=======
    const handleTableAction = (action, patientId) => {
        console.log(`${action} patient with ID: ${patientId}`);
        // Placeholder for actual logic (e.g., open modal, delete record)
        if (action === 'Admit') {
            alert(`Simulating patient admission for ID: ${patientId}`);
        }
    };

>>>>>>> d7adb94f093a3e0b1314671557a7ee3c3ed7e9e9
    return (
        <>
            <AppStyles /> 
            
            <div className="app-container">
                {/* Header */}
                <header className="app-header">
                    <div className="header-content">
                        <div className="logo">
                            <i className="fas fa-eye"></i>
                            <h1>KORENE EYE CLINIC</h1>
                        </div>
                        <div className="user-info">
                            <img 
                                src="https://placehold.co/30x30/764ba2/ffffff?text=A" 
                                alt="Admin Avatar" 
                                className="avatar" 
                                onError={(e) => {e.target.onerror = null; e.target.src='https://placehold.co/30x30/764ba2/ffffff?text=A'}} 
                            /> 
                            <span>Admin</span>
                        </div>
                    </div>
                </header>

                {/* Main Content Area */}
                <div className="main-content-wrapper">
                    {/* Sidebar Navigation */}
                    <nav className="sidebar">
                        <ul className="nav-menu">
                            {navItems.map((item) => (
                                <li key={item.id} className={`nav-item ${activeSection === item.id ? 'active' : ''}`}>
                                    <a 
                                        href={item.href} 
                                        className="nav-link"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            handleNavClick(item.id);
                                        }}
                                    >
                                        <i className={item.icon}></i>
                                        <span>{item.label}</span>
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </nav>

                    {/* Content Area */}
                    <main className="content-area">
                        <section className="patients-section">
                            <div className="card">
                                <div className="card-header">
                                    <h3>PATIENTS</h3>
                                </div>
                                
                                <div className="card-controls">
                                    <div className="search-bar">
                                        <input type="text" placeholder="Search patient..." />
                                        <i className="fas fa-search"></i>
                                    </div>
                                    <div className="filters">
                                        {/* Dropdowns are non-functional placeholders */}
                                        <div className="dropdown">
                                            <button>Filter <i className="fas fa-chevron-down"></i></button>
                                        </div>
                                        <div className="dropdown">
                                            <button>ID <i className="fas fa-chevron-down"></i></button>
                                        </div>
                                        <div className="dropdown">
                                            <button>Gender <i className="fas fa-chevron-down"></i></button>
                                        </div>
                                    </div>
                                    <button 
                                        className="btn btn-primary"
<<<<<<< HEAD
                                        onClick={() => {
                                          setEditingPatient(null);
                                          setPatientFormData({patient_id: '', first_name: '', last_name: '', dob: '', gender: '', contact: ''});
                                          setShowAddEditModal(true);
                                        }}
=======
                                        onClick={() => console.log('Add New Patient')}
>>>>>>> d7adb94f093a3e0b1314671557a7ee3c3ed7e9e9
                                    >
                                        <i className="fas fa-plus"></i> Add Patient
                                    </button>
                                </div>

                                <div className="table-responsive">
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>ID</th>
                                                <th>Name</th>
                                                <th>Phone Number</th>
                                                <th>Email</th>
                                                <th>Date of Birth</th>
                                                <th>Gender</th>
                                                <th>Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
<<<<<<< HEAD
                                            {patients.length > 0 ? patients.map((patient) => (
                                                <tr key={patient.id}>
                                                    <td>{patient.patient_id}</td>
                                                    <td>{`${patient.first_name} ${patient.last_name}`}</td>
                                                    <td>{patient.contact}</td>
=======
                                            {patientsData.map((patient) => (
                                                <tr key={patient.id}>
                                                    <td>{patient.id}</td>
                                                    <td>{patient.name}</td>
                                                    <td>{patient.phone}</td>
>>>>>>> d7adb94f093a3e0b1314671557a7ee3c3ed7e9e9
                                                    <td>{patient.email}</td>
                                                    <td>{patient.dob}</td>
                                                    <td>{patient.gender}</td>
                                                    <td className="action-buttons">
                                                        <button 
                                                            className="icon-btn edit" 
<<<<<<< HEAD
                                                            onClick={() => handleTableAction('Edit', patient)}
=======
                                                            onClick={() => handleTableAction('Edit', patient.id)}
>>>>>>> d7adb94f093a3e0b1314671557a7ee3c3ed7e9e9
                                                        >
                                                            <i className="fas fa-pencil-alt"></i>
                                                        </button>
                                                        <button 
                                                            className="icon-btn view"
<<<<<<< HEAD
                                                            onClick={() => handleTableAction('View', patient)}
=======
                                                            onClick={() => handleTableAction('View', patient.id)}
>>>>>>> d7adb94f093a3e0b1314671557a7ee3c3ed7e9e9
                                                        >
                                                            <i className="fas fa-eye"></i>
                                                        </button>
                                                        <button 
                                                            className="icon-btn delete"
<<<<<<< HEAD
                                                            onClick={() => handleTableAction('Delete', patient)}
=======
                                                            onClick={() => handleTableAction('Delete', patient.id)}
>>>>>>> d7adb94f093a3e0b1314671557a7ee3c3ed7e9e9
                                                        >
                                                            <i className="fas fa-trash-alt"></i>
                                                        </button>
                                                        <button 
                                                            className="btn btn-secondary"
<<<<<<< HEAD
                                                            onClick={() => handleTableAction('Admit', patient)}
=======
                                                            onClick={() => handleTableAction('Admit', patient.id)}
>>>>>>> d7adb94f093a3e0b1314671557a7ee3c3ed7e9e9
                                                        >
                                                            Admit
                                                        </button>
                                                    </td>
                                                </tr>
<<<<<<< HEAD
                                            )) : (
                                                <tr>
                                                  <td colSpan="7" className="text-center text-gray-400 dark:text-gray-500 py-4">
                                                    {loading ? 'Loading patients...' : 'No patients found.'}
                                                  </td>
                                                </tr>
                                            )}
=======
                                            ))}
>>>>>>> d7adb94f093a3e0b1314671557a7ee3c3ed7e9e9
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </section>
                    </main>
                </div>
            </div>
<<<<<<< HEAD

            {/* Add/Edit Patient Modal */}
            {showAddEditModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
                        <h3 className="text-lg font-semibold mb-4 dark:text-white">{editingPatient ? 'Edit Patient' : 'Add New Patient'}</h3>
                        <div className="space-y-4">
                            <input
                                type="text"
                                placeholder="Patient ID"
                                value={patientFormData.patient_id}
                                onChange={(e) => setPatientFormData({ ...patientFormData, patient_id: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                            />
                            <input
                                type="text"
                                placeholder="First Name"
                                value={patientFormData.first_name}
                                onChange={(e) => setPatientFormData({ ...patientFormData, first_name: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                            />
                            <input
                                type="text"
                                placeholder="Last Name"
                                value={patientFormData.last_name}
                                onChange={(e) => setPatientFormData({ ...patientFormData, last_name: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                            />
                            <input
                                type="date"
                                placeholder="Date of Birth"
                                value={patientFormData.dob}
                                onChange={(e) => setPatientFormData({ ...patientFormData, dob: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                            />
                            <select
                                value={patientFormData.gender}
                                onChange={(e) => setPatientFormData({ ...patientFormData, gender: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                            >
                                <option value="">Select Gender</option>
                                <option value="male">Male</option>
                                <option value="female">Female</option>
                                <option value="other">Other</option>
                            </select>
                            <input
                                type="text"
                                placeholder="Contact (Phone/Email)"
                                value={patientFormData.contact}
                                onChange={(e) => setPatientFormData({ ...patientFormData, contact: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                            />
                        </div>
                        <div className="flex justify-end space-x-2 mt-6">
                            <button
                                onClick={() => {
                                    setShowAddEditModal(false);
                                    setEditingPatient(null);
                                    setPatientFormData({patient_id: '', first_name: '', last_name: '', dob: '', gender: '', contact: ''});
                                }}
                                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-white"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddEditPatient}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                            >
                                {editingPatient ? 'Update' : 'Add'} Patient
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
                        <h3 className="text-lg font-semibold mb-4 dark:text-white">Delete Patient</h3>
                        <p className="text-gray-600 dark:text-gray-300 mb-6">Are you sure you want to delete patient {showDeleteConfirm.first_name} {showDeleteConfirm.last_name}?</p>
                        <div className="flex justify-end space-x-2">
                            <button
                                onClick={() => setShowDeleteConfirm(null)}
                                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-white"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeletePatient}
                                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
=======
>>>>>>> d7adb94f093a3e0b1314671557a7ee3c3ed7e9e9
        </>
    );
};

export default App;
