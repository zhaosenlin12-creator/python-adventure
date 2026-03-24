/**
 * 聊天状态管理 (Zustand)
 */

import { create } from 'zustand';
import { ChatMessage, ChatUser, PrivateChat, CHAT_CONFIG } from '@/types/chat';

interface ChatState {
  // 连接状态
  isConnected: boolean;
  
  // 消息
  globalMessages: ChatMessage[];
  privateChats: Map<number, ChatMessage[]>;  // user_id -> messages
  
  // 在线用户
  onlineUsers: ChatUser[];
  
  // UI 状态
  isOpen: boolean;
  activeTab: 'global' | 'private';
  activePrivateChatUserId: number | null;
  
  // 未读消息
  unreadGlobal: number;
  unreadPrivate: Map<number, number>;  // user_id -> count
  
  // 发送限制
  lastSendTime: number;
  todayMessageCount: number;
  
  // Actions
  setConnected: (connected: boolean) => void;
  setOpen: (open: boolean) => void;
  setActiveTab: (tab: 'global' | 'private') => void;
  setActivePrivateChat: (userId: number | null) => void;
  
  addGlobalMessage: (message: ChatMessage) => void;
  addPrivateMessage: (message: ChatMessage) => void;
  setGlobalMessages: (messages: ChatMessage[]) => void;
  setPrivateMessages: (userId: number, messages: ChatMessage[]) => void;
  
  setOnlineUsers: (users: ChatUser[]) => void;
  addOnlineUser: (user: ChatUser) => void;
  removeOnlineUser: (userId: number) => void;
  
  clearUnreadGlobal: () => void;
  clearUnreadPrivate: (userId: number) => void;
  
  canSendMessage: () => { canSend: boolean; cooldown: number; remaining: number };
  recordMessageSent: () => void;
  
  getTotalUnread: () => number;
  getPrivateChatList: () => PrivateChat[];
}

