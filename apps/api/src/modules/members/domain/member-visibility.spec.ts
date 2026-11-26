import { visibleMember } from './member-visibility';
import type { AuthenticatedUser } from '../../../common/types/auth.types';

const caller = (permissions: string[]): AuthenticatedUser => ({ sub: 'u', type: 'gym', gymId: 'g', roles: [], permissions });
const member = {
  id: 'm1',
  status: 'ACTIVE',
  membershipNumber: 'MBR-1',
  expiryDate: new Date(),
  user: { id: 'u1', fullName: 'Ana Cruz', email: 'ana@example.com', phone: '0917' },
  membershipPlan: { id: 'p1', name: 'Monthly', price: 1500 },
};

describe('visibleMember', () => {
  it('shows trainers (no members.details) only the name and status', () => {
    expect(visibleMember(member, caller(['members.view']))).toEqual({
      id: 'm1',
      status: 'ACTIVE',
      user: { id: 'u1', fullName: 'Ana Cruz' },
    });
  });

  it('shows staff with members.details everything', () => {
    expect(visibleMember(member, caller(['members.view', 'members.details']))).toBe(member);
  });
});
