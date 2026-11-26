import { Injectable } from '@nestjs/common';
import { EmailService } from '../../../../common/email/email.service';
import { ConflictError, ForbiddenError, NotFoundError } from '../../../../common/errors';
import { MembersRepository } from '../../infrastructure/persistence/members.repository';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';
import { assertGymAccess, assertPermission } from '../../../../common/auth/authorization';
import { Permission } from '../../../../common/enums';

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
  constructor(
    private readonly repo: MembersRepository,
    private readonly email: EmailService,
  ) {}

  async execute(gymId: string, input: RegisterMemberInput, caller: AuthenticatedUser) {
    assertGymAccess(caller, gymId);
    assertPermission(caller, Permission.MEMBERS_CREATE);

    const gym = await this.repo.findGymById(gymId);
    if (!gym) throw new NotFoundError('Gym not found', 'GYM_NOT_FOUND');

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

    const existingUser = await this.repo.findUserByEmail(input.email);
    if (existingUser) {
      throw new ConflictError('Email is already in use', 'EMAIL_TAKEN');
    }

    const result = await this.repo.registerMember({
      gymId,
      email: input.email,
      fullName: input.fullName,
      phone: input.phone,
      planId: input.planId,
      expiryDate,
    });

    await this.email.sendMemberInvite({
      to: input.email,
      fullName: input.fullName,
      gymName: gym.name,
      gymCode: gym.code,
      token: result.inviteToken,
    });

    return result;
  }
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}
