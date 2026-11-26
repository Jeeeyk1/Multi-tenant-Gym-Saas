import { Injectable } from '@nestjs/common';
import { NotFoundError } from '../../../../common/errors';
import { MembersRepository } from '../../infrastructure/persistence/members.repository';
import { profileUpdateFromDto } from '../member-profile';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';
import type { UpsertMyProfileDto } from '../../presentation/dto/upsert-my-profile.dto';
import { assertGymAccess } from '../../../../common/auth/authorization';

@Injectable()
export class UpsertMyProfileUseCase {
  constructor(private readonly repo: MembersRepository) {}

  async execute(gymId: string, dto: UpsertMyProfileDto, caller: AuthenticatedUser) {
    assertGymAccess(caller, gymId);

    const member = await this.repo.findMemberByUserId(gymId, caller.sub);
    if (!member) {
      throw new NotFoundError('Member record not found', 'MEMBER_NOT_FOUND');
    }

    const data = { ...profileUpdateFromDto(dto), healthCaution: dto.healthCaution };
    if (dto.healthDataConsent === false) {
      // Stop processing health data: saved plans go with the consent.
      return this.repo.withdrawHealthDataConsent(member.id, data);
    }
    if (dto.healthDataConsent === true) {
      // Keep the original consent time if consent was already given.
      const existing = await this.repo.findMyProfile(member.id);
      if (!existing?.healthDataConsentAt) data.healthDataConsentAt = new Date();
    }

    return this.repo.upsertMyProfile(member.id, data);
  }
}
