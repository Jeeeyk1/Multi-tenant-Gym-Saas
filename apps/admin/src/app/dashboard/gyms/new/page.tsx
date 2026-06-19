'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function NewGymPage() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ inviteToken: string; gymId: string } | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsPending(true);
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch('/api/admin/gyms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gymName: fd.get('gymName'),
          gymCode: (fd.get('gymCode') as string).toUpperCase(),
          ownerEmail: fd.get('ownerEmail'),
          ownerFullName: fd.get('ownerFullName'),
        }),
      });
      const json = await res.json() as { error?: string; inviteToken?: string; gymId?: string };
      if (!res.ok || json.error) { setError(json.error ?? 'Failed to create gym'); return; }
      setResult({ inviteToken: json.inviteToken!, gymId: json.gymId! });
    } catch {
      setError('Could not reach server');
    } finally {
      setIsPending(false);
    }
  }

  if (result) {
    const activationUrl = `${window.location.origin.replace(':3020', ':3010')}/activate?token=${result.inviteToken}`;
    return (
      <div className="p-8 max-w-lg">
        <div className="bg-success/10 border border-success/30 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-foreground mb-2">Gym created!</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Share this activation link with the gym owner so they can set their password:
          </p>
          <code className="block text-xs bg-background border border-border rounded-lg p-3 break-all text-primary">
            {activationUrl}
          </code>
          <p className="text-xs text-muted-foreground mt-3">Link expires in 7 days.</p>
          <button
            onClick={() => router.push('/dashboard/gyms')}
            className="mt-4 bg-primary text-primary-foreground text-sm font-semibold px-4 py-2 rounded-lg hover:opacity-90 transition"
          >
            Back to gyms
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-lg">
      <h1 className="text-2xl font-bold text-foreground mb-1">Invite Gym Client</h1>
      <p className="text-sm text-muted-foreground mb-8">
        Creates the gym and sends the owner an activation link to set their password.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5 bg-surface border border-border rounded-xl p-6">
        {[
          { name: 'gymName', label: 'Gym Name', placeholder: 'Iron Paradise Gym', type: 'text' },
          { name: 'gymCode', label: 'Gym Code', placeholder: 'IRONPRD (3–12 uppercase)', type: 'text' },
          { name: 'ownerFullName', label: 'Owner Full Name', placeholder: 'Juan dela Cruz', type: 'text' },
          { name: 'ownerEmail', label: 'Owner Email', placeholder: 'juan@ironparadise.com', type: 'email' },
        ].map((f) => (
          <div key={f.name}>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">
              {f.label}
            </label>
            <input
              name={f.name}
              type={f.type}
              placeholder={f.placeholder}
              required
              className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
              disabled={isPending}
            />
          </div>
        ))}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:bg-foreground/5 transition"
            disabled={isPending}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="flex-1 bg-primary text-primary-foreground font-semibold py-2.5 rounded-lg hover:opacity-90 transition disabled:opacity-50 text-sm"
          >
            {isPending ? 'Creating…' : 'Create & Get Invite Link'}
          </button>
        </div>
      </form>
    </div>
  );
}
