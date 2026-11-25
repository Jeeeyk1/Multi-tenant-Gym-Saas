import clsx from 'clsx';
import { onAccent } from '@/lib/accent';
import { DEMO_GYM, DEMO_MEMBER, DEMO_STATS } from '@/lib/demo-data';
import { PhoneFrame } from './PhoneFrame';

export function HeroPhone({ className, style }: { className?: string; style?: React.CSSProperties }) {
  const accent = DEMO_GYM.color;

  return (
    <PhoneFrame size="sm" className={clsx('h-[330px] w-[170px]', className)} style={style}>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[9px] text-member-secondary">{DEMO_GYM.name}</div>
          <div className="font-display text-sm font-extrabold text-white">Hi, {DEMO_MEMBER.firstName}</div>
        </div>
        <span className="h-6 w-6 rounded-[7px]" style={{ backgroundColor: accent }} />
      </div>

      <div className="rounded-[10px] border border-member-warning-border bg-member-warning-bg p-[9px] text-[9px] text-member-warning-text">
        Membership expires in 2 days
        <div
          className="mt-1.5 flex h-[26px] items-center justify-center rounded-lg text-[11px] font-semibold"
          style={{ backgroundColor: accent, color: onAccent(accent) }}
        >
          Renew now
        </div>
      </div>

      <div
        className="flex h-8 items-center justify-center rounded-[10px] border-[1.5px] text-[11px] font-semibold text-white"
        style={{ borderColor: accent }}
      >
        Check in
      </div>

      <div className="rounded-[10px] bg-member-surface p-[9px] text-[9px] text-member-secondary">
        Current streak
        <div className="font-display text-lg font-extrabold" style={{ color: accent }}>
          {DEMO_STATS.streakDays} days
        </div>
      </div>
    </PhoneFrame>
  );
}
