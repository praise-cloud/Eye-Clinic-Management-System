import React from 'react';

// --- CSS Variable Definitions (Simulated :root for easy changes) ---
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
    '--header-bg': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', // Blue/Purple Gradient
    '--danger-color': '#dc3545',
    
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
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', // var(--header-bg)
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
        color: '#ffd700', // var(--accent-color)
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
        backgroundColor: '#764ba2', // var(--sidebar-bg)
        color: 'white',
        height: '100%',
        overflowY: 'auto',
        boxShadow: '2px 0 10px rgba(0,0,0,0.1)',
        padding: '0.5rem 0',
    },
    clinicName: {
        display: 'none', // Hidden as per the final theme CSS
    },
    navMenu: {
        listStyle: 'none',
        padding: '1rem 0',
    },
    // Note: Active/Hover styles for sidebar links must be handled via a separate CSS file or a state management library like useState/styled-components, as pure inline styles cannot handle :hover or :active pseudo-classes.
    navLink: {
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        padding: '1rem 1.5rem',
        color: '#bdc3c7', // var(--sidebar-text)
        textDecoration: 'none',
        transition: 'all 0.3s ease',
        borderLeft: '3px solid transparent',
    },
    contentArea: {
        flex: 1,
        padding: '2rem',
        overflowY: 'auto',
        backgroundColor: '#f5f6fa', // var(--bg-light)
        color: '#2c3e50', // var(--text-color)
    },
    // The rest of the content/form styling (form-layout, input, etc.) is complex and best handled via a CSS class or module.
};

