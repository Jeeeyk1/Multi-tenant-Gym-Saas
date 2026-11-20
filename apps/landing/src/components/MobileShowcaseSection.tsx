import { BRAND_NAME } from '@/lib/brand';

/* ─────────────────────────────────────────────────
   Member app showcase — three real screens:
   Home ((member)/dashboard.tsx), Community ((member)/hub.tsx),
   AI Coach ((member)/ai.tsx weekly plan view).
───────────────────────────────────────────────── */

function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-[220px] rounded-[32px] border-2 border-border shadow-xl shadow-foreground/10 overflow-hidden bg-background flex-shrink-0">
      <div className="h-6 bg-background flex items-center justify-center">
        <div className="w-11 h-1.5 rounded-full bg-border" />
      </div>
      {children}
    </div>
  );
}

function HomeScreen() {
  return (
    <PhoneFrame>
      <div className="p-3 bg-background">
        <div className="flex items-center justify-between mb-2.5">
          <div>
            <p className="text-[8px] text-muted-foreground leading-none">Good morning,</p>
            <p className="text-xs font-bold text-foreground mt-0.5">Ana</p>
          </div>
          <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">AR</div>
        </div>

        {/* Membership card */}
        <div className="rounded-xl p-2.5 mb-2 bg-primary/10 border border-primary/20">
          <div className="flex items-start justify-between mb-1.5">
            <div>
              <p className="text-[7px] font-bold uppercase tracking-wide text-primary">Plan</p>
              <p className="text-[10px] font-bold text-foreground">Monthly Unlimited</p>
            </div>
            <span className="text-[6.5px] font-bold px-1.5 py-0.5 rounded-full bg-success/15 text-success">ACTIVE</span>
          </div>
          <p className="text-xs font-extrabold text-foreground leading-none">Ana Reyes</p>
          <p className="text-[7px] text-primary/70 mt-0.5">MEM-0231</p>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-primary/15">
            <div><p className="text-[6.5px] text-muted-foreground">Expires</p><p className="text-[9px] font-semibold text-foreground">Aug 14</p></div>
            <div className="text-right"><p className="text-[6.5px] text-muted-foreground">Days left</p><p className="text-[9px] font-semibold text-foreground">18</p></div>
          </div>
        </div>

        {/* AI Coach banner */}
        <div className="rounded-xl p-2.5 mb-2 flex items-center gap-2" style={{ background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.7))' }}>
          <div className="w-6 h-6 rounded-full bg-black/15 flex items-center justify-center flex-shrink-0">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary-foreground">
              <path d="M12 2l1.5 4.5L18 8l-4.5 1.5L12 14l-1.5-4.5L6 8l4.5-1.5z" />
            </svg>
          </div>
          <div>
            <p className="text-[9px] font-bold text-primary-foreground leading-none">AI Coach</p>
            <p className="text-[7px] text-primary-foreground/80 mt-0.5">Personalised workouts & meal plans</p>
          </div>
        </div>

        {/* Quick actions */}
        <div className="flex gap-1.5 mb-2">
          <div className="flex-1 border border-border rounded-lg py-2 text-center">
            <p className="text-[7px] font-semibold text-foreground">Check In</p>
          </div>
          <div className="flex-1 border border-border rounded-lg py-2 text-center">
            <p className="text-[7px] font-semibold text-foreground">Start Workout</p>
          </div>
        </div>

        <p className="text-[7px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Recent Visits</p>
        {[{ d: 'Mon, Jul 27', t: '6:12 AM', dur: '54 min' }, { d: 'Sat, Jul 25', t: '7:40 AM', dur: '61 min' }].map((v) => (
          <div key={v.d} className="flex items-center justify-between border border-border rounded-lg px-2 py-1.5 mb-1">
            <div>
              <p className="text-[7.5px] font-medium text-foreground">{v.d}</p>
              <p className="text-[6.5px] text-muted-foreground">Checked in · {v.t}</p>
            </div>
            <span className="text-[7px] text-muted-foreground">{v.dur}</span>
          </div>
        ))}
      </div>
    </PhoneFrame>
  );
}

