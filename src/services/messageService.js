const getServerUrl = () => localStorage.getItem('serverUrl');
const isServerMode = () => !!getServerUrl();
const getApi = () => window.electronAPI || null;

const serverApiCall = async (endpoint, method = 'GET', body = null) => {
  const serverUrl = getServerUrl();
  if (!serverUrl) return { success: false, error: 'Not connected to server' };
  try {
    const accessToken = sessionStorage.getItem('accessToken');
    const headers = { 'Content-Type': 'application/json' };
    if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;
    const options = { method, headers };
    if (body) options.body = JSON.stringify(body);
    const res = await fetch(`${serverUrl}${endpoint}`, options);
    return res.json();
  } catch (err) { return { success: false, error: err.message }; }
};

export const getMessages = async (userId, otherUserId) => {
  if (isServerMode()) {
    if (!otherUserId) return [];
    const res = await serverApiCall(`/api/chat/${otherUserId}`, 'GET');
    return res?.success ? res.data : [];
  }
  const api = getApi();
  if (!api) return [];
  try { const r = await api.getMessages({ userId, otherUserId }); return r?.success ? r.messages : []; }
  catch { return []; }
};

export const sendMessage = async (senderId, receiverId, messageText, attachment, replyToId) => {
  if (isServerMode()) {
    const res = await serverApiCall('/api/chat', 'POST', { receiver_id: receiverId, message_text: messageText, attachment, reply_to_id: replyToId });
    if (!res?.success) throw new Error(res?.error || 'Failed to send message');
    return { id: res.id, sender_id: senderId, receiver_id: receiverId, message_text: messageText, attachment, reply_to_id: replyToId, timestamp: new Date().toISOString() };
  }
  const api = getApi();
  if (!api) throw new Error('API not available');
  try { const r = await api.sendMessage(senderId, receiverId, messageText, attachment, replyToId); return r?.success ? r.message : null; }
  catch { return null; }
};

export const markAsRead = async (messageId, userId) => {
  if (isServerMode()) {
    await serverApiCall('/api/chat/mark-read', 'POST', { messageId, userId });
    return;
  }
  const api = getApi();
  if (!api) return;
  try { await api.markMessageRead({ messageId, userId }); } catch {}
};

export const markAllAsRead = async (userId, otherUserId) => {
  if (isServerMode()) {
    await serverApiCall('/api/chat/mark-read', 'POST', { otherUserId });
    return;
  }
  const api = getApi();
  if (!api) return;
  try { await api.markAllAsRead(userId, otherUserId); } catch {}
};

export const getUnreadCount = async (userId) => {
  const api = getApi();
  if (!api) return 0;
  try { const r = await api.getUnreadCount(userId); return r?.success ? r.count : 0; }
  catch { return 0; }
};

export const deleteMessage = async (messageId) => {
  const api = getApi();
  if (!api) return false;
  try { const r = await api.deleteMessage(messageId); return !!r?.success; }
  catch { return false; }
};
