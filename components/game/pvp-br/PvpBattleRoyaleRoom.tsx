'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Bot,
  Crown,
  LogOut,
  MinusCircle,
  Play,
  Shield,
  Sparkles,
  Users,
  Wifi,
  WifiOff,
} from 'lucide-react';

import { getPetImageUrl } from '@/lib/config/petAssets';
import { BattleRoyaleWebSocketClient } from '@/lib/services/pvpBattleRoyaleWebSocket';
import { useAuthStore } from '@/store/authStore';
import { usePvpBattleRoyaleStore } from '@/store/pvpBattleRoyaleStore';
import type { BattleRoyaleDifficulty, BattleRoyaleRoom } from '@/types/pvp-br';

interface PvpBattleRoyaleRoomProps {
  room: BattleRoyaleRoom;
  onLeave: () => void;
  onStart: (room: BattleRoyaleRoom) => void;
}

const difficultyOptions: Array<{ value: BattleRoyaleDifficulty; label: string; description: string }> = [
  { value: 'easy', label: '简单', description: '移动和进攻更保守，适合补足人数。' },
  { value: 'medium', label: '普通', description: '会积极抢资源并主动追击。' },
  { value: 'hard', label: '困难', description: '压迫更强，出手更频繁。' },
];

export default function PvpBattleRoyaleRoom({ room, onLeave, onStart }: PvpBattleRoyaleRoomProps) {
  const [selectedDifficulty, setSelectedDifficulty] = useState<BattleRoyaleDifficulty>('easy');
  const [busyAction, setBusyAction] = useState<'leave' | 'start' | 'bot' | null>(null);
  const [roomNotice, setRoomNotice] = useState('房间同步已就绪，房主开始后所有玩家会自动进入战场。');
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentUserId = useAuthStore((state) => state.user?.id ?? null);
  const currentRoom = usePvpBattleRoyaleStore((state) => state.currentRoom);
  const wsConnected = usePvpBattleRoyaleStore((state) => state.wsConnected);
  const error = usePvpBattleRoyaleStore((state) => state.error);
  const refreshCurrentRoom = usePvpBattleRoyaleStore((state) => state.refreshCurrentRoom);
  const setCurrentRoom = usePvpBattleRoyaleStore((state) => state.setCurrentRoom);
  const setWsConnected = usePvpBattleRoyaleStore((state) => state.setWsConnected);
  const leaveCurrentRoom = usePvpBattleRoyaleStore((state) => state.leaveCurrentRoom);
  const addBot = usePvpBattleRoyaleStore((state) => state.addBot);
  const removeBot = usePvpBattleRoyaleStore((state) => state.removeBot);
  const startCurrentRoom = usePvpBattleRoyaleStore((state) => state.startCurrentRoom);

  const effectiveRoom = currentRoom ?? room;
  const isHost = effectiveRoom.host_user_id === currentUserId;
  const canStart = effectiveRoom.participant_count >= 2 && effectiveRoom.status === 'waiting';
  const isFull = effectiveRoom.participant_count >= effectiveRoom.max_players;
  const remainingSlots = Math.max(0, effectiveRoom.max_players - effectiveRoom.participant_count);

  const humanCards = useMemo(() => effectiveRoom.humans, [effectiveRoom.humans]);
  const botCards = useMemo(() => effectiveRoom.bots, [effectiveRoom.bots]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!currentUserId) {
      return;
    }

    const client = new BattleRoyaleWebSocketClient({
      roomId: effectiveRoom.id,
      userId: currentUserId,
      onConnect: () => {
        setWsConnected(true);
        setRoomNotice('房间同步已连接，房主开始后会自动跳转到战场。');
      },
      onDisconnect: () => {
        setWsConnected(false);
        setRoomNotice('房间连接暂时中断，系统正在自动重连。如长时间未恢复，请退出后重新进入。');
      },
      onMessage: (message) => {
        if (message.type === 'connected' && message.room) {
          const nextRoom = message.room as BattleRoyaleRoom;
          setCurrentRoom(nextRoom);
          if (nextRoom.status === 'in_progress') {
            onStart(nextRoom);
          }
          return;
        }

        if (message.type === 'br_room_update' && message.room) {
          setCurrentRoom(message.room as BattleRoyaleRoom);
          return;
        }

        if (message.type === 'br_room_started' && message.room) {
          const startedRoom = message.room as BattleRoyaleRoom;
          setCurrentRoom(startedRoom);
          setRoomNotice('战斗已开始，正在进入战场...');
          onStart(startedRoom);
          return;
        }

        if (message.type === 'br_room_closed') {
          setRoomNotice(message.reason || '房间已关闭，正在返回大厅。');
          setCurrentRoom(null);
          if (closeTimerRef.current) {
            clearTimeout(closeTimerRef.current);
          }
          closeTimerRef.current = setTimeout(() => {
            onLeave();
          }, 1200);
        }
      },
    });

    client.connect();

    return () => {
      client.disconnect();
      setWsConnected(false);
    };
  }, [currentUserId, effectiveRoom.id, onLeave, onStart, setCurrentRoom, setWsConnected]);

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      const nextRoom = await refreshCurrentRoom();
      if (cancelled || !nextRoom) {
        return;
      }
      if (nextRoom.status === 'in_progress') {
        onStart(nextRoom);
      }
    };

    const interval = setInterval(() => {
      void poll();
    }, 2800);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [onStart, refreshCurrentRoom]);

  const handleLeave = async () => {
    setBusyAction('leave');
    try {
      await leaveCurrentRoom();
      onLeave();
    } finally {
      setBusyAction(null);
    }
  };

  const handleAddBot = async () => {
    setBusyAction('bot');
    try {
      await addBot(selectedDifficulty);
    } finally {
      setBusyAction(null);
    }
  };

  const handleRemoveBot = async (botId: string) => {
    setBusyAction('bot');
    try {
      await removeBot(botId);
    } finally {
      setBusyAction(null);
    }
  };

  const handleStart = async () => {
    setBusyAction('start');
    try {
      const startedRoom = await startCurrentRoom();
      setRoomNotice('战斗已开始，正在进入战场...');
      onStart(startedRoom);
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      data-testid="br-room"
      className="fixed inset-0 z-50 overflow-y-auto bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.18),transparent_40%),linear-gradient(180deg,rgba(2,6,23,0.92),rgba(2,6,23,0.98))] p-4"
    >
      <div className="mx-auto flex min-h-full max-w-6xl items-center justify-center">
        <div className="w-full rounded-[32px] border border-white/10 bg-[linear-gradient(145deg,rgba(15,23,42,0.97),rgba(8,15,30,0.99))] shadow-[0_26px_90px_rgba(2,6,23,0.58)]">
          <div className="border-b border-white/10 px-6 py-6 sm:px-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.26em] text-cyan-100">
                  <Shield className="h-3.5 w-3.5" />
                  Waiting Room
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-3xl font-black text-white">{effectiveRoom.room_name}</h2>
                  <span className="rounded-full border border-cyan-300/20 bg-cyan-500/10 px-3 py-1 text-sm font-semibold text-cyan-100">
                    房号 {effectiveRoom.id}
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-sm text-slate-200">
                    {wsConnected ? <Wifi className="h-4 w-4 text-emerald-300" /> : <WifiOff className="h-4 w-4 text-amber-300" />}
                    {wsConnected ? '实时同步中' : '等待重连'}
                  </span>
                </div>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                  生存乱斗开始后，所有玩家都会被投放到大地图中。风暴会持续缩圈，玩家需要抢武器、护盾和增益道具，活到最后获得胜利。
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-400">状态</div>
                  <div className="mt-1 text-lg font-bold text-white">
                    {effectiveRoom.status === 'waiting' ? '等待中' : '进行中'}
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-400">总人数</div>
                  <div className="mt-1 text-lg font-bold text-white">
                    {effectiveRoom.participant_count}/{effectiveRoom.max_players}
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-400">真人</div>
                  <div className="mt-1 text-lg font-bold text-white">{effectiveRoom.human_count}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-400">人机</div>
                  <div className="mt-1 text-lg font-bold text-white">{effectiveRoom.bot_count}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-6 p-6 sm:grid-cols-[1.15fr_0.85fr] sm:p-8">
            <div className="space-y-6">
              <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <div className="text-lg font-bold text-white">真人玩家</div>
                    <div className="text-sm text-slate-400">出战宠物会直接用于战斗形象和昵称展示</div>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-500/10 px-3 py-1 text-sm font-semibold text-cyan-100">
                    <Users className="h-4 w-4" />
                    {effectiveRoom.human_count}
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {humanCards.map((fighter) => (
                    <div
                      key={fighter.user_id}
                      className="rounded-[24px] border border-white/10 bg-slate-950/70 p-4"
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-20 w-20 overflow-hidden rounded-[22px] border border-cyan-300/20 bg-slate-900/80">
                          <img
                            src={getPetImageUrl(fighter.pet_type as never, 'normal', fighter.pet_stage)}
                            alt={fighter.pet_name}
                            className="h-full w-full object-contain p-2"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <div className="truncate text-lg font-bold text-white">{fighter.username}</div>
                            {fighter.is_host && <Crown className="h-4 w-4 text-amber-300" />}
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                                fighter.connected !== false
                                  ? 'bg-emerald-500/15 text-emerald-100'
                                  : 'bg-amber-500/15 text-amber-100'
                              }`}
                            >
                              {fighter.connected !== false ? '在线' : '重连中'}
                            </span>
                          </div>
                          <div className="truncate text-sm text-slate-400">{fighter.pet_name}</div>
                          <div className="mt-2 text-xs uppercase tracking-[0.22em] text-cyan-200/75">
                            {fighter.pet_type}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <div className="text-lg font-bold text-white">AI 人机</div>
                    <div className="text-sm text-slate-400">房主可以逐个添加，并为每个 AI 单独设置难度</div>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-500/10 px-3 py-1 text-sm font-semibold text-emerald-100">
                    <Bot className="h-4 w-4" />
                    {effectiveRoom.bot_count}
                  </div>
                </div>

                {botCards.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-white/10 bg-slate-950/60 px-6 py-8 text-center">
                    <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-3xl bg-cyan-500/10 text-cyan-100">
                      <Sparkles className="h-6 w-6" />
                    </div>
                    <div className="text-lg font-bold text-white">还没有添加人机</div>
                    <div className="mt-2 text-sm text-slate-400">
                      建议先用简单难度补足空位，再按需要增加普通或困难人机。
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {botCards.map((bot) => (
                      <div
                        key={bot.id}
                        className="rounded-[24px] border border-white/10 bg-slate-950/70 p-4"
                      >
                        <div className="flex items-center gap-4">
                          <div className="h-20 w-20 overflow-hidden rounded-[22px] border border-emerald-300/20 bg-slate-900/80">
                            <img
                              src={getPetImageUrl(bot.pet_type as never, 'normal', bot.pet_stage)}
                              alt={bot.pet_name}
                              className="h-full w-full object-contain p-2"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-lg font-bold text-white">{bot.name}</div>
                            <div className="truncate text-sm text-slate-400">{bot.pet_name}</div>
                            <div className="mt-2 flex items-center gap-2">
                              <span className="rounded-full border border-emerald-300/20 bg-emerald-500/10 px-2 py-1 text-xs font-semibold text-emerald-100">
                                {difficultyOptions.find((item) => item.value === bot.difficulty)?.label ?? bot.difficulty}
                              </span>
                              <span className="truncate text-xs uppercase tracking-[0.22em] text-cyan-200/75">
                                {bot.pet_type}
                              </span>
                            </div>
                          </div>
                          {isHost && (
                            <button
                              type="button"
                              onClick={() => void handleRemoveBot(bot.id)}
                              disabled={busyAction === 'bot'}
                              className="rounded-full border border-white/10 p-2 text-slate-300 transition hover:border-red-300/40 hover:text-red-200 disabled:opacity-60"
                            >
                              <MinusCircle className="h-5 w-5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>

            <aside className="space-y-6">
              <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
                <div className="text-lg font-bold text-white">等待室提醒</div>
                <div className="mt-4 rounded-2xl border border-cyan-300/15 bg-cyan-500/10 px-4 py-3 text-sm leading-6 text-cyan-50">
                  {roomNotice}
                </div>
                <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
                  <li>风暴会持续向地图中心缩圈，站在圈外会不断掉血，而且越到后期越疼。</li>
                  <li>玩家被淘汰后会触发 3 题复活问答，全部答对才能半血复活一次。</li>
                  <li>武器丢出去后任何玩家都可以捡起，所以不要在危险位置乱丢。</li>
                  <li>如果你中途刷新页面，系统会自动尝试把你恢复到当前房间或战场。</li>
                </ul>
                <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-200">
                  当前还剩 <span className="font-bold text-white">{remainingSlots}</span> 个空位。
                  {isFull
                    ? ' 房间已满，已停止添加玩家和人机。'
                    : ' 未满员前可以继续邀请玩家或添加人机。'}
                </div>
              </section>

              <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
                <div className="text-lg font-bold text-white">人机配置</div>
                <div className="mt-4 grid gap-3">
                  {difficultyOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setSelectedDifficulty(option.value)}
                      className={`rounded-[22px] border px-4 py-3 text-left transition ${
                        selectedDifficulty === option.value
                          ? 'border-cyan-300/50 bg-cyan-500/12 text-cyan-100'
                          : 'border-white/10 bg-slate-950/70 text-slate-300 hover:border-cyan-300/30 hover:text-white'
                      }`}
                    >
                      <div className="font-semibold">{option.label}</div>
                      <div className="mt-1 text-sm text-inherit/80">{option.description}</div>
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  disabled={!isHost || busyAction === 'bot' || effectiveRoom.status !== 'waiting' || isFull}
                  onClick={() => void handleAddBot()}
                  data-testid="br-add-bot"
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#14b8a6,#2563eb)] px-6 py-3 text-sm font-bold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Bot className="h-4 w-4" />
                  {busyAction === 'bot'
                    ? '正在添加...'
                    : isFull
                      ? '房间已满，无法添加人机'
                      : `添加${difficultyOptions.find((item) => item.value === selectedDifficulty)?.label ?? '简单'}人机`}
                </button>
                {isFull && (
                  <div className="mt-3 rounded-2xl border border-amber-300/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                    当前房间人数已到上限。为了避免静默失败，这里会直接锁定添加按钮并明确提示原因。
                  </div>
                )}
              </section>

              {error && (
                <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                  {error}
                </div>
              )}

              <div className="flex flex-col gap-3">
                {!canStart && (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-300">
                    {effectiveRoom.participant_count < 2
                      ? '还不能开始：至少需要 2 名参战者。你可以邀请玩家，或先补一个简单人机。'
                      : '房间当前不是可开战状态，请等待同步完成。'}
                  </div>
                )}
                <button
                  type="button"
                  disabled={!isHost || !canStart || busyAction === 'start'}
                  onClick={() => void handleStart()}
                  data-testid="br-start-match"
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#f97316,#dc2626)] px-6 py-3 text-sm font-bold text-white shadow-[0_18px_34px_rgba(220,38,38,0.26)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Play className="h-4 w-4" />
                  {busyAction === 'start' ? '正在投放战场...' : '开始生存乱斗'}
                </button>
                <button
                  type="button"
                  disabled={busyAction === 'leave'}
                  onClick={() => void handleLeave()}
                  className="flex w-full items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-6 py-3 text-sm font-bold text-white transition hover:border-white/20 hover:bg-white/10 disabled:opacity-60"
                >
                  <LogOut className="h-4 w-4" />
                  {busyAction === 'leave' ? '正在退出...' : '离开房间'}
                </button>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
