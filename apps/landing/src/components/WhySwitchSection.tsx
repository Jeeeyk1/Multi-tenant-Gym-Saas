import { Container } from './ui/Container';
import { CheckIcon, RenewIcon, UsersIcon } from './ui/icons';
import { SectionHeader } from './ui/SectionHeader';
import { motionDelay } from '@/lib/motion';

const PROBLEMS = [
  {
    icon: RenewIcon,
    title: 'Missed renewals',
    problem: 'Expiring memberships get noticed after the member has already stopped coming.',
    fix: 'See who expires this week and remind them in one tap.',
  },
  {
    icon: CheckIcon,
    title: 'Paper check-ins',
    problem: 'Front-desk logbooks are slow, and the data never gets used.',
    fix: 'Members scan a QR code. You see who’s in the gym right now.',
  },
  {
    icon: UsersIcon,
    title: 'Members drift away',
    problem: 'Motivation fades after the first month without goals or community.',
    fix: 'Challenges, leaderboards, badges and an AI coach keep them coming back.',
  },
];

export function WhySwitchSection() {
  return (
    <section aria-labelledby="why-heading" className="bg-cloud py-20 sm:py-24">
      <Container className="flex flex-col gap-11">
        <SectionHeader
          id="why-heading"
          eyebrow="Why gyms switch"
          title="Members leave quietly. Renewals slip through the cracks."
          subtitle="Logbooks, spreadsheets and group chats each hold part of the story, and nobody sees the whole picture until a member is gone."
        />
        <ul className="flex flex-wrap gap-5">
          {PROBLEMS.map(({ icon: Icon, title, problem, fix }, index) => (
            <li
              key={title}
              style={motionDelay(index)}
              className="reveal flex flex-[1_1_300px] flex-col gap-3 rounded-2xl border border-line bg-white p-7"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-navy text-sky">
                <Icon size={24} />
              </span>
              <h3 className="font-display text-[21px] font-extrabold tracking-[-0.02em] text-ink">{title}</h3>
              <p className="text-[15px] leading-relaxed text-ink-secondary">{problem}</p>
              <p className="border-t border-line pt-3 text-[15px] leading-relaxed text-ink">
                <b className="text-code">FitOps:</b> {fix}
              </p>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
