'use client';

import { useEffect, useMemo, useState } from 'react';
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
} from 'lucide-react';

import { getPetImageUrl } from '@/lib/config/petAssets';
import { useAuthStore } from '@/store/authStore';
import { usePvpBattleRoyaleStore } from '@/store/pvpBattleRoyaleStore';
import type { BattleRoyaleDifficulty, BattleRoyaleRoom } from '@/types/pvp-br';

interface PvpBattleRoyaleRoomProps {
  room: BattleRoyaleRoom;
  onLeave: () => void;
  onStart: (room: BattleRoyaleRoom) => void;
}

const difficultyOptions: Array<{ value: BattleRoyaleDifficulty; label: string; description: string }> = [
  { value: 'easy', label: '简单', description: '优先推荐，移动与追击更保守' },
  { value: 'medium', label: '中等', description: '会更积极地搜集拾取并贴身追击' },
  { value: 'hard', label: '困难', description: '高压近战，拾取优先级更高' },
];

export default function PvpBattleRoyaleRoom({ room, onLeave, onStart }: PvpBattleRoyaleRoomProps) {
  const [selectedDifficulty, setSelectedDifficulty] = useState<BattleRoyaleDifficulty>('easy');
  const [busyAction, setBusyAction] = useState<'leave' | 'start' | 'bot' | null>(null);

  const currentUserId = useAuthStore((state) => state.user?.id ?? null);
  const currentRoom = usePvpBattleRoyaleStore((state) => state.currentRoom);
  const error = usePvpBattleRoyaleStore((state) => state.error);
  const refreshCurrentRoom = usePvpBattleRoyaleStore((state) => state.refreshCurrentRoom);
  const leaveCurrentRoom = usePvpBattleRoyaleStore((state) => state.leaveCurrentRoom);
  const addBot = usePvpBattleRoyaleStore((state) => state.addBot);
  const removeBot = usePvpBattleRoyaleStore((state) => state.removeBot);
  const startCurrentRoom = usePvpBattleRoyaleStore((state) => state.startCurrentRoom);

  const effectiveRoom = currentRoom ?? room;
  const isHost = effectiveRoom.host_user_id === currentUserId;
  const canStart = effectiveRoom.participant_count >= 2 && effectiveRoom.status === 'waiting';

  const humanCards = useMemo(() => effectiveRoom.humans, [effectiveRoom.humans]);
  const botCards = useMemo(() => effectiveRoom.bots, [effectiveRoom.bots]);

  useEffect(() => {
    let cancelled = false;
    const interval = setInterval(async () => {
      const nextRoom = await refreshCurrentRoom();
      if (cancelled || !nextRoom) {
        return;
      }
      if (nextRoom.status === 'in_progress') {
        onStart(nextRoom);
      }
    }, 1800);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [refreshCurrentRoom, onStart]);

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

  const handleStart = async () => {
    setBusyAction('start');
    try {
      const startedRoom = await startCurrentRoom();
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
      className="fixed inset-0 z-50 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.18),transparent_40%),linear-gradient(180deg,rgba(2,6,23,0.92),rgba(2,6,23,0.98))] p-4 overflow-y-auto"
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
                </div>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                  乱斗开始后所有玩家会被投放进大地图，风暴会持续缩圈。多个宠物增益拾取、近战压制和复活答题都在这一局里生效。
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-400">状态</div>
                  <div className="mt-1 text-lg font-bold text-white">
                    {effectiveRoom.status === 'waiting' ? '候场中' : '进行中'}
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
                    <div className="text-sm text-slate-400">主宠会直接用于战斗渲染和名字展示</div>
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
                            src={getPetImageUrl(fighter.pet_type as any, 'normal', fighter.pet_stage)}
                            alt={fighter.pet_name}
                            className="h-full w-full object-contain p-2"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <div className="truncate text-lg font-bold text-white">{fighter.username}</div>
                            {fighter.is_host && <Crown className="h-4 w-4 text-amber-300" />}
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
                    <div className="text-sm text-slate-400">房主可逐个添加，并为每一个人机单独选择难度</div>
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
                    <div className="mt-2 text-sm text-slate-400">建议先用简单难度铺满位置，再逐个添加更高难度。</div>
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
                              src={getPetImageUrl(bot.pet_type as any, 'normal', bot.pet_stage)}
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
                              onClick={() => removeBot(bot.id)}
                              className="rounded-full border border-white/10 p-2 text-slate-300 transition hover:border-red-300/40 hover:text-red-200"
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
                <div className="text-lg font-bold text-white">开战前提醒</div>
                <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
                  <li>风暴会逐步缩向地图中心，站在圈外会持续掉血。</li>
                  <li>死亡后会触发 3 题复活问答，必须全部答对才会半血复活。</li>
                  <li>复活成功后会丢失上一条命拾到的护盾、护甲和武器增益。</li>
                  <li>开放世界里已经解锁的机动能力会在乱斗里继续生效。</li>
                </ul>
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
                  disabled={!isHost || busyAction === 'bot' || effectiveRoom.status !== 'waiting'}
                  onClick={handleAddBot}
                  data-testid="br-add-bot"
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#14b8a6,#2563eb)] px-6 py-3 text-sm font-bold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Bot className="h-4 w-4" />
                  {busyAction === 'bot' ? '添加中...' : `添加${difficultyOptions.find((item) => item.value === selectedDifficulty)?.label ?? '简单'}人机`}
                </button>
              </section>

              {error && (
                <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                  {error}
                </div>
              )}

              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  disabled={!isHost || !canStart || busyAction === 'start'}
                  onClick={handleStart}
                  data-testid="br-start-match"
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#f97316,#dc2626)] px-6 py-3 text-sm font-bold text-white shadow-[0_18px_34px_rgba(220,38,38,0.26)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Play className="h-4 w-4" />
                  {busyAction === 'start' ? '投放中...' : '开始生存乱斗'}
                </button>
                <button
                  type="button"
                  disabled={busyAction === 'leave'}
                  onClick={handleLeave}
                  className="flex w-full items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-6 py-3 text-sm font-bold text-white transition hover:border-white/20 hover:bg-white/10 disabled:opacity-60"
                >
                  <LogOut className="h-4 w-4" />
                  {busyAction === 'leave' ? '退出中...' : '离开房间'}
                </button>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
