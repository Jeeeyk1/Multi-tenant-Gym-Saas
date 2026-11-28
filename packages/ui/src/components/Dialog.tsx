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
  /** Set false to block every way of closing (Esc, backdrop, close button), e.g. while saving. */
  dismissible?: boolean;
}

const SIZES = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' };
const CLOSE_MS = 140;

function isOutside(e: { clientX: number; clientY: number }, el: HTMLElement) {
  const r = el.getBoundingClientRect();
  return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
}

/**
 * Modal built on the native <dialog>: the browser traps focus and handles Esc. Focus goes back to
 * whatever opened it, also when the parent unmounts the dialog instead of setting `open` to false.
 * Opens with the bouncy spring, closes with a short fade.
 */
export function Dialog({ open, onClose, title, description, children, footer, size = 'md', dismissible = true }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const pressedOutside = useRef(false);
  const [closing, setClosing] = useState(false);
  const titleId = useId();
  const descriptionId = useId();

  function restoreFocus() {
    const opener = openerRef.current;
    openerRef.current = null;
    if (opener?.isConnected) opener.focus();
  }

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open) {
      setClosing(false);
      if (!el.open) {
        openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        el.showModal();
      }
    } else if (el.open) {
      setClosing(true);
      const t = setTimeout(() => {
        el.close();
        setClosing(false);
        restoreFocus();
      }, CLOSE_MS);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    const el = ref.current;
    return () => {
      // Strict Mode re-runs effects with the element still in the page; only a real unmount detaches it.
      if (el && !el.isConnected) restoreFocus();
    };
  }, []);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={(e) => {
        e.preventDefault();
        if (dismissible) onClose();
      }}
      onClose={(e) => {
        // The browser can close the dialog without asking (e.g. Chrome ignores preventDefault on a
        // repeated Esc). Our own close() runs only after `open` is false, and a late event after a
        // re-open finds the dialog open again, so both are ignored here.
        if (!open || e.currentTarget.open) return;
        if (dismissible) onClose();
        else e.currentTarget.showModal();
      }}
      onPointerDown={(e) => {
        pressedOutside.current = isOutside(e, e.currentTarget);
      }}
      onClick={(e) => {
        // Only a press that starts and ends on the backdrop closes, so selecting text and releasing
        // outside, or dragging the dialog's scrollbar, does not.
        const closeIt = dismissible && pressedOutside.current && e.target === e.currentTarget && isOutside(e, e.currentTarget);
        pressedOutside.current = false;
        if (closeIt) onClose();
      }}
      className={cn(
        'w-[calc(100%-2rem)] rounded-xl border border-border bg-surface p-0 text-foreground shadow-1',
        'backdrop:bg-scrim/50 backdrop:backdrop-blur-[2px]',
        open && !closing ? 'animate-pop-in backdrop:animate-fade-in' : closing ? 'animate-pop-out' : '',
        SIZES[size],
      )}
    >
      <div className="flex flex-col gap-4 p-6">
        <div className="flex flex-col gap-1 pr-8">
          <h2 id={titleId} className="text-title text-foreground">
            {title}
          </h2>
          {description ? (
            <div id={descriptionId} className="text-sm text-muted">
              {description}
            </div>
          ) : null}
        </div>
        {children}
        {footer ? <div className="flex flex-wrap justify-end gap-2 pt-2">{footer}</div> : null}
      </div>
      {/* Last in the DOM so opening focuses the first field, not this button. */}
      <button
        type="button"
        onClick={onClose}
        disabled={!dismissible}
        aria-label="Close"
        className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-md text-icon-muted transition-colors hover:bg-hover hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring disabled:cursor-not-allowed disabled:opacity-50"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
          <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
        </svg>
      </button>
    </dialog>
  );
}
