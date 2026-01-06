import React, { useState, useEffect, useMemo } from 'react';

// --- DUMMY DATA ---
const initialConcerns = [
    { id: 1, name: 'Condition', description: 'Could indicate a general status or condition.' },
    { id: 2, name: 'Alert', description: 'Likely represents a warning or alert.' },
    { id: 3, name: 'Positive', description: 'Could indicate a "go" or positive status.' },
    { id: 4, name: 'NPO', description: 'Stands for \'Nil Per Os\' (nothing by mouth), indicating dietary restrictions.' },
    { id: 5, name: 'Patient movement', description: 'A hand symbol with text, likely a notification for restricted interaction.' },
    { id: 6, name: 'Infection Risk', description: 'High probability of spreading or contracting infection.' },
    { id: 7, name: 'Fall Hazard', description: 'Patient at high risk of falling.' },
];

const App = () => {
    const [searchText, setSearchText] = useState('');
    const [filterBy, setFilterBy] = useState('All');
    
    // Simulating count update
    const [visibleCount, setVisibleCount] = useState(initialConcerns.length);
    const totalRows = initialConcerns.length;

    // Filtering logic using useMemo to optimize
    const filteredConcerns = useMemo(() => {
        const filterText = searchText.toUpperCase();
        
        const results = initialConcerns.filter(concern => {
            // Apply text search filter
            if (filterText) {
                const rowText = `${concern.name} ${concern.description}`.toUpperCase();
                if (rowText.indexOf(filterText) === -1) {
                    return false;
                }
            }

            // Apply dropdown filter (simplified for dummy data)
            // In a real app, this would check a 'department' or 'room' field
            if (filterBy !== 'All' && filterBy !== 'Filter') {
                // Dummy filter logic: only show IDs 1, 2, 3 if Department is selected
                if (filterBy === 'Department' && concern.id > 3) {
                    return false;
                }
                // Dummy filter logic: only show IDs 4, 5, 6 if Room is selected
                if (filterBy === 'Room number' && concern.id <= 3) {
                    return false;
                }
            }

            return true;
        });

        // Update the visible count state
        setVisibleCount(results.length);
        return results;
    }, [searchText, filterBy]);

    // Handle input change for search
    const handleSearchChange = (event) => {
        setSearchText(event.target.value);
    };

    // Handle dropdown change for filtering
    const handleFilterChange = (event) => {
        setFilterBy(event.target.value);
    };

    return (
        <div id="app" className="app-container">
            {/* 1. HEADER */}
            <header className="app-header">
                <div className="header-content">
                    {/* Logo */}
                    <div className="logo">
                        <i className="fas fa-eye"></i>
                        <h1>KORENYE CLINIC</h1>
                    </div>
                    
                    {/* Admin Profile */}
                    <div className="user-info">
                        <i className="fas fa-user-circle text-2xl mr-2"></i>
                        <span>Admin</span>
                    </div>
                </div>
            </header>

            {/* 2. MAIN LAYOUT: SIDEBAR + CONTENT */}
            <div className="main-content-wrapper">
                
                {/* 2a. SIDEBAR */}
                <nav className="sidebar">
                    <ul className="nav-menu">
                        <li className="nav-item"><a href="#" className="nav-link"><i className="fas fa-th-large"></i> <span>Dashboard</span></a></li>
                        <li className="nav-item"><a href="#" className="nav-link"><i className="fas fa-users"></i> <span>Patients</span></a></li>
                        <li className="nav-item"><a href="#" className="nav-link"><i className="fas fa-envelope"></i> <span>Messages</span></a></li>
                        <li className="nav-item"><a href="#" className="nav-link"><i className="fas fa-clipboard-check"></i> <span>Tests</span></a></li>
                        <li className="nav-item"><a href="#" className="nav-link"><i className="fas fa-box-open"></i> <span>Inventory</span></a></li>
                        <li className="nav-item"><a href="#" className="nav-link"><i className="fas fa-chart-bar"></i> <span>Reports</span></a></li>
                        <li className="nav-item"><a href="#" className="nav-link"><i className="fas fa-cog"></i> <span>Settings</span></a></li>
                        <li className="nav-item"><a href="#" className="nav-link"><i className="fas fa-sign-out-alt"></i> <span>Logout</span></a></li>
                    </ul>
                </nav>

                {/* 2b. CONTENT AREA */}
                <main className="content-area">
                    <div className="content-card">
                        {/* Title and Count */}
                        <h2 className="page-title">Case Concerns</h2>
                        <p className="count-text">
                            Showing {visibleCount} of {totalRows}
                        </p>

                        {/* Filter Bar */}
                        <div className="filter-bar">
                            {/* Search Input */}
                            <div className="search-wrapper">
                                <input 
                                    type="text" 
                                    placeholder="Searching..." 
                                    className="search-input" 
                                    value={searchText}
                                    onChange={handleSearchChange}
                                />
                                <i className="fas fa-search search-icon"></i>
                            </div>

                            {/* Department Dropdown */}
                            <div className="dropdown-wrapper">
                                <select 
                                    className="dropdown-select" 
                                    value={filterBy}
                                    onChange={handleFilterChange}
                                >
                                    <option value="Filter">Filter by...</option>
                                    <option value="Department">Department</option>
                                    <option value="Room number">Room number</option>
                                </select>
                                <i className="fas fa-chevron-down dropdown-icon-arrow"></i>
                            </div>
                            
                            {/* Add Concern Button */}
                            <button className="add-button">
                                <i className="fas fa-plus mr-2"></i> Add Concern
                            </button>
                        </div>

                        {/* Concerns Table */}
                        <div className="table-wrapper">
                            <table id="concernsTable">
                                <thead className="table-header">
                                    <tr>
                                        <th>ID</th>
                                        <th>Name</th>
                                        <th>Description</th>
                                        <th className="text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="table-body">
                                    {/* Data Rows */}
                                    {filteredConcerns.map(concern => (
                                        <tr key={concern.id}>
                                            <td>{concern.id}</td>
                                            <td>{concern.name}</td>
                                            <td>{concern.description}</td>
                                            <td className="action-icons">
                                                <i className="fas fa-trash-alt text-red" title="Delete"></i>
                                                <i className="fas fa-edit text-yellow" title="Edit"></i>
                                                <i className="fas fa-eye text-blue" title="View"></i>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredConcerns.length === 0 && (
                                        <tr>
                                            <td colSpan="4" className="text-center" style={{padding: '2rem', color: 'var(--light-text-color)'}}>
                                                No concerns match your search criteria.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </main>
            </div>
            
            {/* Embedded CSS Styles */}
            <style jsx="true">{`
                /* General Body & Reset */
                @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');

                :root {
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
                    background-color: #f5f6fa;
                    color: var(--text-color);
                    overflow: hidden;
                    height: 100vh;
                }

                .app-container {
                    height: 100vh;
                    display: flex;
                    flex-direction: column; 
                }

                /* New Wrapper for Sidebar and Content */
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
                    align-items: flex-end; /* Align to the bottom like the previous design */
                    gap: 10px; 
                }

                .logo i {
                    font-size: 2rem;
                    color: var(--accent-color);
                }

                .logo h1 {
                    font-size: 1.5rem;
                    font-weight: 600;
                    margin-bottom: 2px; /* Align with subtitle */
                }

                /* New styling for the subtitle text color */
                .logo-subtitle {
                    color: rgba(255, 255, 255, 0.8);
                    font-size: 0.9rem;
                    font-weight: 400;
                    margin-bottom: 2px;
                }

                .user-info {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    color: white; 
                    font-weight: 500;
                    cursor: pointer;
                }

                .user-info:hover {
                    color: var(--accent-color);
                }

                /* Sidebar Styling */
                .sidebar {
                    width: 250px;
                    background-color: var(--sidebar-bg);
                    color: white;
                    height: 100%; 
                    overflow-y: auto;
                    box-shadow: 2px 0 10px rgba(0,0,0,0.1);
                    flex-shrink: 0;
                }

                .nav-menu {
                    list-style: none;
                    padding: 1rem 0;
                }

                .nav-item {
                    margin: 0;
                    border-radius: 0; /* Remove rounded corners for border-left style */
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

                /* Card Styling */
                .content-card {
                    background-color: var(--card-bg);
                    border-radius: 12px;
                    box-shadow: 0 4px 15px var(--shadow-light);
                    padding: 2rem;
                }

                .page-title {
                    font-size: 1.8rem;
                    font-weight: 700;
                    color: var(--primary-color);
                    margin-bottom: 0.5rem;
                }

                .count-text {
                    font-size: 0.9rem;
                    color: var(--light-text-color);
                    margin-bottom: 1.5rem;
                }

                /* Filter Bar */
                .filter-bar {
                    display: flex;
                    flex-wrap: wrap;
                    align-items: center;
                    gap: 1rem;
                    margin-bottom: 1.5rem;
                }

                .search-wrapper {
                    position: relative;
                    flex: 1 1 250px; 
                    max-width: 350px;
                }

                .search-input {
                    width: 100%;
                    background-color: var(--bg-light);
                    border: 1px solid var(--border-color);
                    border-radius: 8px;
                    padding: 0.75rem 1rem 0.75rem 2.5rem;
                    color: var(--text-color);
                    font-size: 0.9rem;
                    outline: none;
                    transition: border-color 0.2s;
                }

                .search-input:focus {
                    border-color: var(--primary-color);
                }

                .search-icon {
                    position: absolute;
                    left: 1rem;
                    top: 50%;
                    transform: translateY(-50%);
                    color: var(--light-text-color);
                    font-size: 0.8rem;
                }

                .dropdown-wrapper {
                    position: relative;
                }

                .dropdown-select {
                    background-color: var(--bg-light);
                    border: 1px solid var(--border-color);
                    border-radius: 8px;
                    padding: 0.75rem 2.5rem 0.75rem 1rem;
                    color: var(--text-color);
                    font-size: 0.9rem;
                    appearance: none; 
                    cursor: pointer;
                    outline: none;
                    min-width: 150px;
                    transition: border-color 0.2s;
                }

                .dropdown-select:focus {
                     border-color: var(--primary-color);
                }

                .dropdown-icon-arrow {
                    position: absolute;
                    right: 10px;
                    top: 50%;
                    transform: translateY(-50%);
                    color: var(--light-text-color);
                    font-size: 0.7rem;
                    pointer-events: none;
                }

                .add-button {
                    background-color: var(--primary-color);
                    color: white; 
                    padding: 0.75rem 1.5rem;
                    border-radius: 8px;
                    font-size: 0.9rem;
                    font-weight: 500;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    border: none;
                    cursor: pointer;
                    transition: background-color 0.2s, transform 0.1s;
                    margin-left: auto; 
                }

                .add-button:hover {
                    background-color: #2934cf;
                    transform: translateY(-1px);
                }

                /* Table Styling */
                .table-wrapper {
                    overflow-x: auto;
                    border-radius: 8px;
                    border: 1px solid var(--border-color);
                    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
                }

                #concernsTable {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 0.9rem;
                    background-color: var(--bg-white);
                }

                .table-header {
                    background-color: var(--bg-light);
                    text-transform: uppercase;
                    color: var(--light-text-color);
                    font-weight: 600;
                }

                .table-header th {
                    padding: 1rem 1.5rem;
                    text-align: left;
                    border-bottom: 2px solid var(--border-color);
                }

                .table-body tr {
                    border-top: 1px solid var(--border-color);
                    transition: background-color 0.2s;
                }

                .table-body tr:hover {
                    background-color: #f0f3f6; 
                }

                .table-body td {
                    padding: 1rem 1.5rem;
                    color: var(--text-color);
                    vertical-align: middle;
                }

                .table-body td:nth-child(1) {
                    font-weight: 500;
                }

                .text-right { text-align: right; }

                /* Action Icons - Alignment Fix Applied Here */
                .action-icons {
                    display: flex;
                    /* Push icons to the right edge */
                    justify-content: flex-end; 
                    align-items: center;
                    gap: 1.25rem;
                    /* This padding matches the 1.5rem on the header (th) and normal data cells (td) */
                    padding-right: 1.5rem; 
                }

                .action-icons i {
                    cursor: pointer;
                    transition: color 0.2s, transform 0.1s;
                    font-size: 1.1rem;
                }

                .action-icons i:hover {
                    transform: scale(1.1);
                }

                .text-red { color: var(--danger-color); }
                .text-yellow { color: var(--warning-color); }
                .text-blue { color: var(--info-color); } 

                .text-red:hover { color: #c82333; }
                .text-yellow:hover { color: #d39e00; }
                .text-blue:hover { color: #117a8b; }

                /* Responsive Adjustments */
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
                    
                    .content-area {
                        padding: 1rem;
                    }
                    .content-card {
                        padding: 1.5rem;
                    }
                    .filter-bar {
                        gap: 0.5rem;
                    }
                    .search-wrapper {
                        flex: 1 1 100%; 
                        max-width: none;
                    }
                    .dropdown-select, .add-button {
                        padding: 0.75rem 1rem;
                        font-size: 0.85rem;
                    }
                    .add-button {
                        margin-left: 0;
                        flex: 1 1 100%; 
                        justify-content: center;
                    }
                    .table-header th, .table-body td {
                        padding: 0.8rem 1rem;
                    }
                }

                @media (max-width: 768px) {
                    .sidebar {
                        width: 60px; /* Even smaller for mobile */
                    }
                    .app-header {
                        padding: 0.75rem 1rem;
                    }
                    .logo h1 {
                        font-size: 1.2rem;
                    }
                    .logo i {
                        font-size: 1.5rem;
                    }
                    .logo-subtitle {
                        display: none;
                    }
                }
            `}</style>
        </div>
    );
};

export default App;
