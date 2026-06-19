'use client';

import { createContext, useContext, useState, useCallback } from 'react';

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'destructive';
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider');
  return ctx;
}

interface DialogState {
  open: boolean;
  options: ConfirmOptions;
  resolve: ((value: boolean) => void) | null;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DialogState>({
    open: false,
    options: { message: '' },
    resolve: null,
  });

  const confirm: ConfirmFn = useCallback(
    (options) =>
      new Promise<boolean>((resolve) => {
        setState({ open: true, options, resolve });
      }),
    [],
  );

  function handleClose(result: boolean) {
    state.resolve?.(result);
    setState((prev) => ({ ...prev, open: false, resolve: null }));
  }

  const { options } = state;
  const isDestructive = options.variant === 'destructive';

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state.open && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => handleClose(false)}
          />
          <div className="relative w-full max-w-sm bg-surface border border-border rounded-2xl shadow-2xl p-6 animate-in fade-in zoom-in-95 duration-150">
            {options.title && (
              <h3 className="text-base font-semibold text-foreground mb-2">{options.title}</h3>
            )}
            <p className="text-sm text-muted-foreground mb-6">{options.message}</p>
            <div className="flex gap-3">
              <button
                onClick={() => handleClose(false)}
                className="flex-1 px-4 py-2.5 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground transition"
              >
                {options.cancelLabel ?? 'Cancel'}
              </button>
              <button
                onClick={() => handleClose(true)}
                className={`flex-1 font-semibold py-2.5 rounded-lg hover:opacity-90 transition text-sm ${
                  isDestructive
                    ? 'bg-destructive text-white'
                    : 'bg-primary text-primary-foreground'
                }`}
              >
                {options.confirmLabel ?? 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
