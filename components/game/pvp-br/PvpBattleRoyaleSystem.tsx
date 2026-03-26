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
  const currentRoom = usePvpBattleRoyaleStore((state) => state.currentRoom);
  const setCurrentRoom = usePvpBattleRoyaleStore((state) => state.setCurrentRoom);
  const leaveCurrentRoom = usePvpBattleRoyaleStore((state) => state.leaveCurrentRoom);
  const reset = usePvpBattleRoyaleStore((state) => state.reset);

  useEffect(() => {
    if (!isOpen) {
      setPhase('lobby');
    }
  }, [isOpen]);

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
    onClose();
    window.dispatchEvent(new Event('modal-closed'));
  }, [onClose, reset]);

  if (!isOpen) return null;

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
