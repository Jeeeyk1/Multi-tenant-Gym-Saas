'use client';

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { Button } from './Button';
import { Dialog } from './Dialog';
import { TextAreaField } from './Field';

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'destructive';
}

export interface PromptOptions extends ConfirmOptions {
  /** Label of the text box, e.g. "Reason". */
  label: string;
  placeholder?: string;
  /** Disable confirm until something is typed. */
  required?: boolean;
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;
type PromptFn = (options: PromptOptions) => Promise<string | null>;

const ConfirmContext = createContext<{ confirm: ConfirmFn; prompt: PromptFn } | null>(null);

function useDialogs() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm/usePrompt must be used within ConfirmProvider');
  return ctx;
}

/** `await confirm({ message })` resolves true when the user confirms. Use instead of window.confirm. */
export function useConfirm() {
  return useDialogs().confirm;
}

/**
 * `await prompt({ message, label })` resolves the typed text, or null if the user cancels.
 * Use instead of window.prompt (e.g. asking for a rejection reason). An optional field resolves "" when left empty.
 */
export function usePrompt() {
  return useDialogs().prompt;
}

interface State {
  open: boolean;
  options: ConfirmOptions | PromptOptions;
  withInput: boolean;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>({ open: false, options: { message: '' }, withInput: false });
  const [text, setText] = useState('');
  const resolver = useRef<((value: boolean | string | null) => void) | null>(null);

  const confirm: ConfirmFn = useCallback(
    (options) =>
      new Promise<boolean>((resolve) => {
        resolver.current = (v) => resolve(v === true);
        setState({ open: true, options, withInput: false });
      }),
    [],
  );

  const prompt: PromptFn = useCallback(
    (options) =>
      new Promise<string | null>((resolve) => {
        resolver.current = (v) => resolve(typeof v === 'string' ? v : null);
        setText('');
        setState({ open: true, options, withInput: true });
      }),
    [],
  );

  function finish(confirmed: boolean) {
    resolver.current?.(confirmed ? (state.withInput ? text.trim() : true) : state.withInput ? null : false);
    resolver.current = null;
    setState((prev) => ({ ...prev, open: false }));
  }

  const { options, withInput } = state;
  const promptOptions = withInput ? (options as PromptOptions) : null;
  const blocked = Boolean(promptOptions?.required) && text.trim() === '';

  return (
    <ConfirmContext.Provider value={{ confirm, prompt }}>
      {children}
      <Dialog
        open={state.open}
        onClose={() => finish(false)}
        title={options.title ?? (withInput ? 'One more thing' : 'Are you sure?')}
        description={options.message}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => finish(false)}>
              {options.cancelLabel ?? 'Cancel'}
            </Button>
            <Button variant={options.variant === 'destructive' ? 'danger' : 'primary'} onClick={() => finish(true)} disabled={blocked}>
              {options.confirmLabel ?? 'Confirm'}
            </Button>
          </>
        }
      >
        {promptOptions ? (
          <TextAreaField
            label={promptOptions.label}
            placeholder={promptOptions.placeholder}
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            autoFocus
            hint={promptOptions.required ? undefined : 'Optional'}
          />
        ) : null}
      </Dialog>
    </ConfirmContext.Provider>
  );
}
