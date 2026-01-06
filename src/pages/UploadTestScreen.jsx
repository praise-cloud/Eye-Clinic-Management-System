import React from 'react';
// Assuming the merged CSS file is imported
import './template-theme-modal.css'; 

const TestsPageWithModal = () => {
    // Dummy Data (For table rendering)
    const testHistory = [
        { date: '12 Apr, 2025', eye: 'Both', status: 'Done', action: 'View' },
        { date: '27 Apr, 2025', eye: 'Right', status: 'Pending', action: 'Retry' },
    ];
    
    const documents = [
        { date: '27 Apr, 2025', name: 'Second Eye test', type: 'PDF' },
        { date: '27 Apr, 2025', name: 'Second Eye test', type: 'PDF' },
        { date: '27 Apr, 2025', name: 'Second Eye test', type: 'PDF' },
    ];

    return (
        <div className="app-container">
            {/* HEADER */}
            <header className="app-header">
                <div className="header-content">
                    <div className="logo">
                        <i className="fas fa-eye"></i>
                        <h1>KORENE EYE CLINIC</h1>
                    </div>
                    <div className="user-info">
                        <img src="https://via.placeholder.com/30" alt="Admin Avatar" className="avatar" /> 
                        <span>Admin</span>
                    </div>
                </div>
            </header>

            <div className="main-content-wrapper">
                {/* SIDEBAR */}
                <nav className="sidebar">
                    <ul className="nav-menu">
                        <li className="nav-item"><a href="#" className="nav-link"><i className="fas fa-th-large"></i> <span>Dashboard</span></a></li>
                        <li className="nav-item"><a href="#" className="nav-link"><i className="fas fa-users"></i> <span>Patients</span></a></li>
                        <li className="nav-item"><a href="#" className="nav-link"><i className="fas fa-envelope"></i> <span>Messages</span></a></li>
                        <li className="nav-item active"><a href="#" className="nav-link"><i className="fas fa-clipboard-check"></i> <span>Tests</span></a></li>
                        <li className="nav-item"><a href="#" className="nav-link"><i className="fas fa-box-open"></i> <span>Inventory</span></a></li>
                        <li className="nav-item"><a href="#" className="nav-link"><i className="fas fa-chart-bar"></i> <span>Reports</span></a></li>
                        <li className="nav-item"><a href="#" className="nav-link"><i className="fas fa-cog"></i> <span>Settings</span></a></li>
                        <li className="nav-item"><a href="#" className="nav-link"><i className="fas fa-sign-out-alt"></i> <span>Logout</span></a></li>
                    </ul>
                </nav>

                {/* MAIN CONTENT AREA */}
                <main className="content-area">
                    <div className="page-header-actions">
                        <h2 className="page-title">Tests</h2>
                        <button className="btn btn-upload">
                            Upload <i className="fas fa-cloud-upload-alt"></i>
                        </button>
                    </div>

                    {/* Search and Filter Card */}
                    <div className="card search-filter-card">
                        <h3 className="card-subtitle">Patient's</h3>
                        <div className="search-bar">
                            <div className="search-input-group">
                                <input type="text" placeholder="name or cases..." /> 
                                <i className="fas fa-search search-icon"></i>
                            </div>
                            <button className="btn btn-filter">Filter</button>
                            <button className="btn btn-date">Date</button>
                        </div>
                    </div>

                    <h2 className="patient-name">Uzair Ahmad</h2>

                    {/* Details & History Grid */}
                    <div className="details-history-grid">
                        <div className="card details-card">
                            <h4 className="card-subtitle">Details</h4>
                            <div className="detail-row"><span className="detail-label">Patient_Id:</span><span className="detail-value">1</span></div>
                            <div className="detail-row"><span className="detail-label">First Name:</span><span className="detail-value">Uzair</span></div>
                            <div className="detail-row"><span className="detail-label">Last Name:</span><span className="detail-value">Ahmad</span></div>
                            <div className="detail-row"><span className="detail-label">Email:</span><span className="detail-value email-value">uzair@gmail.com</span></div>
                            <div className="detail-row"><span className="detail-label">Phone:</span><span className="detail-value">+0123456789</span></div>
                            <div className="detail-row"><span className="detail-label">Date of birth:</span><span className="detail-value">1 Jan. 1999</span></div>
                            <div className="detail-row"><span className="detail-label">Gender:</span><span className="detail-value">Male</span></div>
                        </div>

                        <div className="card history-card">
                            <h4 className="card-subtitle">Test History</h4>
                            <table>
                                <thead>
                                    <tr><th>Date</th><th>Eye</th><th>Status</th><th>Action</th></tr>
                                </thead>
                                <tbody>
                                    {testHistory.map((test, index) => (
                                        <tr key={index}>
                                            <td>{test.date}</td>
                                            <td>{test.eye}</td>
                                            <td><span className={`status-tag ${test.status.toLowerCase()}`}>{test.status}</span></td>
                                            <td><a href="#">{test.action}</a></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Documents Card */}
                    <div className="card documents-card">
                        <h4 className="card-subtitle">Documents</h4>
                        <table>
                            <thead>
                                <tr><th>Date</th><th>Document Name</th><th>File Type</th></tr>
                            </thead>
                            <tbody>
                                {documents.map((doc, index) => (
                                    <tr key={index}>
                                        <td>{doc.date}</td>
                                        <td>{doc.name}</td>
                                        <td>{doc.type}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </main>
            </div>

            {/* MODAL OVERLAY - Set to modal-visible to match the screenshot */}
            <div className="modal-overlay modal-visible">
                <div className="modal-card">
                    <h3 className="modal-title">Test Upload</h3>
                    <div className="upload-area">
                        <i className="fas fa-cloud-upload-alt"></i>
                    </div>
                    <button className="btn btn-save">Save</button>
                </div>
            </div>

        </div>
    );
};

export default TestsPageWithModal;