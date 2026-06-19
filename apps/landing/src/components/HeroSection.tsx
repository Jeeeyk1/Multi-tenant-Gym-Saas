export function HeroSection() {
  return (
    <section className="relative overflow-hidden pt-24 pb-16 lg:pb-20 px-6">
      {/* Dot grid background */}
      <div
        className="absolute inset-0 pointer-events-none opacity-50"
        style={{
          backgroundImage: 'radial-gradient(hsl(var(--border)) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />
      {/* Fade the dot grid at the bottom */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent via-transparent to-background" />

      <div className="relative max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center">

          {/* ── Left: copy ── */}
          <div className="flex flex-col items-start max-w-xl">
            <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 text-sm text-primary font-medium mb-8">
              <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse-slow" />
              Built for gym owners, by gym people
            </div>

            <h1 className="text-5xl md:text-6xl lg:text-[64px] font-bold text-foreground tracking-tight leading-[1.08] mb-6">
              Run your gym{' '}
              <span className="text-primary">smarter,</span>
              <br />
              not harder.
            </h1>

            <p className="text-xl text-muted-foreground mb-10 leading-relaxed">
              LiftHub gives gym owners everything they need — member management,
              smart check-ins, AI coaching, leaderboards, and real-time analytics
              — all in one platform.
            </p>

            <div className="flex flex-col sm:flex-row items-start gap-4 mb-10">
              <a
                href="#pricing"
                className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-8 py-3.5 rounded-xl font-semibold text-base hover:bg-primary/90 transition-all duration-200"
              >
                Start your free trial
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
                </svg>
              </a>
              <a
                href="#features"
                className="inline-flex items-center gap-2 border border-border text-foreground px-8 py-3.5 rounded-xl font-medium text-base hover:bg-foreground/5 transition-all duration-200"
              >
                See features
              </a>
            </div>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
              {['No credit card required', '14-day free trial', 'Cancel anytime'].map((item) => (
                <div key={item} className="flex items-center gap-1.5">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary flex-shrink-0">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  {item}
                </div>
              ))}
            </div>
          </div>

          {/* ── Right: floating mockups ── */}
          <div className="hidden lg:block relative h-[580px] select-none">

            {/* Desktop dashboard mockup */}
            <div className="absolute top-0 right-0 w-[540px] rounded-2xl overflow-hidden border border-border shadow-2xl shadow-foreground/10 bg-surface">
              {/* Browser bar */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-background">
                <div className="w-3 h-3 rounded-full bg-red-400/60" />
                <div className="w-3 h-3 rounded-full bg-yellow-400/60" />
                <div className="w-3 h-3 rounded-full bg-green-400/60" />
                <div className="flex-1 bg-surface border border-border rounded-md h-5 ml-3 max-w-[200px] flex items-center px-3">
                  <span className="text-[10px] text-muted-foreground truncate">app.lifthub.io/dashboard</span>
                </div>
              </div>

              {/* Dashboard body */}
              <div className="flex" style={{ height: '296px' }}>
                {/* Sidebar */}
                <div className="w-44 border-r border-border p-3 flex flex-col gap-0.5 bg-surface flex-shrink-0">
                  <div className="px-2 py-1.5 mb-2">
                    <p className="text-[9px] text-muted-foreground font-semibold uppercase tracking-widest">Fitness Forge</p>
                  </div>
                  {[
                    { label: 'Overview', active: true },
                    { label: 'Members' },
                    { label: 'Check-ins' },
                    { label: 'Leaderboard' },
                    { label: 'Staff' },
                    { label: 'AI Coach' },
                    { label: 'Reports' },
                  ].map(({ label, active }) => (
                    <div
                      key={label}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] ${
                        active ? 'bg-primary/10 text-primary font-semibold' : 'text-muted-foreground'
                      }`}
                    >
                      <div className={`w-1.5 h-1.5 rounded-sm flex-shrink-0 ${active ? 'bg-primary' : 'bg-border'}`} />
                      {label}
                    </div>
                  ))}
                </div>

                {/* Main content */}
                <div className="flex-1 p-4 bg-background overflow-hidden">
                  <p className="text-xs font-semibold text-foreground mb-3">Good morning, Coach Maria 👋</p>

                  {/* Stat cards */}
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {[
                      { label: 'Active Members', value: '1,248', badge: '↑ 12%', up: true },
                      { label: 'Check-ins Today', value: '87', badge: '↑ 8%', up: true },
                      { label: 'Renewals Due', value: '34', badge: '↓ 3', up: false },
                      { label: 'Revenue (mo)', value: '₱58.2k', badge: '↑ 6%', up: true },
                    ].map((s) => (
                      <div key={s.label} className="bg-surface border border-border rounded-lg p-2.5">
                        <p className="text-[9px] text-muted-foreground leading-none mb-1">{s.label}</p>
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-bold text-foreground">{s.value}</p>
                          <span className={`text-[8px] font-semibold px-1 py-0.5 rounded ${s.up ? 'text-success bg-success/10' : 'text-muted-foreground bg-border/40'}`}>
                            {s.badge}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Chart */}
                  <div className="bg-surface border border-border rounded-lg p-3">
                    <p className="text-[9px] font-medium text-muted-foreground mb-2">Check-in Activity — this week</p>
                    <div className="flex items-end gap-1" style={{ height: '52px' }}>
                      {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
                        <div
                          key={i}
                          className={`flex-1 rounded-sm ${i === 5 ? 'bg-primary' : 'bg-primary/20'}`}
                          style={{ height: `${h}%` }}
                        />
                      ))}
                    </div>
                    <div className="flex mt-1">
                      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
                        <span key={d} className="flex-1 text-center text-[8px] text-muted-foreground">{d}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Phone mockup — overlapping bottom-left */}
            <div className="absolute bottom-0 left-6 w-[158px] rounded-[28px] overflow-hidden border-2 border-border shadow-2xl shadow-foreground/15 bg-background">
              {/* App header */}
              <div className="bg-primary px-4 py-2.5 flex items-center justify-between">
                <span className="text-[10px] text-primary-foreground font-bold tracking-wide">LiftHub</span>
                <div className="w-5 h-5 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                  <span className="text-[8px] text-primary-foreground font-bold">AR</span>
                </div>
              </div>

              {/* Leaderboard screen */}
              <div className="p-3 bg-background">
                <p className="text-[10px] font-bold text-foreground mb-2.5 flex items-center gap-1">
                  <span>🏆</span> Leaderboard
                </p>
                <div className="space-y-1">
                  {[
                    { rank: '1', name: 'Ana R.', pts: '2,450', gold: true, you: false },
                    { rank: '2', name: 'Marco S.', pts: '2,100', gold: false, you: false },
                    { rank: '3', name: 'Kelly T.', pts: '1,890', gold: false, you: false },
                    { rank: '4', name: 'You', pts: '1,650', gold: false, you: true },
                  ].map((r) => (
                    <div
                      key={r.rank}
                      className={`flex items-center gap-1.5 py-1.5 px-2 rounded-lg ${r.you ? 'bg-primary/10' : ''}`}
                    >
                      <span className={`text-[9px] font-bold w-3 flex-shrink-0 ${r.gold ? 'text-amber-400' : r.you ? 'text-primary' : 'text-muted-foreground'}`}>
                        {r.rank}
                      </span>
                      <div className={`w-5 h-5 rounded-full flex-shrink-0 ${r.gold ? 'bg-amber-400/20' : r.you ? 'bg-primary/20' : 'bg-border'}`} />
                      <span className={`text-[9px] flex-1 truncate ${r.you ? 'text-primary font-semibold' : 'text-foreground'}`}>{r.name}</span>
                      <span className="text-[8px] text-muted-foreground">{r.pts}</span>
                    </div>
                  ))}
                </div>

                {/* Badge strip */}
                <div className="mt-2.5 pt-2.5 border-t border-border">
                  <p className="text-[8px] text-muted-foreground mb-1.5">Earned badges</p>
                  <div className="flex gap-1.5">
                    {['🔥', '⚡', '💪'].map((b) => (
                      <span key={b} className="w-7 h-7 bg-primary/10 rounded-lg flex items-center justify-center text-[13px]">{b}</span>
                    ))}
                    <span className="w-7 h-7 bg-border/40 rounded-lg flex items-center justify-center text-[8px] text-muted-foreground font-semibold">+5</span>
                  </div>
                </div>
              </div>

              {/* Bottom nav */}
              <div className="flex justify-around py-2 border-t border-border bg-surface">
                {['🏠', '🏆', '🤖', '👤'].map((icon) => (
                  <span key={icon} className="text-sm">{icon}</span>
                ))}
              </div>
            </div>

            {/* Floating stat card — top right */}
            <div className="absolute top-5 right-[-12px] bg-background border border-border rounded-xl shadow-lg shadow-foreground/8 px-3.5 py-2.5 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center flex-shrink-0">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-success">
                  <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" />
                </svg>
              </div>
              <div>
                <p className="text-[11px] font-bold text-foreground leading-none">87 check-ins</p>
                <p className="text-[9px] text-muted-foreground mt-0.5">Today · still counting</p>
              </div>
            </div>

            {/* Floating stat card — bottom right */}
            <div className="absolute bottom-28 right-[-16px] bg-background border border-border rounded-xl shadow-lg shadow-foreground/8 px-3.5 py-2.5 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-amber-400/15 flex items-center justify-center text-sm flex-shrink-0">
                🏆
              </div>
              <div>
                <p className="text-[11px] font-bold text-foreground leading-none">Ana R.</p>
                <p className="text-[9px] text-muted-foreground mt-0.5">Rank #1 this week</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
