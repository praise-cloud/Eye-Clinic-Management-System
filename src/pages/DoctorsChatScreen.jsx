<<<<<<< HEAD
import React, { useState, useEffect } from 'react';
import './DoctorsChatScreen.css';
import useUser from '../hooks/useUser';
import MessagesContent from '../components/content/MessagesContent'; // Import the good component

// Main application component
const DoctorsChatScreen = () => {
    const { user, loading } = useUser(); // The currently logged-in user
    const [users, setUsers] = useState([]); // The list of all other users
    const [selectedUser, setSelectedUser] = useState(null); // The user selected from the sidebar

    // Effect to fetch all users to display in the sidebar
    useEffect(() => {
        const fetchUsers = async () => {
            if (user?.id) {
                const result = await window.electronAPI.getAllUsers();
                if (result.success) {
                    // Filter out the current user from the list
                    setUsers(result.users.filter(u => u.id !== user.id));
                }
            }
        };

        fetchUsers();
    }, [user?.id]);

    // Show a loading screen while the user is being authenticated.
    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center text-gray-500">
                    <i className="fas fa-spinner fa-spin text-4xl mb-4"></i>
                    <h2 className="text-xl">Loading User...</h2>
                </div>
            </div>
        );
    }
=======
import React, { useState, useEffect, useRef } from 'react';

// Main application component
const App = () => {
    // State to hold the chat messages
    const [messages, setMessages] = useState([]);
    // Refs for accessing the DOM elements for input and auto-scrolling
    const messageInputRef = useRef(null);
    const chatBodyRef = useRef(null);

    // Function to format the current time as HH:MM AM/PM
    const formatTime = () => {
        const now = new Date();
        const hours = now.getHours();
        const minutes = now.getMinutes();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const formattedHours = hours % 12 === 0 ? 12 : hours % 12;
        const formattedMinutes = minutes < 10 ? '0' + minutes : minutes;
        return `${formattedHours}:${formattedMinutes} ${ampm}`;
    };
    
    // Function to handle sending a message
    const sendMessage = () => {
        const messageText = messageInputRef.current.value.trim();

        if (messageText === "") return; // Stop if the input is empty

        const newMessage = {
            id: Date.now(),
            text: messageText,
            timestamp: formatTime(),
            type: 'sent', // All user-sent messages are type 'sent'
        };

        // Update the messages state
        setMessages(prevMessages => [...prevMessages, newMessage]);
        
        // Clear the input field
        messageInputRef.current.value = '';
    };

    // Handler for pressing the Enter key in the input box
    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault(); 
            sendMessage();
        }
    };

    // Effect hook for auto-scrolling to the bottom whenever messages change
    useEffect(() => {
        if (chatBodyRef.current) {
            chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
        }
    }, [messages]);

    // Dummy data for example conversation if needed:
    /*
    useEffect(() => {
        setMessages([
            { id: 1, text: "Welcome to Korenye Clinic Assistant. How can I help you with the patient records today?", timestamp: "10:00 AM", type: 'received' },
            { id: 2, text: "I need to check Dr. Smith's appointment schedule for tomorrow.", timestamp: "10:01 AM", type: 'sent' },
        ]);
    }, []);
    */
>>>>>>> d7adb94f093a3e0b1314671557a7ee3c3ed7e9e9


    return (
        <div className="app-container">
<<<<<<< HEAD
            {/* The header remains the same */}
=======
            {/* CSS Styles Block (Embedded for single-file compliance) */}
            <style jsx="true">{`
                /* -----------------------------------------------------
                * Global Styles, Root Variables, and Typography (CSS Component)
                * ----------------------------------------------------- */
                @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');

                :root {
                    /* Primary Colors */
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
                .nav-link:has(i.fa-sign-out-alt):hover {
                    color: white !important;
                    background-color: var(--danger-color);
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
                    color: #27ae60; /* Green for online status */
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
                    .chat-container {
                        height: 90vh;
                    }
                }

                @media (max-width: 768px) {
                    .app-header .header-content {
                        flex-direction: column;
                        align-items: flex-start;
                        gap: 10px;
                    }
                    .user-info {
                        padding-top: 5px;
                    }
                    .sidebar {
                        /* Mobile menu hidden by default */
                        position: absolute;
                        left: -80px;
                        height: 100vh;
                        z-index: 1000;
                        transition: left 0.3s ease;
                    }
                    .main-content-wrapper { 
                        flex-grow: 1; 
                        width: 100%;
                    }
                    .content-area {
                        padding: 1rem;
                    }
                    .chat-container {
                        height: 95vh;
                        border-radius: 0;
                    }
                }
            `}</style>

            {/* HTML Structure converted to JSX */}
>>>>>>> d7adb94f093a3e0b1314671557a7ee3c3ed7e9e9
            <header className="app-header">
                <div className="header-content">
                    <div className="logo">
                        <i className="fas fa-eye"></i>
                        <h1>KORENE EYE CLINIC</h1>
                    </div>
                    <div className="user-info">
<<<<<<< HEAD
                        <img
                            src="https://via.placeholder.com/30"
                            alt="Admin Avatar Placeholder"
                            className="avatar"
                            onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = 'https://placehold.co/30x30/3742fa/ffffff?text=A';
                            }}
                        />
                        <span>{user ? user.name : '...'}</span>
