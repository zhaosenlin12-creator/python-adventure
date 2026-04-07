'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Crown,
  LogIn,
  Plus,
  RefreshCw,
  Shield,
  Sword,
  Users,
  X,
} from 'lucide-react';

import { getPetImageUrl } from '@/lib/config/petAssets';
import { usePetStore } from '@/store/petStore';
import { usePvpBattleRoyaleStore } from '@/store/pvpBattleRoyaleStore';
import type { BattleRoyaleRoom } from '@/types/pvp-br';

interface PvpBattleRoyaleLobbyProps {
  onClose: () => void;
  onEnterRoom: (room: BattleRoyaleRoom) => void;
  onResumeActiveRoom?: () => void;
  isRecovering?: boolean;
}

export default function PvpBattleRoyaleLobby({
  onClose,
  onEnterRoom,
  onResumeActiveRoom,
  isRecovering = false,
}: PvpBattleRoyaleLobbyProps) {
  const [tab, setTab] = useState<'create' | 'join'>('create');
  const [roomName, setRoomName] = useState('宠物生存乱斗');

  const currentPet = usePetStore((state) => state.currentPet);
  const cap = usePvpBattleRoyaleStore((state) => state.cap);
  const rooms = usePvpBattleRoyaleStore((state) => state.rooms);
  const isLoading = usePvpBattleRoyaleStore((state) => state.isLoading);
  const error = usePvpBattleRoyaleStore((state) => state.error);
  const fetchRooms = usePvpBattleRoyaleStore((state) => state.fetchRooms);
  const createRoom = usePvpBattleRoyaleStore((state) => state.createRoom);
  const joinRoom = usePvpBattleRoyaleStore((state) => state.joinRoom);
  const setError = usePvpBattleRoyaleStore((state) => state.setError);

  const previewImage = useMemo(
    () =>
      getPetImageUrl(
        currentPet?.petType ?? 'code_kitty',
        currentPet?.status ?? 'normal',
        currentPet?.evolution_stage,
      ),
    [currentPet],
  );

  const waitingRooms = useMemo(
    () => rooms.filter((room) => room.status === 'waiting'),
    [rooms],
  );
  const waitingRoom = waitingRooms[0] ?? null;
  const hasOpenWaitingRoom = Boolean(waitingRoom);
  const stableRoomCapacity = Math.min(Math.max(cap, 2), 6);

  useEffect(() => {
    void fetchRooms();

    const refreshIfVisible = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        return;
      }
      void fetchRooms();
    };

    const interval = setInterval(() => {
      refreshIfVisible();
    }, 5000);
    document.addEventListener('visibilitychange', refreshIfVisible);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', refreshIfVisible);
    };
  }, [fetchRooms]);

  useEffect(() => {
    if (hasOpenWaitingRoom && tab === 'create') {
      setTab('join');
    }
  }, [hasOpenWaitingRoom, tab]);

  const handleCreate = async () => {
    try {
      const createdRoom = await createRoom(roomName.trim() || '宠物生存乱斗', stableRoomCapacity);
      onEnterRoom(createdRoom);
    } catch {
      return;
    }
  };

  const handleJoin = async (room: BattleRoyaleRoom) => {
    try {
      const joinedRoom = await joinRoom(room.id);
      onEnterRoom(joinedRoom);
    } catch {
      return;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      data-testid="br-lobby"
      className="fixed inset-0 z-50 overflow-y-auto bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.18),transparent_45%),linear-gradient(180deg,rgba(2,6,23,0.92),rgba(2,6,23,0.97))] p-4 backdrop-blur-md"
    >
      <div className="mx-auto flex min-h-full max-w-6xl items-center justify-center">
        <motion.div
          initial={{ y: 28, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 18, opacity: 0 }}
          className="w-full overflow-hidden rounded-[32px] border border-cyan-400/15 bg-[linear-gradient(145deg,rgba(15,23,42,0.97),rgba(10,15,30,0.98))] shadow-[0_30px_90px_rgba(2,6,23,0.55)]"
        >
          <div className="border-b border-white/10 px-6 py-6 sm:px-8">
            <div className="flex items-start justify-between gap-4">
              <div className="max-w-3xl">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-cyan-100">
                  <Shield className="h-3.5 w-3.5" />
                  稳定双人协作
                </div>
                <h2 className="text-3xl font-black tracking-tight text-white sm:text-4xl">宠物生存乱斗</h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                  带着当前跟随宠物进入协作战场。真人队伍最多 2 人，其余名额用人机补足；缩圈、武器和护盾机制保留，
                  但胜负改成小队合作清场，更适合当前服务器稳定运行。
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-white/10 p-2 text-slate-300 transition hover:border-cyan-300/40 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="grid gap-6 p-6 sm:grid-cols-[360px_minmax(0,1fr)] sm:p-8">
            <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
              <div className="flex items-center gap-4">
                <div className="relative h-20 w-20 overflow-hidden rounded-[22px] border border-cyan-300/20 bg-slate-900/80">
                  <img
                    src={previewImage}
                    alt={currentPet?.name ?? 'Current pet'}
                    className="h-full w-full object-contain p-2"
                  />
                </div>
                <div>
                  <div className="text-xs uppercase tracking-[0.25em] text-cyan-200/70">当前出战主宠</div>
                  <div className="mt-1 text-xl font-bold text-white">{currentPet?.name ?? 'Battle Pet'}</div>
                  <div className="text-sm text-slate-400">
                    {currentPet
                      ? '当前跟随宠物会直接作为你的乱斗外观和战斗形象。'
                      : '如果还没有设置主宠，系统会默认使用 code_kitty 出战。'}
                  </div>
                </div>
              </div>

              <div className="mt-6 rounded-3xl border border-white/10 bg-slate-900/70 p-2">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTab('create')}
                    className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                      tab === 'create'
                        ? 'bg-cyan-500/15 text-cyan-100 shadow-[0_0_0_1px_rgba(34,211,238,0.2)]'
                        : 'text-slate-400 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    创建房间
                  </button>
                  <button
                    type="button"
                    onClick={() => setTab('join')}
                    className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                      tab === 'join'
                        ? 'bg-cyan-500/15 text-cyan-100 shadow-[0_0_0_1px_rgba(34,211,238,0.2)]'
                        : 'text-slate-400 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    加入房间
                  </button>
                </div>
              </div>

              <AnimatePresence mode="wait">
                {tab === 'create' ? (
                  <motion.div
                    key="create"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="mt-5 space-y-4"
                  >
                    <label className="block">
                      <div className="mb-2 text-sm font-semibold text-white">房间名称</div>
                      <input
                        value={roomName}
                        onChange={(event) => setRoomName(event.target.value)}
                        maxLength={48}
                        className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-white outline-none transition focus:border-cyan-300/50"
                        placeholder="例如：黄昏竞技场"
                      />
                    </label>

                    <div className="rounded-2xl border border-cyan-300/15 bg-cyan-500/10 px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-white">房间规模</div>
                          <div className="mt-1 text-xs leading-5 text-slate-300">
                            当前模式为 1 到 2 名真人加人机，总房间上限仍为 6。
                          </div>
                        </div>
                        <span className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-1 text-sm font-bold text-cyan-100">
                          {stableRoomCapacity}/{stableRoomCapacity}
                        </span>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm leading-6 text-amber-100">
                      房主可以在等待室逐个添加不同难度的人机。建议真人只保留 1 到 2 人，其余用人机补足，
                      这样延迟更稳，房主切换后的续局也更可靠。
                    </div>

                    {hasOpenWaitingRoom && waitingRoom && (
                      <div className="rounded-2xl border border-cyan-300/20 bg-cyan-500/10 px-4 py-3 text-sm leading-6 text-cyan-50">
                        当前已经有一个等待中的房间：
                        <span className="font-semibold text-white"> {waitingRoom.room_name}</span>
                        （{waitingRoom.id}）。
                        为了保证服务器稳定，同一时间不会再开放第二个房间，请直接加入右侧现有房间。
                      </div>
                    )}

                    <button
                      type="button"
                      disabled={isLoading || hasOpenWaitingRoom}
                      onClick={() => void handleCreate()}
                      data-testid="br-create-room"
                      className="flex w-full items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#14b8a6,#2563eb)] px-6 py-3 text-sm font-bold text-white shadow-[0_18px_40px_rgba(37,99,235,0.28)] transition hover:brightness-110 disabled:opacity-60"
                    >
                      <Plus className="h-4 w-4" />
                      {isLoading
                        ? '正在创建...'
                        : hasOpenWaitingRoom
                          ? '已有房间开放，请先加入'
                          : '创建生存乱斗房间'}
                    </button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="join"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="mt-5 rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-4 text-sm leading-6 text-slate-300"
                  >
                    点击右侧任意等待中的房间即可加入。进入后会自动带上当前主宠，并实时同步房主的开战状态。
                    {waitingRooms.length === 0 ? ' 当前没有可加入的空房间；如果服务器空闲，你可以先创建一个。' : ''}
                  </motion.div>
                )}
              </AnimatePresence>

              {error && (
                <div className="mt-4 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                  {error}
                </div>
              )}

              {onResumeActiveRoom && (
                <button
                  type="button"
                  onClick={onResumeActiveRoom}
                  disabled={isRecovering}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/[0.1] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <RefreshCw className={`h-4 w-4 ${isRecovering ? 'animate-spin' : ''}`} />
                  {isRecovering ? '正在检查可恢复房间...' : '恢复未结束的乱斗房间'}
                </button>
              )}
            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <div className="text-lg font-bold text-white">等待中的乱斗房间</div>
                  <div className="text-sm text-slate-400">
                    加入后会在等待室同步成员变化和开战状态。满员房间会直接显示为不可加入。
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    void fetchRooms();
                  }}
                  data-testid="br-refresh-rooms"
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-cyan-300/40 hover:text-white"
                >
                  <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                  刷新
                </button>
              </div>

              <div className="grid gap-4">
                {rooms.length === 0 ? (
                  <div className="rounded-[24px] border border-dashed border-white/10 bg-slate-950/60 px-6 py-10 text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-cyan-500/10 text-cyan-100">
                      <Sword className="h-7 w-7" />
                    </div>
                    <div className="text-lg font-bold text-white">当前没有等待中的房间</div>
                    <div className="mt-2 text-sm text-slate-400">
                      服务器同一时间只开放一个房间；当前空闲时可以直接创建。
                    </div>
                  </div>
                ) : (
                  rooms.map((room) => {
                    const isFull = room.participant_count >= room.max_players;
                    const canJoin = room.status === 'waiting' && !isFull;

                    return (
                      <div
                        key={room.id}
                        data-testid={`br-room-card-${room.id}`}
                        className="rounded-[24px] border border-white/10 bg-slate-950/65 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
                      >
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="text-lg font-bold text-white">{room.room_name}</div>
                              <span className="rounded-full border border-cyan-300/20 bg-cyan-500/10 px-2 py-1 text-xs font-semibold text-cyan-100">
                                {room.id}
                              </span>
                              {isFull && (
                                <span className="rounded-full border border-amber-300/20 bg-amber-500/10 px-2 py-1 text-xs font-semibold text-amber-100">
                                  房间已满
                                </span>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-400">
                              <span className="inline-flex items-center gap-1">
                                <Crown className="h-4 w-4 text-amber-300" />
                                房主：{room.host_username}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <Users className="h-4 w-4 text-cyan-200" />
                                {room.participant_count}/{room.max_players}
                              </span>
                              <span>{room.bot_count} 个 AI 人机</span>
                            </div>

                            {isFull && (
                              <div className="rounded-2xl border border-amber-300/15 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
                                当前人数已经达到上限，无法继续加入。请刷新列表或选择其他房间。
                              </div>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => void handleJoin(room)}
                            disabled={!canJoin || isLoading}
                            data-testid={`br-join-room-${room.id}`}
                            className="inline-flex items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#0ea5e9,#2563eb)] px-5 py-3 text-sm font-bold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-55"
                          >
                            <LogIn className="h-4 w-4" />
                            {isFull ? '房间已满' : '加入房间'}
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
