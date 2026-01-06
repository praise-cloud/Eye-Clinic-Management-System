import React from 'react';

// ======================================================================
// 1. STYLES OBJECT (CSS converted to JavaScript/camelCase)
//    - This simulates a stylesheet or CSS-in-JS definitions.
//    - Note: Media queries and complex pseudo-selectors are often 
//      handled by a separate library (like styled-components) or a 
//      separate CSS file for production, but are included here 
//      in comments for reference.
// ======================================================================

const styles = {
    // --- Theme Variables ---
    vars: {
        '--primary-color': '#3742fa', 
        '--secondary-color': '#6c757d',
        '--text-color': '#2c3e50',
        '--light-text-color': '#7f8c8d',
        '--border-color': '#dee2e6',
        '--bg-light': '#f8f9fa',
        '--bg-white': '#ffffff',
        '--sidebar-bg': '#764ba2', 
        '--sidebar-text': '#bdc3c7',
        '--sidebar-active-bg': '#3742fa', 
        '--accent-color': '#ffd700',
        '--header-bg': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        '--card-bg': '#ffffff',
        '--shadow-light': 'rgba(0, 0, 0, 0.05)',
        '--danger-color': '#dc3545',
    },

    // --- General/Reset Styles ---
    global: `
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Poppins', sans-serif; 
            background-color: var(--bg-light); 
            color: var(--text-color); 
            overflow: hidden; 
            height: 100vh;
        }
    `, // Typically injected via a global style provider

    // --- Layout ---
    appContainer: { height: '100vh', display: 'flex', flexDirection: 'column' },
    mainContentWrapper: { display: 'flex', flex: 1, overflow: 'hidden' },

    // --- Header ---
    appHeader: {
        background: styles.vars['--header-bg'],
        color: 'white',
        padding: '1rem 2rem',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        zIndex: 1000,
    },
    headerContent: {
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        maxWidth: '1200px', margin: '0 auto',
    },
    logo: { display: 'flex', alignItems: 'center', gap: '10px' },
    logoIcon: { fontSize: '2rem', color: styles.vars['--accent-color'] },
    logoH1: { fontSize: '1.5rem', fontWeight: 600, color: 'white' },
    userInfo: { display: 'flex', alignItems: 'center', gap: '10px', color: 'white', fontWeight: 500 },
    avatar: {
        width: '30px', height: '30px', borderRadius: '50%', objectFit: 'cover',
        border: '1px solid rgba(255, 255, 255, 0.5)',
    },

    // --- Sidebar ---
    sidebar: {
        width: '250px', backgroundColor: styles.vars['--sidebar-bg'], color: 'white',
        height: '100%', overflowY: 'auto', boxShadow: '2px 0 10px rgba(0,0,0,0.1)',
    },
    navMenu: { listStyle: 'none', padding: '1rem 0' },
    navItem: { margin: 0 },
    navLink: {
        display: 'flex', alignItems: 'center', gap: '1rem',
        padding: '1rem 1.5rem', color: styles.vars['--sidebar-text'],
        textDecoration: 'none', transition: 'all 0.3s ease',
        borderLeft: '3px solid transparent',
    },
    navLinkIcon: { fontSize: '1.1rem', width: '20px' },
    
    // Note: The actual hover/active styles would require a CSS stylesheet or a proper CSS-in-JS solution.
    // .nav-item.active .nav-link { background-color: var(--sidebar-active-bg); color: white; border-left-color: var(--accent-color); }
    
    // --- Main Content ---
    contentArea: {
        flex: 1, padding: '2rem', overflowY: 'auto',
        backgroundColor: styles.vars['--bg-light'],
    },

    // --- Settings Page ---
    settingsPage: { padding: 0, maxWidth: '900px', margin: '0 auto' },
    settingsH2: { fontWeight: 600, color: styles.vars['--text-color'], marginBottom: '2rem', fontSize: '1.75rem' },

    // --- Profile Section ---
    sectionBase: {
        backgroundColor: styles.vars['--bg-white'], padding: '2.5rem', 
        borderRadius: '12px', boxShadow: '0 4px 15px rgba(0, 0, 0, 0.08)',
        marginBottom: '2rem', position: 'relative',
    },
    profileSection: {
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        flexWrap: 'wrap',
    },
    profileCard: { display: 'flex', alignItems: 'flex-start', gap: '2.5rem', flexGrow: 1 },
    profileInfo: { display: 'flex', alignItems: 'center', gap: '1.5rem' },
    profileAvatar: {
        width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover',
        boxShadow: '0 0 0 4px #e0e0e0', flexShrink: 0,
    },
    userDetails: { display: 'flex', flexDirection: 'column' },
    profileName: { fontSize: '1.8rem', fontWeight: 700, color: styles.vars['--text-color'], marginBottom: '0.2rem' },
    profileRole: { fontSize: '1rem', fontWeight: 500, color: styles.vars['--light-text-color'] },
    contactInfo: {
        display: 'flex', flexDirection: 'column', alignItems: 'flex-end',
        color: styles.vars['--light-text-color'], fontSize: '0.85rem', 
        lineHeight: 1.8, textAlign: 'right', marginRight: '200px',
    },
    editButton: {
        position: 'absolute', top: '1.5rem', right: '1.5rem',
        background: 'none', border: 'none', color: styles.vars['--light-text-color'],
        cursor: 'pointer', fontSize: '0.9rem', fontWeight: 500, padding: '0.5rem',
        transition: 'color 0.2s',
    },

    // --- Preferences Section ---
    preferencesH3: { fontWeight: 600, color: styles.vars['--text-color'], marginBottom: '2rem', fontSize: '1.35rem' },
    preferenceGroup: { display: 'flex', gap: '2rem', marginBottom: '1.5rem', flexWrap: 'wrap' },
    preferenceGroupFileExport: { marginTop: '2.5rem' },
    preferenceItem: { 
        display: 'flex', flexDirection: 'column', 
        flexBasis: 'calc(33.333% - 1.333rem)', minWidth: '180px', flexGrow: 1,
    },
    preferenceItemExport: { maxWidth: '200px', flexGrow: 0 },
    preferenceLabel: {
        fontSize: '0.85rem', color: styles.vars['--light-text-color'], 
        fontWeight: 500, marginBottom: '0.6rem',
    },
    customSelect: {
        width: '100%', padding: '0.75rem 1rem', border: `1px solid ${styles.vars['--border-color']}`,
        borderRadius: '8px', backgroundColor: styles.vars['--bg-white'], color: styles.vars['--text-color'],
        fontSize: '0.95rem', appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none',
        cursor: 'pointer', transition: 'border-color 0.2s',
        // Note: The custom arrow background-image is omitted here for simplicity of inline JS style.
    },

    // --- Action Buttons ---
    actionButtons: { display: 'flex', justifyContent: 'flex-end', gap: '1rem', padding: '0.5rem 0' },
    buttonBase: {
        padding: '0.75rem 2rem', border: 'none', borderRadius: '8px',
        fontSize: '1rem', fontWeight: 600, cursor: 'pointer',
        transition: 'all 0.2s ease', boxShadow: `0 2px 4px ${styles.vars['--shadow-light']}`,
    },
    resetButton: { 
        backgroundColor: styles.vars['--bg-white'], 
        color: styles.vars['--secondary-color'],
        border: `1px solid ${styles.vars['--border-color']}`,
    },
    saveButton: {
        backgroundColor: styles.vars['--primary-color'],
        color: 'white',
        boxShadow: '0 4px 10px rgba(55, 66, 250, 0.3)',
    },
};

