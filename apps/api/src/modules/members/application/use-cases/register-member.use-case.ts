import { Injectable } from '@nestjs/common';
import { ConflictError, ForbiddenError, NotFoundError } from '../../../../common/errors';
import { MembersRepository } from '../../infrastructure/persistence/members.repository';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';

export interface RegisterMemberInput {
  email: string;
  fullName: string;
  phone?: string;
  planId?: string;
  /** Required when planId is not provided. Format: YYYY-MM-DD */
  expiryDate?: string;
}

@Injectable()
export class RegisterMemberUseCase {
  constructor(private readonly repo: MembersRepository) {}

  async execute(gymId: string, input: RegisterMemberInput, caller: AuthenticatedUser) {
    assertGymAccess(caller, gymId);
    assertPermission(caller, 'members.create');

    // Resolve expiry date
    let expiryDate: Date;
    if (input.planId) {
      const plan = await this.repo.findPlanById(input.planId, gymId);
      if (!plan) {
        throw new NotFoundError('Membership plan not found or inactive', 'PLAN_NOT_FOUND');
      }
      expiryDate = addDays(new Date(), plan.durationDays);
    } else if (input.expiryDate) {
      expiryDate = new Date(input.expiryDate);
    } else {
      throw new ForbiddenError(
        'Either planId or expiryDate must be provided',
        'MISSING_EXPIRY',
      );
    }

    // Check email uniqueness
    const existingUser = await this.repo.findUserByEmail(input.email);
    if (existingUser) {
      throw new ConflictError('Email is already in use', 'EMAIL_TAKEN');
    }

    // MVP: return invite token directly. Production: relay via email.
    return this.repo.registerMember({
      gymId,
      email: input.email,
      fullName: input.fullName,
      phone: input.phone,
      planId: input.planId,
      expiryDate,
    });
  }
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function assertGymAccess(caller: AuthenticatedUser, gymId: string) {
  if (caller.type === 'gym' && caller.gymId !== gymId) {
    throw new ForbiddenError('Access denied to this gym', 'GYM_ACCESS_DENIED');
  }
}

function assertPermission(caller: AuthenticatedUser, permission: string) {
  if (caller.type === 'gym' && !caller.permissions.includes(permission)) {
    throw new ForbiddenError(`Missing permission: ${permission}`, 'PERMISSION_DENIED');
  }
}
