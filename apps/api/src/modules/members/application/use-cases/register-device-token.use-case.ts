import { Injectable } from '@nestjs/common';
import { MembersRepository } from '../../infrastructure/persistence/members.repository';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';
import type { RegisterDeviceTokenDto } from '../../presentation/dto/register-device-token.dto';

@Injectable()
export class RegisterDeviceTokenUseCase {
  constructor(private readonly membersRepository: MembersRepository) {}

  execute(dto: RegisterDeviceTokenDto, user: AuthenticatedUser): Promise<void> {
    return this.membersRepository.upsertDeviceToken(user.sub, dto.token, dto.platform);
  }
}
