'use client';

import { useRef, useState } from 'react';
import { CONTACT_EMAIL } from '@/lib/brand';
import { CheckIcon } from './ui/icons';

type FormStatus = { kind: 'idle' } | { kind: 'submitting' } | { kind: 'success' } | { kind: 'error'; message: string };

const TOO_MANY_REQUESTS = 429;
const GENERIC_ERROR = `Something went wrong. Please try again, or email us at ${CONTACT_EMAIL}.`;
const RATE_LIMITED_ERROR = `You've sent several requests in a short time. Please try again later, or email us at ${CONTACT_EMAIL}.`;

const INPUT_CLASS =
  'h-12 rounded-xl border-[1.5px] border-navy-line bg-navy-raised px-4 text-base text-white placeholder:text-ink-muted focus:border-sky focus:outline-none disabled:opacity-60';

const FIELDS = [
  { name: 'ownerName', label: 'Your name', type: 'text', autoComplete: 'name', required: true },
  { name: 'gymName', label: 'Gym name', type: 'text', autoComplete: 'organization', required: true },
  { name: 'phone', label: 'Mobile number', type: 'tel', autoComplete: 'tel', required: true },
  { name: 'email', label: 'Email', type: 'email', autoComplete: 'email', required: true },
] as const;

function optional(value: FormDataEntryValue | null): string | undefined {
  const text = typeof value === 'string' ? value.trim() : '';
  return text || undefined;
}

export function TrialForm() {
  const [status, setStatus] = useState<FormStatus>({ kind: 'idle' });
  const successRef = useRef<HTMLDivElement>(null);
  const submitting = status.kind === 'submitting';

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus({ kind: 'submitting' });
    const data = new FormData(event.currentTarget);

    let res: Response;
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:9001';
      res = await fetch(`${apiUrl}/api/v1/public/signup-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ownerName: optional(data.get('ownerName')),
          gymName: optional(data.get('gymName')),
          phone: optional(data.get('phone')),
          email: optional(data.get('email')),
          website: optional(data.get('website')),
        }),
      });
    } catch {
      setStatus({ kind: 'error', message: GENERIC_ERROR });
      return;
    }

    if (!res.ok) {
      setStatus({ kind: 'error', message: res.status === TOO_MANY_REQUESTS ? RATE_LIMITED_ERROR : GENERIC_ERROR });
      return;
    }
    setStatus({ kind: 'success' });
    requestAnimationFrame(() => successRef.current?.focus());
  }

  if (status.kind === 'success') {
    return (
      <div
        ref={successRef}
        tabIndex={-1}
        role="status"
        className="flex w-full max-w-[720px] flex-col items-center gap-3 rounded-[20px] border border-sky/20 bg-navy-raised px-6 py-10 focus:outline-none"
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-volt/15 text-volt">
          <CheckIcon size={24} />
        </span>
        <p className="font-display text-2xl font-extrabold text-white">Thanks! We&apos;ll be in touch.</p>
        <p className="max-w-[460px] text-base text-ink-on-navy">
          We&apos;ll set up your account and reach out within a day.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid w-full max-w-[720px] grid-cols-1 gap-3 text-left sm:grid-cols-2"
    >
      {FIELDS.map((field) => (
        <label key={field.name} className="flex flex-col gap-1.5 text-[13px] font-semibold text-ink-on-navy">
          {field.label}
          <input
            name={field.name}
            type={field.type}
            autoComplete={field.autoComplete}
            required={field.required}
            maxLength={field.name === 'phone' ? 30 : 100}
            disabled={submitting}
            className={INPUT_CLASS}
          />
        </label>
      ))}

      {/* Honeypot: only bots fill it; the API drops those requests. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Website
          <input name="website" type="text" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      {status.kind === 'error' && (
        <p role="alert" className="col-span-full rounded-xl bg-danger-bg px-4 py-3 text-sm text-danger">
          {status.message}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="col-span-full h-[52px] rounded-full bg-volt text-base font-semibold text-navy transition hover:brightness-95 disabled:opacity-60"
      >
        {submitting ? 'Sending…' : 'Start free trial'}
      </button>
    </form>
  );
}
