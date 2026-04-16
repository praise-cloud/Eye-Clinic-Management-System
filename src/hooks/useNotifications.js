import { useState, useCallback, useEffect } from 'react';
import logger from '../utils/logger';

export default function useNotifications(userId) {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchNotifications = useCallback(async () => {
        if (!userId) return;
        setLoading(true);
        setError(null);
        try {
            const [systemResult, usersResult] = await Promise.all([
                window.electronAPI.getNotifications(userId),
                window.electronAPI.getUsersWithPresence?.() || Promise.resolve({ success: false, users: [] })
            ]);

            const systemNotifications = systemResult?.success ? (systemResult.notifications || []) : [];
            if (!systemResult?.success) {
                setError(systemResult?.error || null);
            }

            const users = usersResult?.success ? (usersResult.users || []) : [];
            const others = users.filter(u => u.id !== userId);

            const chatNotifications = [];
            for (const u of others) {
                try {
                    const msgRes = await window.electronAPI.getMessages({
                        userId,
                        otherUserId: u.id,
                        limit: 200,
                        offset: 0
                    });
                    if (!msgRes?.success) continue;

                    const unread = (msgRes.messages || []).filter(
                        m => m.receiver_id === userId && m.status !== 'read'
                    );
                    if (!unread.length) continue;

                    const latest = unread
                        .slice()
                        .sort((a, b) => new Date(b.timestamp || b.created_at || 0) - new Date(a.timestamp || a.created_at || 0))[0];

                    const senderName =
                        `${u.first_name || ''} ${u.last_name || ''}`.trim() ||
                        u.name ||
                        u.email ||
                        'Staff';

                    chatNotifications.push({
                        id: `chat-unread-${u.id}`,
                        status: 'unread',
                        type: 'chat_unread',
                        title: `Message from ${senderName}`,
                        message: latest?.message_text || `${unread.length} unread message(s)`,
                        created_at: latest?.timestamp || latest?.created_at || new Date().toISOString(),
                        related_id: u.id,
                        unread_messages: unread.length
                    });
                } catch (chatErr) {
                    logger.error('useNotifications: Error fetching chat unread notifications', { error: chatErr.message });
                }
            }

            const merged = [...systemNotifications, ...chatNotifications]
                .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

            setNotifications(merged);
            setUnreadCount(merged.filter(n => n.status === 'unread').length);
        } catch (err) {
            logger.error('useNotifications: Error fetching notifications', { error: err.message });
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    const markAsRead = useCallback(async (id) => {
        try {
            const result = await window.electronAPI.markNotificationRead(id);
            if (result.success) {
                setNotifications(prev => prev.map(n => n.id === id ? { ...n, status: 'read' } : n));
                setUnreadCount(prev => Math.max(0, prev - 1));
                return true;
            }
        } catch (err) {
            logger.error('useNotifications: Error marking notification as read', { error: err.message });
        }
        return false;
    }, []);

    const markAllAsRead = useCallback(async () => {
        if (!userId) return;
        try {
            const result = await window.electronAPI.markAllNotificationsRead(userId);
            if (result.success) {
                setNotifications(prev => prev.map(n => ({ ...n, status: 'read' })));
                setUnreadCount(0);
                return true;
            }
        } catch (err) {
            logger.error('useNotifications: Error marking all notifications as read', { error: err.message });
        }
        return false;
    }, [userId]);

    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    useEffect(() => {
        if (!window.electronAPI || !window.electronAPI.onNewNotification) return;

        const unsubscribe = window.electronAPI.onNewNotification((data) => {
            if (data.userId === userId) {
                fetchNotifications();
                // Browser notification or sound could be triggered here
            }
        });

        return unsubscribe;
    }, [userId, fetchNotifications]);

    useEffect(() => {
        if (!window.electronAPI?.onIpcEvent || !userId) return;
        const off = window.electronAPI.onIpcEvent('new-message', (msg) => {
            if (msg?.receiver_id === userId) {
                fetchNotifications();
            }
        });
        return () => off && off();
    }, [userId, fetchNotifications]);

    useEffect(() => {
        const handler = (e) => {
            fetchNotifications();
        };
        window.addEventListener('server:chatMessage', handler);
        window.addEventListener('server:dataUpdate', handler);
        return () => {
            window.removeEventListener('server:chatMessage', handler);
            window.removeEventListener('server:dataUpdate', handler);
        };
    }, [fetchNotifications]);

    return {
        notifications,
        unreadCount,
        loading,
        error,
        fetchNotifications,
        markAsRead,
        markAllAsRead
    };
}
