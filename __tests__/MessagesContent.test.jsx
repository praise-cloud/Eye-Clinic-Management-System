import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import MessagesContent from '../src/components/content/MessagesContent';

jest.mock('../src/hooks/useUser', () => ({
  __esModule: true,
  default: () => ({
    user: { id: 1, name: 'Admin User', role: 'admin' }
  })
}));

describe('MessagesContent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sessionStorage.clear();

    Object.keys(window.electronAPI).forEach((k) => delete window.electronAPI[k]);
    Object.assign(window.electronAPI, {
      setUserOnline: jest.fn().mockResolvedValue({ success: true }),
      setUserOffline: jest.fn().mockResolvedValue({ success: true }),
      getUsersWithPresence: jest.fn().mockResolvedValue({
        success: true,
        users: [
          { id: 1, name: 'Admin User', role: 'admin', is_online: true },
          { id: 2, name: 'Dr Smith', role: 'doctor', is_online: true }
        ]
      }),
      getMessages: jest.fn().mockResolvedValue({
        success: true,
        messages: [
          {
            id: 11,
            sender_id: 2,
            receiver_id: 1,
            status: 'read',
            message_text: 'Older message',
            timestamp: '2026-02-20T09:00:00.000Z'
          },
          {
            id: 12,
            sender_id: 2,
            receiver_id: 1,
            status: 'unread',
            message_text: 'Newest message',
            timestamp: '2026-02-20T10:00:00.000Z'
          }
        ]
      }),
      markAllAsRead: jest.fn().mockResolvedValue({ success: true }),
      markMessageRead: jest.fn().mockResolvedValue({ success: true }),
      onIpcEvent: jest.fn().mockImplementation(() => () => {}),
      sendMessage: jest.fn().mockResolvedValue({ success: true }),
      deleteMessage: jest.fn().mockResolvedValue({ success: true })
    });
  });

  it('uses pending chat target and loads selected conversation', async () => {
    sessionStorage.setItem('pendingChatUserId', '2');
    render(<MessagesContent />);

    await waitFor(() => {
      expect(window.electronAPI.markAllAsRead).toHaveBeenCalledWith(1, 2);
    });

    expect(screen.getAllByText('Dr Smith').length).toBeGreaterThan(0);
    expect(screen.getByText('Older message')).toBeInTheDocument();
    expect(screen.getByText('Newest message')).toBeInTheDocument();
  });

  it('renders messages in natural order (oldest before newest)', async () => {
    sessionStorage.setItem('pendingChatUserId', '2');
    render(<MessagesContent />);

    const older = await screen.findByText('Older message');
    const newest = await screen.findByText('Newest message');

    const relation = older.compareDocumentPosition(newest);
    expect(relation & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
