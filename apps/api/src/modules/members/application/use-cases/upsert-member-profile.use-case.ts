import { Injectable } from '@nestjs/common';
import { ForbiddenError, NotFoundError } from '../../../../common/errors';
import { MembersRepository } from '../../infrastructure/persistence/members.repository';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';
import type { UpsertMyProfileDto } from '../../presentation/dto/upsert-my-profile.dto';

@Injectable()
export class UpsertMemberProfileUseCase {
  constructor(private readonly repo: MembersRepository) {}

  async execute(gymId: string, memberId: string, dto: UpsertMyProfileDto, caller: AuthenticatedUser) {
    if (caller.type === 'gym' && caller.gymId !== gymId) {
      throw new ForbiddenError('Access denied to this gym', 'GYM_ACCESS_DENIED');
    }
    if (caller.type === 'gym' && !caller.permissions.includes('members.edit')) {
      throw new ForbiddenError('Missing permission: members.edit', 'PERMISSION_DENIED');
    }

    const member = await this.repo.findMemberById(memberId, gymId);
    if (!member) throw new NotFoundError('Member not found', 'MEMBER_NOT_FOUND');

    return this.repo.upsertMyProfile(memberId, {
      age: dto.age,
      weightKg: dto.weightKg,
      heightCm: dto.heightCm,
      fitnessGoal: dto.fitnessGoal,
      activityLevel: dto.activityLevel,
      onboardingDone: dto.onboardingDone,
    });
  }
}
