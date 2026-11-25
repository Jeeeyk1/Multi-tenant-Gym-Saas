'use client';

import { useState } from 'react';
import { checkOutMember } from '@/lib/actions/checkins';

interface Props {
  gymId: string;
  checkinId: string;
}

export function CheckOutButton({ gymId, checkinId }: Props) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      await checkOutMember(gymId, checkinId);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="bg-surface text-xs font-semibold px-3 py-1.5 rounded-md border border-border text-foreground hover:text-foreground hover:border-foreground/30 transition disabled:opacity-40 hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
    >
      {loading ? '…' : 'Check Out'}
    </button>
  );
}
