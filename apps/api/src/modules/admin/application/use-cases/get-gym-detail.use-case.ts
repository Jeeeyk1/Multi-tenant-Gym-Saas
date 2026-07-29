import { Injectable } from '@nestjs/common';
import { NotFoundError } from '../../../../common/errors';
import { SubscriptionStatus } from '../../../../common/enums';
import { AdminRepository } from '../../infrastructure/persistence/admin.repository';

@Injectable()
export class GetGymDetailUseCase {
  constructor(private readonly repo: AdminRepository) {}

  async execute(gymId: string) {
    const gym = await this.repo.getGymById(gymId);
    if (!gym) throw new NotFoundError('Gym not found');

    const { organization, ...rest } = gym;
    const ownerActivated = !!organization.members[0]?.user.emailVerifiedAt;
    const sub = organization.subscriptions[0] ?? null;
    const activeMemberCount = await this.repo.countActiveMembers(gymId);

    return {
      ...rest,
      organization: { id: organization.id, name: organization.name, slug: organization.slug },
      ownerActivated,
      subscription: sub ? { status: sub.status, currentPeriodEnd: sub.currentPeriodEnd } : null,
      activeMemberCount,
      // Trials are unlimited regardless of the provisioned plan's cap, and -1 is the DB's
      // "unlimited" sentinel for enterprise-tier plans — both surface as null so the frontend
      // only has one "no cap" shape to handle.
      memberCap:
        sub && sub.status !== SubscriptionStatus.TRIALING && sub.plan.maxMembersPerGym >= 0
          ? sub.plan.maxMembersPerGym
          : null,
    };
  }
}
