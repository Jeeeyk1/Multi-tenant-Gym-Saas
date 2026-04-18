import { Injectable } from '@nestjs/common';
import { ConflictError, ForbiddenError } from '../../../../common/errors';
import { StaffRepository } from '../../infrastructure/persistence/staff.repository';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';

export interface InviteStaffInput {
  email: string;
  fullName: string;
  phone?: string;
}

@Injectable()
export class InviteStaffUseCase {
  constructor(private readonly repo: StaffRepository) {}

  async execute(gymId: string, input: InviteStaffInput, caller: AuthenticatedUser) {
    assertGymAccess(caller, gymId);
    assertStaffManage(caller);

    // Check if a user with this email already exists
    const existingUser = await this.repo.findUserByEmail(input.email);

    if (existingUser) {
      // User exists — check if they're already a staff member at this gym
      const existingStaff = await this.repo.findStaffByUserId(existingUser.id, gymId);
      if (existingStaff) {
        throw new ConflictError(
          'This user is already a staff member at this gym',
          'STAFF_ALREADY_EXISTS',
        );
      }
    }

    const result = await this.repo.inviteStaff({
      gymId,
      email: input.email,
      fullName: input.fullName,
      phone: input.phone,
      existingUserId: existingUser?.id,
    });

    // MVP: return invite token directly. Production: relay via email.
    return {
      staffId: result.staffId,
      userId: result.userId,
      inviteToken: result.inviteToken,
    };
  }
}

function assertGymAccess(caller: AuthenticatedUser, gymId: string) {
  if (caller.type === 'gym' && caller.gymId !== gymId) {
    throw new ForbiddenError('Access denied to this gym', 'GYM_ACCESS_DENIED');
  }
}

function assertStaffManage(caller: AuthenticatedUser) {
  if (caller.type === 'gym' && !caller.permissions.includes('staff.manage')) {
    throw new ForbiddenError('Missing permission: staff.manage', 'PERMISSION_DENIED');
  }
}