function CommunityScreen() {
  const items = [
    {
      label: 'Announcements',
      desc: 'Gym news, updates & pinned posts',
      color: '#F59E0B',
      d: 'M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z',
    },
    {
      label: 'Community Chat',
      desc: 'Talk with other members',
      color: '#0891B2',
      d: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
    },
    {
      label: 'Leaderboard',
      desc: 'See the top lifters in your gym',
      color: '#8B5CF6',
      d: 'M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM7 6H4a2 2 0 0 0 2 4M17 6h3a2 2 0 0 1-2 4',
    },
  ];

  return (
    <PhoneFrame>
      <div className="p-3 bg-background" style={{ minHeight: '360px' }}>
        <p className="text-sm font-extrabold text-foreground">Community</p>
        <p className="text-[8px] text-muted-foreground mb-3">Everything social, in one place</p>
        {items.map((item, i) => (
          <div key={item.label} className={`flex items-center gap-2.5 py-2.5 ${i > 0 ? 'border-t border-border' : ''}`}>
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: `${item.color}22`, color: item.color }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d={item.d} />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold text-foreground leading-none">{item.label}</p>
              <p className="text-[7.5px] text-muted-foreground mt-1 truncate">{item.desc}</p>
            </div>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground flex-shrink-0">
              <path d="m9 6 6 6-6 6" />
            </svg>
          </div>
        ))}
      </div>
    </PhoneFrame>
  );
}

function AiCoachScreen() {
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const exercises = [
    { name: 'Back Squat', sets: 4, reps: 6, rest: 90 },
    { name: 'Romanian Deadlift', sets: 3, reps: 10, rest: 75 },
    { name: 'Leg Press', sets: 3, reps: 12, rest: 60 },
  ];

  return (
    <PhoneFrame>
      <div className="bg-background">
        <div className="bg-primary px-3 py-2.5">
          <p className="text-[10px] font-bold text-primary-foreground">AI Coach</p>
          <div className="flex gap-3 mt-1.5">
            <span className="text-[8px] font-semibold text-primary-foreground border-b-2 border-primary-foreground pb-0.5">Workout</span>
            <span className="text-[8px] text-primary-foreground/60">Meal Plan</span>
          </div>
        </div>
        <div className="p-2.5">
          <div className="flex gap-1 mb-2.5">
            {days.map((d, i) => (
              <div
                key={i}
                className={`flex-1 text-center rounded-md py-1.5 text-[8px] font-bold ${i === 2 ? 'bg-primary text-primary-foreground' : 'bg-surface text-muted-foreground border border-border'}`}
              >
                {d}
              </div>
            ))}
          </div>
          <p className="text-[9px] font-bold text-primary mb-0.5">Leg Day</p>
          <p className="text-[7.5px] text-muted-foreground mb-2.5">45 min · Strength focus</p>
          <div className="space-y-1.5">
            {exercises.map((ex) => (
              <div key={ex.name} className="border border-border rounded-lg p-2">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[9px] font-semibold text-foreground">{ex.name}</p>
                  <span className="text-[6.5px] font-semibold text-primary border border-primary/30 rounded-full px-1.5 py-0.5">Swap</span>
                </div>
                <div className="flex gap-2.5">
                  <span className="text-[7px] text-muted-foreground"><b className="text-foreground">{ex.sets}</b> sets</span>
                  <span className="text-[7px] text-muted-foreground"><b className="text-foreground">{ex.reps}</b> reps</span>
                  <span className="text-[7px] text-muted-foreground"><b className="text-foreground">{ex.rest}s</b> rest</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PhoneFrame>
  );
}

export function MobileShowcaseSection() {
  return (
    <section className="py-24 px-6 border-t border-border/50 bg-surface/40">
      <div className="max-w-6xl mx-auto">
        <div className="mb-14 max-w-xl mx-auto text-center">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">The member app</p>
          <h2 className="text-4xl font-bold text-foreground mb-4">What your members actually see</h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Every screen below is the real {BRAND_NAME} app — same layout, same copy, same feature set members get on day one.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-8">
          <div className="flex flex-col items-center gap-3">
            <HomeScreen />
            <p className="text-sm font-semibold text-foreground">Home</p>
          </div>
          <div className="flex flex-col items-center gap-3">
            <CommunityScreen />
            <p className="text-sm font-semibold text-foreground">Community</p>
          </div>
          <div className="flex flex-col items-center gap-3">
            <AiCoachScreen />
            <p className="text-sm font-semibold text-foreground">AI Coach</p>
          </div>
        </div>
      </div>
    </section>
  );
}
