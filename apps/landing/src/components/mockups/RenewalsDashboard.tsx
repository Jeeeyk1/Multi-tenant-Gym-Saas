import clsx from 'clsx';
import { DEMO_GYM, DEMO_RENEWALS, DEMO_STATS, type RenewalTag } from '@/lib/demo-data';

const NAV_ITEMS = ['Dashboard', 'Renewals', 'Check-ins', 'Members', 'AI Insights'];
const ACTIVE_NAV_ITEM = 'Renewals';

const TAG_CLASS: Record<RenewalTag, string> = {
  soon: 'bg-warning-bg text-warning',
  expired: 'bg-danger-bg text-danger',
  upcoming: 'bg-tint text-code',
};

export function RenewalsDashboard({ className }: { className?: string }) {
  return (
    <div
      className={clsx(
        'flex overflow-hidden sm:min-h-[380px] rounded-2xl bg-white text-xs shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_30px_80px_rgba(0,0,0,0.45),0_0_120px_rgba(59,130,246,0.25)]',
        className,
      )}
    >
      <div className="hidden w-[150px] flex-none flex-col gap-1.5 border-r border-line px-2.5 py-3.5 text-ink-secondary sm:flex">
        <div className="flex items-center gap-1.5 rounded-lg border border-line p-1.5 font-semibold text-ink">
          <span className="h-[18px] w-[18px] flex-none rounded-[5px]" style={{ backgroundColor: DEMO_GYM.color }} />
          <span className="truncate">{DEMO_GYM.name}</span>
        </div>
        {NAV_ITEMS.map((item) => (
          <span
            key={item}
            className={clsx('rounded-lg px-2 py-[7px]', item === ACTIVE_NAV_ITEM && 'bg-tint font-semibold text-code')}
          >
            {item}
          </span>
        ))}
      </div>

      <div className="flex flex-1 flex-col gap-3 bg-cloud p-4">
        <div className="flex items-center justify-between">
          <span className="font-display text-lg font-extrabold text-ink">Renewals</span>
          <span className="rounded-lg bg-code px-2.5 py-1.5 text-[11px] font-semibold text-white">Remind all</span>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div className="rounded-[10px] bg-navy p-3 text-[10px] text-ink-on-navy">
            DUE THIS WEEK
            <div className="font-display text-[26px] font-extrabold text-sky">{DEMO_STATS.dueThisWeek}</div>
          </div>
          <div className="rounded-[10px] border border-line bg-white p-3 text-[10px] text-ink-secondary">
            EXPIRED
            <div className="font-display text-[26px] font-extrabold text-ink">{DEMO_STATS.expired}</div>
          </div>
        </div>

        <div className="overflow-hidden rounded-[10px] border border-line bg-white">
          <div className="px-2.5 py-[9px] text-[10px] font-semibold tracking-eyebrow text-ink-secondary">EXPIRING SOON</div>
          {DEMO_RENEWALS.map((renewal) => (
            <div key={renewal.name} className="flex items-center gap-2.5 border-t border-line px-2.5 py-[9px]">
              <span className="h-[26px] w-[26px] flex-none rounded-full bg-cloud" />
              <span className="flex-1 truncate text-ink">{renewal.name}</span>
              <span className={clsx('rounded-full px-2 py-0.5 text-[10px] font-semibold', TAG_CLASS[renewal.tag])}>
                {renewal.label}
              </span>
              <span className="rounded-md border border-line px-2 py-1 text-[10px] font-semibold text-ink">Remind</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
