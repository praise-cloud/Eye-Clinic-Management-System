import React from 'react';

// The main application component
const App = () => {
    /*
     * Embedding the complete CSS here allows us to utilize media queries,
     * pseudo-classes, and CSS variables which are not easily supported by
     * inline React styles.
     */
    const styles = `
/*
 * CORE THEME STYLES
 * File: index16.css
 * Description: Contains all global variables, resets, and core layout styles.
 */

/* --------------------------------------
   1. IMPORTS & VARIABLES
   -------------------------------------- */
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');

:root {
    /* Color Palette */
    --primary-color: #3742fa;       /* Blue for actions/active state */
    --text-color: #2c3e50;          /* Dark text */
    --light-text-color: #7f8c8d;    /* Subdued text/labels */
    --accent-color: #ffd700;        /* Yellow accent */
    --danger-color: #dc3545;        /* Red for alerts/logout */

    /* Backgrounds & Borders */
    --bg-light: #f5f6fa;            /* Light grey background for content */
    --bg-white: #ffffff;
    --border-color: #dee2e6;
    --shadow-light: rgba(0, 0, 0, 0.05);

    /* Layout Specifics */
    --sidebar-bg: #764ba2;          /* Purple */
    --sidebar-text: #bdc3c7;
    --sidebar-active-bg: #3742fa;
    --header-bg: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    --overlay-bg: rgba(0, 0, 0, 0.4);
}

/* --------------------------------------
   2. BASE & LAYOUT (SCROLL FIX APPLIED)
   -------------------------------------- */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: 'Poppins', sans-serif;
    background-color: var(--bg-light);
    color: var(--text-color);
    /* FIX: Removed 'overflow: hidden;' to allow content scrolling */
    height: 100vh;
}

.app-container {
    height: 100vh;
    display: flex;
    flex-direction: column; 
}

/* Wrapper for Sidebar and Content */
.main-content-wrapper {
    display: flex;
    flex: 1; 
    /* Ensures the wrapper fills the remaining space and manages its overflow */
    overflow: hidden; 
}

.content-area {
    flex: 1; 
    padding: 2rem;
    /* CORRECT: This enables scrolling for the main content area */
    overflow-y: auto; 
    background-color: var(--bg-light);
    position: relative; 
}


/* --------------------------------------
   3. HEADER STYLING
   -------------------------------------- */
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
    color: white;
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


/* --------------------------------------
   4. SIDEBAR STYLING
   -------------------------------------- */
.sidebar {
    width: 250px; 
    background-color: var(--sidebar-bg); 
    color: white;
    height: 100%; 
    overflow-y: auto;
    box-shadow: 2px 0 10px rgba(0,0,0,0.1);
    padding: 0.5rem 0;
}

.clinic-name {
    padding: 1rem 1.5rem;
    font-size: 1rem;
    font-weight: 600;
    text-align: center;
    color: white;
}

.nav-menu {
    list-style: none;
    padding: 1rem 0;
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

/* Hover and Active States */
.nav-link:hover {
    background-color: var(--sidebar-active-bg); 
    color: white;
    border-left-color: var(--accent-color); 
}

.nav-item.active .nav-link {
    background-color: var(--sidebar-active-bg);
    color: white;
    font-weight: 500;
    border-left-color: var(--accent-color);
}

/* Specific logout hover style */
.nav-item.logout .nav-link:hover {
    color: white !important;
    background-color: var(--danger-color);
    border-left-color: var(--danger-color); 
}

.nav-link i {
    font-size: 1.1rem;
    width: 20px;
}


/* --------------------------------------
   5. ITEM EDIT MODAL STYLING
   -------------------------------------- */

/* --- A. Background Content (Item View) --- */
.item-edit-container {
    min-height: 100%; 
    max-width: 900px;
    margin: 0 auto;
    position: relative; 
    z-index: 1; 
}

.background-content {
    /* Mimics the blurred/faded Item Info screen */
    background-color: var(--bg-white);
    border-radius: 8px;
    box-shadow: 0 4px 10px var(--shadow-light);
    padding: 1.5rem 2rem;
    /* Increased min-height to ensure scrollbar appears for testing */
    min-height: 900px; 
    filter: blur(3px) brightness(0.9);
    pointer-events: none;
    user-select: none;
    opacity: 0.8;
}

/* Placeholder styles for visual reference */
.background-content h2 { margin-bottom: 2rem; }
.edit-icon-bg { position: absolute; top: 1.5rem; right: 2rem; color: var(--primary-color); }
.placeholder-details { display: flex; gap: 2rem; margin-bottom: 2rem; }
.placeholder-image-box { width: 40%; height: 250px; background-color: var(--primary-color); border-radius: 8px; }
.placeholder-text-box { width: 60%; padding-top: 1rem; }
.placeholder-text-box h3 { font-size: 1.8rem; }
.placeholder-description-text { line-height: 1.6; }
.placeholder-long-content { margin-top: 1rem; color: var(--text-color); }


/* --- B. Modal Overlay and Card --- */
.edit-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    /* Bottom needs to align with the bottom of the content to cover full scrollable height */
    bottom: 0; 
    background-color: var(--overlay-bg);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 100; 
    padding: 1rem; 
}

.edit-card {
    background-color: var(--bg-white);
    border-radius: 8px;
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
    width: 100%;
    max-width: 550px; 
    padding: 1.5rem 2rem;
    position: relative; 
    transform: translateY(-20px); 
    max-height: 95vh; 
    /* Ensures the card itself can scroll if the form is very long */
    overflow-y: auto; 
}

.edit-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: 1rem;
    margin-bottom: 1.5rem;
    border-bottom: 1px solid var(--border-color);
}

.edit-title {
    font-size: 1.5rem;
    font-weight: 600;
    color: var(--text-color);
}

.close-icon {
    font-size: 1.2rem;
    color: var(--light-text-color);
    cursor: pointer;
    padding: 5px;
    transition: color 0.2s;
}

.close-icon:hover {
    color: var(--danger-color);
}

/* --- C. Form Components --- */
.form-section {
    margin-bottom: 1.5rem;
}

.form-label {
    display: block;
    font-size: 0.85rem;
    font-weight: 500;
    color: var(--light-text-color);
    margin-bottom: 0.5rem;
}

.image-upload-box {
    background-color: #e0f2ff; 
    border: 1px solid var(--primary-color);
    border-radius: 8px;
    height: 150px; 
    display: flex;
    justify-content: center;
    align-items: center;
    cursor: pointer;
    transition: background-color 0.2s;
}

.image-upload-box:hover {
    background-color: #cce9ff;
}

.upload-icon {
    font-size: 2.5rem; 
    color: var(--primary-color);
}

.form-row {
    display: flex;
    gap: 1.5rem;
}

.form-group {
    flex: 1;
}

.form-control {
    width: 100%;
    padding: 0.75rem 1rem;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    font-size: 1rem;
    transition: border-color 0.2s, box-shadow 0.2s;
    background-color: var(--bg-white);
    color: var(--text-color);
}

.form-control:focus {
    outline: none;
    border-color: var(--primary-color);
    box-shadow: 0 0 0 2px rgba(55, 66, 250, 0.2);
}

/* Custom Select Dropdown */
.custom-select {
    position: relative;
}

.custom-select select {
    appearance: none; 
    -webkit-appearance: none;
    -moz-appearance: none;
    padding-right: 2.5rem; 
}

.select-arrow {
    position: absolute;
    right: 1rem;
    top: 50%;
    transform: translateY(-50%);
    color: var(--light-text-color);
    pointer-events: none; 
}

textarea.description-box {
    resize: vertical;
    min-height: 80px; 
    max-height: 200px;
    line-height: 1.5;
}

.quantity-group .quantity-inputs {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.quantity-inputs .quantity-input {
    flex: 1; 
    text-align: center;
}

.multiply-icon {
    font-weight: 600;
    color: var(--light-text-color);
    font-size: 1rem;
}

/* --- D. Form Actions (Buttons) --- */
.form-actions {
    display: flex;
    justify-content: flex-end; 
    gap: 1rem;
    padding-top: 1rem;
    border-top: 1px solid var(--border-color); 
    margin-top: 2rem;
}

.btn {
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 4px;
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s, color 0.2s, border-color 0.2s;
}

.btn-save {
    background-color: var(--primary-color);
    color: white;
    box-shadow: 0 4px 6px rgba(55, 66, 250, 0.3);
}

.btn-save:hover {
    background-color: #2a34c9; 
}

.btn-cancel {
    background-color: transparent;
    color: var(--light-text-color);
    border: 1px solid var(--border-color);
}

.btn-cancel:hover {
    background-color: var(--bg-light);
    color: var(--text-color);
    border-color: var(--light-text-color);
}


/* --------------------------------------
   6. RESPONSIVE ADJUSTMENTS 
   -------------------------------------- */
@media (max-width: 992px) {
    /* Sidebar collapse */
    .sidebar { width: 80px; padding: 15px 0; }
    .clinic-name { display: none; }
    .nav-link { justify-content: center; padding: 10px 0; }
    .nav-link span { display: none; } 
    .nav-link:hover,
    .nav-item.active .nav-link { border-left: none; border-right: 3px solid var(--accent-color); }

    /* Form Layout changes */
    .form-row { flex-direction: column; gap: 0; }
    .form-group { margin-bottom: 1rem; } 
}

@media (max-width: 768px) {
    .sidebar { width: 60px; }
    .content-area { padding: 1rem; }
    .edit-card { padding: 1rem; max-width: 95%; } 
}

@media (max-width: 480px) {
    .edit-header { flex-direction: column; align-items: flex-start; }
    .edit-title { margin-bottom: 10px; }
    .form-row { flex-direction: column; gap: 0; }
}
    `;

    return (
        <>
            {/* The Head elements are included for proper rendering environment setup */}
            <head>
                <meta charSet="UTF-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <title>Korenye Clinic - Item Edit</title>
                {/* Font Awesome CSS Link */}
                <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" />
                {/* Embedded CSS Styles */}
                <style dangerouslySetInnerHTML={{ __html: styles }} />
            </head>

            {/* Main Application Body */}
            <div className="app-container">
                {/* THEMED HEADER */}
                <header className="app-header">
                    <div className="header-content">
                        <div className="logo">
                            <i className="fas fa-eye"></i> 
                            <h1>KORENYE CLINIC</h1>
                        </div>
                        <div className="user-info">
                            {/* Note: 'alt' attribute added for image tag in JSX */}
                            <img src="https://via.placeholder.com/30/cccccc/ffffff?text=AD" alt="Admin Avatar" className="avatar" /> 
                            <span>Admin</span> 
                            <i className="fas fa-caret-down"></i>
                        </div>
                    </div>
                </header>

                <div className="main-content-wrapper">
                    {/* THEMED SIDEBAR */}
                    <nav className="sidebar">
                        <div className="clinic-name">KORENYE CLINIC <br /> NIG. LTD.</div>
                        <ul className="nav-menu">
                            {/* Links converted to JSX. 'className' is used instead of 'class' */}
                            <li className="nav-item"><a href="#" className="nav-link"><i className="fas fa-th-large"></i> <span>Dashboard</span></a></li>
                            <li className="nav-item"><a href="#" className="nav-link"><i className="fas fa-envelope"></i> <span>Messages</span></a></li>
                            <li className="nav-item"><a href="#" className="nav-link"><i className="fas fa-clipboard-check"></i> <span>Test</span></a></li>
                            {/* Active Inventory link */}
                            <li className="nav-item active"><a href="#" className="nav-link"><i className="fas fa-box-open"></i> <span>Inventory</span></a></li>
                            <li className="nav-item"><a href="#" className="nav-link"><i className="fas fa-cog"></i> <span>Settings</span></a></li>
                            <li className="nav-item logout"><a href="#" className="nav-link"><i className="fas fa-sign-out-alt"></i> <span>Logout</span></a></li>
                        </ul>
                    </nav>

                    <main className="content-area">
                        <div className="item-edit-container">
                            {/* Placeholder for the background content, visually obscured by the overlay */}
                            <div className="background-content">
                                <h2>Item Details View</h2>
                                <i className="fas fa-pencil-alt edit-icon-bg"></i>
                                <div className="placeholder-details">
                                    <div className="placeholder-image-box"></div>
                                    <div className="placeholder-text-box">
                                        <h3>Flexible Glasses sv3</h3>
                                        <p>Eye Glasses</p>
                                        <p>#5,000</p>
                                        <p>25 remaining</p>
                                    </div>
                                </div>
                                <p className="placeholder-description-text">Description content is visible but blurred...</p>
                                <p className="placeholder-long-content">Scroll down to see the blur effect extend below the viewport.</p>
                                {/* Inline style in JSX uses camelCase and string values */}
                                <div style={{ height: '500px', backgroundColor: '#f0f0f0', marginTop: '20px', borderRadius: '8px' }}>
                                    <p style={{ padding: '20px', fontSize: '0.9rem' }}>(Extra content to force the content-area to scroll, testing the fix.)</p>
                                </div>
                            </div>

                            {/* ITEM EDIT MODAL OVERLAY (Foreground) */}
                            <div className="edit-overlay">
                                <div className="edit-card">
                                    <div className="edit-header">
                                        <h2 className="edit-title">Item Edit</h2>
                                        <i className="fas fa-times close-icon"></i>
                                    </div>

                                    <div className="form-section upload-image-section">
                                        {/* 'htmlFor' is used instead of 'for' */}
                                        <label className="form-label" htmlFor="image-upload-input">Upload image</label>
                                        <div className="image-upload-box">
                                            <i className="fas fa-upload upload-icon"></i>
                                            {/* Hidden input to handle file selection */}
                                            <input type="file" id="image-upload-input" style={{ display: 'none' }} accept="image/*" />
                                        </div>
                                    </div>

                                    <div className="form-section form-row">
                                        <div className="form-group">
                                            <label className="form-label" htmlFor="item-name">Item Name</label>
                                            {/* Self-closing tag and 'defaultValue' used for static value */}
                                            <input type="text" id="item-name" className="form-control" defaultValue="Flexible glasses s3" />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label" htmlFor="item-category">Category</label>
                                            <div className="custom-select">
                                                {/* 'defaultValue' used for pre-selected option */}
                                                <select id="item-category" className="form-control" defaultValue="contact-lenses">
                                                    <option value="eye-glasses">Eye Glasses</option>
                                                    <option value="contact-lenses">Glasses</option>
                                                    <option value="solution">Solution</option>
                                                </select>
                                                <i className="fas fa-caret-down select-arrow"></i>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="form-section form-row">
                                        <div className="form-group">
                                            <label className="form-label" htmlFor="item-price">Price</label>
                                            <input type="text" id="item-price" className="form-control" defaultValue="#9,000" />
                                        </div>
                                        <div className="form-group quantity-group">
                                            <label className="form-label">Quantity</label>
                                            <div className="quantity-inputs">
                                                <input type="text" className="form-control quantity-input" defaultValue="5" />
                                                <span className="multiply-icon">X</span>
                                                <input type="text" className="form-control quantity-input" defaultValue="5" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="form-section">
                                        <label className="form-label" htmlFor="item-description">Description</label>
                                        <textarea id="item-description" className="form-control description-box" defaultValue="Figma ipsum component variant main layer. Group pixel export inspect outline asset. Layout mask style edit inspect text. Link horizontal pencil main invite. Invite flows arrow plugin setting content selection boolean."></textarea>
                                    </div>

                                    <div className="form-actions">
                                        <button className="btn btn-save">Save</button>
                                        <button className="btn btn-cancel">Cancel</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </main>
                </div>
            </div>
        </>
    );
};

export default App;
