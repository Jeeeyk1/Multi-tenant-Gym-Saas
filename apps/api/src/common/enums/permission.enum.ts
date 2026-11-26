/**
 * Permission keys. Staff keys match the `permissions` table (db/seeds/002_permissions.sql); `checkins.self` and
 * `announcements.view` are granted to every member at login (gym-login.use-case.ts) and aren't stored.
 */
export enum Permission {
  /** The member list and badges: name and status. */
  MEMBERS_VIEW = 'members.view',
  /** Contact details, plan, prices, renewals and payments. Trainers don't have it. */
  MEMBERS_DETAILS = 'members.details',
  MEMBERS_CREATE = 'members.create',
  MEMBERS_EDIT = 'members.edit',
  MEMBERS_RENEW = 'members.renew',
  MEMBERS_SUSPEND = 'members.suspend',
  MEMBERS_MANAGE = 'members.manage',
  MEMBERS_DELETE = 'members.delete',
  CHECKINS_VIEW = 'checkins.view',
  CHECKINS_MANAGE = 'checkins.manage',
  CHECKINS_SELF = 'checkins.self',
  REPORTS_VIEW = 'reports.view',
  STAFF_VIEW = 'staff.view',
  STAFF_MANAGE = 'staff.manage',
  ANNOUNCEMENTS_VIEW = 'announcements.view',
  ANNOUNCEMENTS_MANAGE = 'announcements.manage',
  CHAT_MANAGE = 'chat.manage',
  PLANS_VIEW = 'plans.view',
  GYM_SETTINGS = 'gym.settings',
  LEADERBOARD_VIEW = 'leaderboard.view',
  LEADERBOARD_SUBMIT = 'leaderboard.submit',
  LEADERBOARD_REVIEW = 'leaderboard.review',
  LEADERBOARD_MANAGE = 'leaderboard.manage',
  BADGES_MANAGE = 'badges.manage',
  BADGES_AWARD = 'badges.award',
  INSIGHTS_QUERY = 'insights.query',
  BILLING_MANAGE = 'billing.manage',
}
