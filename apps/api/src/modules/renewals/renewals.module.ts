import { Module } from '@nestjs/common';
import { RenewalsRepository } from './infrastructure/persistence/renewals.repository';
import { RenewMembershipUseCase } from './application/use-cases/renew-membership.use-case';
import { ListRenewalsUseCase } from './application/use-cases/list-renewals.use-case';
import { RenewalsController } from './presentation/controllers/renewals.controller';

@Module({
  controllers: [RenewalsController],
  providers: [RenewalsRepository, RenewMembershipUseCase, ListRenewalsUseCase],
})
export class RenewalsModule {}
