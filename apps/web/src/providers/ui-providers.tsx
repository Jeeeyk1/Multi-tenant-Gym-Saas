'use client';

import { ToastProvider } from '@/components/ui/toast-provider';
import { ConfirmProvider } from '@/components/ui/confirm-dialog';

export function UIProviders({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <ConfirmProvider>{children}</ConfirmProvider>
    </ToastProvider>
  );
}
