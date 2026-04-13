import { useState, useCallback, useEffect } from 'react';
import * as messageService from '../services/messageService';

export default function useMessages() {
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchMessages = useCallback(async (filters = {}) => {
        setLoading(true);
        setError(null);
        try {
            const data = await messageService.getMessages(filters);
            setMessages(data);
        } catch (err) {
            console.error('Error fetching messages:', err);
            setError(err);
        } finally {
            setLoading(false);
        }
    }, []);

    const sendMessage = useCallback(async (messageData) => {
        setLoading(true);
        setError(null);
        try {
            const newMessage = await messageService.sendMessage(messageData);
            if (newMessage) setMessages(prev => [...prev, newMessage]);
            return newMessage;
        } catch (err) {
            setError(err);
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const handler = (e) => {
            const data = e.detail;
            if (data && (data.table === 'chat' || data.table === 'messages')) {
                fetchMessages();
            }
        };
        window.addEventListener('server:dataUpdate', handler);
        return () => window.removeEventListener('server:dataUpdate', handler);
    }, [fetchMessages]);

    return {
        messages,
        loading,
        error,
        fetchMessages,
        sendMessage,
        setMessages
    };
}
