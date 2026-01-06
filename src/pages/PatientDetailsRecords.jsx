import React, { useState } from 'react';

// Mock Data for a Specific Patient's History
const CURRENT_PATIENT = {
    name: "Ammar Bin Khalid",
    id: 100456,
    dob: "1975-03-15",
    allergies: "Penicillin, Latex",
    gender: "Male",
};

const MOCK_PATIENT_HISTORY = [
    {
        id: 1,
        date: "2024-01-25",
        chiefComplaint: "Sudden loss of peripheral vision in left eye.",
        diagnosis: "Rhegmatogenous Retinal Detachment (L Eye)",
        treatment: "Scleral Buckling and Vitrectomy. Laser retinopexy performed.",
        doctor: "Dr. Leda K.",
        status: "Surgical Intervention",
    },
    {
        id: 2,
        date: "2023-11-10",
        chiefComplaint: "Routine check-up, blurry vision for near tasks.",
        diagnosis: "Presbyopia and Mild Cataract (R Eye)",
        treatment: "Prescribed Bifocal Lenses. Advised annual monitoring for cataract progression.",
        doctor: "Dr. Orus S.",
        status: "Observation",
    },
    {
        id: 3,
        date: "2023-05-01",
        chiefComplaint: "Severe, throbbing eye pain and nausea.",
        diagnosis: "Acute Angle-Closure Glaucoma Attack (R Eye)",
        treatment: "Initial management with topical medications. Followed by Laser Peripheral Iridotomy (LPI) in both eyes.",
        doctor: "Dr. Charon T.",
        status: "Emergency Care",
    },
];

