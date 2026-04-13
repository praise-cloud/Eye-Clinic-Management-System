import { useEffect, useCallback } from 'react';

export default function useServerEvents({ onDataUpdate, onChatMessage, onPresence, table } = {}) {
  useEffect(() => {
    const handles = [];

    if (onDataUpdate) {
      const handler = (e) => {
        const data = e.detail;
        if (!table || data.table === table) onDataUpdate(data);
      };
      window.addEventListener('server:dataUpdate', handler);
      handles.push({ name: 'server:dataUpdate', handler });
    }

    if (onChatMessage) {
      const handler = (e) => onChatMessage(e.detail);
      window.addEventListener('server:chatMessage', handler);
      handles.push({ name: 'server:chatMessage', handler });
    }

    if (onPresence) {
      const handler = (e) => onPresence(e.detail);
      window.addEventListener('server:presence', handler);
      handles.push({ name: 'server:presence', handler });
    }

    return () => {
      handles.forEach(h => window.removeEventListener(h.name, h.handler));
    };
  }, [onDataUpdate, onChatMessage, onPresence, table]);
}
