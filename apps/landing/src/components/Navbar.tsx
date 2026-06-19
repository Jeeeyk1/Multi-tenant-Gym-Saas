import Link from 'next/link';
import { ThemeToggle } from './ThemeToggle';

const WEB_URL = process.env.NEXT_PUBLIC_WEB_URL ?? 'http://localhost:3010';

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
              <path d="M6.5 6.5h11" /><path d="M6.5 17.5h11" />
              <path d="M3 9.5h2v5H3z" /><path d="M19 9.5h2v5h-2z" />
              <path d="M1 11h2v2H1z" /><path d="M21 11h2v2h-2z" />
            </svg>
          </div>
          <span className="text-lg font-bold text-foreground tracking-tight">LiftHub</span>
        </div>

        <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
          <a href="#features" className="hover:text-foreground transition">Features</a>
          <a href="#how-it-works" className="hover:text-foreground transition">How it works</a>
          <a href="#pricing" className="hover:text-foreground transition">Pricing</a>
        </nav>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link
            href={WEB_URL}
            className="hidden sm:block text-sm text-muted-foreground hover:text-foreground transition"
          >
            Staff login
          </Link>
          <a
            href="#pricing"
            className="text-sm bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition"
          >
            Get started
          </a>
        </div>
      </div>
    </header>
  );
}
