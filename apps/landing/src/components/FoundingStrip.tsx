import { ButtonLink } from './ui/ButtonLink';
import { Container } from './ui/Container';

export function FoundingStrip() {
  return (
    <section id="founding" aria-labelledby="founding-heading" className="bg-white pb-2 pt-10">
      <Container>
        <div className="reveal flex flex-wrap items-center justify-between gap-6 rounded-[20px] border-[1.5px] border-founding-border bg-gradient-to-r from-founding-tint to-white to-55% px-6 py-7 sm:px-8">
          <div className="flex flex-[1_1_520px] flex-col items-start gap-5 sm:flex-row sm:items-center">
            <div className="flex h-24 w-24 flex-none flex-col items-center justify-center rounded-[20px] bg-navy font-display leading-none text-volt">
              <span className="text-[32px] font-extrabold tracking-heading">50%</span>
              <span className="mt-1 text-[13px] font-bold">OFF</span>
            </div>
            <div className="flex flex-col gap-1.5">
              <p className="font-mono text-xs uppercase tracking-eyebrow text-ink">Founding gyms · Only 10 spots</p>
              <h2 id="founding-heading" className="font-display text-2xl font-extrabold tracking-[-0.02em] text-ink">
                Half price for your entire first year.
              </h2>
              <p className="text-[15px] leading-normal text-ink-secondary">
                Our first 10 gyms pay <b className="text-ink">50% less every month for 12 months</b> on any plan, plus
                free setup and a direct line to the team building FitOps. Monthly billing only.
              </p>
            </div>
          </div>
          <ButtonLink href="#trial" variant="navy" className="h-[52px]">
            Claim a founding spot
          </ButtonLink>
        </div>
      </Container>
    </section>
  );
}
