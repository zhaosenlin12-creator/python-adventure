"use client";

import { QUICK_MESSAGES } from '@/types/chat';

interface Props {
  onSelect: (message: string) => void;
}

export default function QuickMessages({ onSelect }: Props) {
  return (
    <div className="flex flex-wrap gap-1 p-2 border-t border-gray-700">
      {QUICK_MESSAGES.map((msg, index) => (
        <button
          key={index}
          onClick={() => onSelect(msg)}
          className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded text-gray-300 transition-colors"
        >
          {msg}
        </button>
      ))}
    </div>
  );
}
