const electronAPI = window.electronAPI;

export const getMessages = async (filters = {}) => {
    try {
        if (electronAPI?.invoke) {
            // Use invoke for standardized IPC calls
            const res = await electronAPI.invoke('chat:getMessages', filters);
            return res?.success ? res.messages : [];
        }
        console.warn('Electron API not available');
        return [];
    } catch (err) {
        console.error('getMessages error:', err);
        return [];
    }
};

export const sendMessage = async (messageData) => {
    try {
        if (electronAPI?.invoke) {
            const { text, senderId, receiverId, attachment, replyToId } = messageData;
            // Default receiver to 'assistant' or 'admin' if not specified for now, 
            // but ideally the UI provides this.
            // For the AssistantChatScreen, receiver is likely the "Doctor" or vice-versa.
            // We'll assume a broadcast or fixed receiver for the simple chat unless specified.

            const targetReceiver = receiverId || 'all_assistants'; // Backend logic handles routing or broadcast

            const res = await electronAPI.invoke('chat:sendMessage',
                senderId,
                targetReceiver,
                text,
                attachment,
                replyToId
            );

            if (!res?.success) throw new Error(res?.error || 'Failed to send message');
            return res.message;
        }
        throw new Error('Electron API not available');
    } catch (err) {
        console.error('sendMessage error:', err);
        throw err;
    }
};

export const markAsRead = async (messageId, userId) => {
    try {
        if (electronAPI?.invoke) {
            return await electronAPI.invoke('chat:markMessageRead', { messageId, userId });
        }
    } catch (err) {
        console.error('markAsRead error:', err);
    }
}
