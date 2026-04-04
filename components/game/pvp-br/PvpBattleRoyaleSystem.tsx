'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import PvpBattleRoyaleArena from '@/components/game/pvp-br/PvpBattleRoyaleArena';
import PvpBattleRoyaleLobby from '@/components/game/pvp-br/PvpBattleRoyaleLobby';
import PvpBattleRoyaleRoom from '@/components/game/pvp-br/PvpBattleRoyaleRoom';
import { useGlobalUiStore } from '@/store/globalUiStore';
import { usePvpBattleRoyaleStore } from '@/store/pvpBattleRoyaleStore';
import type { BattleRoyaleRoom } from '@/types/pvp-br';

type RoyalePhase = 'lobby' | 'room' | 'arena';

interface PvpBattleRoyaleSystemProps {
  isOpen: boolean;
  onClose: () => void;
}

const DEFAULT_LOADING_LABEL = '正在进入宠物生存乱斗...';
const RECOVER_LOADING_LABEL = '正在检查未结束的乱斗房间...';
const ARENA_LOADING_LABEL = '正在加载战场并同步房间...';

export default function PvpBattleRoyaleSystem({ isOpen, onClose }: PvpBattleRoyaleSystemProps) {
  const [phase, setPhase] = useState<RoyalePhase>('lobby');
  const [isRecovering, setIsRecovering] = useState(false);
  const [loadingLabel, setLoadingLabel] = useState(DEFAULT_LOADING_LABEL);
  const autoRecoverAttemptedRef = useRef(false);
  const recoveryRequestIdRef = useRef(0);

  const currentRoom = usePvpBattleRoyaleStore((state) => state.currentRoom);
  const fetchMyActiveRoom = usePvpBattleRoyaleStore((state) => state.fetchMyActiveRoom);
  const setCurrentRoom = usePvpBattleRoyaleStore((state) => state.setCurrentRoom);
  const leaveCurrentRoom = usePvpBattleRoyaleStore((state) => state.leaveCurrentRoom);
  const reset = usePvpBattleRoyaleStore((state) => state.reset);
  const setBattleRoyaleActive = useGlobalUiStore((state) => state.setBattleRoyaleActive);

  useEffect(() => {
    setBattleRoyaleActive(isOpen);

    return () => {
      setBattleRoyaleActive(false);
    };
  }, [isOpen, setBattleRoyaleActive]);

  useEffect(() => {
    if (!isOpen) {
      recoveryRequestIdRef.current += 1;
      autoRecoverAttemptedRef.current = false;
      setPhase('lobby');
      setIsRecovering(false);
      setLoadingLabel(DEFAULT_LOADING_LABEL);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || currentRoom || isRecovering || autoRecoverAttemptedRef.current) {
      return;
    }

    const requestId = recoveryRequestIdRef.current + 1;
    recoveryRequestIdRef.current = requestId;
    autoRecoverAttemptedRef.current = true;
    setIsRecovering(true);
    setLoadingLabel(RECOVER_LOADING_LABEL);

    void fetchMyActiveRoom()
      .then((activeRoom) => {
        if (recoveryRequestIdRef.current !== requestId || !activeRoom) {
          return;
        }
        setCurrentRoom(activeRoom);
        setPhase(activeRoom.status === 'in_progress' ? 'arena' : 'room');
      })
      .finally(() => {
        if (recoveryRequestIdRef.current === requestId) {
          setIsRecovering(false);
        }
      });
  }, [currentRoom, fetchMyActiveRoom, isOpen, isRecovering, setCurrentRoom]);

  const handleResumeActiveRoom = useCallback(async () => {
    const requestId = recoveryRequestIdRef.current + 1;
    recoveryRequestIdRef.current = requestId;
    autoRecoverAttemptedRef.current = true;
    setIsRecovering(true);
    setLoadingLabel(RECOVER_LOADING_LABEL);

    try {
      const activeRoom = await fetchMyActiveRoom();
      if (recoveryRequestIdRef.current === requestId && activeRoom) {
        setCurrentRoom(activeRoom);
        setPhase(activeRoom.status === 'in_progress' ? 'arena' : 'room');
      }
    } finally {
      if (recoveryRequestIdRef.current === requestId) {
        setIsRecovering(false);
      }
    }
  }, [fetchMyActiveRoom, setCurrentRoom]);

  const handleClose = useCallback(async () => {
    recoveryRequestIdRef.current += 1;
    autoRecoverAttemptedRef.current = false;
    if (phase === 'room') {
      await leaveCurrentRoom();
    }
    reset();
    setPhase('lobby');
    setIsRecovering(false);
    setLoadingLabel(DEFAULT_LOADING_LABEL);
    onClose();
    window.dispatchEvent(new Event('modal-closed'));
  }, [leaveCurrentRoom, onClose, phase, reset]);

  const handleEnterRoom = useCallback((room: BattleRoyaleRoom) => {
    recoveryRequestIdRef.current += 1;
    autoRecoverAttemptedRef.current = true;
    setCurrentRoom(room);
    setPhase(room.status === 'in_progress' ? 'arena' : 'room');
  }, [setCurrentRoom]);

  const handleArenaExit = useCallback(() => {
    recoveryRequestIdRef.current += 1;
    autoRecoverAttemptedRef.current = false;
    reset();
    setPhase('lobby');
    setIsRecovering(false);
    setLoadingLabel(DEFAULT_LOADING_LABEL);
    onClose();
    window.dispatchEvent(new Event('modal-closed'));
  }, [onClose, reset]);

  const handleRoomStart = useCallback((room: BattleRoyaleRoom) => {
    recoveryRequestIdRef.current += 1;
    autoRecoverAttemptedRef.current = true;
    setLoadingLabel(ARENA_LOADING_LABEL);
    setCurrentRoom(room);
    setPhase('arena');
  }, [setCurrentRoom]);

  if (!isOpen) return null;

  if (isRecovering && !currentRoom) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/86 backdrop-blur-sm">
        <div className="rounded-[28px] border border-cyan-300/15 bg-slate-900/92 px-8 py-7 text-center shadow-[0_22px_70px_rgba(8,15,30,0.5)]">
          <div className="mx-auto mb-4 h-11 w-11 animate-spin rounded-full border-2 border-cyan-300/20 border-t-cyan-300" />
          <div className="text-lg font-semibold text-white">{loadingLabel}</div>
          <div className="mt-2 text-sm text-slate-300">
            如果检测到未结束的房间，系统会自动恢复到当前对局。
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'arena' && currentRoom) {
    return <PvpBattleRoyaleArena room={currentRoom} onExit={handleArenaExit} />;
  }

  if (phase === 'room' && currentRoom) {
    return (
      <PvpBattleRoyaleRoom
        room={currentRoom}
        onLeave={handleClose}
        onStart={handleRoomStart}
      />
    );
  }

  return (
    <PvpBattleRoyaleLobby
      onClose={handleClose}
      onEnterRoom={handleEnterRoom}
      onResumeActiveRoom={() => void handleResumeActiveRoom()}
      isRecovering={isRecovering}
    />
  );
}
