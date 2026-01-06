import React from 'react';

// --- CSS Variable Definitions (Simulated :root) ---
const styles = {
    // Theme Variables
    '--primary-color': '#3742fa', 
    '--secondary-color': '#6c757d',
    '--text-color': '#2c3e50',
    '--light-text-color': '#7f8c8d',
    '--border-color': '#dee2e6',
    '--bg-light': '#f5f6fa',
    '--bg-white': '#ffffff',
    '--sidebar-bg': '#764ba2', // Purple
    '--sidebar-text': '#bdc3c7', 
    '--sidebar-active-bg': '#3742fa', // Blue 
    '--accent-color': '#ffd700', // Yellow
    '--danger-color': '#dc3545',
    '--shadow-light': 'rgba(0, 0, 0, 0.05)',
    
    // Inline styles for structural elements
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
    // Note: navLink styles are mostly handled in the internal <style> block for hover/active states
    navLink: {
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        padding: '1rem 1.5rem',
        color: '#bdc3c7',
        textDecoration: 'none',
        transition: 'all 0.3s ease',
        borderLeft: '3px solid transparent',
        borderRight: 'none',
    },
    contentArea: {
        flex: 1,
        padding: '2rem',
        overflowY: 'auto',
        backgroundColor: '#f5f6fa',
        color: '#2c3e50',
    },
};

