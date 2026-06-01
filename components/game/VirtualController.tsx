'use client';

import React, { useCallback, useEffect, useRef } from 'react';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Sparkles,
  Swords,
  Wind,
} from 'lucide-react';
import { touchInputManager } from '@/lib/input/TouchInputManager';

interface VirtualControllerProps {
  visible?: boolean;
  opacity?: number;
}

export default function VirtualController({
  visible = true,
  opacity = 0.6,
}: VirtualControllerProps) {
  const dpadRef = useRef<HTMLDivElement>(null);

  const handleDirectionStart = useCallback((direction: 'left' | 'right' | 'up' | 'down') => {
    touchInputManager.setDirection(direction, true);
  }, []);

  const handleDirectionEnd = useCallback((direction: 'left' | 'right' | 'up' | 'down') => {
    touchInputManager.setDirection(direction, false);
  }, []);

  const handleActionStart = useCallback((action: 'jump' | 'attack' | 'interact' | 'dash') => {
    touchInputManager.setAction(action, true);
  }, []);

  const handleActionEnd = useCallback((action: 'jump' | 'attack' | 'interact' | 'dash') => {
    touchInputManager.setAction(action, false);
  }, []);

  useEffect(() => {
    return () => {
      touchInputManager.reset();
    };
  }, []);

  if (!visible) return null;

  const buttonStyle = {
    opacity,
    touchAction: 'none' as const,
    userSelect: 'none' as const,
    WebkitUserSelect: 'none' as const,
    WebkitTouchCallout: 'none' as const,
  };

  return (
    <div className="pointer-events-none fixed inset-0 z-50" style={{ touchAction: 'none' }}>
      <div ref={dpadRef} className="pointer-events-auto absolute bottom-7 left-4" style={buttonStyle}>
        <div className="relative h-40 w-40">
          <div className="absolute inset-4 rounded-full border border-white/10 bg-slate-950/28 backdrop-blur-md" />
          <DPadButton
            direction="up"
            className="absolute left-1/2 top-0 -translate-x-1/2"
            onStart={() => handleDirectionStart('up')}
            onEnd={() => handleDirectionEnd('up')}
          />
          <DPadButton
            direction="down"
            className="absolute bottom-0 left-1/2 -translate-x-1/2"
            onStart={() => handleDirectionStart('down')}
            onEnd={() => handleDirectionEnd('down')}
          />
          <DPadButton
            direction="left"
            className="absolute left-0 top-1/2 -translate-y-1/2"
            onStart={() => handleDirectionStart('left')}
            onEnd={() => handleDirectionEnd('left')}
          />
          <DPadButton
            direction="right"
            className="absolute right-0 top-1/2 -translate-y-1/2"
            onStart={() => handleDirectionStart('right')}
            onEnd={() => handleDirectionEnd('right')}
          />
          <div className="absolute left-1/2 top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/14 bg-slate-900/88 shadow-[inset_0_2px_10px_rgba(0,0,0,0.42)]">
            <div className="h-5 w-5 rounded-full bg-white/16" />
          </div>
        </div>
      </div>

      <div className="pointer-events-auto absolute bottom-5 right-4" style={buttonStyle}>
        <div className="relative h-44 w-44">
          <div className="absolute inset-4 rounded-full border border-white/10 bg-slate-950/28 backdrop-blur-md" />
          <ActionButton
            label="跳"
            subLabel="Jump"
            color="green"
            icon={<ChevronUp className="h-5 w-5" />}
            className="absolute left-1/2 top-0 -translate-x-1/2"
            onStart={() => handleActionStart('jump')}
            onEnd={() => handleActionEnd('jump')}
          />
          <ActionButton
            label="攻"
            subLabel="Hit"
            color="red"
            icon={<Swords className="h-4.5 w-4.5" />}
            className="absolute right-0 top-1/2 -translate-y-1/2"
            onStart={() => handleActionStart('attack')}
            onEnd={() => handleActionEnd('attack')}
          />
          <ActionButton
            label="技"
            subLabel="Use"
            color="yellow"
            icon={<Sparkles className="h-4.5 w-4.5" />}
            className="absolute left-0 top-1/2 -translate-y-1/2"
            onStart={() => handleActionStart('interact')}
            onEnd={() => handleActionEnd('interact')}
          />
          <ActionButton
            label="冲"
            subLabel="Dash"
            color="blue"
            icon={<Wind className="h-4.5 w-4.5" />}
            className="absolute bottom-0 left-1/2 -translate-x-1/2"
            onStart={() => handleActionStart('dash')}
            onEnd={() => handleActionEnd('dash')}
          />
        </div>
      </div>
    </div>
  );
}

interface DPadButtonProps {
  direction: 'up' | 'down' | 'left' | 'right';
  className?: string;
  onStart: () => void;
  onEnd: () => void;
}

