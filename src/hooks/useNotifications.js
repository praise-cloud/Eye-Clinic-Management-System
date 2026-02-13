import { useState, useCallback, useEffect } from 'react';

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
            const result = await window.electronAPI.getNotifications(userId);
            if (result.success) {
                setNotifications(result.notifications);
                setUnreadCount(result.notifications.filter(n => n.status === 'unread').length);
            } else {
                setError(result.error);
            }
        } catch (err) {
            console.error('Error fetching notifications:', err);
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
            console.error('Error marking notification as read:', err);
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
            console.error('Error marking all notifications as read:', err);
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
