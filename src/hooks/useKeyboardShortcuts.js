import { useEffect } from 'react';

const useKeyboardShortcuts = (shortcuts) => {
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!event.key) return;
      const eventKey = event.key.toLowerCase();
      shortcuts.forEach(({ key, ctrlKey = false, altKey = false, shiftKey = false, callback }) => {
        if (!key || typeof key !== 'string') return;
        const keyMatch = eventKey === key.toLowerCase();
        const ctrlMatch = event.ctrlKey === ctrlKey;
        const altMatch = event.altKey === altKey;
        const shiftMatch = event.shiftKey === shiftKey;

        if (keyMatch && ctrlMatch && altMatch && shiftMatch) {
          event.preventDefault();
          callback(event);
        }
      });
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [shortcuts]);
};

export default useKeyboardShortcuts;