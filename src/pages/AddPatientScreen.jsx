import React, { useState } from 'react';

const App = () => {
    // State to control sidebar visibility on smaller screens (based on media queries in CSS)
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // Handler to toggle the sidebar for mobile views
    const toggleSidebar = () => {
        setIsSidebarOpen(!isSidebarOpen);
    };

    const sidebarStyle = {
        left: isSidebarOpen ? '0' : '-80px',
        // Ensure it always displays normally on wider screens
        '@media (min-width: 993px)': {
            width: '250px',
            left: '0',
            position: 'relative',
        }
    };

    return (
        <div className="app-container">
            {/* Embedded CSS to maintain the exact visual theme and structure */}
            <style>
                {`
                    /* Import Poppins font */
                    @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');

                    /* Font Awesome CDN (included via link in original HTML, replicating for completeness) */
                    @import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css');

                    :root {
                        /* --- Template Colors --- */
                        --primary-color: #3742fa;
                        --secondary-color: #6c757d;
                        --text-color: #2c3e50;
                        --light-text-color: #7f8c8d;
                        --border-color: #dee2e6;
                        --bg-light: #f8f9fa;
                        --bg-white: #ffffff;
                        --sidebar-bg: #764ba2;
                        --sidebar-text: #bdc3c7;
                        --sidebar-active-bg: #3742fa;
                        --accent-color: #ffd700;
                        --header-bg: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        --card-bg: #ffffff;
                        --shadow-light: rgba(0, 0, 0, 0.05);
                        --danger-color: #dc3545;

                        /* --- Form-Specific Colors (Kept from Original for Form Elements) --- */
                        --color-primary-blue: #007bff;
                        --color-text-light: #6c757d;
                        --color-text-dark: #333;
                        --color-input-border: #ced4da;
                    }

                    /* Universal Reset */
                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                    }

                    body {
                        font-family: 'Poppins', sans-serif;
                        background-color: #f5f6fa;
                        color: var(--text-color);
                        overflow: hidden;
                        height: 100vh;
                    }

                    a {
                        text-decoration: none;
                        color: inherit;
                    }

                    /* ========================================= */
                    /* 2. APP LAYOUT */
                    /* ========================================= */
                    .app-container {
                        height: 100vh;
                        display: flex;
                        flex-direction: column; 
                    }

                    /* Wrapper for Sidebar and Content */
                    .main-content-wrapper {
                        display: flex;
                        flex: 1; 
                        overflow: hidden; 
                    }

                    /* ========================================= */
                    /* 3. HEADER STYLING */
                    /* ========================================= */
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
                    
                    /* Mobile Menu Button */
                    .menu-toggle {
                        display: none;
                        background: none;
                        border: none;
                        color: white;
                        font-size: 1.5rem;
                        cursor: pointer;
                        padding: 0;
                    }

                    /* ========================================= */
                    /* 4. SIDEBAR NAVIGATION STYLING */
                    /* ========================================= */
                    .sidebar {
                        width: 250px;
                        background-color: var(--sidebar-bg);
                        color: white;
                        height: 100%; 
                        overflow-y: auto;
                        box-shadow: 2px 0 10px rgba(0,0,0,0.1);
                        flex-shrink: 0;
                        transition: width 0.3s ease, left 0.3s ease;
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

                    /* ========================================= */
                    /* 5. CARD STYLING */
                    /* ========================================= */
                    .page-content {
                        padding: 0; 
                        flex-grow: 1;
                    }

                    .card {
                        background-color: var(--bg-white);
                        border-radius: 6px;
                        box-shadow: 0 1px 10px var(--shadow-light);
                        padding: 30px;
                        border: 1px solid var(--border-color);
                        margin: 0 auto;
                        margin-top: -30px;
                        max-width: 900px;
                    }

                    .card-title {
                        font-size: 28px;
                        font-weight: 700;
                        color: var(--text-color);
                        margin-bottom: 25px;
                        padding-bottom: 15px;
                        border-bottom: 1px solid #eee;
                        height: 54px;
                    }

                    /* ========================================= */
                    /* 6. FORM ELEMENTS & GRID LAYOUT */
                    /* ========================================= */
                    .patient-form {
                        display: flex;
                        flex-direction: column;
                    }

                    /* Base grid container for form fields */
                    .form-grid {
                        display: grid;
                        gap: 20px;
                        margin-bottom: 20px;
                    }

                    .two-cols {
                        grid-template-columns: 1fr 1fr;
                    }

                    .single-col {
                        grid-template-columns: 1fr;
                    }

                    .form-group {
                        display: flex;
                        flex-direction: column;
                    }

                    .form-group label {
                        font-size: 15.2px;
                        color: rgb(44, 62, 80);
                        margin-bottom: 5px;
                        font-weight: 600;
                    }

                    /* Styling for all common input types and selects */
                    input[type="text"],
                    input[type="email"],
                    input[type="tel"],
                    select {
                        padding: 10px 15px;
                        border: 1px solid var(--color-input-border);
                        border-radius: 4px;
                        font-size: 15px;
                        color: var(--color-text-dark);
                        appearance: none;
                        height: 45px;
                        width: 100%; 
                    }

                    /* Focus State Styling */
                    input[type="text"]:focus,
                    input[type="email"]:focus,
                    input[type="tel"]:focus,
                    select:focus {
                        outline: none;
                        border-color: var(--color-primary-blue);
                        box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
                    }

                    /* Wrapper for elements that need icons (e.g., date, select, search) */
                    .date-input, .search-input, .select-input {
                        position: relative;
                    }

                    .date-input input, .search-input input {
                        padding-right: 40px;
                    }

                    /* Icon positioning */
                    .date-input i, 
                    .search-input i,
                    .select-input i {
                        position: absolute;
                        right: 15px;
                        top: 50%; 
                        transform: translateY(calc(-50% + 5px));
                        color: var(--color-text-light);
                        pointer-events: none;
                    }

                    /* Admission Details Separator */
                    .admission-details {
                        padding: 20px 0; 
                        border-top: 1px solid var(--border-color);
                        margin-top: 5px; 
                    }


                    /* ========================================= */
                    /* 7. BUTTON STYLING (Form Actions) */
                    /* ========================================= */
                    .form-actions {
                        margin-top: 30px;
                        display: flex;
                        justify-content: flex-end;
                    }

                    .btn {
                        padding: 10px 20px;
                        border: none;
                        border-radius: 4px;
                        font-size: 16px;
                        cursor: pointer;
                        transition: background-color 0.2s, box-shadow 0.2s;
                        font-weight: 500;
                    }

                    .btn-primary {
                        background-color: #3742fa;
                        color: white;
                        box-shadow: 0 2px 4px rgba(0, 123, 255, 0.3);
                    }

                    .btn-primary:hover {
                        background-color: #2f3542;
                    }

                    /* ========================================= */
                    /* 8. RESPONSIVE DESIGN (Media Queries) */
                    /* ========================================= */

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
                        .nav-link:hover,
                        .nav-item.active .nav-link {
                            border-left: none;
                            border-right: 3px solid var(--accent-color);
                            background-color: var(--sidebar-active-bg);
                        }
                    }

                    @media (max-width: 768px) {
                        .sidebar {
                            position: absolute;
                            z-index: 1000;
                            height: calc(100vh - 78px); /* Adjust for header height */
                            transition: left 0.3s ease;
                        }
                        
                        .main-content-wrapper { 
                            flex-grow: 1; 
                            width: 100%;
                        }
                        
                        .header-content {
                            padding-right: 10px;
                        }
                        
                        .menu-toggle {
                            display: block;
                        }
                        
                        /* Form fix */
                        .two-cols {
                            grid-template-columns: 1fr;
                        }
                        
                        .card {
                            margin-top: 0;
                        }
                    }
                `}
            </style>
            
            {/* Font Awesome link is required for the icons to render */}
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css" />
            <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap" rel="stylesheet" />

            {/* HEADER */}
            <header className="app-header">
                <div className="header-content">
                    <div className="logo">
                        {/* Mobile menu toggle button */}
                        <button onClick={toggleSidebar} className="menu-toggle mr-3">
                            <i className="fas fa-bars"></i>
                        </button>
                        <i className="fas fa-eye"></i>
                        <h1>KORENE EYE CLINIC</h1>
                    </div>
                    <div className="user-info">
                        <img src="https://placehold.co/30x30/2c3e50/ffffff?text=A" alt="Admin Avatar" className="avatar" /> 
                        <span>Admin</span>
                    </div>
                </div>
            </header>

            {/* MAIN CONTENT WRAPPER */}
            <div className="main-content-wrapper">
                {/* SIDEBAR */}
                <nav 
                    className="sidebar" 
                    style={window.innerWidth <= 768 ? sidebarStyle : {}}
                >
                    <ul className="nav-menu">
                        <li className="nav-item"><a href="#" className="nav-link"><i className="fas fa-th-large"></i> <span>Dashboard</span></a></li>
                        <li className="nav-item active"><a href="#" className="nav-link"><i className="fas fa-users"></i> <span>Patients</span></a></li>
                        <li className="nav-item"><a href="#" className="nav-link"><i className="fas fa-envelope"></i> <span>Messages</span></a></li>
                        <li className="nav-item"><a href="#" className="nav-link"><i className="fas fa-clipboard-check"></i> <span>Tests</span></a></li>
                        <li className="nav-item"><a href="#" className="nav-link"><i className="fas fa-box-open"></i> <span>Inventory</span></a></li>
                        <li className="nav-item"><a href="#" className="nav-link"><i className="fas fa-chart-bar"></i> <span>Reports</span></a></li>
                        <li className="nav-item"><a href="#" className="nav-link"><i className="fas fa-cog"></i> <span>Settings</span></a></li>
                        <li className="nav-item"><a href="#" className="nav-link"><i className="fas fa-sign-out-alt"></i> <span>Logout</span></a></li>
                    </ul>
                </nav>

                {/* MAIN VIEW */}
                <main className="content-area">
                    <div className="page-content">
                        <div className="card">
                            <h3 className="card-title">ADD PATIENT</h3>
                            <form className="patient-form" onSubmit={(e) => e.preventDefault()}>
                                
                                {/* Personal Details */}
                                <div className="form-grid two-cols">
                                    <div className="form-group">
                                        <label htmlFor="first-name">First name</label>
                                        <input type="text" id="first-name" name="first-name" placeholder="John" />
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="last-name">Last name</label>
                                        <input type="text" id="last-name" name="last-name" placeholder="Doe" />
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="email">Email</label>
                                        <input type="email" id="email" name="email" placeholder="john.doe@example.com" />
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="phone">Phone</label>
                                        <input type="tel" id="phone" name="phone" placeholder="(123) 456-7890" />
                                    </div>
                                </div>

                                <div className="form-grid two-cols">
                                    <div className="form-group date-input">
                                        <label htmlFor="dob">Date of birth</label>
                                        <input type="text" id="dob" name="dob" defaultValue="dd/mm/yyyy" />
                                        <i className="fas fa-calendar-alt"></i>
                                    </div>
                                    <div className="form-group select-input">
                                        <label htmlFor="gender">Gender</label>
                                        <select id="gender" name="gender" defaultValue="">
                                            <option value="" disabled>- select -</option>
                                            <option value="male">Male</option>
                                            <option value="female">Female</option>
                                            <option value="other">Other</option>
                                        </select>
                                        <i className="fas fa-caret-down"></i>
                                    </div>
                                </div>

                                {/* Admission Details */}
                                <div className="admission-details">
                                    <div className="form-grid two-cols">
                                        <div className="form-group search-input">
                                            <label htmlFor="room">Room</label>
                                            <input type="text" id="room" name="room" placeholder="A-101" />
                                            <i className="fas fa-search"></i>
                                        </div>
                                        <div className="form-group search-input">
                                            <label htmlFor="doctor">Doctor</label>
                                            <input type="text" id="doctor" name="doctor" placeholder="Dr. Alice Smith" />
                                            <i className="fas fa-search"></i>
                                        </div>
                                    </div>
                                    
                                    <div className="form-grid single-col">
                                        <div className="form-group search-input">
                                            <label htmlFor="nurse">Nurse</label>
                                            <input type="text" id="nurse" name="nurse" placeholder="Nurse Betty Jones" />
                                            <i className="fas fa-search"></i>
                                        </div>
                                    </div>

                                    <div className="form-grid two-cols">
                                        <div className="form-group date-input">
                                            <label htmlFor="admission-date">Admission date</label>
                                            <input type="text" id="admission-date" name="admission-date" defaultValue="dd/mm/yyyy" />
                                            <i className="fas fa-calendar-alt"></i>
                                        </div>
                                        <div className="form-group date-input">
                                            <label htmlFor="discharge-date">Discharge date</label>
                                            <input type="text" id="discharge-date" name="discharge-date" defaultValue="dd/mm/yyyy" />
                                            <i className="fas fa-calendar-alt"></i>
                                        </div>
                                    </div>

                                    <div className="form-grid single-col">
                                        <div className="form-group select-input">
                                            <label htmlFor="department">Department</label>
                                            <select id="department" name="department" defaultValue="">
                                                <option value="" disabled>- select -</option>
                                                <option value="er">Emergency Room</option>
                                                <option value="surgery">Surgery</option>
                                                <option value="optometry">Optometry</option>
                                                <option value="general">General Clinic</option>
                                            </select>
                                            <i className="fas fa-caret-down"></i>
                                        </div>
                                    </div>
                                </div>

                                {/* Form Action Button */}
                                <div className="form-actions">
                                    <button type="submit" className="btn btn-primary">Save Patient</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default App;
