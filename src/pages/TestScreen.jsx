import React from 'react';
import './template-theme.css';
import TestsContent from './TestsContent';

const TestsPage = () => {
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
                        <h2 className="page-title">All Tests</h2>
                    </div>

                    {/* Replaced hardcoded content with dynamic TestsContent */}
                    <div className="card" style={{ padding: '20px', overflow: 'visible' }}>
                        <TestsContent />
                    </div>
                </main>
            </div>
        </div>
    );
};

export default TestsPage;
