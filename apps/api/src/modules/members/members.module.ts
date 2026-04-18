import { Module } from '@nestjs/common';
import { MembersRepository } from './infrastructure/persistence/members.repository';
import { RegisterMemberUseCase } from './application/use-cases/register-member.use-case';
import { ListMembersUseCase } from './application/use-cases/list-members.use-case';
import { GetMemberUseCase } from './application/use-cases/get-member.use-case';
import { SuspendMemberUseCase } from './application/use-cases/suspend-member.use-case';
import { ReactivateMemberUseCase } from './application/use-cases/reactivate-member.use-case';
import { GetMemberQrUseCase } from './application/use-cases/get-member-qr.use-case';
import { MembersController } from './presentation/controllers/members.controller';

@Module({
  controllers: [MembersController],
  providers: [
    MembersRepository,
    RegisterMemberUseCase,
    ListMembersUseCase,
    GetMemberUseCase,
    SuspendMemberUseCase,
    ReactivateMemberUseCase,
    GetMemberQrUseCase,
  ],
  exports: [MembersRepository],
})
export class MembersModule {}
