import { DEMO_BRANDED_GYMS, SHOWCASE_GYM } from '@/lib/demo-data';
import { BrandedPhone } from './mockups/BrandedPhone';
import { AiCoachScreen, LeaderboardScreen, MemberHomeScreen } from './mockups/MemberScreens';
import { Container } from './ui/Container';
import { SectionHeader } from './ui/SectionHeader';
import { SwipeRow } from './ui/SwipeRow';
import { motionDelay } from '@/lib/motion';

const SCREENS = [
  { title: 'Home', text: 'Membership card, days left, check-in and recent visits.', Screen: MemberHomeScreen },
  { title: 'AI Coach', text: 'Workouts with exercise swaps, meal plans and meal advice.', Screen: AiCoachScreen },
  {
    title: 'Leaderboard',
    text: 'Weekly and monthly rankings, points from check-ins and badges.',
    Screen: LeaderboardScreen,
  },
];

export function MemberAppSection() {
  return (
    <section id="members" aria-labelledby="members-heading" className="bg-members py-20 sm:py-24">
      <Container className="flex flex-col gap-12">
        <SectionHeader
          id="members-heading"
          tone="navy"
          align="center"
          eyebrow="The member app"
          title={'Your gym, in your members\u2019 pockets.'}
          subtitle="One app, branded for every gym. Your members see your logo and your colors, not ours."
        />

        <SwipeRow label="Member app in three gym colors">
          {DEMO_BRANDED_GYMS.map((gym, index) => (
            <li key={gym.name} style={motionDelay(index, 120)} className="reveal flex snap-center flex-col items-center gap-3.5">
              <div role="img" aria-label={`Member app home screen in ${gym.name}'s ${gym.colorLabel.toLowerCase()} branding.`}>
                <BrandedPhone gymName={gym.name} monogram={gym.monogram} color={gym.color} />
              </div>
              <span className="flex flex-col items-center gap-0.5 text-sm text-ink-on-navy">
                {gym.name}
                <span className="text-xs text-ink-muted">{gym.colorLabel}</span>
              </span>
            </li>
          ))}
        </SwipeRow>

        <div className="reveal flex flex-col items-center gap-2.5 border-t border-navy-line pt-6 text-center">
          <h3 className="font-display text-[28px] font-extrabold tracking-[-0.02em] text-white">What your members see</h3>
          <p className="text-base text-ink-on-navy">
            Real screens from the member app, shown here in {SHOWCASE_GYM.name}&rsquo;s gold.
          </p>
        </div>

        <SwipeRow label="Member app screens">
          {SCREENS.map(({ title, text, Screen }, index) => (
            <li key={title} style={motionDelay(index, 120)} className="reveal flex w-[270px] snap-center flex-col items-center gap-3">
              <div role="img" aria-label={`Member app ${title} screen.`}>
                <Screen color={SHOWCASE_GYM.color} />
              </div>
              <h4 className="font-display text-lg font-extrabold text-white">{title}</h4>
              <p className="max-w-[260px] text-center text-sm text-ink-on-navy">{text}</p>
            </li>
          ))}
        </SwipeRow>
      </Container>
    </section>
  );
}
