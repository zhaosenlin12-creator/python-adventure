'use client';

import { memo, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Apple, Cpu, Heart, Package2, Shield, Sparkles, X } from 'lucide-react';
import { useFoodStore } from '@/store/foodStore';
import { useAuthStore } from '@/store/authStore';
import { usePetStore } from '@/store/petStore';
import { FoodInventoryItem } from '@/types/food';
import { FoodIcon } from '@/components/ui/FoodIcon';
import { playSound } from '@/lib/utils/soundManager';
import {
  RateLimitError,
  formatWaitTime,
  rateLimitedRequest,
} from '@/lib/utils/rateLimiter';
import FoodInventory from './FoodInventory';

interface FoodSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  petId: number;
  petName?: string;
}

const FEED_TIMEOUT_MS = 12000;
const FEED_COOLDOWN_MS = 700;

type FeedbackTone = 'success' | 'error' | null;

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => reject(new Error(message)), ms);
    promise
      .then((value) => {
        clearTimeout(timeoutId);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
}

function buildSuccessMessage(petName: string | undefined, foodName: string, quantity: number) {
  if (quantity <= 1) {
    return `${petName || '伙伴'}吃下了 1 份${foodName}，状态更好了。`;
  }
  return `${petName || '伙伴'}吃下了 ${quantity} 份${foodName}，这轮补给已经完成。`;
}

function getFriendlyFeedError(error: unknown) {
  const raw = error instanceof Error ? error.message : '未知错误';

  if (error instanceof RateLimitError) {
    return `操作太快了，请 ${formatWaitTime(error.waitTime)} 后再试。`;
  }

  if (raw.includes('Not enough') || raw.includes('库存不足')) {
    return '这份食物已经不够用了，换一份继续喂养吧。';
  }

  if (raw.includes('Failed to fetch') || raw.includes('NetworkError') || raw.includes('网络')) {
    return '网络暂时不稳定，稍后再试一次。';
  }

  if (raw.includes('timeout') || raw.includes('超时') || raw.includes('aborted')) {
    return '请求超时了，稍后再试。';
  }

  return `喂养失败：${raw}`;
}

function FeedEffectRow({
  icon,
  label,
  value,
  colorClass,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  colorClass: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-slate-950/42 px-3 py-2">
      <div className="flex items-center gap-2 text-sm text-slate-300">
        <span className={colorClass}>{icon}</span>
        <span>{label}</span>
      </div>
      <span className={`text-sm font-bold ${colorClass}`}>+{value}</span>
    </div>
  );
}

const FoodPreview = memo(function FoodPreview({
  food,
  isUsing,
  onUseOnce,
  onUseAll,
}: {
  food: FoodInventoryItem;
  isUsing: boolean;
  onUseOnce: () => void;
  onUseAll: () => void;
}) {
  const effects = food.food_type.effects;

  return (
    <div className="border-t border-slate-700/90 px-5 py-5">
      <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.92),rgba(2,6,23,0.86))] p-5 shadow-[0_18px_36px_rgba(2,6,23,0.22)]">
        <div className="flex items-start gap-4">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[24px] border border-white/10 bg-white/[0.05]">
            <FoodIcon
              foodId={food.food_id}
              fallbackEmoji={food.food_type.icon}
              size={64}
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-black text-white">{food.food_type.name}</h3>
                <p className="mt-1 text-sm leading-6 text-slate-400">{food.food_type.description}</p>
              </div>
              <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-semibold text-slate-100">
                x{food.quantity}
              </div>
            </div>

            <div className="mt-4 grid gap-2">
              {effects.hunger ? (
                <FeedEffectRow
                  icon={<Apple className="h-4 w-4" />}
                  label="饱腹恢复"
                  value={effects.hunger}
                  colorClass="text-amber-300"
                />
              ) : null}
              {effects.happiness ? (
                <FeedEffectRow
                  icon={<Heart className="h-4 w-4" />}
                  label="心情提升"
                  value={effects.happiness}
                  colorClass="text-rose-300"
                />
              ) : null}
              {effects.intelligence ? (
                <FeedEffectRow
                  icon={<Cpu className="h-4 w-4" />}
                  label="思考力"
                  value={effects.intelligence}
                  colorClass="text-sky-300"
                />
              ) : null}
              {effects.creativity ? (
                <FeedEffectRow
                  icon={<Sparkles className="h-4 w-4" />}
                  label="创造力"
                  value={effects.creativity}
                  colorClass="text-fuchsia-300"
                />
              ) : null}
              {effects.persistence ? (
                <FeedEffectRow
                  icon={<Shield className="h-4 w-4" />}
                  label="坚持力"
                  value={effects.persistence}
                  colorClass="text-emerald-300"
                />
              ) : null}
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2 text-xs leading-5 text-slate-300">
          喂养窗口会保持打开，方便连续补给。当前食物很多时，可以直接一键全部使用。
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={onUseOnce}
            disabled={isUsing}
            className={`rounded-full px-4 py-2.5 text-sm font-semibold transition ${
              isUsing
                ? 'bg-slate-800 text-slate-500'
                : 'bg-sky-600 text-white hover:bg-sky-500'
            }`}
          >
            {isUsing ? '正在喂养...' : '使用 1 份'}
          </button>

          <button
            type="button"
            onClick={onUseAll}
            disabled={isUsing || food.quantity <= 1}
            className={`rounded-full border px-4 py-2.5 text-sm font-semibold transition ${
              isUsing || food.quantity <= 1
                ? 'border-white/10 bg-slate-900/60 text-slate-500'
                : 'border-emerald-300/24 bg-emerald-500/10 text-white hover:bg-emerald-500/18'
            }`}
          >
            {food.quantity <= 1 ? '库存只有 1 份' : `全部使用 x${food.quantity}`}
          </button>
        </div>
      </div>
    </div>
  );
});

