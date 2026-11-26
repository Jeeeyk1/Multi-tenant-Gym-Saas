import { onAccent } from '@/lib/accent';
import { DEMO_LEADERBOARD, DEMO_MEMBER, DEMO_MEMBERSHIP, DEMO_WORKOUT } from '@/lib/demo-data';
import { MedalIcon } from '../ui/icons';
import { PhoneFrame } from './PhoneFrame';

const SCREEN_CLASS = 'h-[520px] w-[260px] text-xs';

export function MemberHomeScreen({ color }: { color: string }) {
  return (
    <PhoneFrame className={SCREEN_CLASS}>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[11px] text-member-secondary">Good morning,</div>
          <div className="font-display text-[17px] font-extrabold">{DEMO_MEMBER.firstName}</div>
        </div>
        <span className="h-[30px] w-[30px] rounded-[9px]" style={{ backgroundColor: color }} />
      </div>

      <div className="rounded-xl border bg-member-surface p-3" style={{ borderColor: color }}>
        <div className="flex justify-between text-[10px] text-member-secondary">
          <span>PLAN</span>
          <span className="rounded-full bg-member-success-bg px-2 py-px font-semibold text-member-success">Active</span>
        </div>
        <div className="mt-1 text-sm font-bold">{DEMO_MEMBERSHIP.plan}</div>
        <div className="mt-2.5 flex justify-between text-[11px] text-member-secondary">
          <span>Expires {DEMO_MEMBERSHIP.expires}</span>
          <span>
            <b className="text-white">{DEMO_MEMBERSHIP.daysLeft}</b> days left
          </span>
        </div>
      </div>

      <div
        className="flex h-[42px] items-center justify-center rounded-xl text-[13px] font-semibold"
        style={{ backgroundColor: color, color: onAccent(color) }}
      >
        Check in
      </div>

      <div className="mt-1 text-[10px] tracking-eyebrow text-member-secondary">RECENT VISITS</div>
      {DEMO_MEMBERSHIP.recentVisits.map((visit) => (
        <div key={visit.date} className="flex justify-between rounded-xl bg-member-surface p-3">
          <span>{visit.date}</span>
          <span className="text-member-secondary">{visit.duration}</span>
        </div>
      ))}
    </PhoneFrame>
  );
}

export function AiCoachScreen({ color }: { color: string }) {
  return (
    <PhoneFrame className={SCREEN_CLASS}>
      <div className="font-display text-[17px] font-extrabold">AI Coach</div>
      <div className="flex gap-3.5">
        <span className="border-b-2 pb-[3px] font-semibold" style={{ color, borderColor: color }}>
          Workout
        </span>
        <span className="text-member-secondary">Meal plan</span>
      </div>
      <div className="text-sm font-bold">{DEMO_WORKOUT.name}</div>
      <div className="-mt-1.5 text-[10px] text-member-secondary">{DEMO_WORKOUT.summary}</div>

      {DEMO_WORKOUT.exercises.map((exercise) => (
        <div key={exercise.name} className="flex items-center justify-between rounded-xl bg-member-surface p-3">
          <div>
            <div className="font-semibold">{exercise.name}</div>
            <div className="text-[10px] text-member-secondary">{exercise.sets}</div>
          </div>
          <span
            className="rounded-full border px-[9px] py-[3px] text-[10px] font-semibold"
            style={{ color, borderColor: color }}
          >
            Swap
          </span>
        </div>
      ))}

      <div
        className="mt-auto flex h-[38px] items-center justify-center rounded-[10px] font-semibold"
        // #RRGGBB + 29 = 16% opacity.
        style={{ color, backgroundColor: `${color}29` }}
      >
        Ask AI for meal advice
      </div>
    </PhoneFrame>
  );
}

export function LeaderboardScreen({ color }: { color: string }) {
  return (
    <PhoneFrame className={SCREEN_CLASS}>
      <div className="font-display text-[17px] font-extrabold">Leaderboard</div>
      <div className="flex gap-1 self-start rounded-full bg-member-surface p-[3px] text-[11px]">
        <span className="rounded-full px-2.5 py-1 font-semibold" style={{ backgroundColor: color, color: onAccent(color) }}>
          This week
        </span>
        <span className="px-2.5 py-1 text-member-secondary">This month</span>
      </div>

      {DEMO_LEADERBOARD.rows.map((row) => (
        <div
          key={row.rank}
          className="flex items-center gap-2.5 rounded-[10px] border bg-member-surface px-2.5 py-[9px]"
          style={{ borderColor: row.isViewer ? color : 'transparent' }}
        >
          <span
            className="w-4 font-extrabold text-member-secondary"
            style={row.isViewer ? { color } : undefined}
          >
            {row.rank}
          </span>
          <span className={row.isViewer ? 'flex-1 font-semibold' : 'flex-1'}>{row.name}</span>
          <span className="font-semibold" style={{ color: row.isViewer ? color : undefined }}>
            {row.points}
          </span>
        </div>
      ))}

      <div className="mt-1 text-[10px] tracking-eyebrow text-member-secondary">YOUR BADGES</div>
      <div className="flex gap-1.5">
        {DEMO_LEADERBOARD.badges.map((badge) => (
          <span
            key={badge}
            className="flex flex-1 flex-col items-center gap-1 rounded-[10px] bg-member-surface px-1 py-2 text-center text-[9px] text-member-secondary"
          >
            <span style={{ color }}>
              <MedalIcon />
            </span>
            {badge}
          </span>
        ))}
      </div>
    </PhoneFrame>
  );
}
