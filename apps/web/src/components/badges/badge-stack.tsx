'use client';

import { useEffect, useId, useRef, useState } from 'react';
import type { EquippedBadge } from '@/types/api';
import { BadgeMedal } from './badge-medal';
import { CATEGORY_LABEL, RARITY_LABEL, TIER_LABEL } from './badge-labels';

const POPOVER_WIDTH = 256;
const POPOVER_GAP = 4;
// Roughly three badges tall; below this much room the popover opens upward instead.
const POPOVER_MIN_ROOM = 180;

type Position = { left: number; top?: number; bottom?: number };

/**
 * Up to three overlapping medals next to a name. Hover (mouse), click, tap or Enter shows what each one is;
 * Escape, moving away or tapping elsewhere closes it.
 * The details are positioned against the viewport so scrolling and clipped containers don't hide them.
 */
export function BadgeStack({ badges, size = 18 }: { badges: EquippedBadge[]; size?: number }) {
  const [position, setPosition] = useState<Position | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverId = useId();
  const open = position !== null;

  function show() {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - POPOVER_WIDTH - 8));
    const roomBelow = window.innerHeight - rect.bottom;
    setPosition(
      roomBelow < POPOVER_MIN_ROOM
        ? { left, bottom: window.innerHeight - rect.top + POPOVER_GAP }
        : { left, top: rect.bottom + POPOVER_GAP },
    );
  }
  const hide = () => setPosition(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && hide();
    const onOutside = (e: PointerEvent) => {
      if (!buttonRef.current?.contains(e.target as Node)) hide();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onOutside);
    window.addEventListener('scroll', hide, true);
    window.addEventListener('resize', hide);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onOutside);
      window.removeEventListener('scroll', hide, true);
      window.removeEventListener('resize', hide);
    };
  }, [open]);

  if (badges.length === 0) return null;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onPointerEnter={(e) => e.pointerType === 'mouse' && show()}
        onPointerLeave={(e) => e.pointerType === 'mouse' && hide()}
        onClick={show}
        onBlur={hide}
        aria-label={`Badges: ${badges.map((b) => b.name).join(', ')}`}
        aria-describedby={open ? popoverId : undefined}
        className="inline-flex shrink-0 items-center rounded-full p-0.5 focus:outline-none focus-visible:ring-1 focus-visible:ring-primary"
      >
        {badges.slice(0, 3).map((b, i) => (
          <span key={b.memberBadgeId} style={{ marginLeft: i === 0 ? 0 : -size * 0.3, zIndex: 3 - i }} className="relative">
            <BadgeMedal category={b.category} tier={b.tier} color={b.color} icon={b.icon} size={size} rarity={b.rarity} />
          </span>
        ))}
      </button>

      {position && (
        <div
          id={popoverId}
          role="tooltip"
          style={{ ...position, width: POPOVER_WIDTH }}
          className="fixed z-50 space-y-3 rounded-xl border border-border bg-surface p-3 text-left shadow-lg"
        >
          {badges.map((b) => (
            <div key={b.memberBadgeId} className="flex items-start gap-3">
              <BadgeMedal category={b.category} tier={b.tier} color={b.color} icon={b.icon} size={36} rarity={b.rarity} />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {CATEGORY_LABEL[b.category]}
                  {b.tier && ` · ${TIER_LABEL[b.tier]}`}
                  {b.rarity && ` · ${RARITY_LABEL[b.rarity]}`}
                </p>
                <p className="text-sm font-medium text-foreground">{b.name}</p>
                {b.description && <p className="text-xs text-muted-foreground">{b.description}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
