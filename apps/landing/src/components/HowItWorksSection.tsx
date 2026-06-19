const STEPS = [
  {
    step: '01',
    title: 'Contact us to get started',
    description:
      'Reach out to the LiftHub team. We set up your gym organization, assign your unique gym code, and send you an invite to activate your account.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    step: '02',
    title: 'Customize your gym profile',
    description:
      'Upload your logo, set your brand colors, configure membership plans and pricing. Your staff portal and member app reflect your branding automatically.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 19.07A10 10 0 0 1 4.93 4.93" />
      </svg>
    ),
  },
  {
    step: '03',
    title: 'Onboard your staff',
    description:
      'Invite trainers and front-desk staff via email. Assign roles — owner, manager, or staff — so everyone gets exactly the right access.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    step: '04',
    title: 'Members join and thrive',
    description:
      'Members download the LiftHub app, enter your gym code, and instantly access their membership card, AI coach, leaderboard, badges, and check-in history.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
  },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-24 px-6 border-t border-border/50 bg-surface/40">
      <div className="max-w-6xl mx-auto">
        {/* Header — left-aligned to break from centered-section monotony */}
        <div className="mb-16 max-w-xl">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">How it works</p>
          <h2 className="text-4xl font-bold text-foreground mb-4">Up and running in a day</h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            No complex setup. No IT team required. LiftHub is designed to go live fast.
          </p>
        </div>

        {/* Steps grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {STEPS.map((step, idx) => (
            <div key={step.step} className="relative group">
              {/* Connector line (desktop only, not on last item) */}
              {idx < STEPS.length - 1 && (
                <div className="hidden lg:block absolute top-7 left-[calc(100%+0px)] w-6 h-px bg-border z-10" style={{ transform: 'translateX(-24px)' }} />
              )}

              {/* Card */}
              <div className="bg-surface border border-border rounded-2xl p-5 h-full hover:border-primary/30 hover:bg-background transition-all duration-200">
                {/* Step number + icon row */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary flex-shrink-0 group-hover:bg-primary/20 transition">
                    {step.icon}
                  </div>
                  <span className="text-3xl font-extrabold text-primary/20 leading-none">{step.step}</span>
                </div>

                <h3 className="font-semibold text-foreground mb-2 text-sm leading-snug">{step.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{step.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom note */}
        <p className="mt-10 text-sm text-muted-foreground text-center">
          Most gyms are fully live within{' '}
          <span className="text-foreground font-semibold">24 hours</span> of signup.
          Free setup assistance included.
        </p>
      </div>
    </section>
  );
}
