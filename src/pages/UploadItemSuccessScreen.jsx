import React from 'react';

// --- CSS Variable Definitions (Simulated :root) ---
const styles = {
    // Theme Variables
    '--primary-color': '#3742fa', 
    '--light-text-color': '#7f8c8d',
    '--border-color': '#dee2e6',
    '--bg-light': '#f5f6fa',
    '--bg-white': '#ffffff',
    '--text-color': '#2c3e50',
    '--sidebar-bg': '#764ba2', // Purple
    '--sidebar-text': '#bdc3c7', 
    '--sidebar-active-bg': '#3742fa', // Blue 
    '--accent-color': '#ffd700', // Yellow
    '--danger-color': '#dc3545',
    '--shadow-light': 'rgba(0, 0, 0, 0.05)',
    
    // Inline styles for theme elements that need dynamic styles
    appContainer: {
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
    },
    mainContentWrapper: {
        display: 'flex',
        flex: 1,
        overflow: 'hidden',
    },
    appHeader: {
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        padding: '1rem 2rem',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        zIndex: 1000,
    },
    headerContent: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        maxWidth: '1200px',
        margin: '0 auto',
    },
    logo: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
    },
    logoIcon: {
        fontSize: '2rem',
        color: '#ffd700', 
    },
    logoH1: {
        fontSize: '1.5rem',
        fontWeight: 600,
        color: 'white',
    },
    userInfo: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        color: 'white',
        fontWeight: 500,
    },
    avatar: {
        width: '30px',
        height: '30px',
        borderRadius: '50%',
        objectFit: 'cover',
        border: '1px solid rgba(255, 255, 255, 0.5)',
    },
    sidebar: {
        width: '250px',
        backgroundColor: '#764ba2',
        color: 'white',
        height: '100%',
        overflowY: 'auto',
        boxShadow: '2px 0 10px rgba(0,0,0,0.1)',
        padding: '0.5rem 0',
    },
    clinicName: {
        display: 'none', 
    },
    navMenu: {
        listStyle: 'none',
        padding: '1rem 0',
    },
    navLink: {
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        padding: '1rem 1.5rem',
        color: '#bdc3c7',
        textDecoration: 'none',
        transition: 'all 0.3s ease',
        borderLeft: '3px solid transparent',
    },
    contentArea: {
        flex: 1,
        padding: '2rem',
        overflowY: 'auto',
        backgroundColor: '#f5f6fa',
        color: '#2c3e50',
    },
};

