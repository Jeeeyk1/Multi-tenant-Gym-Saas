import { onAccent } from '@/lib/accent';
import { DEMO_LEADERBOARD, DEMO_MEMBER, DEMO_STATS, DEMO_WORKOUT } from '@/lib/demo-data';
import { QrIcon } from '../ui/icons';
import { PhoneFrame } from './PhoneFrame';

const TABS = ['Home', 'Coach', 'Ranks', 'Chat'];

export function BrandedPhone({ gymName, monogram, color }: { gymName: string; monogram: string; color: string }) {
  const textOnColor = onAccent(color);

  return (
    <PhoneFrame className="h-[500px] w-[250px]">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[11px] text-member-secondary">{gymName}</div>
          <div className="font-display text-lg font-extrabold">Hi, {DEMO_MEMBER.firstName}</div>
        </div>
        <span
          className="flex h-8 w-8 items-center justify-center rounded-[9px] font-display text-sm font-extrabold"
          style={{ backgroundColor: color, color: textOnColor }}
        >
          {monogram}
        </span>
      </div>

      <div
        className="flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-semibold"
        style={{ backgroundColor: color, color: textOnColor }}
      >
        <QrIcon />
        Check in
      </div>

      <div className="rounded-xl bg-member-surface p-3 text-[11px] text-member-secondary">
        Current streak
        <div className="font-display text-2xl font-extrabold" style={{ color }}>
          {DEMO_STATS.streakDays} days
        </div>
      </div>

      <div className="rounded-xl bg-member-surface p-3 text-[11px] font-semibold" style={{ color }}>
        AI COACH
        <div className="text-[13px] font-normal text-white">{DEMO_WORKOUT.name}</div>
      </div>

      <div className="rounded-xl bg-member-surface p-3 text-[11px] text-member-secondary">
        LEADERBOARD
        <div className="text-[13px] text-white">You&apos;re #{DEMO_LEADERBOARD.viewerRank} this week</div>
      </div>

      <div className="mt-auto flex justify-around text-[10px] text-member-secondary">
        {TABS.map((tab, index) => (
          <span key={tab} className={index === 0 ? 'font-semibold' : undefined} style={index === 0 ? { color } : undefined}>
            {tab}
          </span>
        ))}
      </div>
    </PhoneFrame>
  );
}
