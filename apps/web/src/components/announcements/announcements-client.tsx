'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { archiveAnnouncement } from '@/lib/actions/announcements';
import { AnnouncementModal } from './announcement-modal';
import type { StaffAnnouncement } from '@/types/api';

type StatusFilter = 'ALL' | 'PUBLISHED' | 'SCHEDULED' | 'DRAFT' | 'ARCHIVED' | 'EXPIRED';

const TABS: { label: string; value: StatusFilter }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Published', value: 'PUBLISHED' },
  { label: 'Scheduled', value: 'SCHEDULED' },
  { label: 'Draft', value: 'DRAFT' },
  { label: 'Archived', value: 'ARCHIVED' },
];

const STATUS_STYLES: Record<string, string> = {
  PUBLISHED: 'text-success border-success/40 bg-success/10',
  SCHEDULED: 'text-primary border-primary/40 bg-primary/10',
  DRAFT: 'text-muted-foreground border-border bg-background',
  EXPIRED: 'text-destructive border-destructive/40 bg-destructive/10',
  ARCHIVED: 'text-muted-foreground border-border/40 bg-background',
};

const ARCHIVABLE = new Set(['PUBLISHED', 'SCHEDULED', 'DRAFT']);

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

interface Props {
  gymId: string;
  announcements: StaffAnnouncement[];
}

export function AnnouncementsClient({ gymId, announcements }: Props) {
  const [tab, setTab] = useState<StatusFilter>('ALL');
  const [createOpen, setCreateOpen] = useState(false);
  const [editAnnouncement, setEditAnnouncement] = useState<StaffAnnouncement | null>(null);
  const [archivingId, setArchivingId] = useState<string | null>(null);

  const filtered = tab === 'ALL' ? announcements : announcements.filter((a) => a.status === tab);

  async function handleArchive(a: StaffAnnouncement) {
    if (!confirm(`Archive "${a.title}"? This cannot be undone.`)) return;
    setArchivingId(a.id);
    try {
      await archiveAnnouncement(gymId, a.id);
    } finally {
      setArchivingId(null);
    }
  }

  return (
    <>
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-surface border border-border rounded-xl p-1">
          {TABS.map((t) => {
            const count = t.value === 'ALL'
              ? announcements.length
              : announcements.filter((a) => a.status === t.value).length;
            return (
              <button
                key={t.value}
                onClick={() => setTab(t.value)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm font-medium transition',
                  tab === t.value
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {t.label}
                {count > 0 && (
                  <span className="ml-1.5 text-xs opacity-70">{count}</span>
                )}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => setCreateOpen(true)}
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground text-sm font-semibold px-4 py-2 rounded-lg hover:opacity-90 transition"
        >
          <span className="text-base leading-none">+</span>
          New Announcement
        </button>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="bg-surface border border-border rounded-xl p-12 text-center">
          <p className="text-sm text-muted-foreground">
            {tab === 'ALL' ? 'No announcements yet.' : `No ${tab.toLowerCase()} announcements.`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((a) => (
            <div
              key={a.id}
              className={cn(
                'bg-surface border border-border rounded-xl p-5',
                a.status === 'ARCHIVED' || a.status === 'EXPIRED' ? 'opacity-60' : '',
              )}
            >
              {/* Card header */}
              <div className="flex items-start gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {a.isPinned && (
                      <span className="text-xs text-primary font-medium">📌 Pinned</span>
                    )}
                    <h3 className="text-sm font-semibold text-foreground">{a.title}</h3>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full border', STATUS_STYLES[a.status] ?? 'text-muted-foreground border-border')}>
                      {a.status}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      by {a.createdByUser.fullName}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 shrink-0">
                  {a.status !== 'ARCHIVED' && a.status !== 'EXPIRED' && (
                    <button
                      onClick={() => setEditAnnouncement(a)}
                      className="text-xs font-medium px-3 py-1.5 rounded-md border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition"
                    >
                      Edit
                    </button>
                  )}
                  {ARCHIVABLE.has(a.status) && (
                    <button
                      onClick={() => handleArchive(a)}
                      disabled={archivingId === a.id}
                      className="text-xs font-medium px-3 py-1.5 rounded-md border border-warning/40 text-warning hover:bg-warning/10 transition disabled:opacity-40"
                    >
                      {archivingId === a.id ? '…' : 'Archive'}
                    </button>
                  )}
                </div>
              </div>

              {/* Content preview */}
              <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{a.content}</p>

              {/* Dates */}
              <div className="flex gap-4 text-xs text-muted-foreground">
                {a.publishAt && (
                  <span>Publishes: {formatDate(a.publishAt)}</span>
                )}
                {a.expiresAt && (
                  <span>Expires: {formatDate(a.expiresAt)}</span>
                )}
                {!a.publishAt && !a.expiresAt && (
                  <span>Created: {formatDate(a.createdAt)}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {createOpen && (
        <AnnouncementModal gymId={gymId} onClose={() => setCreateOpen(false)} />
      )}
      {editAnnouncement && (
        <AnnouncementModal
          gymId={gymId}
          announcement={editAnnouncement}
          onClose={() => setEditAnnouncement(null)}
        />
      )}
    </>
  );
}
