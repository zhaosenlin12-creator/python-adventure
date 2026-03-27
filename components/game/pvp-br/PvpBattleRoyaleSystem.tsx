'use client';

import { useCallback, useEffect, useState } from 'react';

import PvpBattleRoyaleArena from '@/components/game/pvp-br/PvpBattleRoyaleArena';
import PvpBattleRoyaleLobby from '@/components/game/pvp-br/PvpBattleRoyaleLobby';
import PvpBattleRoyaleRoom from '@/components/game/pvp-br/PvpBattleRoyaleRoom';
import { usePvpBattleRoyaleStore } from '@/store/pvpBattleRoyaleStore';
import type { BattleRoyaleRoom } from '@/types/pvp-br';

type RoyalePhase = 'lobby' | 'room' | 'arena';

interface PvpBattleRoyaleSystemProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PvpBattleRoyaleSystem({ isOpen, onClose }: PvpBattleRoyaleSystemProps) {
  const [phase, setPhase] = useState<RoyalePhase>('lobby');
  const [isRecovering, setIsRecovering] = useState(false);
  const currentRoom = usePvpBattleRoyaleStore((state) => state.currentRoom);
  const fetchMyActiveRoom = usePvpBattleRoyaleStore((state) => state.fetchMyActiveRoom);
  const setCurrentRoom = usePvpBattleRoyaleStore((state) => state.setCurrentRoom);
  const leaveCurrentRoom = usePvpBattleRoyaleStore((state) => state.leaveCurrentRoom);
  const reset = usePvpBattleRoyaleStore((state) => state.reset);

  useEffect(() => {
    if (!isOpen) {
      setPhase('lobby');
      setIsRecovering(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || currentRoom) {
      return;
    }

    let cancelled = false;
    setIsRecovering(true);

    const tryRecover = async () => {
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const activeRoom = await fetchMyActiveRoom();
        if (cancelled) {
          return;
        }
        if (activeRoom) {
          setCurrentRoom(activeRoom);
          setPhase(activeRoom.status === 'in_progress' ? 'arena' : 'room');
          setIsRecovering(false);
          return;
        }
        if (attempt < 2) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }

      if (!cancelled) {
        setIsRecovering(false);
      }
    };

    void tryRecover();

    return () => {
      cancelled = true;
    };
  }, [currentRoom, fetchMyActiveRoom, isOpen, setCurrentRoom]);

  const handleClose = useCallback(async () => {
    if (phase === 'room') {
      await leaveCurrentRoom();
    }
    reset();
    setPhase('lobby');
    onClose();
    window.dispatchEvent(new Event('modal-closed'));
  }, [leaveCurrentRoom, onClose, phase, reset]);

  const handleEnterRoom = useCallback((room: BattleRoyaleRoom) => {
    setCurrentRoom(room);
    setPhase(room.status === 'in_progress' ? 'arena' : 'room');
  }, [setCurrentRoom]);

  const handleArenaExit = useCallback(() => {
    reset();
    setPhase('lobby');
    setIsRecovering(false);
    onClose();
    window.dispatchEvent(new Event('modal-closed'));
  }, [onClose, reset]);

  if (!isOpen) return null;

  if (isRecovering && !currentRoom) {
    return null;
  }

  if (phase === 'arena' && currentRoom) {
    return <PvpBattleRoyaleArena room={currentRoom} onExit={handleArenaExit} />;
  }

  if (phase === 'room' && currentRoom) {
    return (
      <PvpBattleRoyaleRoom
        room={currentRoom}
        onLeave={handleClose}
        onStart={(room) => {
          setCurrentRoom(room);
          setPhase('arena');
        }}
      />
    );
  }

  return (
    <PvpBattleRoyaleLobby
      onClose={handleClose}
      onEnterRoom={handleEnterRoom}
    />
  );
}
