# Real-Time Chat Setup

## ✅ What's Enabled

Your chat now syncs **instantly** across all computers using Supabase real-time subscriptions.

## How It Works

1. **User A sends message** → Saved to SQLite + Uploaded to Supabase
2. **Supabase broadcasts** → All connected clients notified instantly
3. **User B receives** → Message downloaded to SQLite + UI updates

## Usage in React Components

```javascript
import { useEffect, useState } from 'react';

function ChatComponent() {
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    // Listen for new messages
    const unsubscribe = window.electronAPI.onMessage((newMessage) => {
      console.log('New message received:', newMessage);
      setMessages(prev => [...prev, newMessage]);
    });

    // Cleanup
    return () => unsubscribe();
  }, []);

  const sendMessage = async (text) => {
    const result = await window.electronAPI.sendMessage(
      currentUserId,
      receiverId,
      text
    );
    
    if (result.success) {
      console.log('Message sent and synced!');
    }
  };

  return (
    <div>
      {messages.map(msg => (
        <div key={msg.id}>{msg.message_text}</div>
      ))}
    </div>
  );
}
```

## Features

- ✅ **Instant delivery** - No 5-minute delay
- ✅ **Offline support** - Messages queue and sync when online
- ✅ **Multi-device** - Works across all computers
- ✅ **Auto-reconnect** - Handles network interruptions
- ✅ **Broadcast** - All open windows get updates

## API

### Send Message
```javascript
await window.electronAPI.sendMessage(senderId, receiverId, text, attachment);
```

### Listen for Messages
```javascript
const unsubscribe = window.electronAPI.onMessage((message) => {
  // Handle new message
});
```

### Get Messages
```javascript
const { messages } = await window.electronAPI.getMessages({
  userId: currentUserId,
  otherUserId: chatPartnerId
});
```

## Requirements

- ✅ Supabase configured (.env file)
- ✅ Internet connection for real-time sync
- ✅ Offline mode still works (syncs when back online)
