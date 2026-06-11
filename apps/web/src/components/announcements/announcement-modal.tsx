'use client';

import { useState } from 'react';
import { createAnnouncement, updateAnnouncement } from '@/lib/actions/announcements';
import type { StaffAnnouncement } from '@/types/api';

function toDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return '';
  // datetime-local expects "YYYY-MM-DDTHH:MM"
  return new Date(iso).toISOString().slice(0, 16);
}

interface Props {
  gymId: string;
  announcement?: StaffAnnouncement;
  onClose: () => void;
}

export function AnnouncementModal({ gymId, announcement, onClose }: Props) {
  const isEdit = !!announcement;
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPinned, setIsPinned] = useState(announcement?.isPinned ?? false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsPending(true);

    const fd = new FormData(e.currentTarget);
    fd.set('isPinned', String(isPinned));

    try {
      const result = isEdit
        ? await updateAnnouncement(gymId, announcement.id, {}, fd)
        : await createAnnouncement(gymId, {}, fd);

      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(true);
        setTimeout(onClose, 800);
      }
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-surface border border-border rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-border shrink-0">
          <h2 className="text-base font-semibold text-foreground">
            {isEdit ? 'Edit Announcement' : 'New Announcement'}
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition text-lg px-1">
            ✕
          </button>
        </div>

        {success ? (
          <p className="text-center text-success font-medium py-10">
            ✓ Announcement {isEdit ? 'updated' : 'created'} successfully
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-4">
            {/* Title */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                Title <span className="text-destructive">*</span>
              </label>
              <input
                name="title"
                type="text"
                defaultValue={announcement?.title}
                placeholder="Announcement title…"
                required
                disabled={isPending}
                className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
              />
            </div>

            {/* Content */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                Content <span className="text-destructive">*</span>
              </label>
              <textarea
                name="content"
                rows={5}
                defaultValue={announcement?.content}
                placeholder="Write your announcement here…"
                required
                disabled={isPending}
                className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition resize-none"
              />
            </div>

            {/* Publish at + Expires at */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                  Publish At
                  <span className="text-muted-foreground font-normal normal-case ml-1">(leave blank to publish now)</span>
                </label>
                <input
                  name="publishAt"
                  type="datetime-local"
                  defaultValue={toDatetimeLocal(announcement?.publishAt)}
                  disabled={isPending}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                  Expires At
                  <span className="text-muted-foreground font-normal normal-case ml-1">(optional)</span>
                </label>
                <input
                  name="expiresAt"
                  type="datetime-local"
                  defaultValue={toDatetimeLocal(announcement?.expiresAt)}
                  disabled={isPending}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
                />
              </div>
            </div>

            {/* Pin toggle */}
            <button
              type="button"
              onClick={() => setIsPinned((v) => !v)}
              disabled={isPending}
              className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl border transition ${
                isPinned
                  ? 'border-primary/50 bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:border-foreground/20'
              }`}
            >
              <span className="text-base">{isPinned ? '📌' : '📍'}</span>
              <span className="text-sm font-medium">
                {isPinned ? 'Pinned — will appear at the top' : 'Pin this announcement'}
              </span>
            </button>

            {error && (
              <div className="bg-red-950/60 border border-destructive rounded-lg px-3 py-2">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                disabled={isPending}
                className="flex-1 px-4 py-2.5 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:border-foreground/30 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="flex-1 bg-primary text-primary-foreground font-semibold py-2.5 rounded-lg hover:opacity-90 transition disabled:opacity-50"
              >
                {isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Publish'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
