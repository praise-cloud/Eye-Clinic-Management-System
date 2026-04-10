// src/services/messageService.js
// Abstracts all internal messaging logic via window.electronAPI

const getServerUrl = () => localStorage.getItem('serverUrl');
const isServerMode = () => !!getServerUrl();

const serverApiCall = async (endpoint, method = 'GET', body = null) => {
    const serverUrl = getServerUrl();
    if (!serverUrl) return { success: false, error: 'Not connected to server' };
    
    try {
        const options = { method, headers: { 'Content-Type': 'application/json' } };
        if (body) options.body = JSON.stringify(body);
        
        const response = await fetch(`${serverUrl}${endpoint}`, options);
        return await response.json();
    } catch (err) {
        return { success: false, error: err.message };
    }
};

const getApi = () => {
    if (!window.electronAPI) {
        console.error('Electron API not found in window');
        return null;
    }
    return window.electronAPI;
};

export const getMessages = async (filters = {}) => {
    if (isServerMode()) {
        const res = await serverApiCall('/api/chat', 'GET', filters);
        return res?.success ? res.messages : [];
    }
    const api = getApi();
    if (!api) return [];
    try {
        const res = await api.getMessages(filters);
        return res?.success ? res.messages : [];
    } catch (err) {
        console.error('getMessages error:', err);
        return [];
    }
};

export const sendMessage = async (messageData) => {
    if (isServerMode()) {
        const res = await serverApiCall('/api/chat', 'POST', messageData);
        if (!res?.success) throw new Error(res?.error || 'Failed to send message');
        return res.message;
    }
    const api = getApi();
    if (!api) throw new Error('Electron API not available');
    try {
        const { text, senderId, receiverId, attachment, replyToId } = messageData;
        const targetReceiver = receiverId || 'all_assistants';

        const res = await api.sendMessage(
            senderId,
            targetReceiver,
            text,
            attachment,
            replyToId
        );

        if (!res?.success) throw new Error(res?.error || 'Failed to send message');
        return res.message;
    } catch (err) {
        console.error('sendMessage error:', err);
        throw err;
    }
};

export const markAsRead = async (messageId, userId) => {
    const api = getApi();
    if (!api) return;
    try {
        return await api.markMessageRead({ messageId, userId });
    } catch (err) {
        console.error('markAsRead error:', err);
    }
};

export const markAllAsRead = async (userId, otherUserId) => {
    const api = getApi();
    if (!api) return;
    try {
        return await api.markAllAsRead(userId, otherUserId);
    } catch (err) {
        console.error('markAllAsRead error:', err);
    }
};

export const deleteMessage = async (messageId) => {
    const api = getApi();
    if (!api) return false;
    try {
        const res = await api.deleteMessage(messageId);
        return !!res?.success;
    } catch (err) {
        console.error('deleteMessage error:', err);
        return false;
    }
};
