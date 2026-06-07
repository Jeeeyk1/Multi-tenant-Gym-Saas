interface Props {
  params: Promise<{ id: string }>;
}

export default async function MemberDetailPage({ params }: Props) {
  const { id } = await params;
  return (
    <div className="p-8">
      <div className="mb-8">
        <a href="/dashboard/members" className="text-sm text-primary hover:underline">← Members</a>
        <h1 className="text-3xl font-bold text-foreground mt-2">Member Detail</h1>
        <p className="text-xs text-muted-foreground font-mono mt-1">{id}</p>
      </div>
      <div className="bg-surface border border-border rounded-xl p-12 text-center">
        <p className="text-muted-foreground text-sm">Member detail view coming in W3</p>
      </div>
    </div>
  );
}