const UploadSuccessScreen = () => {
    return (
        <>
            {/* The internal CSS block handles all layout, hover states, and specific success styles */}
            <style>
                {`
                    /* General & Imports */
                    @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
                    
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    
                    body { font-family: 'Poppins', sans-serif; background-color: ${styles['--bg-light']}; color: ${styles['--text-color']}; overflow: hidden; height: 100vh; }
                    
                    /* Sidebar Pseudo-Class Styles */
                    .nav-link { border-right: none; }
                    .nav-link:hover {
                        background-color: ${styles['--sidebar-active-bg']};
                        color: white;
                        border-left-color: ${styles['--accent-color']};
                    }

                    .nav-item.active .nav-link {
                        background-color: ${styles['--sidebar-active-bg']};
                        color: white;
                        font-weight: 500;
                        border-left-color: ${styles['--accent-color']};
                    }
                    
                    .nav-item.logout .nav-link:hover {
                        color: white !important;
                        background-color: ${styles['--danger-color']};
                        border-left-color: ${styles['--danger-color']};
                    }

                    /* Main Content & Title */
                    .upload-item-container h2 { margin-bottom: 2rem; font-weight: 600; color: ${styles['--text-color']}; }
                    .upload-item-container.success-state { max-width: 1000px; }


                    /* --- SUCCESS STATE STYLES --- */
                    .success-box {
                        background-color: ${styles['--bg-white']};
                        border: 1px solid ${styles['--primary-color']}; /* Blue border matching the image */
                        border-radius: 8px;
                        padding: 4rem 2rem;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        min-height: 400px;
                        box-shadow: 0 4px 10px ${styles['--shadow-light']};
                        height: calc(100vh - 200px); 
                        max-height: 550px;
                    }

                    .success-icon {
                        font-size: 5rem;
                        color: ${styles['--primary-color']};
                        border: 3px solid ${styles['--primary-color']};
                        border-radius: 50%;
                        padding: 10px;
                        margin-bottom: 1rem;
                        /* Use a checkmark for font-awesome */
                        content: '\\f058'; /* fas fa-check-circle unicode, though we rely on the class */
                    }

                    .success-message {
                        font-size: 1.5rem;
                        font-weight: 600;
                        color: ${styles['--text-color']};
                        margin-bottom: 2rem;
                    }
                    
                    /* Responsive Adjustments */
                    @media (max-width: 992px) {
                        .sidebar { width: 80px; padding: 15px 0; }
                        .nav-link { justify-content: center; padding: 10px 0; }
                        .nav-link span { display: none; } 
                        .nav-link:hover, .nav-item.active .nav-link { border-left: none; border-right: 3px solid ${styles['--accent-color']}; }
                        .success-box { height: auto; max-height: none; }
                    }

                    @media (max-width: 768px) {
                        .sidebar { width: 60px; }
                        .content-area { padding: 1rem; }
                    }
                `}
            </style>
            
            <div className="app-container" style={styles.appContainer}>
                <header className="app-header" style={styles.appHeader}>
                    <div className="header-content" style={styles.headerContent}>
                        <div className="logo" style={styles.logo}>
                            <i className="fas fa-eye" style={styles.logoIcon}></i> 
                            <h1 style={styles.logoH1}>KORENYE CLINIC</h1>
                        </div>
                        <div className="user-info" style={styles.userInfo}>
                            <img src="https://via.placeholder.com/30/cccccc/ffffff?text=AD" alt="Admin Avatar" className="avatar" style={styles.avatar} /> 
                            <span>Admin</span> 
                            <i className="fas fa-caret-down"></i>
                        </div>
                    </div>
                </header>

                <div className="main-content-wrapper" style={styles.mainContentWrapper}>
                    <nav className="sidebar" style={styles.sidebar}>
                        <div className="clinic-name" style={styles.clinicName}>KORENYE CLINIC <br /> NIG. LTD.</div>
                        <ul className="nav-menu" style={styles.navMenu}>
                            <li className="nav-item">
                                <a href="#" className="nav-link" style={styles.navLink}><i className="fas fa-th-large"></i> <span>Dashboard</span></a>
                            </li>
                            <li className="nav-item">
                                <a href="#" className="nav-link" style={styles.navLink}><i className="fas fa-envelope"></i> <span>Messages</span></a>
                            </li>
                            <li className="nav-item">
                                <a href="#" className="nav-link" style={styles.navLink}><i className="fas fa-clipboard-check"></i> <span>Test</span></a>
                            </li>
                            <li className="nav-item active">
                                {/* The active class will apply the style defined in the <style> block */}
                                <a href="#" className="nav-link" style={styles.navLink}><i className="fas fa-box-open"></i> <span>Inventory</span></a>
                            </li>
                            <li className="nav-item">
                                <a href="#" className="nav-link" style={styles.navLink}><i className="fas fa-cog"></i> <span>Settings</span></a>
                            </li>
                            <li className="nav-item logout">
                                <a href="#" className="nav-link" style={styles.navLink}><i className="fas fa-sign-out-alt"></i> <span>Logout</span></a>
                            </li>
                        </ul>
                    </nav>

                    <main className="content-area" style={styles.contentArea}>
                        <div className="upload-item-container success-state">
                            <h2>Upload an Item</h2>
                            
                            {/* Success Message Box */}
                            <div className="success-box">
                                {/* Font Awesome Check Icon (styled to look like the image) */}
                                <i className="fas fa-check-circle success-icon"></i>
                                <p className="success-message">Item Uploaded</p>
                                
                                {/* An optional button to return to the form or inventory list */}
                                {/* <a href="#" className="btn-primary-return">
                                    <i className="fas fa-list-ul"></i> View Inventory
                                </a> */}
                            </div>
                        </div>
                    </main>
                </div>
            </div>
        </>
    );
};

export default UploadSuccessScreen;