export const useChatStore = create<ChatState>((set, get) => ({
  // 初始状态
  isConnected: false,
  globalMessages: [],
  privateChats: new Map(),
  onlineUsers: [],
  isOpen: false,
  activeTab: 'global',
  activePrivateChatUserId: null,
  unreadGlobal: 0,
  unreadPrivate: new Map(),
  lastSendTime: 0,
  todayMessageCount: 0,
  
  // Actions
  setConnected: (connected) => set({ isConnected: connected }),
  
  setOpen: (open) => set({ isOpen: open }),
  
  setActiveTab: (tab) => set({ activeTab: tab }),
  
  setActivePrivateChat: (userId) => {
    set({ activePrivateChatUserId: userId, activeTab: 'private' });
    if (userId !== null) {
      get().clearUnreadPrivate(userId);
    }
  },
  
  addGlobalMessage: (message) => set((state) => {
    const newMessages = [...state.globalMessages, message].slice(-CHAT_CONFIG.HISTORY_LIMIT);
    const newUnread = state.isOpen && state.activeTab === 'global' 
      ? state.unreadGlobal 
      : state.unreadGlobal + 1;
    return { globalMessages: newMessages, unreadGlobal: newUnread };
  }),
  
  addPrivateMessage: (message) => set((state) => {
    // 🔥 修复私聊消息同步问题
    // 需要从 authStore 获取当前用户ID来正确判断"对方"是谁
    // 私聊消息的 chatKey 应该是"对方"的ID
    // 如果我是发送者，对方是 receiver_id
    // 如果我是接收者，对方是 sender_id
    
    // 获取当前用户ID（从 window 或 localStorage）
    let currentUserId: number | null = null;
    if (typeof window !== 'undefined') {
      try {
        const authData = localStorage.getItem('auth-storage');
        if (authData) {
          const parsed = JSON.parse(authData);
          currentUserId = parsed?.state?.user?.id || null;
        }
      } catch (e) {
        console.error('[ChatStore] 获取当前用户ID失败:', e);
      }
    }
    
    // 计算对方的ID作为 chatKey
    let chatKey: number;
    if (currentUserId !== null) {
      // 如果我是发送者，对方是 receiver_id；如果我是接收者，对方是 sender_id
      chatKey = message.sender_id === currentUserId 
        ? message.receiver_id! 
        : message.sender_id;
    } else {
      // 降级逻辑：使用原来的方式
      chatKey = message.sender_id === state.activePrivateChatUserId 
        ? message.sender_id 
        : message.receiver_id!;
    }
    
    if (!chatKey) return state;
    
    const existingMessages = state.privateChats.get(chatKey) || [];
    
    // 🔥 防止重复消息（通过消息ID去重）
    if (existingMessages.some(m => m.id === message.id)) {
      return state;
    }
    
    const newMessages = [...existingMessages, message].slice(-CHAT_CONFIG.HISTORY_LIMIT);
    
    const newPrivateChats = new Map(state.privateChats);
    newPrivateChats.set(chatKey, newMessages);
    
    // 更新未读计数（只有当消息是对方发来的才增加未读）
    const newUnreadPrivate = new Map(state.unreadPrivate);
    const isCurrentChat = state.isOpen && state.activeTab === 'private' && state.activePrivateChatUserId === chatKey;
    const isFromOther = currentUserId !== null && message.sender_id !== currentUserId;
    
    if (!isCurrentChat && isFromOther) {
      newUnreadPrivate.set(chatKey, (newUnreadPrivate.get(chatKey) || 0) + 1);
    }
    
    return { privateChats: newPrivateChats, unreadPrivate: newUnreadPrivate };
  }),
  
  setGlobalMessages: (messages) => set({ globalMessages: messages }),
  
  setPrivateMessages: (userId, messages) => set((state) => {
    const newPrivateChats = new Map(state.privateChats);
    newPrivateChats.set(userId, messages);
    return { privateChats: newPrivateChats };
  }),
  
  setOnlineUsers: (users) => set({ onlineUsers: users }),
  
  addOnlineUser: (user) => set((state) => {
    if (state.onlineUsers.some(u => u.user_id === user.user_id)) {
      return state;
    }
    return { onlineUsers: [...state.onlineUsers, user] };
  }),
  
  removeOnlineUser: (userId) => set((state) => ({
    onlineUsers: state.onlineUsers.filter(u => u.user_id !== userId)
  })),
  
  clearUnreadGlobal: () => set({ unreadGlobal: 0 }),
  
  clearUnreadPrivate: (userId) => set((state) => {
    const newUnreadPrivate = new Map(state.unreadPrivate);
    newUnreadPrivate.delete(userId);
    return { unreadPrivate: newUnreadPrivate };
  }),
  
  canSendMessage: () => {
    const state = get();
    const now = Date.now();
    const elapsed = now - state.lastSendTime;
    const cooldown = Math.max(0, CHAT_CONFIG.SEND_COOLDOWN_MS - elapsed);
    const remaining = CHAT_CONFIG.DAILY_MESSAGE_LIMIT - state.todayMessageCount;
    
    return {
      canSend: cooldown === 0 && remaining > 0,
      cooldown: Math.ceil(cooldown / 1000),
      remaining,
    };
  },
  
  recordMessageSent: () => set((state) => ({
    lastSendTime: Date.now(),
    todayMessageCount: state.todayMessageCount + 1,
  })),
  
  getTotalUnread: () => {
    const state = get();
    let total = state.unreadGlobal;
    state.unreadPrivate.forEach(count => {
      total += count;
    });
    return total;
  },
  
  getPrivateChatList: () => {
    const state = get();
    const list: PrivateChat[] = [];
    
    state.privateChats.forEach((messages, userId) => {
      const user = state.onlineUsers.find(u => u.user_id === userId);
      const lastMessage = messages[messages.length - 1];
      
      list.push({
        user_id: userId,
        username: user?.username || `用户${userId}`,
        level: user?.level || 1,
        unread_count: state.unreadPrivate.get(userId) || 0,
        last_message: lastMessage,
      });
    });
    
    // 按最后消息时间排序
    list.sort((a, b) => {
      const timeA = a.last_message ? new Date(a.last_message.created_at).getTime() : 0;
      const timeB = b.last_message ? new Date(b.last_message.created_at).getTime() : 0;
      return timeB - timeA;
    });
    
    return list;
  },
}));
