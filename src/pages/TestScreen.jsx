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
