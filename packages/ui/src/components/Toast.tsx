'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { cn } from '../cn';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastOptions {
  duration?: number;
  /** One action, usually Undo. Keeps the toast up longer. */
  action?: { label: string; onClick: () => void };
}

interface ToastItem extends ToastOptions {
  id: number;
  type: ToastType;
  message: string;
}

type Show = (message: string, durationOrOptions?: number | ToastOptions) => void;

interface ToastContextValue {
  success: Show;
  error: Show;
  warning: Show;
  info: Show;
}

const ToastContext = createContext<ToastContextValue | null>(null);

/** `toast.success('Saved')`, `toast.error(msg)`, `toast.success('Archived', { action: { label: 'Undo', onClick } })`. */
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

const MAX_TOASTS = 4;
const STYLES: Record<ToastType, { dot: string; label: string }> = {
  success: { dot: 'bg-success', label: 'Success' },
  error: { dot: 'bg-destructive', label: 'Error' },
  warning: { dot: 'bg-warning-solid', label: 'Warning' },
  info: { dot: 'bg-primary', label: 'Info' },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const remove = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const push = useCallback((type: ToastType, message: string, arg?: number | ToastOptions) => {
    const options = typeof arg === 'number' ? { duration: arg } : arg ?? {};
    nextId.current += 1;
    setToasts((t) => [...t.slice(-(MAX_TOASTS - 1)), { id: nextId.current, type, message, ...options }]);
  }, []);

  const value = useMemo<ToastContextValue>(
    () => ({
      success: (m, a) => push('success', m, a),
      error: (m, a) => push('error', m, a),
      warning: (m, a) => push('warning', m, a),
      info: (m, a) => push('info', m, a),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed bottom-4 right-4 z-[300] flex flex-col items-end gap-2">
        {toasts.map((t) => (
          <Toast key={t.id} toast={t} onDone={remove} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function Toast({ toast, onDone }: { toast: ToastItem; onDone: (id: number) => void }) {
  const [leaving, setLeaving] = useState(false);
  const duration = toast.duration ?? (toast.action ? 6000 : 3500);

  const leave = useCallback(() => {
    setLeaving(true);
    setTimeout(() => onDone(toast.id), 160);
  }, [onDone, toast.id]);

  useEffect(() => {
    const t = setTimeout(leave, duration);
    return () => clearTimeout(t);
  }, [duration, leave]);

  const style = STYLES[toast.type];
  return (
    <div
      role={toast.type === 'error' ? 'alert' : 'status'}
      className={cn(
        'pointer-events-auto flex min-w-72 max-w-sm items-center gap-3 rounded-xl bg-surface-inverse px-4 py-3 text-sm text-inverse-foreground shadow-1',
        leaving ? 'animate-pop-out' : 'animate-toast-in',
      )}
    >
      <span className={cn('h-2 w-2 shrink-0 rounded-full', style.dot)} aria-label={style.label} />
      <span className="flex-1">{toast.message}</span>
      {toast.action ? (
        <button
          type="button"
          onClick={() => {
            toast.action?.onClick();
            leave();
          }}
          className="rounded-sm px-1 font-semibold text-inverse-number hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
        >
          {toast.action.label}
        </button>
      ) : null}
      <button
        type="button"
        onClick={leave}
        aria-label="Dismiss"
        className="-mr-1 rounded-sm px-1 text-inverse-muted hover:text-inverse-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
      >
        ✕
      </button>
    </div>
  );
}
