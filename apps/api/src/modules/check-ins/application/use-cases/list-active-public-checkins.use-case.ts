import { Injectable } from '@nestjs/common';
import { CheckInsRepository } from '../../infrastructure/persistence/check-ins.repository';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';
import { assertGymAccess } from '../../../../common/auth/authorization';

export interface PublicActiveCheckinsResult {
  totalCount: number;
  visible: {
    memberId: string;
    userId: string;
    fullName: string;
    checkedInAt: Date;
  }[];
}

/**
 * Member-facing "who's currently checked in" view.
 * Returns the total count of active check-ins plus the subset of members who
 * have opted in to display their identity (member_privacy.hide_checkin_visibility = false).
 */
@Injectable()
export class ListActivePublicCheckinsUseCase {
  constructor(private readonly repo: CheckInsRepository) {}

  async execute(gymId: string, caller: AuthenticatedUser): Promise<PublicActiveCheckinsResult> {
    assertGymAccess(caller, gymId);

    const rows = await this.repo.listActiveCheckins(gymId);

    const visible = rows
      .filter((r) => r.member.privacy?.hideCheckinVisibility !== true)
      .map((r) => ({
        memberId: r.member.id,
        userId: r.member.user.id,
        fullName: r.member.user.fullName,
        checkedInAt: r.checkedInAt,
      }));

    return { totalCount: rows.length, visible };
  }
}
