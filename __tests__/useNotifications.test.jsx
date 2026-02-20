import { renderHook, waitFor, act } from '@testing-library/react';
import useNotifications from '../src/hooks/useNotifications';

describe('useNotifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    window.electronAPI = {
      getNotifications: jest.fn().mockResolvedValue({
        success: true,
        notifications: [
          {
            id: 'sys-1',
            status: 'unread',
            type: 'prescription_new',
            title: 'New prescription',
            message: 'Please dispense',
            created_at: '2026-02-20T09:00:00.000Z'
          }
        ]
      }),
      getUsersWithPresence: jest.fn().mockResolvedValue({
        success: true,
        users: [
          { id: 1, name: 'Admin User' },
          { id: 2, first_name: 'John', last_name: 'Doctor' }
        ]
      }),
      getMessages: jest.fn().mockResolvedValue({
        success: true,
        messages: [
          {
            id: 'm-1',
            sender_id: 2,
            receiver_id: 1,
            status: 'unread',
            message_text: 'Hello admin',
            timestamp: '2026-02-20T10:00:00.000Z'
          },
          {
            id: 'm-2',
            sender_id: 2,
            receiver_id: 1,
            status: 'unread',
            message_text: 'Please review',
            timestamp: '2026-02-20T11:00:00.000Z'
          }
        ]
      }),
      markNotificationRead: jest.fn().mockResolvedValue({ success: true }),
      markAllNotificationsRead: jest.fn().mockResolvedValue({ success: true }),
      onNewNotification: jest.fn().mockImplementation(() => () => {}),
      onIpcEvent: jest.fn().mockImplementation(() => () => {})
    };
  });

  it('merges system and chat unread notifications and computes unread count', async () => {
    const { result } = renderHook(() => useNotifications(1));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.notifications.length).toBe(2);
    });

    expect(result.current.unreadCount).toBe(2);
    expect(result.current.notifications[0].type).toBe('chat_unread');
    expect(result.current.notifications[0].title).toContain('John Doctor');
    expect(result.current.notifications[0].unread_messages).toBe(2);
  });

  it('marks a notification as read and decrements unread count', async () => {
    const { result } = renderHook(() => useNotifications(1));

    await waitFor(() => expect(result.current.notifications.length).toBe(2));

    await act(async () => {
      await result.current.markAsRead('sys-1');
    });

    expect(window.electronAPI.markNotificationRead).toHaveBeenCalledWith('sys-1');
    expect(result.current.unreadCount).toBe(1);
  });
});
