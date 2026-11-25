import { Container } from './ui/Container';
import { SectionHeader } from './ui/SectionHeader';

const FAQS = [
  {
    question: 'Can you move our existing members over?',
    answer: 'Yes. Free migration help is included. Send us your member list and we’ll import it during setup.',
  },
  { question: 'Do our members see FitOps or our gym?', answer: 'Your gym. The member app shows your logo and colors.' },
  {
    question: 'What happens when the trial ends?',
    answer:
      'Your free trial lasts 14 days, with every feature included and no credit card needed. We’ll remind you a few days before it ends. To keep going, choose monthly or yearly billing. If you don’t, your account pauses and we keep your data for 30 days, so you can pick up right where you left off.',
  },
  {
    question: 'Does it work on a tablet at the front desk?',
    answer: 'Yes. The staff dashboard runs in a web browser on a laptop or tablet.',
  },
];

export function FaqSection() {
  return (
    <section id="faq" aria-labelledby="faq-heading" className="bg-cloud py-20 sm:py-24">
      <Container className="flex flex-col gap-11">
        <SectionHeader id="faq-heading" eyebrow="FAQ" title="Questions gym owners ask." />
        <div className="reveal max-w-[820px] border-b border-line">
          {FAQS.map((faq) => (
            <details key={faq.question} className="group border-t border-line py-5">
              <summary className="cursor-pointer rounded text-[17px] font-semibold text-ink marker:text-code">
                {faq.question}
              </summary>
              <p className="mt-3 text-[15px] leading-relaxed text-ink-secondary">{faq.answer}</p>
            </details>
          ))}
        </div>
      </Container>
    </section>
  );
}
