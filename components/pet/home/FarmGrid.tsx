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
              /* 已种植 — 绿色生长光晕 */
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{
                  background: 'radial-gradient(circle, rgba(74,222,128,0.18) 0%, transparent 70%)',
                }}
                animate={{ scale: [1, 1.25, 1], opacity: [0.4, 0.12, 0.4] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              />
            ) : (
              /* 空地 — 虚线提示 */
              <div className="w-3/4 h-3/4 rounded border border-dashed border-amber-700/20 flex items-center justify-center">
                <span className="opacity-20 text-sm select-none">🌱</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
