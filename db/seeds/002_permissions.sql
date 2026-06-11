-- Seed : 002_permissions
-- Description: Granular permission keys — seeded once, grows only when new features are added
-- Idempotent: uses INSERT ... ON CONFLICT DO NOTHING

INSERT INTO permissions (key, description, module) VALUES
  -- Members module
  ('members.view',          'View member list and details',             'Members'),
  ('members.create',        'Register new member',                      'Members'),
  ('members.edit',          'Edit member details',                      'Members'),
  ('members.renew',         'Renew membership',                         'Members'),
  ('members.suspend',       'Suspend or reactivate a member',           'Members'),

  -- Check-ins module
  ('checkins.view',         'View check-in list and history',           'CheckIns'),
  ('checkins.manage',       'Manual check-in and check-out',            'CheckIns'),

  -- Reports module
  ('reports.view',          'View all reports',                         'Reports'),

  -- Staff module
  ('staff.view',            'View staff list',                          'Staff'),
  ('staff.manage',          'Add or remove staff, assign roles',        'Staff'),

  -- Announcements module
  ('announcements.manage',  'Create, edit, and publish announcements',  'Announcements'),

  -- Chat module
  ('chat.manage',           'Send and moderate community chat messages', 'Chat'),

  -- Plans module
  ('plans.view',            'View membership plans',                     'Plans'),

  -- Members extended
  ('members.manage',        'Full member management (suspend, renew)',   'Members'),

  -- Gym settings module
  ('gym.settings',          'Edit gym profile and settings',            'Gym'),

  -- Leaderboard module
  ('leaderboard.view',      'View leaderboard and rankings',            'Leaderboard'),
  ('leaderboard.submit',    'Submit a personal record to leaderboard',  'Leaderboard'),
  ('leaderboard.review',    'Approve or reject PR submissions',         'Leaderboard'),
  ('leaderboard.manage',    'Configure enabled exercises per gym',      'Leaderboard')

ON CONFLICT (key) DO NOTHING;
