'use client';

import { useState } from 'react';
import { Dialog, TextAreaField, TextField } from '@gym-saas/ui';
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
    <Dialog open onClose={onClose} title={isEdit ? 'Edit Announcement' : 'New Announcement'} dismissible={!isPending}>
      {success ? (
        <p role="status" className="text-center text-success font-medium py-10">
          ✓ Announcement {isEdit ? 'updated' : 'created'} successfully
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <TextField
            label="Title"
            name="title"
            type="text"
            defaultValue={announcement?.title}
            placeholder="Announcement title…"
            required
            disabled={isPending}
          />

          <TextAreaField
            label="Content"
            name="content"
            rows={5}
            defaultValue={announcement?.content}
            placeholder="Write your announcement here…"
            required
            disabled={isPending}
          />

          <div className="grid grid-cols-2 gap-3">
            <TextField
              label="Publish at"
              hint="Leave blank to publish now"
              name="publishAt"
              type="datetime-local"
              defaultValue={toDatetimeLocal(announcement?.publishAt)}
              disabled={isPending}
            />
            <TextField
              label="Expires at"
              hint="Optional"
              name="expiresAt"
              type="datetime-local"
              defaultValue={toDatetimeLocal(announcement?.expiresAt)}
              disabled={isPending}
            />
          </div>

          <button
            type="button"
            onClick={() => setIsPinned((v) => !v)}
            disabled={isPending}
            aria-pressed={isPinned}
            className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring ${
              isPinned
                ? 'border-primary/50 bg-primary/10 text-primary'
                : 'border-border text-muted-foreground hover:border-foreground/20'
            }`}
          >
            <span className="text-base" aria-hidden>{isPinned ? '📌' : '📍'}</span>
            <span className="text-sm font-medium">
              {isPinned ? 'Pinned — will appear at the top' : 'Pin this announcement'}
            </span>
          </button>

          {error && (
            <div role="alert" className="bg-destructive-bg border border-destructive rounded-md px-3 py-2">
              <p className="text-sm text-destructive-text">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="bg-surface flex-1 px-4 py-2.5 text-sm rounded-md border border-border text-foreground hover:text-foreground hover:border-foreground/30 transition disabled:opacity-50 font-semibold hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 bg-primary text-primary-foreground font-semibold py-2.5 rounded-md hover:bg-primary-hover transition disabled:bg-disabled disabled:text-disabled-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
            >
              {isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Publish'}
            </button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
