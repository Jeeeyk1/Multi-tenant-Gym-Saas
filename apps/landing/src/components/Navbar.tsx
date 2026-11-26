import Link from 'next/link';
import { MobileNav } from './MobileNav';
import { NAV_LINKS } from './navLinks';
import { ButtonLink } from './ui/ButtonLink';
import { Container } from './ui/Container';
import { Logo } from './ui/Logo';

export function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-navy-line bg-navy">
      <Container className="relative flex min-h-[72px] items-center justify-between gap-3">
        <Link href="/" aria-label="FitOps home" className="rounded-md">
          <Logo />
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-[26px] text-[15px] font-medium lg:flex">
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href} className="text-ink-on-navy transition hover:text-white">
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-1">
          {/* Phones use MobileTrialBar instead. */}
          <ButtonLink href="/#trial" className="max-md:hidden">
            Start free trial
          </ButtonLink>
          <MobileNav />
        </div>
      </Container>
    </header>
  );
}
