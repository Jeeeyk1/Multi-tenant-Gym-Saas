import type { ReactNode } from 'react';

/* ─────────────────────────────────────────────────
   Bento grid features section
   Row 1 (tall): AI Coaching (7) | Leaderboard (5)
   Row 2 (medium): Badges (5) | Check-ins (3) | Analytics (4)
   Row 3 (compact): Members (3) | Staff (3) | Multi-tenant (3) | Announcements (3)
───────────────────────────────────────────────── */

function NewBadge() {
  return (
    <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/25 tracking-wide">
      NEW
    </span>
  );
}

function AiCoachingCard() {
  const exercises = [
    { name: 'Bench Press', sets: '4 × 8', done: true },
    { name: 'Incline DB Press', sets: '3 × 10', done: true },
    { name: 'Cable Fly', sets: '3 × 12', done: false },
    { name: 'Tricep Pushdown', sets: '3 × 15', done: false },
  ];

  return (
    <div className="group col-span-1 sm:col-span-2 lg:col-span-7 bg-surface border border-border rounded-2xl p-6 hover:border-primary/30 transition-all duration-300 overflow-hidden flex flex-col min-h-[440px] lg:min-h-[480px]">
      {/* Header */}
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z" /><path d="M12 8v4l3 3" />
            </svg>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">AI-Powered</span>
        </div>
        <h3 className="text-xl font-bold text-foreground mb-1.5">AI Coaching</h3>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">
          Personalized workout plans and meal analysis powered by AI. Members get real coaching from day one — no extra trainer needed.
        </p>
      </div>

      {/* Phone mockup */}
      <div className="flex-1 flex items-end justify-end">
        <div className="relative w-[210px] rounded-[28px] border-2 border-border shadow-xl shadow-foreground/10 overflow-hidden bg-background">
          {/* App header */}
          <div className="bg-primary px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-[9px] text-primary-foreground/70 leading-none">Tuesday</p>
              <p className="text-[11px] text-primary-foreground font-bold">Today's Workout</p>
            </div>
            <span className="text-[9px] bg-primary-foreground/20 text-primary-foreground px-2 py-1 rounded-full font-semibold">2 / 4 done</span>
          </div>

          {/* Exercise list */}
          <div className="p-3 space-y-2">
            {exercises.map((ex) => (
              <div
                key={ex.name}
                className={`flex items-center gap-2.5 p-2.5 rounded-xl border ${
                  ex.done
                    ? 'bg-success/5 border-success/20'
                    : 'bg-surface border-border'
                }`}
              >
                <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${ex.done ? 'border-success bg-success/10' : 'border-border'}`}>
                  {ex.done && (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-success">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-[10px] font-semibold leading-none ${ex.done ? 'text-muted-foreground line-through' : 'text-foreground'}`}>{ex.name}</p>
                  <p className="text-[9px] text-muted-foreground mt-0.5">{ex.sets}</p>
                </div>
              </div>
            ))}
          </div>

          {/* CTA row */}
          <div className="px-3 pb-3">
            <div className="w-full bg-primary/10 text-primary text-[10px] font-semibold py-2 rounded-xl text-center">
              ✨ Ask AI for meal advice
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LeaderboardCard() {
  const members = [
    { rank: 1, name: 'Ana Reyes', pts: '2,450', delta: '+120', you: false },
    { rank: 2, name: 'Marco Santos', pts: '2,100', delta: '+85', you: false },
    { rank: 3, name: 'Kelly Torres', pts: '1,890', delta: '+60', you: false },
    { rank: 4, name: 'You', pts: '1,650', delta: '+45', you: true },
    { rank: 5, name: 'Ben Cruz', pts: '1,480', delta: '+30', you: false },
  ];

  const rankColors: Record<number, string> = {
    1: 'text-amber-400',
    2: 'text-slate-400',
    3: 'text-amber-600',
  };

  const rankBg: Record<number, string> = {
    1: 'bg-amber-400/15',
    2: 'bg-slate-400/10',
    3: 'bg-amber-700/10',
  };

  return (
    <div className="group col-span-1 sm:col-span-2 lg:col-span-5 bg-surface border border-border rounded-2xl p-6 hover:border-primary/30 transition-all duration-300 flex flex-col min-h-[440px] lg:min-h-[480px]">
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-9 h-9 rounded-xl bg-amber-400/15 border border-amber-400/25 flex items-center justify-center text-lg">
              🏆
            </div>
            <NewBadge />
          </div>
          <h3 className="text-xl font-bold text-foreground mb-1.5">Leaderboard</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Drive member engagement with weekly and monthly gym rankings. Points earned through check-ins and activities.
          </p>
        </div>
      </div>

      {/* Ranking list */}
      <div className="flex-1 flex flex-col justify-center space-y-1.5">
        {members.map((m) => (
          <div
            key={m.rank}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-colors ${
              m.you
                ? 'bg-primary/8 border-primary/25'
                : 'bg-background border-border'
            }`}
          >
            {/* Rank badge */}
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${rankBg[m.rank] ?? 'bg-border/30'}`}>
              <span className={`text-xs font-bold ${rankColors[m.rank] ?? (m.you ? 'text-primary' : 'text-muted-foreground')}`}>
                {m.rank}
              </span>
            </div>

            {/* Avatar */}
            <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-[9px] font-bold ${m.you ? 'bg-primary/20 text-primary' : 'bg-border/50 text-muted-foreground'}`}>
              {m.name.split(' ').map(n => n[0]).join('')}
            </div>

            {/* Name */}
            <span className={`flex-1 text-xs font-medium truncate ${m.you ? 'text-primary font-semibold' : 'text-foreground'}`}>
              {m.name}{m.you ? ' (you)' : ''}
            </span>

            {/* Points */}
            <div className="text-right flex-shrink-0">
              <p className="text-xs font-bold text-foreground">{m.pts}</p>
              <p className="text-[9px] text-success">{m.delta}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Period selector */}
      <div className="mt-4 flex gap-1.5">
        {['This Week', 'This Month', 'All Time'].map((p, i) => (
          <span
            key={p}
            className={`text-[10px] px-2.5 py-1 rounded-full font-medium ${
              i === 0
                ? 'bg-primary/10 text-primary border border-primary/20'
                : 'text-muted-foreground hover:text-foreground cursor-pointer'
            }`}
          >
            {p}
          </span>
        ))}
      </div>
    </div>
  );
}

function BadgesCard() {
  const badges = [
    { icon: '🔥', name: '7-Day Streak', earned: true },
    { icon: '⚡', name: 'Power User', earned: true },
    { icon: '💪', name: 'Iron Warrior', earned: true },
    { icon: '🏃', name: 'First Check-in', earned: true },
    { icon: '🥇', name: 'Century Club', earned: false },
    { icon: '👑', name: 'Check-in Champ', earned: false },
    { icon: '🌟', name: '30-Day Streak', earned: false },
    { icon: '🎯', name: 'Goal Crusher', earned: false },
  ];

  return (
    <div className="group col-span-1 sm:col-span-2 lg:col-span-5 bg-surface border border-border rounded-2xl p-6 hover:border-primary/30 transition-all duration-300 flex flex-col min-h-[240px]">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-base">
              🎖️
            </div>
            <NewBadge />
          </div>
          <h3 className="font-bold text-foreground mb-1">Badges & Achievements</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Reward consistency and milestones. Members earn badges that show up on their profile and leaderboard.
          </p>
        </div>
      </div>

      {/* Badge grid */}
      <div className="grid grid-cols-4 gap-2">
        {badges.map((b) => (
          <div
            key={b.name}
            title={b.name}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition-all ${
              b.earned
                ? 'bg-primary/5 border-primary/20'
                : 'bg-border/20 border-transparent opacity-50 grayscale'
            }`}
          >
            <span className="text-xl">{b.icon}</span>
            <span className={`text-[8px] text-center leading-tight font-medium ${b.earned ? 'text-foreground' : 'text-muted-foreground'}`}>
              {b.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CheckInsCard() {
  const recent = [
    { name: 'Ana R.', time: '2 min ago' },
    { name: 'Marco S.', time: '5 min ago' },
    { name: 'Kelly T.', time: '11 min ago' },
    { name: 'Ben C.', time: '14 min ago' },
  ];

  return (
    <div className="group col-span-1 lg:col-span-3 bg-surface border border-border rounded-2xl p-5 hover:border-primary/30 transition-all duration-300 flex flex-col min-h-[240px]">
      <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-3">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
      </div>
      <h3 className="font-bold text-foreground text-sm mb-0.5">Smart Check-ins</h3>
      <p className="text-xs text-muted-foreground mb-4 leading-relaxed">QR code and manual. Real-time attendance with duplicate guard.</p>

      {/* Live feed */}
      <div className="space-y-2 flex-1">
        {recent.map((r) => (
          <div key={r.name} className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-full bg-primary/10 flex-shrink-0 flex items-center justify-center text-[9px] font-bold text-primary">
              {r.name[0]}
            </div>
            <span className="text-xs text-foreground font-medium flex-1">{r.name}</span>
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse-slow" />
              <span className="text-[9px] text-muted-foreground">{r.time}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AnalyticsCard() {
  const bars = [45, 70, 55, 85, 60, 92, 75];
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  return (
    <div className="group col-span-1 lg:col-span-4 bg-surface border border-border rounded-2xl p-5 hover:border-primary/30 transition-all duration-300 flex flex-col min-h-[240px]">
      <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-3">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 20V10" /><path d="M12 20V4" /><path d="M6 20v-6" />
        </svg>
      </div>
      <h3 className="font-bold text-foreground text-sm mb-0.5">Analytics & Insights</h3>
      <p className="text-xs text-muted-foreground mb-4 leading-relaxed">Revenue trends, peak hours, retention rates — all in one clean dashboard.</p>

      {/* Mini chart */}
      <div className="flex-1 flex flex-col justify-end">
        <div className="flex items-end gap-1.5 mb-1" style={{ height: '72px' }}>
          {bars.map((h, i) => (
            <div
              key={i}
              className={`flex-1 rounded-sm ${i === 5 ? 'bg-primary' : 'bg-primary/25'}`}
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
        <div className="flex">
          {days.map((d, i) => (
            <span key={i} className="flex-1 text-center text-[9px] text-muted-foreground">{d}</span>
          ))}
        </div>
        <div className="mt-3 flex gap-3">
          {[
            { label: 'Peak day', value: 'Saturday' },
            { label: 'Avg/day', value: '72' },
          ].map((m) => (
            <div key={m.label} className="flex-1 bg-background border border-border rounded-lg p-2">
              <p className="text-[9px] text-muted-foreground">{m.label}</p>
              <p className="text-xs font-bold text-foreground mt-0.5">{m.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SmallFeatureCard({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="group col-span-1 lg:col-span-3 bg-surface border border-border rounded-2xl p-5 hover:border-primary/30 hover:bg-primary/5 transition-all duration-200 min-h-[160px]">
      <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-3 group-hover:bg-primary/20 transition">
        {icon}
      </div>
      <h3 className="font-semibold text-foreground text-sm mb-1.5">{title}</h3>
      <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}

export function FeaturesSection() {
  return (
    <section id="features" className="py-24 px-6 border-t border-border/50">
      <div className="max-w-7xl mx-auto">
        {/* Section header */}
        <div className="mb-12 max-w-2xl">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Features</p>
          <h2 className="text-4xl font-bold text-foreground mb-4">
            Everything your gym needs,{' '}
            <span className="text-primary">nothing it doesn't.</span>
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            From day one, LiftHub covers every operational need so you can focus on what matters — your members.
          </p>
        </div>

        {/* Bento grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4">
          {/* Row 1: large feature cards */}
          <AiCoachingCard />
          <LeaderboardCard />

          {/* Row 2: medium feature cards */}
          <BadgesCard />
          <CheckInsCard />
          <AnalyticsCard />

          {/* Row 3: compact utility cards */}
          <SmallFeatureCard
            title="Member Management"
            description="Full profiles, photo ID, membership cards, and renewal tracking — all in one place."
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            }
          />
          <SmallFeatureCard
            title="Staff Portal (Web)"
            description="Full-featured web dashboard for owners and staff. Manage plans, renewals, announcements, and reports."
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8" /><path d="M12 17v4" />
              </svg>
            }
          />
          <SmallFeatureCard
            title="Multi-Gym & Multi-Tenant"
            description="One organization, multiple locations. Role-based access for owners, managers, and staff across all gyms."
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            }
          />
          <SmallFeatureCard
            title="Announcements"
            description="Push targeted announcements to members by gym or across all locations. Keep everyone in the loop."
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8h1a4 4 0 0 1 0 8h-1" /><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
                <line x1="6" y1="1" x2="6" y2="4" /><line x1="10" y1="1" x2="10" y2="4" /><line x1="14" y1="1" x2="14" y2="4" />
              </svg>
            }
          />
        </div>
      </div>
    </section>
  );
}
