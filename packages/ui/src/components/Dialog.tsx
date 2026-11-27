'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { cn } from '../cn';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  /** Buttons row at the bottom, right-aligned. */
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  /** Prevent closing on backdrop click (e.g. while saving). Esc still closes unless `dismissible` is false. */
  dismissible?: boolean;
}

const SIZES = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' };
const CLOSE_MS = 140;

/**
 * Modal built on the native <dialog>: the browser traps focus, closes on Esc, and returns focus to
 * the button that opened it. Opens with the bouncy spring, closes with a short fade.
 */
export function Dialog({ open, onClose, title, description, children, footer, size = 'md', dismissible = true }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const [closing, setClosing] = useState(false);
  const titleId = useId();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) {
      setClosing(false);
      el.showModal();
    } else if (!open && el.open) {
      setClosing(true);
      const t = setTimeout(() => {
        el.close();
        setClosing(false);
      }, CLOSE_MS);
      return () => clearTimeout(t);
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        if (dismissible) onClose();
      }}
      onClick={(e) => {
        // A click on the backdrop lands on the <dialog> element itself.
        if (dismissible && e.target === e.currentTarget) onClose();
      }}
      className={cn(
        'w-[calc(100%-2rem)] rounded-xl border border-border bg-surface p-0 text-foreground shadow-1',
        'backdrop:bg-scrim/50 backdrop:backdrop-blur-[2px]',
        open && !closing ? 'animate-pop-in backdrop:animate-fade-in' : closing ? 'animate-pop-out' : '',
        SIZES[size],
      )}
    >
      <div className="flex flex-col gap-4 p-6">
        <div className="flex flex-col gap-1">
          <h2 id={titleId} className="text-title text-foreground">
            {title}
          </h2>
          {description ? <div className="text-sm text-muted">{description}</div> : null}
        </div>
        {children}
        {footer ? <div className="flex flex-wrap justify-end gap-2 pt-2">{footer}</div> : null}
      </div>
    </dialog>
  );
}
