import React, { useState, useRef, useEffect, useCallback } from 'react';
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
        const res = await electronAPI.getAllUsers();
        if (res?.success) {
          const others = res.users.filter(u => u.id !== currentUser.id);
          setAvailableUsers(others);

          // calculate unread count per user (using existing IPC methods only)
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
        }
      } catch (e) {
        console.error(e);
      }
    };
    load();
  }, [currentUser?.id]);

  // Presence
  useEffect(() => {
    if (!electronAPI) return;
    const off = electronAPI.onIpcEvent('presence-update', ids => {
      setOnlineUsers(ids.map(String));
    });
    return () => off && off();
  }, []);

  // Real-time messages
  useEffect(() => {
    if (!electronAPI || !currentUser) return;

    const handler = msg => {
      const inThisChat =
        (msg.sender_id === currentUser.id && msg.receiver_id === otherUser?.id) ||
        (msg.sender_id === otherUser?.id && msg.receiver_id === currentUser.id);

      if (inThisChat) {
        setMessages(prev => (prev.some(m => m.id === msg.id) ? prev : [...prev, msg]));
        if (msg.receiver_id === currentUser.id && msg.status !== 'read') {
          electronAPI.markMessageRead({ messageId: msg.id, userId: currentUser.id });
        }
      } else if (msg.receiver_id === currentUser.id) {
        setUnreadCounts(p => ({ ...p, [msg.sender_id]: (p[msg.sender_id] || 0) + 1 }));
      }
    };

    const off = electronAPI.onIpcEvent('new-message', handler);
    return () => off && off();
  }, [currentUser?.id, otherUser?.id]);

  // Load messages when chat selected
  const loadMessages = useCallback(async () => {
    if (!otherUser) {
      setMessages([]);
      return;
    }
    try {
      const res = await electronAPI.getMessages({
        userId: currentUser.id,
        otherUserId: otherUser.id,
        limit: 500,
        offset: 0,
      });
      if (res.success) {
        setMessages(res.messages.reverse());
        setUnreadCounts(p => ({ ...p, [otherUser.id]: 0 }));
        await electronAPI.markAllAsRead?.(currentUser.id, otherUser.id);
      }
    } catch (e) {
      console.error(e);
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

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setActiveMenu(null);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

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
        const reader = new FileReader();
        reader.onload = async (ev) => {
          const attachment = {
            name: selectedFile.name,
            type: selectedFile.type,
            data: ev.target.result
          };
          try {
            const attachmentData = JSON.stringify(attachment);
            const res = await electronAPI.sendMessage(currentUser.id, otherUser.id, 'Image', attachmentData);
            if (res.success) {
              setMessages((msgs) => [...msgs, res.message]);
            }
          } catch (err) {
            console.error('Send image error:', err);
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

    if (file) {
      // Read file as base64
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const attachment = {
          name: file.name,
          type: file.type,
          data: ev.target.result
        };
        console.log('File attachment created:', attachment);
        await sendMessage(attachment);
        setFile(null);
        setInput('');
      };
      reader.readAsDataURL(file);
    } else {
      await sendMessage();
      setInput('');
    }
  };

  const sendMessage = async (attachment = null) => {
    try {
      const attachmentData = attachment ? JSON.stringify(attachment) : null;
      const messageText = input.trim() || (attachment ? 'File attachment' : '');
      const replyToId = replyTo ? replyTo.id : null;

      console.log('Sending message with replyToId:', replyToId);

      // Try with replyToId first, fallback without it if backend doesn't support it
      let res;
      try {
        res = await electronAPI.sendMessage(currentUser.id, otherUser.id, messageText, attachmentData, replyToId);
      } catch (replyError) {
        console.warn('Backend may not support replyToId, sending without it:', replyError);
        res = await electronAPI.sendMessage(currentUser.id, otherUser.id, messageText, attachmentData);
      }

      if (res.success) {
        // Store reply reference client-side until backend supports it
        if (replyToId) {
          setClientReplies(prev => ({
            ...prev,
            [res.message.id]: replyToId
          }));
        }
        setMessages((msgs) => [...msgs, res.message]);
        setReplyTo(null);
      }
    } catch (err) {
      console.error('Send message error:', err);
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
        setMessages(res.messages.reverse());
      }
    } catch (e) {
      console.error(e);
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
      console.error('Delete error:', e);
    }
  };

  return (
    <div className="flex flex-col h-full p-6">
      <div className="flex flex-col">
      <form onSubmit={handleSearch} className="flex items-center gap-2 mb-2">
        <input
          type="text"
          className="flex-1 border rounded px-3 py-2 focus:outline-none focus:ring focus:border-blue-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
          placeholder="Search messages..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button
          type="submit"
          className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300 transition dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500"
        >
          Search
        </button>
      </form>
        <div className="flex items-center gap-6 p-6 bg-white rounded-lg shadow mb-5 w-full dark:bg-gray-800">
          {/* Doctor avatar and status */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-700 font-bold text-lg">
                {currentUser?.name ? currentUser.name.split(' ').map(n => n[0]).join('') : 'U'}
              </span>
              <span className="absolute bottom-0 right-0 block h-3 w-3 rounded-full ring-2 ring-white bg-green-400" title="Online"></span>
            </div>
            <div className="flex flex-col">
              <span className="font-medium text-gray-900 dark:text-gray-100">{currentUser?.name || 'User'}</span>
              <span className="text-xs text-green-500">Online</span>
            </div>
          </div>
          <span className="text-gray-300 text-2xl dark:text-gray-600">|</span>
          {/* Assistant avatar and status */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-pink-100 text-pink-700 font-bold text-lg">
                {otherUser?.name ? otherUser.name.split(' ').map(n => n[0]).join('') : 'S'}
              </span>
              <span className="absolute bottom-0 right-0 block h-3 w-3 rounded-full ring-2 ring-white bg-green-400" title="Online"></span>
            </div>
            <div className="flex flex-col">
              <span className="font-medium text-gray-900 dark:text-gray-100">{otherUser?.name || 'Staff'}</span>
              <span className="text-xs text-green-500">Online</span>
            </div>
          </div>
          <div className="flex-1 flex justify-center">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Doctor & Assistant Chat</h2>
          </div>
        </div>
      </div>
      {/* Search bar */}
      <div className="flex-1 overflow-y-auto mb-4 px-2">
        {notification && (
          <div className="text-center text-green-600 font-semibold mb-2">{notification}</div>
        )}
        {loading ? (
          <div className="text-center text-gray-400 dark:text-gray-500">Loading messages...</div>
        ) : messages.length === 0 ? (
          <div className="text-center text-gray-400 dark:text-gray-500">No messages yet.</div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex mb-2 ${msg.sender_id === currentUser.id ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs px-4 py-2 rounded-lg shadow text-sm relative ${
                  msg.sender_id === currentUser.id
                    ? 'bg-blue-600 text-white dark:bg-blue-500'
                    : 'bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-gray-100'
                }`}
              >
                <span className="block font-bold mb-1">
                  {msg.sender_id === currentUser.id ? (currentUser?.name || 'Me') : (otherUser?.name || 'Staff')}
                </span>
                {(() => {
                  // Check backend reply field or client-side tracking
                  const replyId = msg.reply_to_id || msg.replyToId || clientReplies[msg.id];
                  if (replyId) {
                    const referencedMsg = messages.find(m => m.id === replyId);
                    if (referencedMsg) {
                      return (
                        <div className={`mb-2 p-2 rounded border-l-2 text-xs ${
                          msg.sender_id === currentUser.id
                            ? 'bg-blue-500 border-blue-300 text-blue-100 dark:bg-blue-600 dark:border-blue-400'
                            : 'bg-gray-200 border-gray-400 text-gray-600 dark:bg-gray-600 dark:border-gray-500 dark:text-gray-300'
                        }`}>
                          <div className="font-medium">
                            Replying to {referencedMsg.sender_id === currentUser.id ? (currentUser?.name || 'Me') : (otherUser?.name || 'Staff')}
                          </div>
                          <div className="truncate">
                            {referencedMsg.message_text || 'File attachment'}
                          </div>
                        </div>
                      );
                    }
                  }
                  return null;
                })()}
                {msg.message_text && msg.message_text !== 'File attachment' && (
                  <span>{msg.message_text}</span>
                )}
                {msg.attachment && (
                  <div className="mt-2">
                    {(() => {
                      try {
                        const attachment = typeof msg.attachment === 'string' ? JSON.parse(msg.attachment) : msg.attachment;
                        const isImage = attachment.type && attachment.type.startsWith('image/');

                        if (isImage) {
                          return (
                            <div>
                              <img
                                src={attachment.data}
                                alt={attachment.name}
                                className="max-w-48 max-h-32 rounded cursor-pointer hover:opacity-80"
                                onClick={() => setModalContent({type: 'image', data: attachment.data, name: attachment.name})}
                              />
                              <div className="text-xs text-blue-300 mt-1 dark:text-blue-200">
                                🖼️ {attachment.name}
                              </div>
                            </div>
                          );
                        } else {
                          return (
                            <div
                              className="text-xs text-blue-300 bg-blue-900 p-2 rounded cursor-pointer hover:bg-blue-800 inline-block dark:bg-blue-800 dark:hover:bg-blue-700"
                              onClick={() => setModalContent({type: 'file', data: attachment.data, name: attachment.name})}
                            >
                              📄 {attachment.name}
                            </div>
                          );
                        }
                      } catch (e) {
                        return (
                          <div className="text-xs text-blue-300 bg-blue-900 p-1 rounded dark:bg-blue-800">
                            📎 File (error)
                          </div>
                        );
                      }
                    })()}
                  </div>
                )}
                <span className="block text-xs text-right mt-1 opacity-70">
                  {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                  {msg.sender_id === currentUser.id && (
                    <span className="ml-2">
                      {msg.status === 'read' ? (
                        <span className="text-white">✓✓</span>
                      ) : (
                        <span className="text-gray-300">✓</span>
                      )}
                    </span>
                  )}
                  {msg.status === 'unread' && msg.receiver_id === currentUser.id && (
                    <span className="ml-2 text-red-500">● Unread</span>
                  )}
                </span>
                {/* Options menu for all messages */}
                <div className="absolute top-1 right-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveMenu(activeMenu === msg.id ? null : msg.id);
                    }}
                    className={`text-xs p-1 ${
                      msg.sender_id === currentUser.id
                        ? 'text-white hover:text-gray-300 dark:hover:text-gray-400'
                        : 'text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
                    }`}
                    title="Message options"
                  >
                    ⋯
                  </button>
                  {activeMenu === msg.id && (
                    <div className="absolute right-0 top-6 bg-white border rounded shadow-lg py-1 z-10 dark:bg-gray-800 dark:border-gray-600">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setReplyTo(msg);
                          setActiveMenu(null);
                        }}
                        className="block w-full text-left px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-gray-700"
                      >
                        Reply
                      </button>
                      {msg.sender_id === currentUser.id && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirm(msg);
                            setActiveMenu(null);
                          }}
                          className="block w-full text-left px-3 py-1 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-gray-700"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={chatEndRef} />
      </div>
      {replyTo && (
        <div className="mb-2 p-2 bg-yellow-50 border border-yellow-200 rounded dark:bg-yellow-900 dark:border-yellow-700">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-yellow-700 font-medium dark:text-yellow-300">Replying to {replyTo.sender_id === currentUser.id ? (currentUser?.name || 'Me') : (otherUser?.name || 'Staff')}</span>
            <button onClick={() => setReplyTo(null)} className="text-yellow-600 hover:text-yellow-800 text-sm dark:text-yellow-400 dark:hover:text-yellow-200">✕</button>
          </div>
          <div className="text-sm text-gray-600 truncate dark:text-gray-300">{replyTo.message_text || 'File attachment'}</div>
        </div>
      )}
      {file && (
        <div className="mb-2 p-2 bg-blue-50 border border-blue-200 rounded flex items-center justify-between dark:bg-blue-900 dark:border-blue-700">
          <span className="text-sm text-blue-700 dark:text-blue-300">📎 {file.name}</span>
          <button
            onClick={() => setFile(null)}
            className="text-red-500 hover:text-red-700 text-sm dark:text-red-400 dark:hover:text-red-300"
          >
            ✕
          </button>
        </div>
      )}
      <form onSubmit={handleSend} className="flex items-center gap-2">
        <input
          type="text"
          className="flex-1 border rounded px-3 py-2 focus:outline-none focus:ring focus:border-blue-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
          placeholder={replyTo ? "Reply to message..." : file ? "Add a message (optional)..." : "Type your message..."}
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <input
          type="file"
          className="hidden"
          id="chat-file-upload"
          onChange={(e) => handleFileChange(e, false)}
        />
        <input
          type="file"
          className="hidden"
          id="chat-image-upload"
          accept="image/*"
          onChange={(e) => handleFileChange(e, true)}
        />
        <ChatInputActions
          onFileSelect={() => document.getElementById('chat-file-upload').click()}
          onImageSelect={() => document.getElementById('chat-image-upload').click()}
          onSend={handleSend}
          disabled={!input.trim() && !file}
        />
      </form>
      {modalContent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setModalContent(null)}>
          <div className="bg-white rounded-lg p-6 w-[90vw] h-[90vh] flex flex-col resize overflow-hidden dark:bg-gray-800" onClick={(e) => e.stopPropagation()} style={{minWidth: '600px', minHeight: '400px'}}>
            <div className="flex justify-between items-center mb-4 flex-shrink-0">
              <h3 className="text-xl font-semibold truncate dark:text-gray-100">{modalContent.name}</h3>
              <button onClick={() => setModalContent(null)} className="text-gray-500 hover:text-gray-700 text-2xl ml-4 dark:text-gray-400 dark:hover:text-gray-200">✕</button>
            </div>
            <div className="flex-1 flex items-center justify-center" style={{minHeight: '300px'}}>
              {modalContent.type === 'image' ? (
                <img
                  src={modalContent.data}
                  alt={modalContent.name}
                  className="max-w-full max-h-full object-contain"
                  onError={(e) => console.error('Image load error:', e)}
                  onLoad={() => console.log('Image loaded successfully')}
                />
              ) : (
                <iframe src={modalContent.data} className="w-full h-full border-0" title={modalContent.name} />
              )}
            </div>
          </div>
        </div>
      )}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4 dark:bg-gray-800" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4 dark:text-gray-100">Delete Message</h3>
            <p className="text-gray-600 mb-6 dark:text-gray-300">Are you sure you want to delete this message? This action cannot be undone.</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm.id)}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessagesContent;
