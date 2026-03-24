"use client";

import { useState } from 'react';
import { Smile } from 'lucide-react';
import { CHAT_EMOJIS } from '@/types/chat';

interface Props {
  onSelect: (emoji: string) => void;
}

export default function EmojiPicker({ onSelect }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-gray-400 hover:text-yellow-400 transition-colors"
        title="表情"
      >
        <Smile className="w-5 h-5" />
      </button>
      
      {isOpen && (
        <div className="absolute bottom-full right-0 mb-2 bg-gray-800 rounded-lg shadow-lg p-2 flex gap-1">
          {CHAT_EMOJIS.map((emoji, index) => (
            <button
              key={index}
              onClick={() => {
                onSelect(emoji);
                setIsOpen(false);
              }}
              className="w-8 h-8 text-lg hover:bg-gray-700 rounded transition-colors"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
