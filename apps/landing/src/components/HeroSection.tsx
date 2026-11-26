import { DEMO_GYM, DEMO_MEMBER, DEMO_STATS } from '@/lib/demo-data';
import { FloatingStat } from './mockups/FloatingStat';
import { HeroPhone } from './mockups/HeroPhone';
import { RenewalsDashboard } from './mockups/RenewalsDashboard';
import { ButtonLink } from './ui/ButtonLink';
import { Container } from './ui/Container';
import { CheckIcon, TrophyIcon } from './ui/icons';
import { TrustList } from './ui/TrustList';
import { motionDelay } from '@/lib/motion';

const TRUST_ITEMS = ['Free trial', 'No credit card required', 'Free setup assistance'];

export function HeroSection() {
  return (
    <section id="hero" className="bg-hero overflow-hidden pb-20 pt-14 sm:pb-[104px] sm:pt-20">
      <Container className="flex flex-wrap items-center gap-14">
        <div className="flex max-w-full flex-[1_1_440px] flex-col gap-6">
          <p className="motion-enter font-mono text-[13px] uppercase tracking-eyebrow text-volt" style={motionDelay(0)}>
            Built for gym owners, by gym people</p>
          <h1 className="font-display text-[clamp(42px,6vw,68px)] font-extrabold leading-none tracking-[-0.045em] text-white">
            Keep your members.
            <br />
            <span className="text-volt">Lose the logbook.</span>
          </h1>
          <p style={motionDelay(2)} className="motion-enter max-w-[520px] text-[19px] leading-relaxed text-ink-on-navy">
            FitOps runs check-ins, renewals and member engagement, and gives your members an app with your gym&apos;s
            logo.
          </p>
          <div className="motion-enter flex flex-wrap gap-3" style={motionDelay(3)}>
            <ButtonLink href="#trial" className="h-[52px]">
              Start free trial
            </ButtonLink>
            <ButtonLink href="#members" variant="outline-navy" className="h-[52px]">
              See the member app
            </ButtonLink>
          </div>
          <TrustList items={TRUST_ITEMS} tone="navy" className="motion-enter" style={motionDelay(4)} />
        </div>

        <div
          role="img"
          aria-label="FitOps staff dashboard showing renewals due this week, next to a gym's branded member app reminding a member to renew."
          className="motion-enter relative max-w-full flex-[1_1_540px] pb-10"
          style={motionDelay(3, 120)}
        >
          <RenewalsDashboard className="sm:mr-[150px]" />
          <HeroPhone className="motion-drift absolute bottom-0 right-0 hidden sm:flex" style={motionDelay(10, 150)} />
          <FloatingStat
            icon={<CheckIcon className="text-volt" />}
            iconClassName="bg-volt/15"
            title={`${DEMO_STATS.checkInsToday} check-ins`}
            subtitle="Today · still counting"
            className="motion-drift -top-11 right-[120px] hidden md:flex"
            style={motionDelay(0)}
          />
          <FloatingStat
            icon={<TrophyIcon />}
            // #RRGGBB + 26 = 15% opacity.
            iconStyle={{ color: DEMO_GYM.color, backgroundColor: `${DEMO_GYM.color}26` }}
            title={DEMO_MEMBER.shortName}
            subtitle="Rank #1 this week"
            className="motion-drift -left-7 bottom-16 hidden md:flex"
            style={motionDelay(20, 150)}
          />
        </div>
      </Container>
    </section>
  );
}
