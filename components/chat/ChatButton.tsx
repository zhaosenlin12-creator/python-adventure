"use client";

import { MessageCircle } from 'lucide-react';
import { useChatStore } from '@/store/chatStore';

export default function ChatButton() {
  const { isOpen, setOpen, getTotalUnread } = useChatStore();
  const unreadCount = getTotalUnread();

  return (
    <button
      onClick={() => setOpen(!isOpen)}
      className="fixed bottom-4 right-4 z-[9999] w-14 h-14 bg-blue-600 hover:bg-blue-500 rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110"
      title="聊天"
    >
      <MessageCircle className="w-6 h-6 text-white" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  );
}
