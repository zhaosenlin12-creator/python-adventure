"use client";

import { MessageCircle } from 'lucide-react';
import { useChatStore } from '@/store/chatStore';

export default function ChatButton() {
  const { isOpen, setOpen, getTotalUnread } = useChatStore();
  const unreadCount = getTotalUnread();

  return (
    <button
      onClick={() => setOpen(!isOpen)}
      data-testid="global-chat-button"
      className="fixed bottom-3 right-3 z-[9999] flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 shadow-lg transition-all hover:scale-110 hover:bg-blue-500"
      title="聊天"
    >
      <MessageCircle className="h-4.5 w-4.5 text-white" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  );
}
