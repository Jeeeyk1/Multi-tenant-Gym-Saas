import Link from 'next/link';
import { CONTACT_EMAIL, FACEBOOK_URL } from '@/lib/brand';
import { Container } from './ui/Container';
import { Logo } from './ui/Logo';

const LINK_CLASS = 'text-ink-on-navy underline-offset-4 transition hover:text-white hover:underline';

export function Footer() {
  return (
    <footer className="bg-navy-deep py-12">
      <Container className="flex flex-wrap items-start justify-between gap-7">
        <div className="flex flex-col gap-2.5">
          <Logo size="sm" />
          <span className="font-mono text-[13px] text-ink-muted">a VerSolutions product</span>
        </div>

        <div className="flex flex-col gap-1.5 text-sm">
          <span className="font-semibold text-white">Contact</span>
          <a href={`mailto:${CONTACT_EMAIL}`} className={LINK_CLASS}>
            {CONTACT_EMAIL}
          </a>
        </div>

        <nav aria-label="Footer" className="flex flex-col gap-1.5 text-sm">
          <span className="font-semibold text-white">Company</span>
          <Link href="/privacy" className={LINK_CLASS}>
            Privacy
          </Link>
          <Link href="/terms" className={LINK_CLASS}>
            Terms
          </Link>
          <a href={FACEBOOK_URL} target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>
            Facebook
          </a>
        </nav>
      </Container>
    </footer>
  );
}