function FoodSelector({ isOpen, onClose, petId, petName }: FoodSelectorProps) {
  const [selectedFoodId, setSelectedFoodId] = useState<string | null>(null);
  const [isFeeding, setIsFeeding] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [feedbackTone, setFeedbackTone] = useState<FeedbackTone>(null);
  const lastFeedTimeRef = useRef(0);

  const { inventory, loadInventory } = useFoodStore();
  const { token } = useAuthStore();
  const { feedPet, loadPets } = usePetStore();

  const selectedFood = useMemo(
    () => inventory.find((item) => item.food_id === selectedFoodId) ?? null,
    [inventory, selectedFoodId]
  );

  const handleClose = useCallback(() => {
    onClose();
    setSelectedFoodId(null);
    setFeedbackMessage(null);
    setFeedbackTone(null);
  }, [onClose]);

  useEffect(() => {
    if (!isOpen || !token) {
      return;
    }

    setFeedbackMessage(null);
    setFeedbackTone(null);
    loadInventory(token, true).catch(() => {});
  }, [isOpen, loadInventory, token]);

  useEffect(() => {
    if (!isOpen) {
      setSelectedFoodId(null);
      return;
    }

    const selectedStillExists = selectedFoodId
      ? inventory.some((item) => item.food_id === selectedFoodId)
      : false;

    if ((!selectedFoodId || !selectedStillExists) && inventory.length > 0) {
      setSelectedFoodId(inventory[0].food_id);
    }
  }, [inventory, isOpen, selectedFoodId]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isFeeding) {
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleClose, isFeeding, isOpen]);

  const handleSelectFood = useCallback((foodId: string) => {
    setSelectedFoodId(foodId);
    setFeedbackMessage(null);
    setFeedbackTone(null);
  }, []);

  const runFeed = useCallback(
    async (requestedQuantity: number) => {
      if (!selectedFoodId || !selectedFood || !token) {
        return;
      }

      const quantity = Math.max(1, Math.min(requestedQuantity, selectedFood.quantity));
      const waitMs = FEED_COOLDOWN_MS - (Date.now() - lastFeedTimeRef.current);
      if (waitMs > 0) {
        setFeedbackTone('error');
        setFeedbackMessage(`操作太快了，请 ${formatWaitTime(waitMs)} 后再试。`);
        return;
      }

      try {
        setIsFeeding(true);
        setFeedbackMessage(null);

        await rateLimitedRequest(
          'pet:feed',
          () =>
            withTimeout(
              feedPet(petId, { foodId: selectedFoodId, quantity }),
              FEED_TIMEOUT_MS,
              '请求超时，请稍后重试'
            ),
          { identifier: `${petId}:${selectedFoodId}` }
        );

        lastFeedTimeRef.current = Date.now();
        playSound('pet_eat');
        setFeedbackTone('success');
        setFeedbackMessage(buildSuccessMessage(petName, selectedFood.food_type.name, quantity));

        await Promise.allSettled([loadPets(), loadInventory(token, true)]);
      } catch (error) {
        setFeedbackTone('error');
        setFeedbackMessage(getFriendlyFeedError(error));

        if (error instanceof Error && error.message.includes('Not enough')) {
          loadInventory(token, true).catch(() => {});
        }
      } finally {
        setIsFeeding(false);
      }
    },
    [feedPet, loadInventory, loadPets, petId, petName, selectedFood, selectedFoodId, token]
  );

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-950/82 px-4 py-6 backdrop-blur-sm"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-3xl max-h-[88vh] overflow-y-auto rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.98),rgba(2,6,23,0.98))] shadow-[0_36px_90px_rgba(2,6,23,0.58)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-white/10 px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/18 bg-amber-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-100">
                <Apple className="h-3.5 w-3.5" />
                Food Care
              </div>
              <h2 className="mt-2 text-xl font-black text-white">喂养 {petName || '当前伙伴'}</h2>
              <p className="mt-1 text-sm leading-6 text-slate-400">
                选择一种食物后，可以单次喂养，也可以一次性把当前库存全部用完。
              </p>
            </div>

            <button
              type="button"
              onClick={handleClose}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
              aria-label="关闭喂养窗口"
            >
              <X className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>

        <FoodInventory
          onSelectFood={handleSelectFood}
          selectedFoodId={selectedFoodId || undefined}
        />

        {feedbackMessage ? (
          <div
            className={`mx-5 mt-4 rounded-2xl border px-4 py-3 text-sm ${
              feedbackTone === 'success'
                ? 'border-emerald-300/18 bg-emerald-500/10 text-emerald-100'
                : 'border-rose-300/18 bg-rose-500/10 text-rose-100'
            }`}
          >
            {feedbackMessage}
          </div>
        ) : null}

        {selectedFood ? (
          <FoodPreview
            food={selectedFood}
            isUsing={isFeeding}
            onUseOnce={() => runFeed(1)}
            onUseAll={() => runFeed(selectedFood.quantity)}
          />
        ) : null}

        {inventory.length === 0 ? (
          <div className="px-5 pb-5 pt-2">
            <div className="rounded-[28px] border border-white/10 bg-white/[0.03] px-5 py-8 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-slate-950/50">
                <Package2 className="h-7 w-7 text-slate-300" />
              </div>
              <h3 className="mt-4 text-lg font-black text-white">背包里还没有食物</h3>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                先去食物补给里买一点，再回来继续照顾伙伴。
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default memo(FoodSelector);
