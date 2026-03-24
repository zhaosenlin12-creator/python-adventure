"use client";

import { ChatMessage as ChatMessageType } from '@/types/chat';

interface Props {
  message: ChatMessageType;
  currentUserId: number;
  onClickUser?: (userId: number, username: string) => void;
}

export default function ChatMessage({ message, currentUserId, onClickUser }: Props) {
  const isOwnMessage = message.sender_id === currentUserId;
  const isPrivate = message.message_type === 'private';
  
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'} mb-2`}>
      <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
        {!isOwnMessage && (
          <button
            onClick={() => onClickUser?.(message.sender_id, message.sender_username)}
            className="text-blue-400 hover:text-blue-300 font-medium"
          >
            Lv.{message.sender_level} {message.sender_username}
          </button>
        )}
        {isPrivate && (
          <span className="text-purple-400">[私聊]</span>
        )}
        <span>{formatTime(message.created_at)}</span>
      </div>
      
      <div
        className={`max-w-[80%] px-3 py-2 rounded-lg text-sm break-words ${
          isOwnMessage
            ? 'bg-blue-600 text-white rounded-br-none'
            : isPrivate
            ? 'bg-purple-900/50 text-purple-100 rounded-bl-none'
            : 'bg-gray-700 text-gray-100 rounded-bl-none'
        }`}
      >
        {message.content}
      </div>
    </div>
  );
}
