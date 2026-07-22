import { Injectable } from '@nestjs/common';
import { NotFoundError } from '../../../../common/errors';
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

    return {
      ...rest,
      organization: { id: organization.id, name: organization.name, slug: organization.slug },
      ownerActivated,
      subscription: sub ? { status: sub.status, currentPeriodEnd: sub.currentPeriodEnd } : null,
    };
  }
}
