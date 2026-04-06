'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Coins, Gift, Megaphone, Sparkles, X } from 'lucide-react';

import { getApiBaseUrl } from '@/lib/config/api';
import { useAuthStore } from '@/store/authStore';
import { useCoinStore } from '@/store/coinStore';
import { showCoinRewardToast } from '@/components/ui/CoinRewardToast';

interface SystemAnnouncement {
  slug: string;
  title: string;
  message: string;
  highlights: string[];
  reward_coins: number;
  source_label: string;
  dismiss_key: string;
  granted_now: boolean;
  current_balance: number;
}

interface SystemAnnouncementsResponse {
  announcements: SystemAnnouncement[];
}

interface SystemUpdateAnnouncementProps {
  triggerVariant?: 'floating' | 'toolbar';
}

export default function SystemUpdateAnnouncement({
  triggerVariant = 'floating',
}: SystemUpdateAnnouncementProps) {
  const { isAuthenticated, token, user } = useAuthStore();
  const { loadBalance } = useCoinStore();
  const [announcement, setAnnouncement] = useState<SystemAnnouncement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [portalReady, setPortalReady] = useState(false);
  const rewardToastKeyRef = useRef<string | null>(null);

  useEffect(() => {
    setPortalReady(true);
    return () => {
      setPortalReady(false);
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !token || !user?.id) {
      rewardToastKeyRef.current = null;
      setAnnouncement(null);
      setIsOpen(false);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    const loadAnnouncement = async () => {
      try {
        const response = await fetch(`${getApiBaseUrl()}/users/system-announcements`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          signal: controller.signal,
        });

        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as SystemAnnouncementsResponse;
        const nextAnnouncement = Array.isArray(data.announcements)
          ? (data.announcements[0] ?? null)
          : null;

        if (cancelled) {
          return;
        }

        setAnnouncement(nextAnnouncement);

        if (!nextAnnouncement) {
          setIsOpen(false);
          return;
        }

        loadBalance(token).catch(() => {});

        if (nextAnnouncement.granted_now) {
          const toastKey = `${nextAnnouncement.slug}:${user.id}`;
          if (rewardToastKeyRef.current !== toastKey) {
            rewardToastKeyRef.current = toastKey;
            showCoinRewardToast(nextAnnouncement.reward_coins, nextAnnouncement.source_label, 'reward');
          }
        }

        const dismissed = window.localStorage.getItem(nextAnnouncement.dismiss_key) === 'true';
        setIsOpen(!dismissed);
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }
        console.error('[SystemUpdateAnnouncement] Failed to load announcement:', error);
      }
    };

    loadAnnouncement();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [isAuthenticated, loadBalance, token, user?.id]);

  const handleClose = () => {
    if (announcement) {
      window.localStorage.setItem(announcement.dismiss_key, 'true');
    }
    setIsOpen(false);
  };

  const handleReopen = () => {
    setIsOpen(true);
  };

  if (!announcement) {
    return null;
  }

  const triggerClassName =
    triggerVariant === 'toolbar'
      ? 'inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-400/10 px-3 py-2 text-sm font-semibold text-cyan-100 transition hover:border-cyan-200/50 hover:bg-cyan-400/15'
      : 'fixed right-4 top-24 z-[120] flex items-center gap-2 rounded-full border border-cyan-300/30 bg-slate-900/92 px-4 py-2 text-sm font-semibold text-cyan-100 shadow-[0_18px_40px_rgba(2,6,23,0.4)] transition hover:border-cyan-200/50 hover:bg-slate-800';

  return (
    <>
      {!isOpen && (
        <button
          type="button"
          data-testid="system-update-button"
          onClick={handleReopen}
          className={triggerClassName}
        >
          <Megaphone className="h-4 w-4 text-cyan-300" />
          更新补给
        </button>
      )}

      {portalReady &&
        isOpen &&
        createPortal(
          <div className="fixed inset-0 z-[240] flex items-center justify-center bg-black/60 px-4 py-6 backdrop-blur-sm">
            <div
              data-testid="system-update-modal"
              className="w-full max-w-lg overflow-hidden rounded-[28px] border border-cyan-300/20 bg-slate-900/96 shadow-[0_34px_90px_rgba(2,6,23,0.58)]"
            >
              <div className="relative overflow-hidden border-b border-cyan-300/12 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.14),transparent_48%),linear-gradient(135deg,rgba(15,23,42,0.98),rgba(2,6,23,0.98))] px-6 py-5">
                <div className="absolute -right-10 top-0 h-28 w-28 rounded-full bg-cyan-400/10 blur-3xl" />
                <button
                  type="button"
                  data-testid="system-update-close"
                  onClick={handleClose}
                  className="absolute right-4 top-4 z-10 rounded-full border border-white/10 bg-white/5 p-2 text-slate-300 transition hover:bg-white/10 hover:text-white"
                  aria-label="关闭更新公告"
                >
                  <X className="h-4 w-4" />
                </button>

                <div className="relative flex items-start gap-3">
                  <div className="rounded-2xl border border-cyan-300/25 bg-cyan-400/10 p-3">
                    <Gift className="h-6 w-6 text-cyan-300" />
                  </div>
                  <div className="pr-10">
                    <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-[0.28em] text-cyan-200/70">
                      <Sparkles className="h-3.5 w-3.5" />
                      System Update
                    </div>
                    <h2 className="text-2xl font-bold text-white">{announcement.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-300">{announcement.message}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-5 px-6 py-6">
                <div className="rounded-2xl border border-amber-400/25 bg-amber-400/10 p-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-amber-300/15 p-2">
                      <Coins className="h-5 w-5 text-amber-300" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-amber-200">
                        {announcement.granted_now
                          ? `${announcement.reward_coins} 金币已到账`
                          : `${announcement.reward_coins} 金币补给可在金币记录中查看`}
                      </div>
                      <div className="text-xs text-amber-100/80">
                        当前金币：{announcement.current_balance.toLocaleString('zh-CN')}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  {announcement.highlights.map((item) => (
                    <div
                      key={item}
                      className="rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-3 text-sm leading-6 text-slate-200"
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-white/8 bg-slate-950/70 px-6 py-4">
                <div className="text-xs text-slate-400">补给已送达，查收后继续冒险吧。</div>
                <button
                  type="button"
                  data-testid="system-update-confirm"
                  onClick={handleClose}
                  className="rounded-full bg-gradient-to-r from-cyan-300 to-sky-400 px-5 py-2 text-sm font-semibold text-slate-950 transition hover:brightness-105"
                >
                  我知道了
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
