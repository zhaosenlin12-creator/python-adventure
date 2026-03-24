"use client";

import { useState, useEffect, useRef } from 'react';
import { X, Send, Users, Globe, MessageSquare } from 'lucide-react';
import { useChatStore } from '@/store/chatStore';
import { useAuthStore } from '@/store/authStore';
import { createChatWebSocket, disconnectChatWebSocket, getChatWebSocket } from '@/lib/services/chatWebSocket';
import { ChatWsMessage, CHAT_CONFIG, ChatMessage as ChatMessageType, ChatUser } from '@/types/chat';
import ChatMessage from './ChatMessage';
import QuickMessages from './QuickMessages';
import EmojiPicker from './EmojiPicker';

export default function ChatPanel() {
  const { user } = useAuthStore();
  const {
    isOpen, setOpen, isConnected, setConnected,
    activeTab, setActiveTab, activePrivateChatUserId, setActivePrivateChat,
    globalMessages, privateChats, onlineUsers,
    addGlobalMessage, addPrivateMessage, setOnlineUsers, addOnlineUser, removeOnlineUser,
    clearUnreadGlobal, canSendMessage, recordMessageSent, getPrivateChatList,
  } = useChatStore();

  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 初始化 WebSocket
  useEffect(() => {
    if (!user?.id) return;

    const client = createChatWebSocket({
      userId: user.id,
      onConnect: () => setConnected(true),
      onDisconnect: () => setConnected(false),
      onMessage: handleWsMessage,
    });

    client.connect();

    return () => {
      disconnectChatWebSocket();
    };
  }, [user?.id]);

  // 处理 WebSocket 消息
  const handleWsMessage = (message: ChatWsMessage) => {
    switch (message.type) {
      case 'new_message':
        const msgData = message.data as ChatMessageType;
        if (msgData.message_type === 'global') {
          addGlobalMessage(msgData);
        } else {
          addPrivateMessage(msgData);
        }
        break;
      case 'online_users':
        setOnlineUsers((message.data as { users: ChatUser[] }).users);
        break;
      case 'user_join':
        addOnlineUser(message.data as ChatUser);
        break;
      case 'user_leave':
        removeOnlineUser((message.data as { user_id: number }).user_id);
        break;
      case 'error':
        setError((message.data as { message: string }).message);
        setTimeout(() => setError(null), 3000);
        break;
    }
  };

  // 滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [globalMessages, privateChats, activePrivateChatUserId]);

  // 清除未读
  useEffect(() => {
    if (isOpen && activeTab === 'global') {
      clearUnreadGlobal();
    }
  }, [isOpen, activeTab]);

  // 发送消息
  const handleSend = () => {
    if (!inputValue.trim()) return;
    
    const { canSend, cooldown, remaining } = canSendMessage();
    if (!canSend) {
      if (cooldown > 0) {
        setError(`请等待 ${cooldown} 秒后再发送`);
      } else {
        setError('今日发言次数已用完');
      }
      setTimeout(() => setError(null), 3000);
      return;
    }

    const client = getChatWebSocket();
    if (!client?.isConnected()) {
      setError('未连接到服务器');
      setTimeout(() => setError(null), 3000);
      return;
    }

    const receiverId = activeTab === 'private' ? activePrivateChatUserId : null;
    client.sendMessage(inputValue.trim(), receiverId);
    recordMessageSent();
    setInputValue('');
  };

  // 快捷消息
  const handleQuickMessage = (msg: string) => {
    setInputValue(msg);
  };

  // 表情
  const handleEmoji = (emoji: string) => {
    if (inputValue.length + emoji.length <= CHAT_CONFIG.MAX_MESSAGE_LENGTH) {
      setInputValue(prev => prev + emoji);
    }
  };

  // 点击用户发起私聊
  const handleClickUser = (userId: number, username: string) => {
    if (userId === user?.id) return;
    setActivePrivateChat(userId);
  };

  // 获取当前显示的消息
  const currentMessages = activeTab === 'global'
    ? globalMessages
    : (activePrivateChatUserId ? privateChats.get(activePrivateChatUserId) || [] : []);

  const privateChatList = getPrivateChatList();

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-20 right-4 z-[9998] w-80 h-[500px] bg-gray-900 rounded-lg shadow-2xl border border-gray-700 flex flex-col">
      {/* 头部 */}
      <div className="flex items-center justify-between p-3 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-white font-medium">聊天</span>
          <span className="text-xs text-gray-500">({onlineUsers.length}人在线)</span>
        </div>
        <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-white">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* 标签切换 */}
      <div className="flex border-b border-gray-700">
        <button
          onClick={() => setActiveTab('global')}
          className={`flex-1 py-2 text-sm flex items-center justify-center gap-1 ${
            activeTab === 'global' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400'
          }`}
        >
          <Globe className="w-4 h-4" />
          全局
        </button>
        <button
          onClick={() => setActiveTab('private')}
          className={`flex-1 py-2 text-sm flex items-center justify-center gap-1 ${
            activeTab === 'private' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-gray-400'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          私聊
        </button>
      </div>

      {/* 私聊列表（当没有选中私聊对象时显示） */}
      {activeTab === 'private' && !activePrivateChatUserId && (
        <div className="flex-1 overflow-y-auto p-2">
          <div className="text-xs text-gray-500 mb-2">点击在线玩家发起私聊</div>
          {privateChatList.length > 0 ? (
            privateChatList.map(chat => (
              <button
                key={chat.user_id}
                onClick={() => setActivePrivateChat(chat.user_id)}
                className="w-full p-2 flex items-center gap-2 hover:bg-gray-800 rounded"
              >
                <div className="flex-1 text-left">
                  <div className="text-sm text-white">
                    Lv.{chat.level} {chat.username}
                    {chat.unread_count > 0 && (
                      <span className="ml-2 bg-red-500 text-xs px-1.5 rounded-full">
                        {chat.unread_count}
                      </span>
                    )}
                  </div>
                  {chat.last_message && (
                    <div className="text-xs text-gray-500 truncate">
                      {chat.last_message.content}
                    </div>
                  )}
                </div>
              </button>
            ))
          ) : (
            <div className="text-center text-gray-500 text-sm py-4">
              暂无私聊记录
            </div>
          )}
        </div>
      )}

      {/* 消息列表 */}
      {(activeTab === 'global' || activePrivateChatUserId) && (
        <div className="flex-1 overflow-y-auto p-3">
          {activeTab === 'private' && activePrivateChatUserId && (
            <button
              onClick={() => setActivePrivateChat(null)}
              className="text-xs text-blue-400 hover:text-blue-300 mb-2"
            >
              ← 返回私聊列表
            </button>
          )}
          
          {currentMessages.length === 0 ? (
            <div className="text-center text-gray-500 text-sm py-4">
              暂无消息
            </div>
          ) : (
            currentMessages.map(msg => (
              <ChatMessage
                key={msg.id}
                message={msg}
                currentUserId={user?.id || 0}
                onClickUser={handleClickUser}
              />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="px-3 py-1 bg-red-900/50 text-red-300 text-xs text-center">
          {error}
        </div>
      )}

      {/* 快捷消息 */}
      {(activeTab === 'global' || activePrivateChatUserId) && (
        <QuickMessages onSelect={handleQuickMessage} />
      )}

      {/* 输入框 */}
      {(activeTab === 'global' || activePrivateChatUserId) && (
        <div className="p-2 border-t border-gray-700">
          <div className="flex items-center gap-1">
            <EmojiPicker onSelect={handleEmoji} />
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value.slice(0, CHAT_CONFIG.MAX_MESSAGE_LENGTH))}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="输入消息..."
              className="flex-1 bg-gray-800 text-white text-sm px-3 py-2 rounded outline-none focus:ring-1 focus:ring-blue-500"
              maxLength={CHAT_CONFIG.MAX_MESSAGE_LENGTH}
            />
            <button
              onClick={handleSend}
              disabled={!inputValue.trim()}
              className="p-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:cursor-not-allowed rounded transition-colors"
            >
              <Send className="w-4 h-4 text-white" />
            </button>
          </div>
          <div className="text-xs text-gray-500 mt-1 text-right">
            {inputValue.length}/{CHAT_CONFIG.MAX_MESSAGE_LENGTH}
          </div>
        </div>
      )}
    </div>
  );
}
