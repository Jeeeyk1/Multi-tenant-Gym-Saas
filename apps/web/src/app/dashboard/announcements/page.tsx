import { getSessionUser } from '@/lib/auth';
import { api } from '@/lib/api';
import { AnnouncementsClient } from '@/components/announcements/announcements-client';
import type { StaffAnnouncement } from '@/types/api';

export default async function AnnouncementsPage() {
  const user = await getSessionUser();
  if (!user) return null;

  const announcements = await api
    .get<StaffAnnouncement[]>(`/gyms/${user.gymId}/announcements`)
    .catch(() => [] as StaffAnnouncement[]);

  // Pinned first, then by createdAt desc
  const sorted = [...announcements].sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Announcements</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Create and broadcast announcements to your gym members.
        </p>
      </div>

      <AnnouncementsClient gymId={user.gymId} announcements={sorted} />
    </div>
  );
}