const ItemInfoScreen = () => {
    // Extracting color variables for use in the CSS block
    const { 
        '--primary-color': primary, 
        '--light-text-color': lightText, 
        '--text-color': text, 
        '--bg-light': bgLight,
        '--bg-white': bgWhite,
        '--border-color': border,
        '--accent-color': accent,
        '--sidebar-active-bg': sidebarActive,
        '--danger-color': danger,
        '--shadow-light': shadowLight
    } = styles;

    return (
        <>
            {/* The internal CSS block handles all layout, hover states, and specific item info styles */}
            <style>
                {`
                    /* General & Imports */
                    @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
                    
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    
                    body { font-family: 'Poppins', sans-serif; background-color: ${bgLight}; color: ${text}; overflow: hidden; height: 100vh; }
                    
                    /* Sidebar Pseudo-Class Styles */
                    .nav-link:hover {
                        background-color: ${sidebarActive};
                        color: white;
                        border-left-color: ${accent};
                    }

                    .nav-item.active .nav-link {
                        background-color: ${sidebarActive};
                        color: white;
                        font-weight: 500;
                        border-left-color: ${accent};
                    }
                    
                    .nav-item.logout .nav-link:hover {
                        color: white !important;
                        background-color: ${danger};
                        border-left-color: ${danger};
                    }

                    /* --- ITEM INFO STYLES --- */
                    .item-info-container {
                        max-width: 900px; 
                        margin: 0 auto;
                        display: flex;
                        flex-direction: column;
                        height: 100%;
                    }
                    
                    .info-card {
                        background-color: ${bgWhite};
                        border: 1px solid ${border};
                        border-radius: 8px;
                        box-shadow: 0 4px 10px ${shadowLight};
                        padding: 1.5rem 2rem 2rem;
                        flex-grow: 1; 
                        position: relative;
                        margin-bottom: 2rem;
                    }
                    
                    .card-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        border-bottom: 1px solid ${border};
                        padding-bottom: 1rem;
                        margin-bottom: 1.5rem;
                    }
                    
                    .card-title {
                        font-size: 1.5rem;
                        font-weight: 600;
                        color: ${text};
                    }
                    
                    .edit-icon {
                        font-size: 1.2rem;
                        color: ${primary};
                        cursor: pointer;
                        padding: 8px;
                        border-radius: 50%;
                        transition: background-color 0.2s;
                    }
                    
                    .edit-icon:hover {
                        background-color: ${bgLight};
                    }
                    
                    .info-layout {
                        display: flex;
                        gap: 2rem;
                        margin-bottom: 2rem;
                    }
                    
                    .info-image-box {
                        flex: 1.5; 
                        height: 250px;
                        background-color: ${primary}; 
                        border-radius: 8px;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        position: relative;
                    }
                    
                    .placeholder-icon {
                        font-size: 3rem;
                        color: rgba(255, 255, 255, 0.7);
                    }
                    
                    .info-details-box {
                        flex: 2;
                        padding: 1rem 0;
                    }
                    
                    .item-name {
                        font-size: 1.8rem;
                        font-weight: 700;
                        color: ${text};
                        margin-bottom: 0.2rem;
                    }
                    
                    .item-category {
                        font-size: 1rem;
                        color: ${lightText};
                        margin-bottom: 1.5rem;
                    }
                    
                    .item-stats {
                        display: flex;
                        flex-direction: column;
                        padding-top: 1rem;
                        border-top: 1px solid ${border};
                    }
                    
                    .stat-group {
                        margin-bottom: 1rem; /* FIX: Added margin-bottom to separate stat groups */
                    }
                    
                    .stat-label {
                        font-size: 0.85rem;
                        color: ${lightText};
                        margin-bottom: 0.2rem;
                    }
                    
                    .stat-value {
                        font-size: 1.1rem;
                        font-weight: 500;
                    }
                    
                    .stat-value.primary-text {
                        color: ${primary};
                        font-weight: 600;
                    }
                    
                    /* Description Section */
                    .info-description-section {
                        padding-top: 1.5rem;
                        border-top: 1px solid ${border};
                    }
                    
                    .description-heading {
                        font-size: 1.1rem;
                        font-weight: 600;
                        margin-bottom: 0.5rem;
                        color: ${text};
                    }
                    
                    .description-text {
                        font-size: 0.95rem;
                        line-height: 1.6;
                        color: ${text};
                        white-space: pre-wrap; 
                    }
                    
                    /* Back Button Styling */
                    .back-button-container {
                        display: flex;
                        justify-content: flex-end;
                        margin-top: -1.5rem; 
                    }
                    
                    .btn-back {
                        background-color: ${primary};
                        color: white;
                        padding: 0.75rem 2rem;
                        border: none;
                        border-radius: 4px;
                        font-size: 1rem;
                        font-weight: 500;
                        cursor: pointer;
                        transition: background-color 0.2s;
                        box-shadow: 0 4px 6px rgba(55, 66, 250, 0.3);
                    }
                    
                    .btn-back:hover {
                        background-color: #2a34c9; 
                    }


                    /* Responsive Adjustments */
                    @media (max-width: 992px) {
                        .sidebar { width: 80px; padding: 15px 0; }
                        .nav-link { justify-content: center; padding: 10px 0; }
                        .nav-link span { display: none; } 
                        .nav-link:hover, .nav-item.active .nav-link { border-left: none; border-right: 3px solid ${accent}; }

                        .info-layout { flex-direction: column; }
                        .info-image-box { flex: none; height: 200px; }
                    }

                    @media (max-width: 768px) {
                        .sidebar { width: 60px; }
                        .content-area { padding: 1rem; }
                        .card-header { flex-direction: column; align-items: flex-start; }
                        .card-title { margin-bottom: 0.5rem; }
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
                        <div className="item-info-container">
                            <div className="info-card">
                                <div className="card-header">
                                    <h2 className="card-title">Item</h2>
                                    <i className="fas fa-pencil-alt edit-icon"></i> 
                                </div>

                                <div className="info-layout">
                                    <div className="info-image-box">
                                        <i className="fas fa-box-open placeholder-icon"></i>
                                    </div>

                                    <div className="info-details-box">
                                        <h3 className="item-name">Flexible Glasses sv3</h3>
                                        <p className="item-category">Eye Glasses</p>
                                        
                                        <div className="item-stats">
                                            <div className="stat-group">
                                                <p className="stat-label">Price</p>
                                                <p className="stat-value primary-text">#5,000</p>
                                            </div>
                                            <div className="stat-group">
                                                <p className="stat-label">Stock</p>
                                                <p className="stat-value">25 remaining</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="info-description-section">
                                    <h4 className="description-heading">Description</h4>
                                    <p className="description-text">
                                        Figma ipsum component variant main layer. Group pixel export inspect outline asset. Layout mask style edit inspect text. Link horizontal pencil main invite. Invite flows arrow plugin setting content selection boolean. Ellipse invite pixel flatten asset component bullet thumbnail. Fill arrange align rotate prototype mask scrolling create. Share prototype bold line device content polygon ipsum team connection. Auto rotate boolean ellipse auto edit. Export invite distribute image team star ellipse text share editor. Align mask pixel figma shadow flows editor asset stroke frame. Text line create flows effect scale link undo. Pixel content duplicate rectangle polygon community export follower mask. Effect rotate team horizontal clip pencil. Project pen link editor team group flows opacity. Overflow clip move link slice vertical pen create. Overflow flatten arrange subselect create undo arrange. Device team group. Bullet layout clip move content inspect image boolean vertical. Arrange connection share scrolling ipsum selection.
                                    </p>
                                </div>
                            </div>
                            
                            <div className="back-button-container">
                                <button className="btn-back">Back</button>
                            </div>

                        </div>
                    </main>
                </div>
            </div>
        </>
    );
};

export default ItemInfoScreen;