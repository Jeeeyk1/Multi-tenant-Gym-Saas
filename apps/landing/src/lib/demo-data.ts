// Fictional demo data. Gym names stay generic: natural-sounding ones all belonged to real gyms.

export const DEMO_GYM = {
  name: 'Your Gym',
  color: '#FFC20E',
};

export const DEMO_MEMBER = {
  firstName: 'Ana',
  shortName: 'Ana R.',
};

export type RenewalTag = 'soon' | 'expired' | 'upcoming';

export const DEMO_RENEWALS: { name: string; label: string; tag: RenewalTag }[] = [
  { name: 'Ana Reyes', label: '2 days', tag: 'soon' },
  { name: 'Marco Santos', label: '3 days', tag: 'soon' },
  { name: 'Kelly Torres', label: 'Expired', tag: 'expired' },
  { name: 'Ben Cruz', label: '6 days', tag: 'upcoming' },
];

export const DEMO_STATS = {
  dueThisWeek: 12,
  expired: 3,
  checkInsToday: 87,
  streakDays: 12,
};

export const DEMO_BRANDED_GYMS = [
  { name: 'Gym A', monogram: 'A', color: '#814CA2', colorLabel: 'Purple' },
  { name: 'Gym B', monogram: 'B', color: DEMO_GYM.color, colorLabel: 'Gold and black' },
  { name: 'Gym C', monogram: 'C', color: '#E30613', colorLabel: 'Red' },
];

export const SHOWCASE_GYM = DEMO_BRANDED_GYMS[1];

export const DEMO_MEMBERSHIP = {
  plan: 'Monthly Unlimited',
  expires: 'Aug 14',
  daysLeft: 18,
  recentVisits: [
    { date: 'Mon, Jul 27', duration: '54 min' },
    { date: 'Sat, Jul 25', duration: '61 min' },
  ],
};

export const DEMO_WORKOUT = {
  name: 'Leg day',
  summary: '45 min · strength focus',
  exercises: [
    { name: 'Back Squat', sets: '4 sets · 6 reps' },
    { name: 'Romanian Deadlift', sets: '3 sets · 10 reps' },
    { name: 'Leg Press', sets: '3 sets · 12 reps' },
  ],
};

export const DEMO_LEADERBOARD = {
  viewerRank: 4,
  rows: [
    { rank: 1, name: 'Ana R.', points: '2,450', isViewer: false },
    { rank: 2, name: 'Marco S.', points: '2,100', isViewer: false },
    { rank: 3, name: 'Kelly T.', points: '1,890', isViewer: false },
    { rank: 4, name: 'You', points: '1,650', isViewer: true },
  ],
  badges: ['7-Day Streak', 'Power User', 'Iron Warrior'],
};

export const DEMO_WEEKLY_CHECK_INS = {
  // Bar heights in % of the peak day, Monday to Sunday.
  bars: [45, 60, 50, 70, 55, 100, 65],
  peakDay: 'Saturday',
  averagePerDay: 72,
};
