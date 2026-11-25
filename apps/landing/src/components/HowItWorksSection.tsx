import { Container } from './ui/Container';
import { SectionHeader } from './ui/SectionHeader';
import { motionDelay } from '@/lib/motion';

const STEPS = [
  { title: 'Start your free trial', text: 'Tell us about your gym. We set up your account and send your gym code.' },
  { title: 'Make it yours', text: 'Upload your logo, pick your color, and add your plans and prices.' },
  { title: 'Invite your staff', text: 'Add owners, managers and front-desk staff with the right access.' },
  { title: 'Members join', text: 'Members download the app, enter your gym code and check in.' },
];

export function HowItWorksSection() {
  return (
    <section id="how" aria-labelledby="how-heading" className="bg-white py-20 sm:py-24">
      <Container className="flex flex-col gap-11">
        <SectionHeader
          id="how-heading"
          eyebrow="How it works"
          title="Up and running in a day."
          subtitle="No IT team needed. We help you set up, for free."
        />
        <ol className="flex flex-wrap gap-4">
          {STEPS.map((step, index) => (
            <li key={step.title} style={motionDelay(index)} className="reveal flex flex-[1_1_230px] flex-col gap-3 rounded-2xl border border-line p-6">
              <span
                aria-hidden="true"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-code font-display text-[17px] font-extrabold text-white"
              >
                {index + 1}
              </span>
              <h3 className="font-display text-[19px] font-extrabold text-ink">{step.title}</h3>
              <p className="text-[15px] leading-relaxed text-ink-secondary">{step.text}</p>
            </li>
          ))}
        </ol>
        <p className="text-[15px] text-ink-secondary">
          We aim to have every gym live within a day. Free setup and migration help included.
        </p>
      </Container>
    </section>
  );
}
