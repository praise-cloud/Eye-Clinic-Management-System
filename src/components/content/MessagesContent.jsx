import React, { useState, useRef, useEffect, useCallback } from 'react';
import logger from '../../utils/logger';
import ChatInputActions from './ChatInputActions';
import useUser from '../../hooks/useUser';

const electronAPI = window.electronAPI;

const MessagesContent = () => {
  const { user: currentUser } = useUser();
  const [otherUser, setOtherUser] = useState(null);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [attachedFile, setAttachedFile] = useState(null); // ← renamed to avoid confusion
  const [replyTo, setReplyTo] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [unreadCounts, setUnreadCounts] = useState({});

  const chatEndRef = useRef(null);
  const imageInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const messagesContainerRef = useRef(null);

  const currentUserName = currentUser
    ? (currentUser.name || `${currentUser.first_name || ''} ${currentUser.last_name || ''}`.trim() || 'Me')
    : 'Me';

  const otherUserName = otherUser
    ? (otherUser.name || `${otherUser.first_name || ''} ${otherUser.last_name || ''}`.trim() || 'Staff')
    : '';

  // Load users + unread badges
  useEffect(() => {
    if (!currentUser || !electronAPI) return;

    const load = async () => {
      try {
        // Set current user online
        await electronAPI.setUserOnline(currentUser.id);

        // Get users with presence status - try enhanced network API first
        let usersData = [];
        try {
          const networkRes = await electronAPI.getOnlineUsersDetailed();
          if (networkRes?.success && networkRes.users?.length > 0) {
            usersData = networkRes.users.map(u => ({
              id: u.user_id,
              first_name: u.name?.split(' ')[0] || '',
              last_name: u.name?.split(' ').slice(1).join(' ') || '',
              email: u.email,
              role: u.role,
              is_online: u.is_online,
              last_seen: u.last_seen,
              device_name: u.device_name
            }));
            // Update online users state for presence display
            setOnlineUsers(usersData.filter(u => u.is_online).map(u => String(u.id)));
          } else {
            throw new Error('No network users');
          }
        } catch {
          // Fallback to local presence
          const res = await electronAPI.getUsersWithPresence();
          if (res?.success) {
            usersData = res.users;
          }
        }

        const others = usersData.filter(u => String(u.id) !== String(currentUser.id));
        setAvailableUsers(others);

        const pendingChatUserId = sessionStorage.getItem('pendingChatUserId');
        if (pendingChatUserId) {
          const matched = others.find(u => String(u.id) === String(pendingChatUserId));
          if (matched) {
            setOtherUser(matched);
          }
          sessionStorage.removeItem('pendingChatUserId');
        }

        // calculate unread count per user
        const counts = {};
        for (const u of others) {
          const msgRes = await electronAPI.getMessages({
            userId: currentUser.id,
            otherUserId: u.id,
            limit: 50,
            offset: 0,
          });
          if (msgRes.success) {
            const unread = msgRes.messages.filter(
              m => m.receiver_id === currentUser.id && m.status !== 'read'
            ).length;
            if (unread > 0) counts[u.id] = unread;
          }
        }
        setUnreadCounts(counts);
      } catch (e) {
        
      }
    };
    load();

    // Refresh presence periodically
    const presenceInterval = setInterval(load, 10000);

    // Set user offline on unmount
    return () => {
      clearInterval(presenceInterval);
      if (electronAPI && currentUser?.id) {
        electronAPI.setUserOffline(currentUser.id);
      }
    };
  }, [currentUser?.id]);

  // Presence update listener
  useEffect(() => {
    if (!electronAPI) return;
    const off = electronAPI.onIpcEvent('presence:update', data => {
      if (data?.online_users) {
        setOnlineUsers(data.online_users.map(String));
      }
    });
    return () => off && off();
  }, []);

  // Real-time messages
  useEffect(() => {
    if (!electronAPI || !currentUser) return;

    const handler = (msg) => {
      // Only process if it's for this chat
      const inThisChat =
        (msg.sender_id === currentUser.id && msg.receiver_id === otherUser?.id) ||
        (msg.sender_id === otherUser?.id && msg.receiver_id === currentUser.id);

      if (!inThisChat) {
        // For other chats → only update unread count
        if (msg.receiver_id === currentUser.id && msg.status !== 'read') {
          setUnreadCounts(p => ({ ...p, [msg.sender_id]: (p[msg.sender_id] || 0) + 1 }));
        }
        return;
      }

      // Prevent duplicate: check if message ID already exists
      setMessages(prev => {
        if (prev.some(existing => existing.id === msg.id)) {
          logger.debug('Duplicate message prevented', { msgId: msg.id });
          return prev;
        }
        return [...prev, msg];
      });

      // Mark as read if it's for us
      if (msg.receiver_id === currentUser.id && msg.status !== 'read') {
        electronAPI.markMessageRead({ messageId: msg.id, userId: currentUser.id });
      }
    };

    const off = electronAPI.onIpcEvent('new-message', handler);
    return () => off && off();
  }, [currentUser?.id, otherUser?.id, electronAPI]);

  // Load messages when chat selected
  const loadMessages = useCallback(async () => {
    if (!otherUser) {
      setMessages([]);
      return;
    }
    try {
      logger.debug('Loading messages' {
        currentUserId: currentUser.id,
        otherUserId: otherUser.id
      });

      const res = await electronAPI.getMessages({
        userId: currentUser.id,
        otherUserId: otherUser.id,
        limit: 500,
        offset: 0,
      });

      logger.debug('Messages loaded', { success: res?.success });

      if (res.success) {
        setMessages(res.messages);
        setUnreadCounts(p => ({ ...p, [otherUser.id]: 0 }));
        // Mark all messages as read
        try {
          await electronAPI.markAllAsRead(currentUser.id, otherUser.id);
        } catch (error) {
          logger.warn('Failed to mark messages as read', { error: error?.message });
        }
      } else {
        
      }
    } catch (e) {
      
    }
  }, [currentUser?.id, otherUser?.id]);

  useEffect(() => { loadMessages(); }, [otherUser, loadMessages]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // State for search, modal, delete, etc.
  const [search, setSearch] = useState('');
  const [modalContent, setModalContent] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [activeMenu, setActiveMenu] = useState(null);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState('');
  const [clientReplies, setClientReplies] = useState({});
  const [sendingMessage, setSendingMessage] = useState(false);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setActiveMenu(null);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!chatEndRef.current) return;

    // Only auto-scroll if user was already at bottom (or it's the first load)
    const container = messagesContainerRef.current;
    const isAtBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight < 100; // 100px tolerance

    if (isAtBottom || messages.length <= 1) { // also scroll on very first message
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Close modal on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        setModalContent(null);
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  // Handle file upload
  const handleFileChange = (e, isImage = false) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (isImage && selectedFile.type.startsWith('image/')) {
        // Auto-send images immediately
        if (!electronAPI) return;
        setSendingMessage(true);
        const reader = new FileReader();
        reader.onload = async (ev) => {
          const attachment = {
            name: selectedFile.name,
            type: selectedFile.type,
            data: ev.target.result
          };
          try {
            const attachmentData = JSON.stringify(attachment);
            await electronAPI.sendMessage(currentUser.id, otherUser.id, 'Image', attachmentData);
            // Don't manually add to state - let the real-time handler do it
          } catch (err) {
            
          } finally {
            setSendingMessage(false);
          }
        };
        reader.readAsDataURL(selectedFile);
      } else {
        setFile(selectedFile);
      }
    }
    // Reset the input value so the same file can be selected again
    e.target.value = '';
  };

  // Send message (with optional file)
  const handleSend = async (e) => {
    e.preventDefault();
    if ((!input.trim() && !file) || !electronAPI) return;

    setSendingMessage(true);
    if (file) {
      // Read file as base64
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const attachment = {
          name: file.name,
          type: file.type,
          data: ev.target.result
        };
        logger.debug('File attachment created', { name: attachment?.name, type: attachment?.type });
        await sendMessage(attachment);
        setFile(null);
        setInput('');
        setSendingMessage(false);
      };
      reader.readAsDataURL(file);
    } else {
      await sendMessage();
      setInput('');
      setSendingMessage(false);
    }
  };

  const sendMessage = async (attachment = null) => {
    try {
      const attachmentData = attachment ? JSON.stringify(attachment) : null;
      const messageText = input.trim() || (attachment ? 'File attachment' : '');
      const replyToId = replyTo ? replyTo.id : null;

      const res = await electronAPI.sendMessage(
        currentUser.id,
        otherUser.id,
        messageText,
        attachmentData,
        replyToId
      );

      if (res && res.success) {
        setReplyTo(null);
        setInput('');
        // console.log('Message sent — waiting for real-time broadcast');
      }
    } catch (err) {
      
    }
  };
  // Fetch messages with optional search
  const fetchMessages = useCallback(async (searchTerm = '') => {
    if (!otherUser) return;
    setLoading(true);
    try {
      const res = await electronAPI.getMessages({
        userId: currentUser.id,
        otherUserId: otherUser.id,
        limit: 500,
        offset: 0,
        search: searchTerm,
      });
      if (res.success) {
        setMessages(res.messages);
      }
    } catch (e) {
      
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id, otherUser?.id]);

  // Search messages
  const handleSearch = async (e) => {
    e.preventDefault();
    await fetchMessages(search);
  };

  // Delete message
  const handleDelete = async (id) => {
    if (!electronAPI) return;
    try {
      const res = await electronAPI.deleteMessage(id);
      if (res.success) {
        setMessages(msgs => msgs.filter(m => m.id !== id));
        setDeleteConfirm(null);
      }
    } catch (e) {
      
    }
  };

  return (
    <div className="flex h-[calc(100vh-140px)] gap-6 animate-premium-fade">
      {/* User List Sidebar */}
      <div className="w-80 card-premium flex flex-col overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">Clinical Staff</h3>
          <p className="text-xs text-slate-500 font-medium mt-1">Direct secure messaging</p>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {availableUsers.map(user => {
            const userName = user.name || `${user.first_name || ''} ${user.last_name || ''} `.trim() || 'Staff';
            const isOnline = user.is_online;
            const unreadCount = unreadCounts[user.id] || 0;
            const isSelected = otherUser?.id === user.id;

            return (
              <button
                key={user.id}
                onClick={() => {
                  setOtherUser(user);
                  sessionStorage.removeItem('pendingChatUserId');
                }}
                className={`w-full text-left p-4 rounded-2xl flex items-center gap-4 transition-all ${isSelected
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-none'
                  : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-300'
                  }`}
              >
                <div className="relative">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-black text-xs ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                    }`}>
                    {userName.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 ${isSelected ? 'border-indigo-600' : 'border-white dark:border-slate-900'
                    } ${isOnline ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold truncate">{userName}</span>
                    {unreadCount > 0 && (
                      <span className="w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center">
                        {unreadCount}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <p className={`text-[10px] font-black uppercase tracking-widest opacity-70`}>{user.role}</p>
                    {user.device_name && (
                      <span className="text-[8px] text-blue-400 dark:text-blue-300 truncate max-w-[60px]">({user.device_name})</span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 card-premium flex flex-col overflow-hidden relative">
        {!otherUser ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
            <div className="w-24 h-24 rounded-[2rem] bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-500 mb-6">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
            </div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Staff Communications</h3>
            <p className="text-sm text-slate-500 font-medium mt-2 max-w-sm">Select a clinical colleague from the roster to begin a secure real-time consult.</p>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900/50 backdrop-blur-md z-10 sticky top-0">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 font-black text-sm">
                    {otherUserName.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white dark:border-slate-900 ${otherUser?.is_online ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">{otherUserName}</h3>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className={`text-[10px] font-black uppercase tracking-widest ${otherUser?.is_online ? 'text-emerald-500' : 'text-slate-400'}`}>
                      {otherUser?.is_online ? 'Active Now' : 'Disconnected'}
                    </span>
                    <span className="text-slate-200">|</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{otherUser?.role}</span>
                    {otherUser?.device_name && (
                      <>
                        <span className="text-slate-200">|</span>
                        <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">{otherUser.device_name}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <form onSubmit={handleSearch} className="relative hidden md:block">
                <input
                  type="text"
                  placeholder="Find in consult..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="input-premium py-2 px-10 text-xs w-48 focus:w-64 transition-all"
                />
                <svg className="w-3.5 h-3.5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </form>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-8 space-y-6" ref={messagesContainerRef}>
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center opacity-40">
                  <svg className="w-12 h-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" /></svg>
                  <p className="text-sm font-bold tracking-widest uppercase">Encryption established</p>
                  <p className="text-xs mt-1">Start your clinical consultation with {otherUserName}</p>
                </div>
              ) : (
                messages.map((msg, index) => {
                  const isMe = msg.sender_id === currentUser.id;
                  return (
                    <div key={`${msg.id}-${index}`} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-md w-full flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                        <div className={`p-4 rounded-[1.5rem] shadow-sm text-sm relative group max-w-md w-full ${isMe
                          ? 'bg-indigo-600 text-white rounded-tr-none'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-tl-none'
                          }`}>
                          {/* Reply Context */}
                          {(() => {
                            const replyId = msg.reply_to_id || clientReplies[msg.id];
                            const refMsg = messages.find(m => m.id === replyId);
                            if (refMsg) {
                              return (
                                <div className={`mb-3 p-2 rounded-xl border-l-4 text-[10px] ${isMe ? 'bg-indigo-700/50 border-white/40' : 'bg-slate-200/50 dark:bg-slate-700 border-slate-300'
                                  }`}>
                                  <div className="font-black uppercase tracking-widest opacity-60 mb-1">REFERENCE</div>
                                  <div className="truncate font-medium">{refMsg.message_text || 'Asset Attachment'}</div>
                                </div>
                              );
                            }
                            return null;
                          })()}

                          {msg.message_text && msg.message_text !== 'File attachment' && (
                            <p className="leading-relaxed font-medium pr-8 break-words overflow-wrap-anywhere">{msg.message_text}</p>
                          )}

                          {msg.attachment && (
                            <div className="mt-3">
                              {(() => {
                                try {
                                  const att = typeof msg.attachment === 'string' ? JSON.parse(msg.attachment) : msg.attachment;
                                  if (att.type?.startsWith('image/')) {
                                    return (
                                      <img
                                        src={att.data}
                                        alt={att.name}
                                        className="max-w-64 rounded-2xl cursor-pointer ring-1 ring-white/20 shadow-lg hover:scale-[1.02] transition-transform"
                                        onClick={() => setModalContent({ type: 'image', data: att.data, name: att.name })}
                                      />
                                    );
                                  }
                                  return (
                                    <button
                                      onClick={() => setModalContent({ type: 'file', data: att.data, name: att.name })}
                                      className={`flex items-center gap-3 p-3 rounded-xl ${isMe ? 'bg-white/10' : 'bg-slate-200 dark:bg-slate-700'}`}
                                    >
                                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                      <div className="text-left">
                                        <p className="text-xs font-bold truncate max-w-[150px]">{att.name}</p>
                                        <p className="text-[10px] opacity-60">Asset Transfer</p>
                                      </div>
                                    </button>
                                  );
                                } catch (e) { return null; }
                              })()}
                            </div>
                          )}

                          {/* Message Actions (3-dot menu - positioned at top right, always accessible) */}
                          <div className={`absolute top-2 ${isMe ? 'right-2' : 'right-2'} opacity-0 group-hover:opacity-100 transition-opacity`}>
                            <div className="relative">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMenu(activeMenu === msg.id ? null : msg.id);
                                }}
                                className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${isMe ? 'hover:bg-indigo-500 text-white/60 hover:text-white' : 'bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-400'}`}
                              >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                  <circle cx="12" cy="5" r="2" />
                                  <circle cx="12" cy="12" r="2" />
                                  <circle cx="12" cy="19" r="2" />
                                </svg>
                              </button>
                              {activeMenu === msg.id && (
                                <div className={`absolute ${isMe ? 'right-0' : 'right-0'} top-8 z-50 py-1 min-w-[140px] rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 ${isMe ? 'bg-indigo-600' : 'bg-white dark:bg-slate-800'}`}>
                                  <button
                                    onClick={() => {
                                      setReplyTo(msg);
                                      setActiveMenu(null);
                                    }}
                                    className={`w-full px-4 py-2 text-xs font-medium text-left flex items-center gap-2 hover:opacity-80 transition-opacity ${isMe ? 'text-white' : 'text-slate-700 dark:text-slate-200'}`}
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                                    Reply
                                  </button>
                                  {isMe && (
                                    <button
                                      onClick={() => {
                                        setDeleteConfirm(msg);
                                        setActiveMenu(null);
                                      }}
                                      className={`w-full px-4 py-2 text-xs font-medium text-left flex items-center gap-2 hover:opacity-80 transition-opacity ${isMe ? 'text-white' : 'text-rose-600'}`}
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                      Delete
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="mt-1 flex items-center gap-2 px-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                            {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                          </span>
                          {isMe && (
                            <span className={msg.status === 'read' ? 'text-indigo-400' : 'text-slate-300'}>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}

              {/* Sending Indicator */}
              {sendingMessage && (
                <div className="flex justify-end animate-premium-fade">
                  <div className="max-w-[80%] flex flex-col items-end">
                    <div className="p-4 rounded-[1.5rem] bg-indigo-600/50 text-white rounded-tr-none shadow-sm flex items-center gap-3">
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                      <span className="text-xs font-medium ml-2">Sending...</span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Input Overlay Zone */}
            <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 backdrop-blur-sm">
              <div className="max-w-4xl mx-auto space-y-4">
                {replyTo && (
                  <div className="flex items-center justify-between p-3 bg-indigo-50 dark:bg-indigo-900/40 border border-indigo-100 dark:border-indigo-800 rounded-2xl animate-premium-fade">
                    <div className="flex items-center gap-3">
                      <div className="w-1.5 h-8 rounded-full bg-indigo-500"></div>
                      <div>
                        <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest leading-none mb-1">Replying To Context</p>
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate max-w-sm">{replyTo.message_text || 'Asset Attachment'}</p>
                      </div>
                    </div>
                    <button onClick={() => setReplyTo(null)} className="w-8 h-8 rounded-xl hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 transition-colors">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                )}

                {file && (
                  <div className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-900/40 border border-amber-100 dark:border-amber-800 rounded-2xl animate-premium-fade">
                    <div className="flex items-center gap-3">
                      <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                      <div>
                        <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest leading-none mb-1">Staged Attachment</p>
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{file.name}</p>
                      </div>
                    </div>
                    <button onClick={() => setFile(null)} className="w-8 h-8 rounded-xl hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center text-rose-500 transition-colors">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                )}

                <form onSubmit={handleSend} className="relative flex items-center gap-3">
                  <div className="relative flex-1 group">
                    <input
                      type="text"
                      className="w-full input-premium py-4 pl-6 pr-32 text-sm font-medium h-[60px]"
                      placeholder={replyTo ? "Confirm consult reply..." : "Draft clinical message..."}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                      <input type="file" className="hidden" id="chat-file-upload" onChange={(e) => handleFileChange(e, false)} />
                      <input type="file" className="hidden" id="chat-image-upload" accept="image/*" onChange={(e) => handleFileChange(e, true)} />

                      <button type="button" onClick={() => document.getElementById('chat-image-upload').click()} className="w-10 h-10 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-indigo-600 transition-all" title="Capture/Upload Image">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                      </button>
                      <button type="button" onClick={() => document.getElementById('chat-file-upload').click()} className="w-10 h-10 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-indigo-600 transition-all" title="Attach Document/Data">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                      </button>
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={(!input.trim() && !file) || loading}
                    className="w-[60px] h-[60px] rounded-[1.75rem] bg-indigo-600 dark:bg-indigo-500 text-white shadow-lg shadow-indigo-200 dark:shadow-none hover:scale-105 active:scale-95 disabled:opacity-50 disabled:grayscale transition-all flex items-center justify-center"
                  >
                    <svg className="w-6 h-6 rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                  </button>
                </form>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Asset Preview Modal */}
      {modalContent && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl z-[200] flex items-center justify-center p-8 animate-premium-fade" onClick={() => setModalContent(null)}>
          <div className="max-w-6xl w-full h-[90vh] flex flex-col animate-premium-slide" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6 text-white px-2">
              <div>
                <h3 className="text-xl font-black tracking-tight">{modalContent.name}</h3>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-400">Verified Clinical Asset</p>
              </div>
              <button onClick={() => setModalContent(null)} className="w-12 h-12 rounded-2xl bg-white/10 hover:bg-white/20 flex items-center justify-center shadow-xl transition-all hover:scale-110 active:scale-90">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="flex-1 bg-white dark:bg-slate-900 rounded-[2.5rem] overflow-hidden shadow-2xl flex items-center justify-center border border-white/10 relative">
              {modalContent.type === 'image' ? (
                <img src={modalContent.data} className="max-w-full max-h-full object-contain p-4" alt={modalContent.name} />
              ) : (
                <iframe src={modalContent.data} className="w-full h-full border-none" title={modalContent.name} />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Disposal Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-premium-fade" onClick={() => setDeleteConfirm(null)}>
          <div className="card-premium bg-white dark:bg-slate-900 p-8 max-w-sm w-full shadow-2xl animate-premium-slide" onClick={e => e.stopPropagation()}>
            <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-900/10 text-rose-600 flex items-center justify-center mb-6 font-black scale-110">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">Dispose Consultation?</h3>
            <p className="text-sm text-slate-500 font-medium mt-3 leading-relaxed">This action will permanently purge the selected message from the clinical record logs. This cannot be reversed.</p>
            <div className="flex gap-3 mt-10">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl text-xs font-black tracking-widest uppercase hover:bg-slate-200 transition-all">Keep Record</button>
              <button onClick={() => handleDelete(deleteConfirm.id)} className="flex-1 py-3 bg-rose-500 text-white rounded-xl text-xs font-black tracking-widest uppercase shadow-lg shadow-rose-200 dark:shadow-none hover:bg-rose-600 transition-all active:scale-95">Purge Log</button>
            </div>
          </div>
        </div>
      )}
    </div>

  );
};

export default MessagesContent;
