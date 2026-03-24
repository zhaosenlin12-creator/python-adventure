/**
 * 聊天系统类型定义
 */

// 聊天消息
export interface ChatMessage {
  id: number;
  sender_id: number;
  sender_username: string;
  sender_level: number;
  receiver_id: number | null;
  receiver_username: string | null;
  content: string;
  message_type: 'global' | 'private';
  created_at: string;
}

// 在线用户
export interface ChatUser {
  user_id: number;
  username: string;
  level: number;
  rank_title: string;
}

// WebSocket 消息类型
export type ChatWsMessageType = 
  | 'new_message'
  | 'user_join'
  | 'user_leave'
  | 'online_users'
  | 'error'
  | 'pong';

// WebSocket 消息
export interface ChatWsMessage {
  type: ChatWsMessageType;
  data: unknown;
}

// 发送消息请求
export interface SendMessageRequest {
  type: 'send_message';
  content: string;
  receiver_id?: number | null;
}

// 聊天配置
export const CHAT_CONFIG = {
  MAX_MESSAGE_LENGTH: 100,
  SEND_COOLDOWN_MS: 3000,
  DAILY_MESSAGE_LIMIT: 100,
  HISTORY_LIMIT: 50,
} as const;

// 快捷消息
export const QUICK_MESSAGES = [
  "来PK吗？⚔️",
  "GG！👍",
  "等等我！🏃",
  "加油！💪",
  "你好！👋",
] as const;

// 简单表情
export const CHAT_EMOJIS = [
  "😀", "😂", "😍", "🤔", "😢", "😡", "👍", "❤️"
] as const;

// 私聊会话
export interface PrivateChat {
  user_id: number;
  username: string;
  level: number;
  unread_count: number;
  last_message?: ChatMessage;
}
