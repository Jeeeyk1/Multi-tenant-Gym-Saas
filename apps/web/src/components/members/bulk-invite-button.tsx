'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  validateBulkInvite,
  bulkInviteMembers,
  type BulkInvitePreview,
  type BulkInviteResult,
  type BulkInviteRowStatus,
} from '@/lib/actions/bulk-invite';

type Step = 'upload' | 'preview' | 'done';

const STATUS_STYLE: Record<BulkInviteRowStatus, string> = {
  ready: 'bg-success/10 text-success',
  duplicate_in_file: 'bg-warning/10 text-warning',
  already_registered: 'bg-warning/10 text-warning',
  invalid: 'bg-destructive/10 text-destructive',
};

const STATUS_LABEL: Record<BulkInviteRowStatus, string> = {
  ready: 'Ready',
  duplicate_in_file: 'Duplicate',
  already_registered: 'Exists',
  invalid: 'Invalid',
};

export function BulkInviteButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>('upload');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<BulkInvitePreview | null>(null);
  const [result, setResult] = useState<BulkInviteResult | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  function reset() {
    setStep('upload');
    setPreview(null);
    setResult(null);
    setError(null);
    setFileName(null);
    setPending(false);
  }
  function close() {
    setOpen(false);
    reset();
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file
    if (!file) return;
    setFileName(file.name);
    setError(null);
    setPending(true);
    const fd = new FormData();
    fd.append('file', file);
    const res = await validateBulkInvite(fd);
    setPending(false);
    if (res.error || !res.preview) {
      setError(res.error ?? 'Could not read the file');
      return;
    }
    setPreview(res.preview);
    setStep('preview');
  }

  async function handleSend() {
    if (!preview) return;
    const ready = preview.rows
      .filter((r) => r.status === 'ready')
      .map((r) => ({ email: r.email, fullName: r.fullName, expiryDate: r.expiryDate }));
    setPending(true);
    setError(null);
    const res = await bulkInviteMembers(ready);
    setPending(false);
    if (res.error || !res.result) {
      setError(res.error ?? 'Could not create members');
      return;
    }
    setResult(res.result);
    setStep('done');
    router.refresh();
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 border border-border text-foreground text-sm font-semibold px-4 py-2 rounded-lg hover:bg-foreground/5 transition"
      >
        Bulk Invite
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={close}>
          <div
            className="bg-surface border border-border rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">Bulk invite members</h2>
              <button onClick={close} className="text-muted-foreground hover:text-foreground text-sm">✕</button>
            </div>

            <div className="p-6 overflow-y-auto">
              {step === 'upload' && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Upload an <strong>.xlsx</strong> or <strong>.csv</strong> file with columns{' '}
                    <strong>Name</strong>, <strong>Email</strong>, and <strong>Expiry Date</strong>. You&apos;ll
                    review everything before any invites go out. Plans are set later at renewal.
                  </p>
                  <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border rounded-xl py-10 cursor-pointer hover:border-primary/40 transition">
                    <span className="text-sm font-medium text-foreground">
                      {pending ? 'Reading file…' : 'Choose a spreadsheet'}
                    </span>
                    <span className="text-xs text-muted-foreground">{fileName ?? '.xlsx or .csv, up to 5MB'}</span>
                    <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} disabled={pending} className="hidden" />
                  </label>
                  {error && <p className="text-sm text-destructive">{error}</p>}
                </div>
              )}

              {step === 'preview' && preview && (
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-3 text-sm">
                    <Stat label="Ready" value={preview.summary.ready} tone="text-success" />
                    <Stat label="Will skip" value={preview.summary.skipped} tone="text-warning" />
                    <Stat label="Invalid" value={preview.summary.invalid} tone="text-destructive" />
                    <Stat label="Total rows" value={preview.summary.total} tone="text-muted-foreground" />
                  </div>

                  <div className="border border-border rounded-xl overflow-hidden">
                    <div className="max-h-72 overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-surface border-b border-border">
                          <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                            <th className="px-3 py-2">Name</th>
                            <th className="px-3 py-2">Email</th>
                            <th className="px-3 py-2">Expiry</th>
                            <th className="px-3 py-2">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {preview.rows.map((r, i) => (
                            <tr key={i} className="border-b border-border last:border-0">
                              <td className="px-3 py-2 text-foreground">{r.fullName || <span className="text-muted-foreground">—</span>}</td>
                              <td className="px-3 py-2 text-muted-foreground">{r.email || '—'}</td>
                              <td className="px-3 py-2 text-muted-foreground">{r.expiryDate || '—'}</td>
                              <td className="px-3 py-2">
                                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLE[r.status]}`} title={r.reason ?? ''}>
                                  {STATUS_LABEL[r.status]}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Skipped and invalid rows won&apos;t be invited. Fix them in your file and re-upload if needed.
                  </p>
                  {error && <p className="text-sm text-destructive">{error}</p>}
                </div>
              )}

              {step === 'done' && result && (
                <div className="space-y-3 text-center py-4">
                  <p className="text-2xl font-bold text-foreground">{result.created} member{result.created !== 1 ? 's' : ''} added</p>
                  <p className="text-sm text-muted-foreground">
                    Invitations are sending in the background — members will get an email to activate their accounts.
                    {result.skipped.length > 0 && ` ${result.skipped.length} row${result.skipped.length !== 1 ? 's were' : ' was'} skipped.`}
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
              {step === 'preview' && (
                <>
                  <button onClick={reset} disabled={pending} className="px-4 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:bg-foreground/5 transition disabled:opacity-50">
                    Choose different file
                  </button>
                  <button
                    onClick={handleSend}
                    disabled={pending || preview?.summary.ready === 0}
                    className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition disabled:opacity-50"
                  >
                    {pending ? 'Sending…' : `Send ${preview?.summary.ready ?? 0} invite${preview?.summary.ready !== 1 ? 's' : ''}`}
                  </button>
                </>
              )}
              {step === 'done' && (
                <button onClick={close} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition">
                  Done
                </button>
              )}
              {step === 'upload' && (
                <button onClick={close} className="px-4 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:bg-foreground/5 transition">
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className={`text-lg font-bold ${tone}`}>{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}
