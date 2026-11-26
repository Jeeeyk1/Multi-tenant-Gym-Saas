/** Gym staff role names — must match the rows seeded in `roles` (migration 0051). */
export enum StaffRole {
  OWNER = 'OWNER',
  STAFF = 'STAFF',
  TRAINER = 'TRAINER',
}

/** Not a stored role: added to the token of anyone who also has a membership at the gym. */
export const MEMBER_ROLE = 'MEMBER';
