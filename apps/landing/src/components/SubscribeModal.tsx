'use client';

import { useState } from 'react';

export function SubscribeModal({ plan, onClose }: { plan: string; onClose: () => void }) {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const fd = new FormData(e.currentTarget);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';
      const res = await fetch(`${apiUrl}/api/v1/public/signup-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gymName: fd.get('gymName'),
          ownerName: fd.get('ownerName'),
          email: fd.get('email'),
          phone: (fd.get('phone') as string) || undefined,
          planInterest: plan,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? 'Something went wrong. Please try again.');
      }
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-border bg-background shadow-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {submitted ? (
          <div className="text-center py-6">
            <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-success">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2">Thanks — we&apos;ll be in touch</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Someone from our team will reach out shortly to set up your {plan} plan.
            </p>
            <button
              onClick={onClose}
              className="bg-primary text-primary-foreground text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-primary/90 transition"
            >
              Close
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-lg font-bold text-foreground">Get started with {plan}</h3>
              <button
                onClick={onClose}
                aria-label="Close"
                className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-foreground/5 transition"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <p className="text-sm text-muted-foreground mb-5">
              Tell us about your gym and we&apos;ll reach out to set up your account.
            </p>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              {[
                { name: 'gymName', label: 'Gym name', placeholder: 'Iron Paradise Gym', type: 'text' },
                { name: 'ownerName', label: 'Your name', placeholder: 'Juan dela Cruz', type: 'text' },
                { name: 'email', label: 'Email', placeholder: 'juan@ironparadise.com', type: 'email' },
              ].map((f) => (
                <div key={f.name}>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">{f.label}</label>
                  <input
                    name={f.name}
                    type={f.type}
                    placeholder={f.placeholder}
                    required
                    disabled={loading}
                    className="w-full bg-surface border border-border rounded-lg px-3 py-2.5 text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
                  />
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Phone (optional)</label>
                <input
                  name="phone"
                  type="tel"
                  placeholder="09XX XXX XXXX"
                  disabled={loading}
                  className="w-full bg-surface border border-border rounded-lg px-3 py-2.5 text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
                />
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-xl hover:bg-primary/90 transition disabled:opacity-50 text-sm"
              >
                {loading ? 'Submitting…' : 'Submit'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
