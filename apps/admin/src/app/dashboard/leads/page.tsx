import type { Metadata } from 'next';
import { api } from '@/lib/api';
import { LeadsClient } from './leads-client';

export const metadata: Metadata = { title: 'Leads' };

export interface SignupRequest {
  id: string;
  gymName: string;
  ownerName: string;
  email: string;
  phone: string | null;
  planInterest: string | null;
  status: 'NEW' | 'CONTACTED' | 'CONVERTED' | 'REJECTED';
  notes: string | null;
  createdAt: string;
}

export default async function LeadsPage() {
  const leads = await api.get<SignupRequest[]>('/v1/admin/signup-requests').catch(() => [] as SignupRequest[]);

  return (
    <div className="p-8">
      <div className="mb-8">
        <p className="text-[13px] text-muted-foreground">FitOps</p>
        <h1 className="text-2xl font-bold text-foreground mb-1">Signup Requests</h1>
        <p className="text-sm text-muted-foreground">
          {leads.filter((l) => l.status === 'NEW').length} new · {leads.length} total
        </p>
      </div>

      <LeadsClient initialLeads={leads} />
    </div>
  );
}
