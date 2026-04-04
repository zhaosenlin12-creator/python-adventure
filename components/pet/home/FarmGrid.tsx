'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { DECORATIONS, PlacedDecoration } from '@/types/decoration';

/**
 * 🌾 田地系统 — 2×4 农田格子
 *
 * 格子坐标与 CozyRoomBackground 中的田地土壤背景对齐：
 *   土壤背景: left 3%, bottom 8%, width 38%, height 16%
 *   → viewport top 76%–92%
 */

// ── 田地格子坐标（视口百分比） ──────────────────
export const FARM_PLOTS = [
  { id: 0, row: 0, col: 0, x: 8,  y: 80 },
  { id: 1, row: 0, col: 1, x: 17, y: 80 },
  { id: 2, row: 0, col: 2, x: 27, y: 80 },
  { id: 3, row: 0, col: 3, x: 36, y: 80 },
  { id: 4, row: 1, col: 0, x: 8,  y: 88 },
  { id: 5, row: 1, col: 1, x: 17, y: 88 },
  { id: 6, row: 1, col: 2, x: 27, y: 88 },
  { id: 7, row: 1, col: 3, x: 36, y: 88 },
] as const;

export type FarmPlot = (typeof FARM_PLOTS)[number];

const SNAP_THRESHOLD = 8;   // 最大吸附距离 (%)
const PROXIMITY = 5;         // 判定「已占用」的容差 (%)

// ── 工具函数 ────────────────────────────────────

/** 是否为可种植装饰（plant / nature 类型） */
export function isPlantable(decorationId: string): boolean {
  const d = DECORATIONS[decorationId];
  return d?.type === 'plant' || d?.type === 'nature';
}

/** 获取已被占用的格子 ID 集合 */
export function getOccupiedPlotIds(gardenDecorations: PlacedDecoration[]): Set<number> {
  const ids = new Set<number>();
  for (const placed of gardenDecorations) {
    if (!isPlantable(placed.decorationId)) continue;
    for (const plot of FARM_PLOTS) {
      if (Math.abs(placed.x - plot.x) < PROXIMITY && Math.abs(placed.y - plot.y) < PROXIMITY) {
        ids.add(plot.id);
        break;
      }
    }
  }
  return ids;
}

/** 查找最近的空闲田地格子（在 SNAP_THRESHOLD 范围内） */
export function findNearestFarmPlot(
  x: number,
  y: number,
  occupiedPlotIds: Set<number>,
): FarmPlot | null {
  let nearest: FarmPlot | null = null;
  let minDist = Infinity;
  for (const plot of FARM_PLOTS) {
    if (occupiedPlotIds.has(plot.id)) continue;
    const dist = Math.sqrt((x - plot.x) ** 2 + (y - plot.y) ** 2);
    if (dist < SNAP_THRESHOLD && dist < minDist) {
      minDist = dist;
      nearest = plot;
    }
  }
  return nearest;
}

// ── 组件 ────────────────────────────────────────

interface FarmGridProps {
  placedDecorations: PlacedDecoration[];
}

export default function FarmGrid({ placedDecorations }: FarmGridProps) {
  const occupiedIds = useMemo(
    () => getOccupiedPlotIds(placedDecorations),
    [placedDecorations],
  );

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 8 }}>
      {FARM_PLOTS.map((plot) => {
        const isOccupied = occupiedIds.has(plot.id);
        return (
          <div
            key={plot.id}
            className="absolute flex items-center justify-center"
            style={{
              left: `${plot.x}%`,
              top: `${plot.y}%`,
              transform: 'translate(-50%, -50%)',
              width: '8%',
              minWidth: '48px',
              aspectRatio: '1',
            }}
          >
            {isOccupied ? (
              <>
                <div
                  className="absolute inset-[6%] rounded-[18px] border border-emerald-900/25"
                  style={{
                    background:
                      'linear-gradient(180deg, rgba(58,88,34,0.52) 0%, rgba(67,101,38,0.24) 32%, rgba(74,52,28,0.24) 100%)',
                    boxShadow: 'inset 0 2px 8px rgba(14,116,48,0.18)',
                  }}
                />
                <motion.div
                  className="absolute inset-[12%] rounded-[18px]"
                  style={{
                    background: 'radial-gradient(circle, rgba(74,222,128,0.22) 0%, transparent 72%)',
                  }}
                  animate={{ scale: [1, 1.15, 1], opacity: [0.42, 0.18, 0.42] }}
                  transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
                />
                <div className="absolute left-[22%] top-[20%] h-[55%] w-[8%] rounded-full bg-emerald-300/45 blur-[1px]" />
                <div className="absolute left-[40%] top-[16%] h-[62%] w-[8%] rounded-full bg-green-200/45 blur-[1px]" />
                <div className="absolute left-[58%] top-[24%] h-[50%] w-[8%] rounded-full bg-lime-200/40 blur-[1px]" />
              </>
            ) : (
              <div
                className="relative h-[78%] w-[78%] overflow-hidden rounded-[18px] border border-amber-900/18"
                style={{
                  background:
                    'linear-gradient(180deg, rgba(118,78,36,0.4) 0%, rgba(88,56,26,0.62) 100%)',
                  boxShadow: 'inset 0 1px 6px rgba(255,226,168,0.08), 0 6px 10px rgba(15,23,42,0.08)',
                }}
              >
                <div
                  className="absolute inset-0 opacity-45"
                  style={{
                    backgroundImage:
                      'repeating-linear-gradient(0deg, transparent 0, transparent 8px, rgba(51,33,14,0.22) 8px, rgba(51,33,14,0.22) 10px)',
                  }}
                />
                <div className="absolute inset-x-[22%] top-[28%] h-[2px] rounded-full bg-amber-100/20" />
                <div className="absolute inset-x-[30%] top-[50%] h-[2px] rounded-full bg-amber-100/16" />
                <div className="absolute inset-x-[38%] top-[68%] h-[2px] rounded-full bg-amber-100/12" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
