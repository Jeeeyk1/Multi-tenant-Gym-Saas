'use client';

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { Button } from './Button';
import { Dialog } from './Dialog';

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'destructive';
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

/** `await confirm({ message })` resolves true when the user confirms. Use instead of window.confirm. */
export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider');
  return ctx;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ open: boolean; options: ConfirmOptions; resolve: ((v: boolean) => void) | null }>({
    open: false,
    options: { message: '' },
    resolve: null,
  });

  const confirm: ConfirmFn = useCallback(
    (options) => new Promise<boolean>((resolve) => setState({ open: true, options, resolve })),
    [],
  );

  function finish(result: boolean) {
    state.resolve?.(result);
    setState((prev) => ({ ...prev, open: false, resolve: null }));
  }

  const { options } = state;
  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Dialog
        open={state.open}
        onClose={() => finish(false)}
        title={options.title ?? 'Are you sure?'}
        description={options.message}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => finish(false)}>
              {options.cancelLabel ?? 'Cancel'}
            </Button>
            <Button variant={options.variant === 'destructive' ? 'danger' : 'primary'} onClick={() => finish(true)}>
              {options.confirmLabel ?? 'Confirm'}
            </Button>
          </>
        }
      />
    </ConfirmContext.Provider>
  );
}
