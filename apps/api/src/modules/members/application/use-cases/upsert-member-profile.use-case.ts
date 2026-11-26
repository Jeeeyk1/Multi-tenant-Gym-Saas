import { Injectable } from '@nestjs/common';
import { NotFoundError } from '../../../../common/errors';
import { MembersRepository } from '../../infrastructure/persistence/members.repository';
import { staffProfileUpdateFromDto, staffVisibleProfile } from '../member-profile';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';
import type { UpsertMyProfileDto } from '../../presentation/dto/upsert-my-profile.dto';
import { assertGymAccess, assertPermission } from '../../../../common/auth/authorization';
import { Permission } from '../../../../common/enums';

@Injectable()
export class UpsertMemberProfileUseCase {
  constructor(private readonly repo: MembersRepository) {}

  async execute(gymId: string, memberId: string, dto: UpsertMyProfileDto, caller: AuthenticatedUser) {
    assertGymAccess(caller, gymId);
    assertPermission(caller, Permission.MEMBERS_EDIT);

    const member = await this.repo.findMemberById(memberId, gymId);
    if (!member) throw new NotFoundError('Member not found', 'MEMBER_NOT_FOUND');

    const profile = await this.repo.upsertMyProfile(memberId, staffProfileUpdateFromDto(dto));
    return staffVisibleProfile(profile);
  }
}