// Reusable Navigation Item Component
const NavItem = ({ icon, label, isActive, onClick }) => (
    <li className={`nav-item ${isActive ? 'active' : ''}`} onClick={onClick}>
        {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
        <a href="#" className="nav-link">
            <i className={`fas ${icon}`}></i> <span>{label}</span>
        </a>
    </li>
);

// Navigation Menu Component (Sidebar)
const NavMenu = ({ isOpen, toggleSidebar }) => {
    // Note: 'Patients' is set to active to match the current content view
    const navItems = [
        { icon: "fa-th-large", label: "Dashboard", isActive: false },
        { icon: "fa-users", label: "Patients", isActive: true }, 
        { icon: "fa-envelope", label: "Messages", isActive: false },
        { icon: "fa-clipboard-check", label: "Tests", isActive: false },
        { icon: "fa-box-open", label: "Inventory", isActive: false },
        { icon: "fa-chart-bar", label: "Reports", isActive: false },
        { icon: "fa-cog", label: "Settings", isActive: false },
        { icon: "fa-sign-out-alt", label: "Logout", isActive: false, isLogout: true },
    ];

    return (
        <nav className={`sidebar ${isOpen ? 'open' : ''}`}>
            <ul className="nav-menu">
                {navItems.map((item) => (
                    <NavItem 
                        key={item.label} 
                        icon={item.icon} 
                        label={item.label} 
                        isActive={item.isActive} 
                        onClick={toggleSidebar} // Close sidebar on click (mobile UX)
                    />
                ))}
            </ul>
        </nav>
    );
};

// Component for a single medical visit entry
const HistoryCard = ({ visit }) => {
    const getStatusColor = (status) => {
        switch (status) {
            case "Surgical Intervention": return "bg-red-500";
            case "Observation": return "bg-yellow-500";
            case "Emergency Care": return "bg-purple-500";
            default: return "bg-gray-500";
        }
    };

    return (
        <div className="history-card">
            <div className="history-card-header">
                <div className="text-xl font-bold text-gray-800">{visit.date}</div>
                <div className={`status-badge ${getStatusColor(visit.status)}`}>{visit.status}</div>
            </div>
            <p className="mt-2 text-lg font-semibold text-gray-700">
                <i className="fas fa-notes-medical mr-2 text-primary-color"></i>
                Chief Complaint: <span className="font-normal">{visit.chiefComplaint}</span>
            </p>
            <p className="mt-1 text-gray-600">
                <i className="fas fa-stethoscope mr-2 text-secondary-color"></i>
                **Diagnosis**: **{visit.diagnosis}**
            </p>
            <p className="mt-1 text-sm text-gray-500">
                <i className="fas fa-hand-holding-medical mr-2"></i>
                Treatment: {visit.treatment}
            </p>
            <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between items-center text-sm text-gray-500">
                <span><i className="fas fa-user-md mr-1"></i> Attending: {visit.doctor}</span>
                <i className="fas fa-file-pdf text-danger-color cursor-pointer hover:text-red-700 transition"></i>
            </div>
        </div>
    );
};

// Main App Component
const App = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [history] = useState(MOCK_PATIENT_HISTORY);
    const [patient] = useState(CURRENT_PATIENT);
    const [adminName] = useState("Dr. Emily Carter");
    const [doctorName] = useState("Doctor John Doe");

    const toggleSidebar = () => {
        setIsSidebarOpen(prev => !prev);
    };

    return (
        <div className="app-container">
            {/* Font Awesome 6.5.1 and Poppins Font - Required by the original HTML */}
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" />
            
            {/* Embedded CSS Styles - Inherited Theme */}
            <style jsx="true">{`
                @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');

                :root {
                    /* Primary Colors */
                    --primary-color: #3742fa;
                    --secondary-color: #6c757d;
                    --text-color: #2c3e50;
                    --border-color: #dee2e6;
                    --bg-light: #f5f6fa;
                    --bg-white: #ffffff;
                    --accent-color: #ffd700; /* Yellow accent */
                    --danger-color: #dc3545;

                    /* Sidebar Specific */
                    --sidebar-bg: #764ba2; /* Darker Purple */
                    --sidebar-text: #bdc3c7;
                    --sidebar-active-bg: #4a5dff; /* Lighter Blue/Purple */
                    
                    /* Header Specific */
                    --header-bg: linear-gradient(135deg, #667eea 0%, #764ba2 100%); /* Blue-to-Purple Gradient */
                }

                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                    font-family: 'Poppins', sans-serif;
                }
                
                html, body, #root {
                    height: 100%;
                    overflow: hidden; 
                    background-color: var(--bg-light);
                }

                .app-container {
                    height: 100vh;
                    display: flex;
                    flex-direction: column; 
                }

                .main-content-wrapper {
                    display: flex;
                    flex: 1; 
                    overflow: hidden; 
                }

                /* -----------------------------------------------------
                 * Header Styling
                 * ----------------------------------------------------- */
                .app-header {
                    background: var(--header-bg);
                    color: white;
                    padding: 1rem 2rem;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.15);
                    z-index: 1000;
                }

                .header-content {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    max-width: 1400px;
                    margin: 0 auto;
                }
                
                .menu-toggle {
                    display: none; /* Hidden by default on desktop */
                    font-size: 1.5rem;
                    cursor: pointer;
                    color: var(--accent-color);
                    transition: color 0.2s;
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
                    text-transform: uppercase;
                }

                .user-info {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    color: white; 
                    font-weight: 500;
                    padding: 0.25rem 0.5rem;
                    border-radius: 9999px;
                    background-color: rgba(255, 255, 255, 0.1);
                    transition: background-color 0.3s;
                }
                .user-info:hover {
                    background-color: rgba(255, 255, 255, 0.2);
                }

                .user-info .avatar {
                    width: 35px;
                    height: 35px;
                    border-radius: 50%;
                    object-fit: cover;
                    border: 2px solid var(--accent-color);
                }

                /* -----------------------------------------------------
                 * Sidebar Styling
                 * ----------------------------------------------------- */
                .sidebar {
                    width: 250px;
                    background-color: var(--sidebar-bg);
                    color: white;
                    height: 100%; 
                    overflow-y: auto;
                    box-shadow: 2px 0 10px rgba(0,0,0,0.1);
                    flex-shrink: 0; /* Prevent sidebar from shrinking */
                }

                .nav-menu {
                    list-style: none;
                    padding: 1.5rem 0;
                }

                .nav-link{
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    padding: 1rem 1.5rem;
                    color: var(--sidebar-text);
                    text-decoration: none;
                    transition: all 0.3s ease;
                    border-left: 5px solid transparent;
                }

                .nav-link:hover {
                    background-color: rgba(255, 255, 255, 0.1);
                    color: white;
                    border-left-color: var(--accent-color);
                }

                .nav-item.active .nav-link {
                    background-color: var(--sidebar-active-bg);
                    color: white;
                    border-left-color: var(--accent-color);
                    font-weight: 600;
                }

                .nav-link i {
                    font-size: 1.2rem;
                    width: 25px; /* Fixed width for icon alignment */
                }

                /* -----------------------------------------------------
                 * Main Content Area and History Widgets
                 * ----------------------------------------------------- */
                .content-area {
                    flex: 1; 
                    padding: 2rem;
                    overflow-y: auto;
                    background-color: var(--bg-light);
                    display: grid;
                    gap: 1.5rem;
                    align-content: start; /* Align content to the top */
                }

                .greeting {
                    margin-bottom: 1.5rem;
                }

                .greeting h2 {
                    font-size: 2rem;
                    font-weight: 700;
                    color: var(--text-color);
                }

                .greeting p {
                    font-size: 1.1rem;
                    color: var(--secondary-color);
                }

                .widget-card {
                    background-color: var(--bg-white);
                    border-radius: 12px;
                    padding: 2rem;
                    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
                }

                .widget-card h3 {
                    font-size: 1.5rem;
                    font-weight: 600;
                    margin-bottom: 1.5rem;
                    color: var(--primary-color);
                }

                /* Patient Info Panel Styles */
                .patient-info-panel {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 1.5rem;
                    padding: 1.5rem;
                    margin-bottom: 2rem;
                    border: 1px solid var(--border-color);
                    border-radius: 12px;
                    background-color: #fafbff;
                }
                .info-item {
                    display: flex;
                    flex-direction: column;
                }
                .info-item label {
                    font-size: 0.9rem;
                    font-weight: 500;
                    color: var(--secondary-color);
                    margin-bottom: 0.25rem;
                }
                .info-item span {
                    font-size: 1.1rem;
                    font-weight: 600;
                    color: var(--text-color);
                }

                /* History Card Styles (New) */
                .history-container {
                    display: flex;
                    flex-direction: column;
                    gap: 1.5rem;
                }
                .history-card {
                    padding: 1.5rem;
                    border: 1px solid #e0e0e0;
                    border-radius: 10px;
                    transition: all 0.2s;
                    border-left: 5px solid var(--primary-color);
                    background-color: #ffffff;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.05);
                }
                .history-card:hover {
                    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                }
                .history-card-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border-bottom: 1px solid #f0f0f0;
                    padding-bottom: 1rem;
                    margin-bottom: 1rem;
                }
                .status-badge {
                    padding: 0.3rem 0.75rem;
                    border-radius: 9999px;
                    color: white;
                    font-size: 0.8rem;
                    font-weight: 600;
                    text-transform: uppercase;
                }
                /* Utility classes for status colors */
                .bg-red-500 { background-color: #ef4444; }
                .bg-yellow-500 { background-color: #f59e0b; }
                .bg-purple-500 { background-color: #a855f7; }
                .text-primary-color { color: var(--primary-color); }
                .text-secondary-color { color: var(--secondary-color); }
                .text-lg { font-size: 1.125rem; }
                .font-semibold { font-weight: 600; }
                .font-normal { font-weight: 400; }
                .mt-1 { margin-top: 0.25rem; }
                .mt-2 { margin-top: 0.5rem; }
                .mt-3 { margin-top: 0.75rem; }
                .pt-3 { padding-top: 0.75rem; }
                .border-t { border-top-width: 1px; }
                .border-gray-100 { border-color: #f3f4f6; }
                .justify-between { justify-content: space-between; }
                .items-center { align-items: center; }
                .text-sm { font-size: 0.875rem; }
                .cursor-pointer { cursor: pointer; }
                .transition { transition-property: all; transition-duration: 0.15s; }
                .hover\:text-red-700:hover { color: #b91c1c; }


                /* -----------------------------------------------------
                 * Responsive Media Queries
                 * ----------------------------------------------------- */
                /* Tablet & Smaller Desktop */
                @media (max-width: 1024px) {
                    .sidebar {
                        width: 80px;
                        padding: 15px 0;
                    }
                    .nav-link {
                        justify-content: center;
                        padding: 15px 0;
                        border-left: none; 
                        border-right: 5px solid transparent; 
                    }
                    .nav-link span { 
                        display: none; 
                    } 
                    .nav-item.active .nav-link,
                    .nav-link:hover {
                        border-right-color: var(--accent-color);
                        border-left: none;
                    }
                }

                /* Mobile View */
                @media (max-width: 768px) {
                    .app-header {
                        padding: 0.75rem 1rem;
                    }

                    .logo h1 {
                        font-size: 1.3rem;
                    }

                    .menu-toggle {
                        display: block; 
                    }
                    
                    /* Sidebar sliding mechanism for mobile */
                    .sidebar {
                        position: fixed;
                        top: 0;
                        left: -250px; 
                        width: 250px;
                        z-index: 1010;
                        transition: left 0.3s ease;
                        box-shadow: 5px 0 15px rgba(0,0,0,0.4);
                        overflow-y: auto;
                    }
                    .sidebar.open {
                        left: 0; 
                    }
                    
                    /* Restore full text and alignment when sidebar is open */
                    .nav-link span { 
                        display: inline;
                    }
                    .nav-link {
                        justify-content: flex-start;
                        border-right: none !important; 
                        border-left: 5px solid transparent; 
                    }
                    .nav-item.active .nav-link,
                    .nav-link:hover {
                        border-left-color: var(--accent-color);
                    }

                    .content-area {
                        padding: 1rem;
                    }
                    .widget-card {
                        padding: 1rem;
                    }
                    .greeting h2 {
                        font-size: 1.5rem;
                    }
                }
            `}</style>
            
            <header className="app-header">
                <div className="header-content">
                    {/* Menu Toggle button (Visible on mobile) */}
                    <div className="menu-toggle" onClick={toggleSidebar}>
                        <i className={`fas ${isSidebarOpen ? 'fa-times' : 'fa-bars'}`}></i>
                    </div>

                    <div className="logo">
                        <i className="fas fa-eye"></i>
                        <h1>KORENE EYE CLINIC</h1>
                    </div>
                    
                    <div className="user-info">
                        <img src="https://placehold.co/35x35/4a5dff/ffffff?text=AD" alt="Admin Avatar" className="avatar" /> 
                        <span>{adminName}</span>
                    </div>
                </div>
            </header>

            <div className="main-content-wrapper">
                {/* Sidebar Navigation */}
                <NavMenu isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />

                <main className="content-area">
                    <div className="greeting">
                        <h2>Patient File: {patient.name}</h2>
                        <p>Detailed medical history and visit logs for {patient.id}</p>
                    </div>

                    <div className="widget-card">
                        <h3>Patient Overview</h3>
                        <div className="patient-info-panel">
                            <div className="info-item">
                                <label>Patient ID</label>
                                <span>{patient.id}</span>
                            </div>
                            <div className="info-item">
                                <label>Date of Birth</label>
                                <span>{patient.dob}</span>
                            </div>
                            <div className="info-item">
                                <label>Gender</label>
                                <span>{patient.gender}</span>
                            </div>
                        </div>

                        <h3>Complete Visit History ({history.length} Records)</h3>

                        {/* History Cards Container */}
                        <div className="history-container">
                            {history.map(visit => (
                                <HistoryCard key={visit.id} visit={visit} />
                            ))}
                        </div>
                        
                        {/* Action Buttons (Themed to fit the style) */}
                        <div className="mt-8 flex gap-4">
                            <button className="filter-bar button bg-primary-color hover:bg-blue-700">
                                <i className="fas fa-plus mr-2"></i>
                                Add New Visit
                            </button>
                            <button className="filter-bar button bg-secondary-color hover:bg-gray-700">
                                <i className="fas fa-print mr-2"></i>
                                Print Full Record
                            </button>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default App;
