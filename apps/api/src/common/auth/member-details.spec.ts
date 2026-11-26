import { withoutMemberDetails } from './member-details';
import type { AuthenticatedUser } from '../types/auth.types';

const caller = (permissions: string[]): AuthenticatedUser => ({ sub: 'u', type: 'gym', gymId: 'g', roles: [], permissions });
const rows = [{ id: 'c1', member: { id: 'm1', membershipNumber: 'MBR-1', user: { id: 'u1', fullName: 'Ana' } } }];

describe('withoutMemberDetails', () => {
  it('removes the membership number for trainers', () => {
    expect(withoutMemberDetails(rows, caller(['checkins.view']))).toEqual([
      { id: 'c1', member: { id: 'm1', user: { id: 'u1', fullName: 'Ana' } } },
    ]);
  });

  it('keeps it for staff with members.details', () => {
    expect(withoutMemberDetails(rows, caller(['members.details']))).toBe(rows);
  });
});
