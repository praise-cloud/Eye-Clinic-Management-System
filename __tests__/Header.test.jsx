import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

jest.mock('../src/hooks/useUser', () => ({
  __esModule: true,
  default: () => ({
    logout: jest.fn().mockResolvedValue(undefined),
    loading: false
  })
}));

const mockMarkAsRead = jest.fn();
const mockMarkAllAsRead = jest.fn();
const mockFetchNotifications = jest.fn();

jest.mock('../src/hooks/useNotifications', () => ({
  __esModule: true,
  default: () => ({
    notifications: [
      {
        id: 'chat-2',
        type: 'chat_unread',
        status: 'unread',
        title: 'Message from Dr Smith',
        message: 'Hi there',
        created_at: '2026-02-20T10:00:00.000Z',
        related_id: 2
      }
    ],
    unreadCount: 1,
    markAsRead: mockMarkAsRead,
    markAllAsRead: mockMarkAllAsRead,
    fetchNotifications: mockFetchNotifications
  })
}));

import Header from '../src/components/layout/Header';

describe('Header notifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sessionStorage.clear();
    window.electronAPI = {
      markAllAsRead: jest.fn().mockResolvedValue({ success: true })
    };
  });

  it('routes chat unread notification to messages and stores target chat user', async () => {
    const onSectionClick = jest.fn();
    render(
      <Header
        activeSection="overview"
        currentUser={{ id: 1, name: 'Admin User', role: 'admin' }}
        searchTerm=""
        onSearchChange={() => {}}
        onSectionClick={onSectionClick}
        onActionClick={() => {}}
      />
    );

    const bellButton = screen.getAllByRole('button')[0];
    await userEvent.click(bellButton);
    await userEvent.click(screen.getByText('Message from Dr Smith'));

    await waitFor(() => {
      expect(window.electronAPI.markAllAsRead).toHaveBeenCalledWith(1, 2);
      expect(onSectionClick).toHaveBeenCalledWith('messages');
    });

    expect(sessionStorage.getItem('pendingChatUserId')).toBe('2');
    expect(mockFetchNotifications).toHaveBeenCalled();
    expect(mockMarkAsRead).not.toHaveBeenCalled();
  });
});
