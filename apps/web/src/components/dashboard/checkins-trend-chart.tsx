'use client';

import { useState, useTransition } from 'react';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { getCheckinsTrend } from '@/lib/actions/reports';
import { cn } from '@/lib/utils';
import type { CheckinsTrendPoint } from '@/types/api';

type RangeOption = 7 | 30;

function formatDayLabel(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export function CheckinsTrendChart({
  gymId,
  initialData,
}: {
  gymId: string;
  initialData: CheckinsTrendPoint[];
}) {
  const [range, setRange] = useState<RangeOption>(7);
  const [data, setData] = useState(initialData);
  const [isPending, startTransition] = useTransition();

  const handleRangeChange = (next: RangeOption) => {
    if (next === range) return;
    setRange(next);
    startTransition(async () => {
      const trend = await getCheckinsTrend(gymId, next);
      setData(trend);
    });
  };

  const chartData = data.map((point) => ({ ...point, label: formatDayLabel(point.date) }));

  return (
    <div className="bg-surface border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Check-ins Trend
        </h2>
        <div className="flex items-center gap-1 bg-background border border-border rounded-lg p-1">
          {([7, 30] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => handleRangeChange(option)}
              className={cn(
                'px-3 py-1 text-xs font-medium rounded-md transition-colors',
                range === option
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {option}d
            </button>
          ))}
        </div>
      </div>

      <div className={cn('h-56 transition-opacity', isPending && 'opacity-50')}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              interval={range === 30 ? 4 : 0}
            />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={28} />
            <Tooltip
              cursor={{ fill: 'hsl(var(--border))' }}
              contentStyle={{ fontSize: 12 }}
              formatter={(value) => [value, 'Check-ins']}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]} fill="hsl(var(--primary))" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