=======
                        {/* Placeholder image handling in React uses alt text and needs a local URL */}
                        <img 
                            src="https://via.placeholder.com/30" 
                            alt="Admin Avatar Placeholder" 
                            className="avatar"
                            // A simple onError replacement for React
                            onError={(e) => { 
                                e.target.onerror = null; 
                                e.target.src = 'https://placehold.co/30x30/3742fa/ffffff?text=A'; 
                            }}
                        /> 
                        <span>Admin</span>
>>>>>>> d7adb94f093a3e0b1314671557a7ee3c3ed7e9e9
                    </div>
                </div>
            </header>

            <div className="main-content-wrapper">
<<<<<<< HEAD
                {/* Sidebar for user selection */}
                <nav className="sidebar">
                    <ul className="nav-menu">
                        {users.map(u => (
                            <li key={u.id} className={`nav-item ${selectedUser && selectedUser.id === u.id ? 'active' : ''}`} onClick={() => setSelectedUser(u)}>
                                <a href="#" className="nav-link" onClick={(e) => e.preventDefault()}>
                                    <i className="fas fa-user"></i>
                                    <span>{u.name || `${u.first_name} ${u.last_name}`}</span>
                                </a>
                            </li>
                        ))}
=======
                {/* Sidebar */}
                <nav className="sidebar">
                    <ul className="nav-menu">
                        <li className="nav-item"><a href="#" className="nav-link"><i className="fas fa-th-large"></i> <span>Dashboard</span></a></li>
                        <li className="nav-item active"><a href="#" className="nav-link"><i className="fas fa-envelope"></i> <span>Messages</span></a></li>
                        <li className="nav-item"><a href="#" className="nav-link"><i className="fas fa-clipboard-check"></i> <span>Tests</span></a></li>
                        <li className="nav-item"><a href="#" className="nav-link"><i className="fas fa-chart-bar"></i> <span>Reports</span></a></li>
                        <li className="nav-item"><a href="#" className="nav-link"><i className="fas fa-cog"></i> <span>Settings</span></a></li>
                        <li className="nav-item"><a href="#" className="nav-link"><i className="fas fa-sign-out-alt"></i> <span>Logout</span></a></li>
>>>>>>> d7adb94f093a3e0b1314671557a7ee3c3ed7e9e9
                    </ul>
                </nav>

                <main className="content-area">
<<<<<<< HEAD
                    {/* Conditionally render MessagesContent or a placeholder */}
                    {selectedUser ? (
                        <MessagesContent key={selectedUser.id} currentUser={user} otherUser={selectedUser} />
                    ) : (
                        <div className="flex items-center justify-center h-full">
                            <div className="text-center text-gray-500">
                                <i className="fas fa-comments text-4xl mb-4"></i>
                                <h2 className="text-xl">Select a user to start a conversation</h2>
                            </div>
                        </div>
                    )}
=======
                    {/* Chat Interface */}
                    <section className="chat-container">
                        <div className="chat-header">
                            <div className="assistant-profile">
                                <i className="fas fa-user-circle assistant-avatar"></i>
                                <div className="details">
                                    <h2>Clinic Assistant</h2>
                                    <p className="online">Online</p>
                                </div>
                            </div>
                            <i className="fas fa-search search-icon"></i>
                        </div>
                        
                        <div className="chat-body" ref={chatBodyRef}>
                            {/* Dynamically render messages from state */}
                            {messages.map((message) => (
                                <div 
                                    key={message.id} 
                                    // Use type to conditionally apply styling
                                    className={`message ${message.type}`}
                                >
                                    <p>{message.text}</p>
                                    <span className="timestamp">{message.timestamp}</span>
                                </div>
                            ))}
                        </div>

                        <div className="chat-input">
                            <input 
                                type="text" 
                                placeholder="Type a message" 
                                ref={messageInputRef}
                                onKeyDown={handleKeyDown} // Handle Enter key press
                            />
                            <div className="input-icons">
                                <i className="fas fa-image"></i>
                                <i className="fas fa-paperclip"></i>
                                <i 
                                    className="fas fa-paper-plane" 
                                    onClick={sendMessage} // Handle click
                                ></i>
                            </div>
                        </div>
                    </section>
>>>>>>> d7adb94f093a3e0b1314671557a7ee3c3ed7e9e9
                </main>
            </div>
        </div>
    );
};

<<<<<<< HEAD
export default DoctorsChatScreen;
=======
export default App;
>>>>>>> d7adb94f093a3e0b1314671557a7ee3c3ed7e9e9