function DPadButton({ direction, className, onStart, onEnd }: DPadButtonProps) {
  const [pressed, setPressed] = React.useState(false);

  const handleTouchStart = useCallback((event: React.TouchEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setPressed(true);
    onStart();
  }, [onStart]);

  const handleTouchEnd = useCallback((event: React.TouchEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setPressed(false);
    onEnd();
  }, [onEnd]);

  const arrows = {
    up: <ChevronUp className="h-6 w-6" />,
    down: <ChevronDown className="h-6 w-6" />,
    left: <ChevronLeft className="h-6 w-6" />,
    right: <ChevronRight className="h-6 w-6" />,
  };

  return (
    <button
      className={`flex h-14 w-14 items-center justify-center rounded-2xl border text-white transition-all duration-75 ${className ?? ''}`}
      style={{
        background: pressed
          ? 'linear-gradient(180deg, rgba(31,41,55,0.98), rgba(15,23,42,0.98))'
          : 'linear-gradient(180deg, rgba(71,85,105,0.9), rgba(30,41,59,0.92))',
        borderColor: pressed ? 'rgba(226,232,240,0.38)' : 'rgba(226,232,240,0.24)',
        transform: pressed ? 'scale(0.94)' : 'scale(1)',
        boxShadow: pressed
          ? 'inset 0 4px 10px rgba(0,0,0,0.44)'
          : '0 10px 22px rgba(15,23,42,0.3), inset 0 1px 0 rgba(255,255,255,0.12)',
        touchAction: 'none',
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      onContextMenu={(event) => event.preventDefault()}
      aria-label={`方向键 ${direction}`}
    >
      {arrows[direction]}
    </button>
  );
}

interface ActionButtonProps {
  label: string;
  subLabel: string;
  color: 'green' | 'red' | 'blue' | 'yellow';
  icon: React.ReactNode;
  className?: string;
  onStart: () => void;
  onEnd: () => void;
}

function ActionButton({
  label,
  subLabel,
  color,
  icon,
  className,
  onStart,
  onEnd,
}: ActionButtonProps) {
  const [pressed, setPressed] = React.useState(false);

  const handleTouchStart = useCallback((event: React.TouchEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setPressed(true);
    onStart();
  }, [onStart]);

  const handleTouchEnd = useCallback((event: React.TouchEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setPressed(false);
    onEnd();
  }, [onEnd]);

  const colors = {
    green: {
      bg: 'linear-gradient(180deg, rgba(52,211,153,0.92), rgba(16,185,129,0.92))',
      pressedBg: 'linear-gradient(180deg, rgba(5,150,105,0.96), rgba(4,120,87,0.96))',
      border: 'rgba(209,250,229,0.72)',
      glow: 'rgba(52,211,153,0.3)',
    },
    red: {
      bg: 'linear-gradient(180deg, rgba(251,113,133,0.92), rgba(239,68,68,0.92))',
      pressedBg: 'linear-gradient(180deg, rgba(225,29,72,0.96), rgba(190,24,93,0.96))',
      border: 'rgba(254,205,211,0.72)',
      glow: 'rgba(251,113,133,0.28)',
    },
    blue: {
      bg: 'linear-gradient(180deg, rgba(96,165,250,0.92), rgba(34,197,246,0.92))',
      pressedBg: 'linear-gradient(180deg, rgba(37,99,235,0.96), rgba(8,145,178,0.96))',
      border: 'rgba(191,219,254,0.72)',
      glow: 'rgba(96,165,250,0.28)',
    },
    yellow: {
      bg: 'linear-gradient(180deg, rgba(250,204,21,0.92), rgba(245,158,11,0.92))',
      pressedBg: 'linear-gradient(180deg, rgba(217,119,6,0.96), rgba(180,83,9,0.96))',
      border: 'rgba(254,240,138,0.74)',
      glow: 'rgba(250,204,21,0.28)',
    },
  };

  const colorStyle = colors[color];

  return (
    <button
      className={`flex h-16 w-16 flex-col items-center justify-center rounded-full border text-white transition-all duration-75 ${className ?? ''}`}
      style={{
        background: pressed ? colorStyle.pressedBg : colorStyle.bg,
        borderColor: colorStyle.border,
        transform: pressed ? 'scale(0.9)' : 'scale(1)',
        boxShadow: pressed
          ? 'inset 0 4px 10px rgba(0,0,0,0.48)'
          : `0 14px 24px ${colorStyle.glow}, inset 0 -3px 8px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.18)`,
        touchAction: 'none',
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      onContextMenu={(event) => event.preventDefault()}
      aria-label={`${label} ${subLabel}`}
    >
      <div className="mb-0.5">{icon}</div>
      <div className="text-[10px] font-bold leading-none">{label}</div>
      <div className="mt-0.5 text-[8px] uppercase tracking-[0.16em] text-white/75">{subLabel}</div>
    </button>
  );
}

export { DPadButton, ActionButton };
