import clsx from 'clsx';

export function Container({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={clsx('mx-auto w-full max-w-page px-5 sm:px-8', className)}>{children}</div>;
}