// ======================================================================
// 2. JSX COMPONENT
//    - Styles are applied using the `style` attribute for simplicity.
//    - Class names are retained for elements where complex styling 
//      (like media queries or pseudo-classes) would normally apply.
// ======================================================================

const SettingsPage = () => {
    // Note: In a real React app, you would use a global style provider 
    // or imported CSS to handle the media queries and pseudo-selectors. 
    // Applying the complex CSS to a <style> tag here is for demonstration only.
    // The following would be external in a standard setup:
    /* eslint-disable react/no-danger */
    return (
        <React.Fragment>
            <style dangerouslySetInnerHTML={{ __html: styles.global }} />
            {/* The rest of the complex CSS (hover, active, media queries) 
                is omitted here as it requires a separate CSS file or library. */}
            
            <div className="app-container" style={styles.appContainer}>
                {/* Header (New Gradient Style) */}
                <header className="app-header" style={styles.appHeader}>
                    <div className="header-content" style={styles.headerContent}>
                        <div className="logo" style={styles.logo}>
                            <i className="fas fa-eye" style={styles.logoIcon}></i>
                            <h1 style={styles.logoH1}>KORENYE CLINIC</h1>
                        </div>
                        <div className="user-info" style={styles.userInfo}>
                            <img 
                                src="https://via.placeholder.com/30/cccccc/ffffff?text=AD" 
                                alt="Admin Avatar" 
                                className="avatar" 
                                style={styles.avatar}
                            /> 
                            <span>Admin</span>
                        </div>
                    </div>
                </header>

                <div className="main-content-wrapper" style={styles.mainContentWrapper}>
                    {/* Sidebar (New Dark Purple Style) */}
                    <nav className="sidebar" style={styles.sidebar}>
                        <ul className="nav-menu" style={styles.navMenu}>
                            <li className="nav-item" style={styles.navItem}>
                                <a href="#" className="nav-link" style={styles.navLink}>
                                    <i className="fas fa-th-large" style={styles.navLinkIcon}></i> <span>Dashboard</span>
                                </a>
                            </li>
                            <li className="nav-item" style={styles.navItem}>
                                <a href="#" className="nav-link" style={styles.navLink}>
                                    <i className="fas fa-envelope" style={styles.navLinkIcon}></i> <span>Messages</span>
                                </a>
                            </li>
                            <li className="nav-item" style={styles.navItem}>
                                <a href="#" className="nav-link" style={styles.navLink}>
                                    <i className="fas fa-clipboard-check" style={styles.navLinkIcon}></i> <span>Test</span>
                                </a>
                            </li>
                            <li className="nav-item" style={styles.navItem}>
                                <a href="#" className="nav-link" style={styles.navLink}>
                                    <i className="fas fa-box-open" style={styles.navLinkIcon}></i> <span>Inventory</span>
                                </a>
                            </li>
                            <li className="nav-item active" style={styles.navItem}>
                                <a href="#" className="nav-link" style={{...styles.navLink, /* Active styles here */}}>
                                    <i className="fas fa-cog" style={styles.navLinkIcon}></i> <span>Settings</span>
                                </a>
                            </li>
                            <li className="nav-item nav-item-logout" style={styles.navItem}>
                                <a href="#" className="nav-link" style={styles.navLink}>
                                    <i className="fas fa-sign-out-alt" style={styles.navLinkIcon}></i> <span>Logout</span>
                                </a>
                            </li>
                        </ul>
                    </nav>

                    {/* Main Content Area */}
                    <main className="content-area" style={styles.contentArea}>
                        <div className="settings-page" style={styles.settingsPage}>
                            <h2 style={styles.settingsH2}>Settings</h2>

                            <div className="profile-section" style={{...styles.sectionBase, ...styles.profileSection}}>
                                <div className="profile-card" style={styles.profileCard}>
                                    <div className="profile-info" style={styles.profileInfo}>
                                        <img 
                                            src="https://i.ibb.co/R2p8XW7/john-doe-profile.jpg" 
                                            alt="User Avatar" 
                                            className="profile-avatar" 
                                            style={styles.profileAvatar}
                                        />
                                        <div className="user-details" style={styles.userDetails}>
                                            <span className="profile-name" style={styles.profileName}>John Doe</span>
                                            <span className="profile-role" style={styles.profileRole}>Doctor</span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="contact-info" style={styles.contactInfo}>
                                    <span className="info-item">Nigerian</span>
                                    <span className="info-item">River State, Port Harcourt</span>
                                    <span className="info-item">+234 123 4567</span>
                                    <span className="info-item">clinic@korenye.com</span>
                                </div>
                                <button className="edit-button" style={styles.editButton}>Edit</button>
                            </div>
                            
                            <div className="preferences-section" style={styles.sectionBase}>
                                <h3 style={styles.preferencesH3}>User Preference</h3>
                                <div className="preference-group" style={styles.preferenceGroup}>
                                    <div className="preference-item" style={styles.preferenceItem}>
                                        <label htmlFor="language-select" style={styles.preferenceLabel}>Language</label>
                                        <select id="language-select" className="custom-select" style={styles.customSelect}>
                                            <option>English</option>
                                            <option>Igbo</option>
                                            <option>Yoruba</option>
                                        </select>
                                    </div>
                                    <div className="preference-item" style={styles.preferenceItem}>
                                        <label htmlFor="theme-select" style={styles.preferenceLabel}>Theme</label>
                                        <select id="theme-select" className="custom-select" style={styles.customSelect}>
                                            <option>Dark</option>
                                            <option>Light</option>
                                        </select>
                                    </div>
                                    <div className="preference-item" style={styles.preferenceItem}>
                                        <label htmlFor="notification-select" style={styles.preferenceLabel}>Notification</label>
                                        <select id="notification-select" className="custom-select" style={styles.customSelect}>
                                            <option>Off</option>
                                            <option>On</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="preference-group file-export" style={{...styles.preferenceGroup, ...styles.preferenceGroupFileExport}}>
                                    <div className="preference-item" style={{...styles.preferenceItem, ...styles.preferenceItemExport}}>
                                        <label htmlFor="export-type-select" style={styles.preferenceLabel}>Export File Type</label>
                                        <select id="export-type-select" className="custom-select" style={styles.customSelect}>
                                            <option>CSV</option>
                                            <option>PDF</option>
                                            <option>XLSX</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="action-buttons" style={styles.actionButtons}>
                                <button className="reset-button" style={{...styles.buttonBase, ...styles.resetButton}}>Reset</button> 
                                <button className="save-button" style={{...styles.buttonBase, ...styles.saveButton}}>Save</button>
                            </div>
                        </div>
                    </main>
                </div>
            </div>
        </React.Fragment>
    );
};

export default SettingsPage;