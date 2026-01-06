import React, { useState, useEffect, useRef } from 'react';

// Main App component
const App = () => {
<<<<<<< HEAD
    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [userName, setUserName] = useState("Dr. Emily Carter");
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isDoctorOnline, setIsDoctorOnline] = useState(true);
=======
    // Initial messages from the HTML structure
    const initialMessages = [
        { id: 1, text: "Good morning Sir", type: 'received', timestamp: "10:39 AM" },
        { id: 2, text: "Good morning. Please check the patient's file for Dr. Williams.", type: 'sent', timestamp: "10:40 AM" },
        { id: 3, text: "Checking now. The file indicates he needs a follow-up appointment for his prescription renewal.", type: 'received', timestamp: "10:41 AM" },
    ];

    const [messages, setMessages] = useState(initialMessages);
    const [inputValue, setInputValue] = useState('');
    const [userName, setUserName] = useState("Dr. Emily Carter"); // Dynamic name for header
    const [isSidebarOpen, setIsSidebarOpen] = useState(false); // State for sidebar toggle on mobile
>>>>>>> d7adb94f093a3e0b1314671557a7ee3c3ed7e9e9
    
    const chatBodyRef = useRef(null);
    const nextId = useRef(4); // Simple ID generator for new messages

    // Effect to scroll to the bottom whenever messages change
    useEffect(() => {
        if (chatBodyRef.current) {
            chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
        }
    }, [messages]);

    // Toggles the sidebar open/closed on mobile
    const toggleSidebar = () => {
        setIsSidebarOpen(prev => !prev);
    };

    // Helper function to get the current formatted timestamp
    const getTimestamp = () => {
        const now = new Date();
        const hours = now.getHours();
        const minutes = now.getMinutes();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const formattedHours = hours % 12 === 0 ? 12 : hours % 12;
        const formattedMinutes = minutes < 10 ? '0' + minutes : minutes;
        return `${formattedHours}:${formattedMinutes} ${ampm}`;
    };

    // Function to handle sending a new message
    const sendMessage = () => {
        const messageText = inputValue.trim();

        if (messageText === "") {
            return;
        }

        const newMessage = {
            id: nextId.current++,
            text: messageText,
            type: 'sent', // New messages are always 'sent' by the user/admin
            timestamp: getTimestamp(),
        };

        setMessages((prevMessages) => [...prevMessages, newMessage]);
        setInputValue('');
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    };

    // Navigation Menu Component (extracted for cleanliness)
    const NavMenu = ({ isOpen }) => (
        <nav className={`sidebar ${isOpen ? 'open' : ''}`}>
            <ul className="nav-menu">
                <NavItem icon="fas fa-th-large" label="Dashboard" isActive={false} onClick={toggleSidebar} />
                <NavItem icon="fas fa-users" label="Patients" isActive={false} onClick={toggleSidebar} />
                <NavItem icon="fas fa-envelope" label="Messages" isActive={true} onClick={toggleSidebar} />
                <NavItem icon="fas fa-clipboard-check" label="Tests" isActive={false} onClick={toggleSidebar} />
                <NavItem icon="fas fa-box-open" label="Inventory" isActive={false} onClick={toggleSidebar} />
                <NavItem icon="fas fa-chart-bar" label="Reports" isActive={false} onClick={toggleSidebar} />
                <NavItem icon="fas fa-cog" label="Settings" isActive={false} onClick={toggleSidebar} />
                <NavItem icon="fas fa-sign-out-alt" label="Logout" isActive={false} isLogout={true} onClick={toggleSidebar} />
            </ul>
        </nav>
    );

    // Nav Item Component - closes sidebar on click (for mobile experience)
    const NavItem = ({ icon, label, isActive, isLogout = false, onClick }) => (
        <li className={`nav-item ${isActive ? 'active' : ''}`}>
            {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
            <a href="#" className={`nav-link ${isLogout ? 'logout' : ''}`} onClick={onClick}>
                <i className={icon}></i> <span>{label}</span>
            </a>
        </li>
    );

    return (
        <div className="app-container">
            {/* Styles MUST be embedded here to comply with single-file React component rule */}
            <style jsx="true">{`
                /* -----------------------------------------------------
                 * Global Styles, Root Variables, and Typography
                 * ----------------------------------------------------- */
                @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');

                :root {
                    /* Primary Colors (from new sample) */
                    --primary-color: #3742fa;
                    --secondary-color: #6c757d;
                    --text-color: #2c3e50;
                    --border-color: #dee2e6;
                    --bg-light: #f5f6fa;
                    --bg-white: #ffffff;
                }

                .dark {
                    --primary-color: #5b6efc;
                    --secondary-color: #9ca3af;
                    --text-color: #e5e7eb;
                    --border-color: #374151;
                    --bg-light: #111827;
                    --bg-white: #1f2937;
                    
                    /* Sidebar Specific */
                    --sidebar-bg: #764ba2;
                    --sidebar-text: #bdc3c7;
                    --sidebar-active-bg: #3742fa;
                    --accent-color: #ffd700; /* Yellow accent for logo/active indicator */
                    
                    /* Header Specific */
                    --header-bg: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    
                    /* Card/Shadows */
                    --card-bg: #ffffff;
                    --shadow-light: rgba(0, 0, 0, 0.05);
                    
                    /* Status Colors */
                    --danger-color: #dc3545;
                }

                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }

                body {
                    font-family: 'Poppins', sans-serif;
                    background-color: var(--bg-light);
                    color: var(--text-color);
                    overflow: hidden;
                    height: 100vh;
                }

                .dark body {
                    background-color: var(--bg-light);
                    color: var(--text-color);
                }

                .app-container {
                    height: 100vh;
                    display: flex;
                    flex-direction: column; 
                }

                .main-content-wrapper {
                    display: flex;
                    flex: 1; 
                    overflow: hidden; 
                }

                /* -----------------------------------------------------
                 * Header Styling
                 * ----------------------------------------------------- */
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
                
                .menu-toggle {
                    display: none; /* Hidden by default on desktop */
                    font-size: 1.5rem;
                    cursor: pointer;
                    color: var(--accent-color);
                    transition: color 0.2s;
                }
                .menu-toggle:hover {
                    color: white;
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


                /* -----------------------------------------------------
                 * Sidebar Styling
                 * ----------------------------------------------------- */
                .sidebar {
                    width: 250px;
                    background-color: var(--sidebar-bg);
                    color: white;
                    height: 100%; 
                    overflow-y: auto;
                    box-shadow: 2px 0 10px rgba(0,0,0,0.1);
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
                .nav-link.logout:hover {
                    color: white !important;
                    background-color: var(--danger-color);
                    border-left-color: var(--danger-color); /* Added border-left for consistency */
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

                /* -----------------------------------------------------
                 * Main Content Area and Chat Styles
                 * ----------------------------------------------------- */
                .content-area {
                    flex: 1; 
                    padding: 2rem;
                    overflow-y: auto;
                    background-color: var(--bg-light);
                    display: flex;
                    justify-content: center;
                    align-items: flex-start; /* Align content to the top */
                }

                .chat-container {
                    background-color: var(--bg-white);
                    border-radius: 12px;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
                    display: flex;
                    flex-direction: column;
                    width: 100%;
                    max-width: 1000px;
                    height: 90vh;
                    min-height: 450px;
                    overflow: hidden;
                }

                .dark .chat-container {
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
                }

                .chat-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 15px 20px;
                    border-bottom: 1px solid var(--border-color);
                    background-color: #f7f9fc;
                }

                .dark .chat-header {
                    background-color: #374151;
                }

                .assistant-profile {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }

                .assistant-avatar {
                    font-size: 2.2rem;
                    color: var(--primary-color);
                }

                .details h2 {
                    font-size: 1.1rem;
                    font-weight: 600;
                    margin: 0;
                    color: var(--text-color);
                }

                .details .online {
                    font-size: 0.8rem;
<<<<<<< HEAD
                    color: #27ae60;
                    margin: 0;
                }

                .details .offline {
                    font-size: 0.8rem;
                    color: #95a5a6;
=======
                    color: #27ae60; /* Green for online status */
>>>>>>> d7adb94f093a3e0b1314671557a7ee3c3ed7e9e9
                    margin: 0;
                }

                .search-icon {
                    color: var(--secondary-color);
                    cursor: pointer;
                    font-size: 1.1rem;
                    transition: color 0.2s;
                }

                .search-icon:hover {
                    color: var(--primary-color);
                }

                .chat-body {
                    flex-grow: 1;
                    padding: 20px;
                    overflow-y: auto;
                    /* Subtle background texture */
                    background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" opacity=".05"><circle cx="10" cy="10" r="10" fill="%23764ba2"/></svg>');
                    background-size: 50px 50px;
                }

                .message {
                    max-width: 70%;
                    margin-bottom: 15px;
                    padding: 10px 15px; 
                    border-radius: 7px; 
                    line-height: 1.4;
                    position: relative;
                    font-size: 0.95rem;
                    display: block;
                    width: fit-content;
                }

                .message p {
                    margin: 0;
                }

<<<<<<< HEAD
                .message-sender {
                    font-size: 0.75rem;
                    font-weight: 600;
                    margin-bottom: 4px;
                    color: var(--primary-color);
                }

                .message.received .message-sender {
                    color: var(--secondary-color);
                }

=======
>>>>>>> d7adb94f093a3e0b1314671557a7ee3c3ed7e9e9
                .message .timestamp {
                    display: block;
                    font-size: 0.7rem;
                    color: rgba(255, 255, 255, 0.7);
                    margin-top: 5px;
                    text-align: right;
                }

                /* Received Message (Assistant) */
                .message.received {
                    background-color: #e9ecef; 
                    color: var(--text-color);
                    text-align: left;
                    margin-left: 0;
                    margin-right: auto; 
                }

                .message.received .timestamp {
                    color: var(--secondary-color);
                    text-align: left;
                }

                /* Sent Message (User/Admin) */
                .message.sent {
                    background-color: var(--primary-color);
                    color: var(--bg-white);
                    margin-left: auto; 
                    margin-right: 0;
                    text-align: left;
                }

                .chat-input {
                    display: flex;
                    align-items: center;
                    padding: 15px 20px;
                    border-top: 1px solid var(--border-color);
                    background-color: var(--bg-white);
                }

                .chat-input input[type="text"] {
                    flex-grow: 1;
                    padding: 10px 15px;
                    border: 1px solid #ced4da;
                    border-radius: 7px; 
                    font-size: 1rem;
                    margin-right: 15px;
                    outline: none;
                    transition: border-color 0.2s;
                    background-color: var(--bg-white);
                    color: var(--text-color);
                }

                .dark .chat-input input[type="text"] {
                    border-color: var(--border-color);
                }

                .chat-input input[type="text"]:focus {
                    border-color: var(--primary-color);
                }

                .input-icons {
                    display: flex;
                    gap: 15px;
                }

                .input-icons i {
                    color: var(--primary-color);
                    cursor: pointer;
                    font-size: 1.2rem;
                    transition: color 0.2s;
                }

                .input-icons i:hover {
                    color: #2b35c0;
                }


                /* -----------------------------------------------------
                 * Responsive Adjustments
                 * ----------------------------------------------------- */
                @media (max-width: 992px) {
                    /* Sidebar collapse */
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
                    .nav-link.logout:hover {
                        border-right: 3px solid var(--danger-color);
                        border-left: none;
                    }
                    .chat-container {
                        height: 90vh; 
                    }
                }

                @media (max-width: 768px) {
                    /* Show menu toggle, hide logo text, adjust header layout */
                    .app-header {
                        padding: 1rem; /* Reduce header padding */
                    }
                    .menu-toggle {
                        display: block; /* Show menu button */
                        margin-right: 15px;
                    }
                    .header-content {
                        /* Switch back to row layout for toggle */
                        flex-direction: row; 
                        justify-content: space-between;
                        align-items: center;
                    }
                    .logo {
                        flex-grow: 1; /* Center logo between toggle and user info */
                        justify-content: center;
                    }
                    .logo h1 {
                        display: none; /* Hide clinic name on tiny screens */
                    }
                    .user-info {
                        padding-top: 0;
                    }

                    .sidebar {
                        /* Positioned fully off-screen by default */
                        left: -250px; 
                        width: 250px; /* Full desktop width for readable menu when open */
                        z-index: 1010; /* Above everything else */
                        transition: left 0.3s ease;
                        box-shadow: 5px 0 15px rgba(0,0,0,0.3);
                    }
                    /* When open, slide in */
                    .sidebar.open {
                        left: 0; 
                    }
                    
                    /* Restore span visibility when sidebar is open */
                    .nav-link span { 
                        display: inline;
                    }
                    .nav-link {
                         /* Restore full link padding for a readable mobile menu */
                        justify-content: flex-start;
                        padding: 1rem 1.5rem;
                        border-right: none !important; 
                        border-left: 3px solid transparent; 
                    }
                    .nav-item.active .nav-link {
                        border-left-color: var(--accent-color);
                    }
                    .chat-container {
                        height: 95vh;
                        border-radius: 0;
                    }
                }
            `}</style>
            
            <header className="app-header">
                <div className="header-content">
                    {/* Menu Toggle button (Visible on mobile) */}
                    <div className="menu-toggle" onClick={toggleSidebar}>
                        <i className={`fas ${isSidebarOpen ? 'fa-times' : 'fa-bars'}`}></i>
                    </div>

                    <div className="logo">
                        <i className="fas fa-eye"></i>
                        <h1>KORENE EYE CLINIC</h1>
                    </div>
                    
                    <div className="user-info">
                        <img src="https://via.placeholder.com/30" alt="Admin Avatar" className="avatar" /> 
                        <span>{userName}</span>
                    </div>
                </div>
            </header>

            <div className="main-content-wrapper">
                <NavMenu isOpen={isSidebarOpen} />

                <main className="content-area">
                    <section className="chat-container">
                        <div className="chat-header">
                            <div className="assistant-profile">
                                <i className="fas fa-user-circle assistant-avatar"></i>
                                <div className="details">
                                    <h2>Doctor</h2>
<<<<<<< HEAD
                                    <p className={isDoctorOnline ? 'online' : 'offline'}>
                                        {isDoctorOnline ? 'Online' : 'Offline'}
                                    </p>
=======
                                    <p className="online">Online</p>
>>>>>>> d7adb94f093a3e0b1314671557a7ee3c3ed7e9e9
                                </div>
                            </div>
                            <i className="fas fa-search search-icon"></i>
                        </div>
                        
                        <div className="chat-body" ref={chatBodyRef}>
                            {messages.map((message) => (
                                <div key={message.id} className={`message ${message.type}`}>
<<<<<<< HEAD
                                    {message.type === 'received' && (
                                        <div className="message-sender">Doctor</div>
                                    )}
=======
>>>>>>> d7adb94f093a3e0b1314671557a7ee3c3ed7e9e9
                                    <p>{message.text}</p>
                                    <span className="timestamp">{message.timestamp}</span>
                                </div>
                            ))}
                        </div>

                        <div className="chat-input">
                            <input
                                type="text"
                                placeholder="Type a message"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyPress={handleKeyPress}
                            />
                            <div className="input-icons">
                                <i className="fas fa-image"></i>
                                <i className="fas fa-paperclip"></i>
                                <i 
                                    className="fas fa-paper-plane" 
                                    onClick={sendMessage}
                                    style={{ cursor: 'pointer' }}
                                ></i>
                            </div>
                        </div>
                    </section>
                </main>
            </div>
        </div>
    );
};

export default App;
