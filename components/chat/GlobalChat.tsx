"use client";

import { useAuthStore } from '@/store/authStore';
import ChatButton from './ChatButton';
import ChatPanel from './ChatPanel';

/**
 * 全局聊天组件
 * 在 layout.tsx 中引入，全局可用
 */
export default function GlobalChat() {
  const { isAuthenticated } = useAuthStore();

  // 未登录不显示聊天
  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
      <ChatButton />
      <ChatPanel />
    </>
  );
}
