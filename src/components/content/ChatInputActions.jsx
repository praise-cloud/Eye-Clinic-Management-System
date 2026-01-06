import React from 'react';
import { sendIcon, fileIcon, imageIcon } from '../Icons';

const ChatInputActions = ({ onFileSelect, onImageSelect, onSend, disabled }) => {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onFileSelect}
        className="p-2 rounded hover:bg-gray-100 transition dark:hover:bg-gray-700"
        title="Attach file"
      >
        {fileIcon({ className: "w-5 h-5" })}
      </button>
      <button
        type="button"
        onClick={onImageSelect}
        className="p-2 rounded hover:bg-gray-100 transition dark:hover:bg-gray-700"
        title="Attach image"
      >
        {imageIcon({ className: "w-5 h-5" })}
      </button>
      <button
        type="submit"
        onClick={onSend}
        disabled={disabled}
        className="p-2 rounded hover:bg-blue-100 transition dark:hover:bg-blue-900 disabled:opacity-50"
        title="Send message"
      >
        {sendIcon({ className: "w-5 h-5" })}
      </button>
    </div>
  );
};

export default ChatInputActions;
