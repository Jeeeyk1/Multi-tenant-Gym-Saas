import { Injectable } from '@nestjs/common';
import { ConflictError, ForbiddenError, NotFoundError } from '../../../../common/errors';
import { CheckInsRepository } from '../../infrastructure/persistence/check-ins.repository';
import { isOutOfHours } from '../../domain/schedule-validator';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';

const VALID_METHODS = ['MANUAL_STAFF', 'QR_STAFF_SCAN', 'QR_SELF_SCAN', 'APP_SELF_CHECKIN'] as const;
type CheckInMethod = (typeof VALID_METHODS)[number];

const STAFF_METHODS: CheckInMethod[] = ['MANUAL_STAFF', 'QR_STAFF_SCAN'];
const SELF_METHODS: CheckInMethod[] = ['QR_SELF_SCAN', 'APP_SELF_CHECKIN'];

export interface CheckInInput {
  method: string;
  /** Required for MANUAL_STAFF */
  memberId?: string;
  /** Required for QR_STAFF_SCAN */
  qrCodeToken?: string;
}

@Injectable()
export class CheckInUseCase {
  constructor(private readonly repo: CheckInsRepository) {}

  async execute(gymId: string, input: CheckInInput, caller: AuthenticatedUser) {
    assertGymAccess(caller, gymId);

    const method = input.method as CheckInMethod;
    const isStaffMethod = (STAFF_METHODS as string[]).includes(method);
    const isSelfMethod = (SELF_METHODS as string[]).includes(method);

    if (isStaffMethod) {
      assertPermission(caller, 'checkins.manage');
    } else if (isSelfMethod) {
      assertPermission(caller, 'checkins.self');
    }

    // Load gym context (timezone, schedules, auto_checkout_hours)
    const gym = await this.repo.findGymForCheckin(gymId);
    if (!gym || gym.status !== 'ACTIVE') {
      throw new NotFoundError('Gym not found or inactive', 'GYM_NOT_FOUND');
    }

    // Resolve member record
    const member = await this.resolveMember(gymId, method, input, caller);
    if (!member) {
      throw new NotFoundError('Member not found in this gym', 'MEMBER_NOT_FOUND');
    }

    // Validate membership
    if (member.status !== 'ACTIVE') {
      throw new ForbiddenError(
        `Member is not active (status: ${member.status})`,
        'MEMBER_NOT_ACTIVE',
      );
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (new Date(member.expiryDate) < today) {
      throw new ForbiddenError('Membership has expired', 'MEMBERSHIP_EXPIRED');
    }

    // Handle existing active check-in
    const existing = await this.repo.findActiveCheckin(member.id);
    if (existing) {
      const staleThreshold = new Date(Date.now() - gym.autoCheckoutHours * 60 * 60 * 1000);
      if (existing.checkedInAt < staleThreshold) {
        // Stale — auto-close before creating new check-in
        await this.repo.closeCheckin(existing.id, true);
      } else {
        throw new ConflictError('Member is already checked in', 'ALREADY_CHECKED_IN');
      }
    }

    const outOfHours = isOutOfHours(gym, new Date(), gym.timezone);
    const processedBy = isStaffMethod ? caller.sub : null;

    return this.repo.createCheckin({
      memberId: member.id,
      gymId,
      method,
      processedBy,
      isOutOfHours: outOfHours,
    });
  }

  private async resolveMember(
    gymId: string,
    method: CheckInMethod,
    input: CheckInInput,
    caller: AuthenticatedUser,
  ) {
    switch (method) {
      case 'MANUAL_STAFF': {
        if (!input.memberId) {
          throw new ForbiddenError('memberId is required for MANUAL_STAFF', 'MISSING_MEMBER_ID');
        }
        return this.repo.findMemberForCheckin(input.memberId, gymId);
      }
      case 'QR_STAFF_SCAN': {
        if (!input.qrCodeToken) {
          throw new ForbiddenError(
            'qrCodeToken is required for QR_STAFF_SCAN',
            'MISSING_QR_TOKEN',
          );
        }
        return this.repo.findMemberByQrToken(input.qrCodeToken, gymId);
      }
      case 'QR_SELF_SCAN':
      case 'APP_SELF_CHECKIN': {
        return this.repo.findMemberByUserId(caller.sub, gymId);
      }
    }
  }
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
