import { CONTACT_EMAIL } from '@/lib/brand';
import { TrialForm } from './TrialForm';
import { Container } from './ui/Container';
import { Eyebrow } from './ui/Eyebrow';
import { TrustList } from './ui/TrustList';

const TRUST_ITEMS = ['Free trial', 'No credit card required', 'Free setup assistance'];
const BOOK_CALL_HREF = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Book a FitOps demo')}`;

export function TrialSection() {
  return (
    <section id="trial" aria-labelledby="trial-heading" className="bg-trial relative py-20 sm:py-24">
      <Container className="flex flex-col items-center gap-[22px] text-center">
        <Eyebrow tone="volt">Start your free trial</Eyebrow>
        <h2
          id="trial-heading"
          className="max-w-[760px] font-display text-[clamp(34px,5vw,54px)] font-extrabold leading-[1.05] tracking-[-0.04em] text-white"
        >
          See FitOps with your own gym.
        </h2>
        <p className="max-w-[560px] text-lg leading-relaxed text-ink-on-navy">
          Tell us a little about your gym. We&apos;ll set up your account and reach out within a day.
        </p>
        <TrialForm />
        <div className="flex flex-wrap items-center justify-center gap-4">
          <TrustList items={TRUST_ITEMS} tone="navy" className="justify-center" />
          <a href={BOOK_CALL_HREF} className="text-sm font-semibold text-sky underline-offset-4 hover:underline">
            Prefer a demo? Book a call
          </a>
        </div>
      </Container>
    </section>
  );
}
