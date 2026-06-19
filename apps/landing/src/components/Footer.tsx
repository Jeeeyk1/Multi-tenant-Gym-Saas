export function Footer() {
  return (
    <footer className="border-t border-border/50 py-10 px-6">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
              <path d="M6.5 6.5h11" /><path d="M6.5 17.5h11" />
              <path d="M3 9.5h2v5H3z" /><path d="M19 9.5h2v5h-2z" />
              <path d="M1 11h2v2H1z" /><path d="M21 11h2v2h-2z" />
            </svg>
          </div>
          <span className="font-semibold text-foreground">LiftHub</span>
        </div>

        <p className="text-sm text-muted-foreground text-center">
          © {new Date().getFullYear()} LiftHub. All rights reserved.
        </p>

        <div className="flex items-center gap-5 text-sm text-muted-foreground">
          <a href="mailto:hello@lifthub.app" className="hover:text-foreground transition">Contact</a>
          <a href="#" className="hover:text-foreground transition">Privacy</a>
          <a href="#" className="hover:text-foreground transition">Terms</a>
        </div>
      </div>
    </footer>
  );
}
