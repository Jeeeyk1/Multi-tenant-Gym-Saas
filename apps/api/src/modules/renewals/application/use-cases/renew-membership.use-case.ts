import { Injectable } from '@nestjs/common';
import { ForbiddenError, NotFoundError } from '../../../../common/errors';
import { RenewalsRepository } from '../../infrastructure/persistence/renewals.repository';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';
import { assertGymAccess, assertPermission } from '../../../../common/auth/authorization';
import { Permission } from '../../../../common/enums';

export interface RenewMembershipInput {
  planId?: string;
  amountPaid: number;
  paymentMethod?: string;
  notes?: string;
}

@Injectable()
export class RenewMembershipUseCase {
  constructor(private readonly repo: RenewalsRepository) {}

  async execute(
    gymId: string,
    memberId: string,
    input: RenewMembershipInput,
    caller: AuthenticatedUser,
  ) {
    assertGymAccess(caller, gymId);
    assertPermission(caller, Permission.MEMBERS_RENEW);

    const member = await this.repo.findMemberForRenewal(memberId, gymId);
    if (!member) {
      throw new NotFoundError('Member not found', 'MEMBER_NOT_FOUND');
    }

    let durationDays: number;
    let resolvedPlanId: string | undefined = input.planId;

    if (input.planId) {
      const plan = await this.repo.findPlanById(input.planId, gymId);
      if (!plan) {
        throw new NotFoundError('Membership plan not found or inactive', 'PLAN_NOT_FOUND');
      }
      durationDays = plan.durationDays;
    } else if (member.membershipPlanId) {
      // Renew with the same plan
      const plan = await this.repo.findPlanById(member.membershipPlanId, gymId);
      if (!plan) {
        throw new NotFoundError('Original plan is no longer available', 'PLAN_NOT_FOUND');
      }
      durationDays = plan.durationDays;
      resolvedPlanId = member.membershipPlanId;
    } else {
      throw new ForbiddenError(
        'planId is required when member has no assigned plan',
        'MISSING_PLAN_ID',
      );
    }

    const previousExpiry = member.expiryDate;
    const newExpiry = computeNewExpiry(member.status, member.expiryDate, durationDays);

    return this.repo.processRenewal({
      memberId,
      planId: resolvedPlanId,
      previousExpiry,
      newExpiry,
      amountPaid: input.amountPaid,
      paymentMethod: input.paymentMethod,
      notes: input.notes,
      renewedBy: caller.sub,
    });
  }
}

/**
 * If the member is still ACTIVE (expiry in future), extend from the current expiry.
 * Otherwise (EXPIRED or SUSPENDED), reset from today.
 */
function computeNewExpiry(status: string, currentExpiry: Date, durationDays: number): Date {
  const base = status === 'ACTIVE' && currentExpiry > new Date() ? currentExpiry : new Date();
  const result = new Date(base);
  result.setDate(result.getDate() + durationDays);
  return result;
}
