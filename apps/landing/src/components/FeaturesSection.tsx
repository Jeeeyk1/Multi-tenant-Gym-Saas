import clsx from 'clsx';
import { DEMO_WEEKLY_CHECK_INS } from '@/lib/demo-data';
import { Container } from './ui/Container';
import {
  BadgeIdIcon,
  CardIcon,
  ChatIcon,
  CheckIcon,
  GridIcon,
  MedalIcon,
  MegaphoneIcon,
  RenewIcon,
  SparkleIcon,
  UsersIcon,
} from './ui/icons';
import { SectionHeader } from './ui/SectionHeader';
import { motionDelay } from '@/lib/motion';

const HIGHLIGHTS = [
  {
    icon: RenewIcon,
    title: 'Renewals',
    text: 'Every membership due and expired, with reminders sent to members in one tap.',
  },
  { icon: CheckIcon, title: 'Smart check-ins', text: 'QR code and manual check-ins, live attendance and duplicate guard.' },
  { icon: SparkleIcon, title: 'AI Insights', text: 'Ask questions about your gym data in plain language.' },
];

const MORE_FEATURES = [
  { icon: UsersIcon, title: 'Member management', text: 'Full profiles, photo ID and membership cards.' },
  { icon: CardIcon, title: 'Plans and billing', text: 'Monthly, annual, student and day passes.' },
  { icon: MegaphoneIcon, title: 'Announcements', text: 'Push updates to members by gym or across all locations.' },
  { icon: ChatIcon, title: 'Community chat', text: 'Your gym’s community, moderated by your staff.' },
  {
    icon: MedalIcon,
    title: 'Leaderboards and badges',
    text: 'Weekly and monthly rankings, points from check-ins and activities.',
  },
  {
    icon: BadgeIdIcon,
    title: 'Branches and roles',
    text: 'Several gyms in one organization, with owner, manager and staff access.',
  },
];

function HighlightCard({
  icon: Icon,
  title,
  step,
  children,
}: {
  icon: typeof CheckIcon;
  title: string;
  step: number;
  children: React.ReactNode;
}) {
  return (
    <li style={motionDelay(step)} className="reveal navy-card flex flex-[1_1_250px] flex-col gap-3 rounded-2xl p-7">
      <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-sky/20 bg-signal/20 text-volt">
        <Icon size={24} />
      </span>
      <h3 className="font-display text-[22px] font-extrabold text-white">{title}</h3>
      {children}
    </li>
  );
}

function WeeklyCheckInsChart() {
  const peakIndex = DEMO_WEEKLY_CHECK_INS.bars.indexOf(Math.max(...DEMO_WEEKLY_CHECK_INS.bars));

  return (
    <div
      role="img"
      aria-label={`Weekly check-ins chart. Peak day ${DEMO_WEEKLY_CHECK_INS.peakDay}, average ${DEMO_WEEKLY_CHECK_INS.averagePerDay} a day.`}
      className="mt-auto flex flex-col gap-2"
    >
      <div className="flex h-16 items-end gap-1.5">
        {DEMO_WEEKLY_CHECK_INS.bars.map((height, index) => (
          <span
            key={index}
            className={clsx('grow-bar flex-1 rounded-t', index === peakIndex ? 'bg-volt' : 'bg-navy-line')}
            style={{ height: `${height}%`, ...motionDelay(index + 6, 60) }}
          />
        ))}
      </div>
      <div className="flex justify-between text-[11px] text-ink-muted">
        <span>Peak day {DEMO_WEEKLY_CHECK_INS.peakDay}</span>
        <span>Avg {DEMO_WEEKLY_CHECK_INS.averagePerDay}/day</span>
      </div>
    </div>
  );
}

export function FeaturesSection() {
  return (
    <section id="features" aria-labelledby="features-heading" className="bg-white py-20 sm:py-24">
      <Container className="flex flex-col gap-11">
        <SectionHeader
          id="features-heading"
          eyebrow="For you and your staff"
          title="One dashboard for the whole front desk."
          subtitle="A web dashboard for owners and staff, on a laptop or a tablet."
        />

        <ul className="flex flex-wrap gap-5">
          {HIGHLIGHTS.map((item, index) => (
            <HighlightCard key={item.title} icon={item.icon} title={item.title} step={index}>
              <p className="text-[15px] leading-relaxed text-ink-on-navy">{item.text}</p>
            </HighlightCard>
          ))}
          <HighlightCard icon={GridIcon} title="Analytics and insights" step={HIGHLIGHTS.length}>
            <p className="text-[15px] leading-relaxed text-ink-on-navy">
              Revenue trends, peak hours and retention rates in one clean dashboard.
            </p>
            <WeeklyCheckInsChart />
          </HighlightCard>
        </ul>

        <ul className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-x-8 gap-y-7">
          {MORE_FEATURES.map(({ icon: Icon, title, text }, index) => (
            <li key={title} style={motionDelay(index)} className="reveal flex items-start gap-3">
              <span className="flex h-10 w-10 flex-none items-center justify-center rounded-[10px] bg-tint text-code">
                <Icon size={20} />
              </span>
              <div className="flex flex-col gap-0.5">
                <h3 className="text-base font-semibold text-ink">{title}</h3>
                <p className="text-sm leading-normal text-ink-secondary">{text}</p>
              </div>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
