import React, { useState, useEffect, useRef } from 'react';
import Layout from '../components/layout/Layout';
import useUser from '../hooks/useUser';
import useMessages from '../hooks/useMessages';

const AssistantChatScreen = () => {
    const { user } = useUser();
    const { messages, loading, fetchMessages, sendMessage } = useMessages();
    const [inputValue, setInputValue] = useState('');
    const [activeSection, setActiveSection] = useState('messages');

    // Hardcoded for now as per original file
    const [isDoctorOnline, setIsDoctorOnline] = useState(true);

    const chatBodyRef = useRef(null);

    // Initial fetch and polling for mock replies
    useEffect(() => {
        fetchMessages();
        // Poll every 3 seconds for new messages (e.g. mock replies)
        const interval = setInterval(() => {
            fetchMessages();
        }, 3000);
        return () => clearInterval(interval);
    }, [fetchMessages]);

    // Scroll to bottom on new message
    useEffect(() => {
        if (chatBodyRef.current) {
            chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSendMessage = async () => {
        const messageText = inputValue.trim();
        if (messageText === "") return;

        await sendMessage({
            text: messageText,
            senderId: user?.id || 'admin'
        });

        setInputValue('');
        // fetchMessages(); // Hook might update state optimistically or re-fetch
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleSendMessage();
        }
    };

    const handleNavClick = (sectionId) => {
        setActiveSection(sectionId);
    };

    return (
        <Layout
            activeSection={activeSection}
            onSectionClick={handleNavClick}
        >
            <div className="flex flex-col h-[calc(100vh-8rem)] bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                {/* Chat Header */}
                <div className="flex justify-between items-center p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-750">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                            <i className="fas fa-user-md text-xl"></i>
                        </div>
                        <div>
                            <h2 className="font-semibold text-gray-900 dark:text-white">Dr. Emily Carter</h2>
                            <div className="flex items-center gap-1.5">
                                <span className={`w-2 h-2 rounded-full ${isDoctorOnline ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                    {isDoctorOnline ? 'Online' : 'Offline'}
                                </span>
                            </div>
                        </div>
                    </div>
                    <button className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors p-2">
                        <i className="fas fa-search text-lg"></i>
                    </button>
                </div>

                {/* Chat Body */}
                <div
                    className="flex-1 p-6 overflow-y-auto bg-gray-50 dark:bg-gray-900/50 custom-scrollbar"
                    ref={chatBodyRef}
                    style={{
                        backgroundImage: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" opacity=".03"><circle cx="10" cy="10" r="1" fill="%234B5563"/></svg>')`,
                        backgroundSize: '20px 20px'
                    }}
                >
                    {loading && messages.length === 0 && (
                        <div className="flex justify-center py-4">
                            <span className="text-gray-400 text-sm">Loading messages...</span>
                        </div>
                    )}

                    {!loading && messages.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500 space-y-2">
                            <i className="fas fa-comments text-4xl opacity-50"></i>
                            <p>No messages yet. Start a conversation!</p>
                        </div>
                    )}

                    {messages.map((message) => (
                        <div
                            key={message.id}
                            className={`flex flex-col mb-4 max-w-[75%] ${message.type === 'sent' ? 'ml-auto items-end' : 'mr-auto items-start'}`}
                        >
                            <div
                                className={`
                                    px-4 py-2.5 rounded-2xl shadow-sm text-sm break-words
                                    ${message.type === 'sent'
                                        ? 'bg-blue-600 text-white rounded-tr-sm'
                                        : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-tl-sm border border-gray-100 dark:border-gray-600'}
                                `}
                            >
                                {message.text}
                            </div>
                            <span className="text-[10px] text-gray-400 mt-1 px-1">
                                {message.timestamp}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Chat Input */}
                <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <div className="flex gap-2 text-gray-400">
                            <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors hover:text-blue-600">
                                <i className="fas fa-image text-lg"></i>
                            </button>
                            <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors hover:text-blue-600">
                                <i className="fas fa-paperclip text-lg"></i>
                            </button>
                        </div>
                        <div className="flex-1 relative">
                            <input
                                type="text"
                                placeholder="Type a message..."
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyPress={handleKeyPress}
                                className="w-full pl-4 pr-12 py-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all dark:text-white"
                            />
                            <button
                                onClick={handleSendMessage}
                                disabled={!inputValue.trim()}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-blue-600 disabled:text-gray-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                            >
                                <i className="fas fa-paper-plane"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default AssistantChatScreen;
