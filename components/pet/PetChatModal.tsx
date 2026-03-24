'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { sendPetChat } from '@/lib/api/petChat';
import { toFriendlyMessage } from '@/lib/utils/friendlyError';
import type { PetChatHistoryItem, PetChatMessage } from '@/types/petChat';
import { triggerInteractionFeedback } from './InteractionFeedback';
import type { InteractionType } from '@/types/interaction';
import { useInteractionStore } from '@/store/interactionStore';
import ConfirmModal from '@/components/ui/ConfirmModal';

interface PetChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  petId: number;
  petName: string;
}

const STORAGE_LIMIT = 30;
const REQUEST_HISTORY_LIMIT = 8;
const MAX_MESSAGE_LENGTH = 200;

const EMOTION_EMOJI: Record<string, string> = {
  happy: '😊',
  calm: '😌',
  excited: '🤩',
  caring: '🥰',
  neutral: '🙂'
};

const ACTIONS: InteractionType[] = ['pat', 'play', 'talk', 'train', 'read', 'paint', 'chat', 'bath'];

function buildStorageKey(userId?: number, petId?: number) {
  return `petChatHistory:${userId ?? 'guest'}:${petId ?? 'unknown'}`;
}

function normalizeMessages(raw: unknown): PetChatMessage[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(item => item && (item.role === 'user' || item.role === 'assistant') && typeof item.content === 'string')
    .map(item => ({
      id: String(item.id || `${item.role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
      role: item.role,
      content: String(item.content).slice(0, MAX_MESSAGE_LENGTH),
      createdAt: typeof item.createdAt === 'number' ? item.createdAt : Date.now(),
      emotion: typeof item.emotion === 'string' ? item.emotion : undefined,
    }))
    .slice(-STORAGE_LIMIT);
}

function buildRequestHistory(messages: PetChatMessage[]): PetChatHistoryItem[] {
  return messages
    .slice(-REQUEST_HISTORY_LIMIT)
    .map(({ role, content }) => ({
      role,
      content: content.slice(0, MAX_MESSAGE_LENGTH),
    }));
}

export default function PetChatModal({ isOpen, onClose, petId, petName }: PetChatModalProps) {
  const { token, user } = useAuthStore();
  const { setLastMessage } = useInteractionStore();
  const [messages, setMessages] = useState<PetChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusNote, setStatusNote] = useState<string | null>(null);
  const [fallbackMode, setFallbackMode] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const storageKey = useMemo(() => buildStorageKey(user?.id, petId), [user?.id, petId]);

  useEffect(() => {
    if (!isOpen) return;
    if (typeof window === 'undefined') return;
    setError(null);
    setStatusNote(null);
    setFallbackMode(false);
    setSuggestions([]);
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        setMessages(normalizeMessages(parsed));
        return;
      } catch {
        // ignore parsing errors
      }
    }
    const greeting: PetChatMessage = {
      id: `greet-${Date.now()}`,
      role: 'assistant',
      content: `我是${petName}，很高兴见到你！想聊点什么吗？`,
      createdAt: Date.now(),
      emotion: 'happy',
    };
    setMessages([greeting]);
  }, [isOpen, storageKey, petName]);

  useEffect(() => {
    if (!isOpen) return;
    if (typeof window === 'undefined') return;
    try {
      const trimmed = messages.slice(-STORAGE_LIMIT);
      localStorage.setItem(storageKey, JSON.stringify(trimmed));
    } catch {
      // ignore storage failures
    }
  }, [messages, isOpen, storageKey]);

  useEffect(() => {
    if (!isOpen) return;
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => inputRef.current?.focus(), 0);
    return () => clearTimeout(timer);
  }, [isOpen]);

  const handleClear = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(storageKey);
    }
    setMessages([]);
    setSuggestions([]);
    setError(null);
    setStatusNote(null);
    setFallbackMode(false);
  };
  const buildLocalFallback = (text: string) => {
    const content = text.trim();
    const owner = user?.username || '主人';
    const name = petName || '小伙伴';

    if (/你是谁|你叫什么|名字/.test(content)) {
      return {
        reply: `我是${name}呀～你的贴心小伙伴！很高兴见到你，${owner}～`,
        emotion: 'happy',
        action: 'chat',
        suggestions: ['今天想做点什么？', '一起玩耍吧', '给我讲个小故事'],
      };
    }
    if (/谢谢|喜欢|爱你/.test(content)) {
      return {
        reply: `我也很喜欢你！${owner}，抱抱～`,
        emotion: 'caring',
        action: 'chat',
        suggestions: ['继续聊聊心情', '一起做个小任务', '给我起个新昵称'],
      };
    }
    if (/难过|不开心|烦|累/.test(content)) {
      return {
        reply: `来，给你一个温暖的抱抱～慢慢说，我在听呢。`,
        emotion: 'caring',
        action: 'chat',
        suggestions: ['说说发生了什么', '深呼吸一下', '让我陪你玩一会儿'],
      };
    }
    if (/再见|拜拜/.test(content)) {
      return {
        reply: `好的，${owner}～我会在这里等你回来！`,
        emotion: 'calm',
        action: 'none',
        suggestions: ['下次再聊', '回来记得找我', '我会想你的'],
      };
    }

    const fallbackReplies = [
      `我在呢～${owner}想聊点什么？`,
      `今天过得怎么样？我一直在听哦～`,
      `嘿嘿，${name}来了！我们聊点开心的吧～`,
      `我想听听你的心情，${owner}愿意说说吗？`,
    ];
    const reply = fallbackReplies[Math.floor(Math.random() * fallbackReplies.length)];
    return {
      reply,
      emotion: 'happy',
      action: 'chat',
      suggestions: ['讲讲今天的事', '一起互动一下', '给我一个小目标'],
    };
  };

  const handleSend = async (preset?: string) => {
    const text = (preset ?? inputValue).trim();
    if (!text || isSending) return;
    if (!token) {
      setError('请先登录后再聊天');
      return;
    }

    setError(null);
    setSuggestions([]);

    const userMessage: PetChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: text.slice(0, MAX_MESSAGE_LENGTH),
      createdAt: Date.now(),
    };

    const history = buildRequestHistory(messages);
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsSending(true);
    try {
      const result = await sendPetChat(
        {
          pet_id: petId,
          message: text.slice(0, MAX_MESSAGE_LENGTH),
          history,
        },
        token
      );

      const reply = (result.reply || '').trim() || '我在呢，主人再说一次吧～';
      const assistantMessage: PetChatMessage = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: reply,
        createdAt: Date.now(),
        emotion: result.emotion,
      };

      setMessages(prev => [...prev, assistantMessage]);
      setLastMessage(reply);
      if (Array.isArray(result.suggestions)) {
        setSuggestions(result.suggestions.slice(0, 3));
      }
      setStatusNote(null);
      setFallbackMode(false);

      const action = result.action;
      if (action !== 'none') {
        const resolved = ACTIONS.includes(action as InteractionType) ? (action as InteractionType) : 'chat';
        triggerInteractionFeedback(resolved, undefined, reply);
      }
    } catch (err) {
      const message = toFriendlyMessage(err, '宠物暂时无法回复，请稍后再试');
      const shouldFallback = !/(频繁|等待|登录)/.test(message);

      if (shouldFallback) {
        const local = buildLocalFallback(text);
        const assistantMessage: PetChatMessage = {
          id: `a-${Date.now()}`,
          role: 'assistant',
          content: local.reply,
          createdAt: Date.now(),
          emotion: local.emotion,
        };

        setMessages(prev => [...prev, assistantMessage]);
        setLastMessage(local.reply);
        setSuggestions(local.suggestions?.slice(0, 3) ?? []);
        setStatusNote('AI暂时离线，我先陪你聊聊～');
        setFallbackMode(true);
        triggerInteractionFeedback('chat', undefined, local.reply);
      } else {
        setError(message);
      }
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed bottom-6 right-6 z-[9999] w-[92vw] max-w-sm h-[60vh] max-h-[420px] flex flex-col bg-slate-800 border-2 border-slate-700 rounded-2xl shadow-2xl backdrop-blur-md overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-slate-700 bg-blue-900/30">
          <div>
            <h3 className="text-lg font-bold text-blue-400">🗨️ 和 {petName} 聊天</h3>
            <p className="text-[10px] text-slate-500 mt-1">记忆仅保存在本地浏览器缓存</p>
          </div>
          <div className="flex items-center gap-2">
            {fallbackMode && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-900/30 text-amber-400 border border-amber-500/30">
                本地陪聊
              </span>
            )}
            <button
              onClick={() => setShowClearConfirm(true)}
              className="pixel-btn bg-slate-700 text-slate-300 px-2 py-1 text-xs rounded-xl hover:bg-slate-600"
            >
              清除记忆
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl">
              ×
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-slate-800/60">
          {statusNote && (
            <div className="text-[11px] text-amber-400 bg-amber-900/30 border border-amber-500/30 rounded-lg px-2 py-1">
              {statusNote}
            </div>
          )}
          {messages.length === 0 && (
            <div className="text-center text-xs text-slate-400">开始和宠物聊聊天吧～</div>
          )}
          {messages.map(msg => {
            const isUser = msg.role === 'user';
            return (
              <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm border ${
                    isUser
                      ? 'bg-blue-600 text-white border-blue-500'
                      : 'bg-slate-700 text-white border-slate-600 shadow-sm'
                  }`}
                >
                  {!isUser && msg.emotion && (
                    <span className="mr-1 text-xs">{EMOTION_EMOJI[msg.emotion] || '🙂'}</span>
                  )}
                  <span className="whitespace-pre-wrap break-words">{msg.content}</span>
                </div>
              </div>
            );
          })}
          {isSending && (
            <div className="flex justify-start">
              <div className="bg-slate-700 text-slate-400 border border-slate-600 rounded-2xl px-3 py-2 text-sm shadow-sm">
                正在思考中...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <div className="px-3 py-2 border-t border-slate-700 bg-blue-900/30">
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s, idx) => (
                <button
                  key={`${s}-${idx}`}
                  onClick={() => handleSend(s)}
                  className="pixel-btn bg-slate-700 text-blue-400 text-xs px-2 py-1 rounded-xl border border-slate-600 hover:bg-slate-600"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="p-3 border-t border-slate-700 bg-slate-800">
          {error && <div className="text-xs text-red-500 mb-2">{error}</div>}
          <div className="flex gap-2">
            <input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value.slice(0, MAX_MESSAGE_LENGTH))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="和宠物说点什么..."
              className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-xl text-white text-sm focus:outline-none focus:border-blue-400"
              maxLength={MAX_MESSAGE_LENGTH}
            />
            <button
              onClick={() => handleSend()}
              disabled={isSending || !inputValue.trim()}
              className={`pixel-btn px-4 text-sm ${
                isSending || !inputValue.trim()
                  ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-500'
              }`}
            >
              发送
            </button>
          </div>
          <div className="text-[10px] text-slate-400 mt-1 text-right">
            {inputValue.length}/{MAX_MESSAGE_LENGTH}
          </div>
        </div>
      </div>
      <ConfirmModal
        isOpen={showClearConfirm}
        title="清除聊天记录"
        message="确定要清除聊天记录吗？这只会清除本地浏览器缓存。"
        confirmText="确认清除"
        cancelText="取消"
        confirmType="warning"
        icon="🧹"
        onConfirm={() => {
          setShowClearConfirm(false);
          handleClear();
        }}
        onCancel={() => setShowClearConfirm(false)}
      />
    </>
  );
}
