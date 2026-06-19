export function CtaSection() {
  return (
    <section className="py-24 px-6 border-t border-border/50">
      <div className="max-w-4xl mx-auto">
        <div className="relative bg-surface border border-border rounded-3xl p-12 text-center overflow-hidden">
          {/* Background accent */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-primary/5 rounded-full blur-3xl" />
          </div>

          <div className="relative">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 border border-primary/25 mb-6">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                <path d="M6.5 6.5h11" /><path d="M6.5 17.5h11" />
                <path d="M3 9.5h2v5H3z" /><path d="M19 9.5h2v5h-2z" />
                <path d="M1 11h2v2H1z" /><path d="M21 11h2v2h-2z" />
              </svg>
            </div>

            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Ready to transform your gym?
            </h2>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-8">
              Join gym owners who are already using LiftHub to grow their memberships and
              deliver an exceptional fitness experience.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="mailto:hello@lifthub.app"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-8 py-3.5 rounded-xl font-semibold hover:bg-primary/90 transition"
              >
                Get in touch
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
                </svg>
              </a>
              <a
                href="#pricing"
                className="w-full sm:w-auto inline-flex items-center justify-center border border-border text-foreground px-8 py-3.5 rounded-xl font-medium hover:bg-foreground/5 transition"
              >
                View pricing
              </a>
            </div>

            <div className="flex items-center justify-center gap-6 mt-10 flex-wrap">
              {['14-day free trial', 'No credit card needed', 'Cancel anytime', 'Free migration help'].map((item) => (
                <div key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