const InventoryUpload = () => {
    return (
        // Embedding the CSS directly as a string in a <style> tag for a true single file output.
        // This includes all the form, layout, hover, and media query CSS.
        <>
            <style>
                {`
                    /* General Styles */
                    @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
                    
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    
                    body { font-family: 'Poppins', sans-serif; background-color: ${styles['--bg-light']}; color: ${styles['--text-color']}; overflow: hidden; height: 100vh; }
                    
                    /* Sidebar Pseudo-Class Styles (Cannot be inline) */
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

                    /* Main Content & Form Layout */
                    .upload-item-container h2 { margin-bottom: 2rem; font-weight: 600; color: ${styles['--text-color']}; }

                    .form-layout { display: flex; gap: 30px; max-width: 1000px; }
                    .form-left { flex: 2; }
                    .form-right { flex: 1; }
                    
                    .form-label { display: block; font-size: 0.85rem; font-weight: 500; color: ${styles['--light-text-color']}; margin-bottom: 0.5rem; margin-top: 1rem; }
                    
                    .image-upload-box { background-color: #e0f2ff; border: 1px solid ${styles['--primary-color']}; border-radius: 8px; height: 200px; display: flex; justify-content: center; align-items: center; cursor: pointer; transition: background-color 0.2s; }
                    .upload-icon { font-size: 3rem; color: ${styles['--primary-color']}; }
                    .upload-form { margin-top: 1rem; }
                    
                    .form-row { display: flex; gap: 20px; margin-bottom: 1rem; }
                    .form-group { flex: 1; }
                    
                    .form-control { width: 100%; padding: 0.75rem 1rem; border: 1px solid ${styles['--border-color']}; border-radius: 4px; font-size: 1rem; transition: border-color 0.2s; }
                    .form-control:focus { outline: none; border-color: ${styles['--primary-color']}; }
                    .description-box { resize: vertical; min-height: 100px; }
                    
                    .quantity-group .quantity-inputs { display: flex; align-items: center; gap: 5px; }
                    .quantity-inputs .quantity-input { text-align: center; }
                    .multiply-icon { font-weight: 600; color: ${styles['--light-text-color']}; font-size: 1rem; }
                    
                    .btn-upload { background-color: ${styles['--primary-color']}; color: white; padding: 0.75rem 2rem; border: none; border-radius: 4px; font-size: 1rem; font-weight: 500; cursor: pointer; margin-top: 1rem; display: flex; align-items: center; gap: 8px; transition: background-color 0.2s; box-shadow: 0 4px 6px rgba(55, 66, 250, 0.3); }
                    .btn-upload:hover { background-color: #2a34c9; }
                    
                    /* Preview Card */
                    .preview-card { background-color: ${styles['--bg-white']}; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); padding: 1.5rem; }
                    .preview-image-box { width: 100%; height: 150px; background-color: #e0f2ff; border-radius: 4px; margin-bottom: 1.5rem; }
                    .preview-details { padding-top: 1rem; border-top: 1px solid ${styles['--border-color']}; }
                    .preview-label { font-size: 0.8rem; font-weight: 500; color: ${styles['--light-text-color']}; text-transform: uppercase; margin-bottom: 0.2rem; }
                    .primary-text { font-size: 1.2rem; font-weight: 600; color: ${styles['--primary-color']}; margin-bottom: 1.5rem; }
                    .preview-description { font-size: 0.9rem; line-height: 1.5; color: ${styles['--text-color']}; }

                    /* Responsive Adjustments */
                    @media (max-width: 992px) {
                        .sidebar { width: 80px; padding: 15px 0; }
                        .nav-link { justify-content: center; padding: 10px 0; }
                        .nav-link span { display: none; } 
                        .nav-link:hover, .nav-item.active .nav-link {
                            border-left: none; 
                            border-right: 3px solid ${styles['--accent-color']};
                        }
                        .form-layout { flex-direction: column; }
                        .form-right { order: -1; }
                    }

                    @media (max-width: 768px) {
                        .sidebar { width: 60px; }
                        .content-area { padding: 1rem; }
                        .form-row { flex-direction: column; gap: 0; }
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
                        {/* Hiding the clinic-name as per the final theme CSS */}
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
                        <div className="upload-item-container">
                            <h2>Upload an Item</h2>
                            <div className="form-layout">
                                <div className="form-left">
                                    <label className="form-label">Upload Item Image</label>
                                    <div className="image-upload-box">
                                        <i className="fas fa-cloud-upload-alt upload-icon"></i>
                                    </div>

                                    <form className="upload-form" onSubmit={(e) => e.preventDefault()}>
                                        <div className="form-row">
                                            <div className="form-group">
                                                <label className="form-label">Item Name</label>
                                                <input type="text" className="form-control" />
                                            </div>
                                            <div className="form-group">
                                                <label className="form-label">Category</label>
                                                <input type="text" className="form-control" />
                                            </div>
                                        </div>
                                        
                                        <div className="form-row">
                                            <div className="form-group">
                                                <label className="form-label">Price</label>
                                                <input type="text" className="form-control" />
                                            </div>
                                            <div className="form-group quantity-group">
                                                <label className="form-label">Quantity</label>
                                                <div className="quantity-inputs">
                                                    <input type="text" className="form-control quantity-input" defaultValue="5" />
                                                    <span className="multiply-icon">x</span>
                                                    <input type="text" className="form-control quantity-input" defaultValue="5" />
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="form-group">
                                            <label className="form-label">Description</label>
                                            <textarea className="form-control description-box"></textarea>
                                        </div>

                                        <button type="submit" className="btn-upload">
                                            <i className="fas fa-cloud-upload-alt"></i> Upload
                                        </button>
                                    </form>
                                </div>
                                
                                <div className="form-right">
                                    <div className="preview-card">
                                        <div className="preview-image-box"></div>
                                        <div className="preview-details">
                                            <p className="preview-label">price</p>
                                            <p className="preview-value primary-text">#5800</p>
                                            <p className="preview-label">Description</p>
                                            <p className="preview-description">Figma ipsum component variant main layer. Group pixel export inspect outline asset. Layout mask style edit inspect text. Link horizontal pencil main invite. Invite flows arrow plugin setting content selection boolean.</p>
                                        </div>
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

export default InventoryUpload;