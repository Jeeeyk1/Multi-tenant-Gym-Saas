import { Module } from '@nestjs/common';
import { MembersRepository } from './infrastructure/persistence/members.repository';
import { RegisterMemberUseCase } from './application/use-cases/register-member.use-case';
import { ListMembersUseCase } from './application/use-cases/list-members.use-case';
import { GetMemberUseCase } from './application/use-cases/get-member.use-case';
import { GetMyMemberUseCase } from './application/use-cases/get-my-member.use-case';
import { GetMyProfileUseCase } from './application/use-cases/get-my-profile.use-case';
import { UpsertMyProfileUseCase } from './application/use-cases/upsert-my-profile.use-case';
import { GetMemberProfileUseCase } from './application/use-cases/get-member-profile.use-case';
import { UpsertMemberProfileUseCase } from './application/use-cases/upsert-member-profile.use-case';
import { LogWeightUseCase } from './application/use-cases/log-weight.use-case';
import { ListWeightLogsUseCase } from './application/use-cases/list-weight-logs.use-case';
import { SuspendMemberUseCase } from './application/use-cases/suspend-member.use-case';
import { ReactivateMemberUseCase } from './application/use-cases/reactivate-member.use-case';
import { GetMemberQrUseCase } from './application/use-cases/get-member-qr.use-case';
import { RegisterDeviceTokenUseCase } from './application/use-cases/register-device-token.use-case';
import { MembersController } from './presentation/controllers/members.controller';

@Module({
  controllers: [MembersController],
  providers: [
    MembersRepository,
    RegisterMemberUseCase,
    ListMembersUseCase,
    GetMemberUseCase,
    GetMyMemberUseCase,
    GetMyProfileUseCase,
    UpsertMyProfileUseCase,
    GetMemberProfileUseCase,
    UpsertMemberProfileUseCase,
    LogWeightUseCase,
    ListWeightLogsUseCase,
    SuspendMemberUseCase,
    ReactivateMemberUseCase,
    GetMemberQrUseCase,
    RegisterDeviceTokenUseCase,
  ],
  exports: [MembersRepository],
})
export class MembersModule {}
