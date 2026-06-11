import { Module } from '@nestjs/common';
import { RenewalsRepository } from './infrastructure/persistence/renewals.repository';
import { RenewMembershipUseCase } from './application/use-cases/renew-membership.use-case';
import { ListRenewalsUseCase } from './application/use-cases/list-renewals.use-case';
import { ListGymRenewalsUseCase } from './application/use-cases/list-gym-renewals.use-case';
import { RenewalsController } from './presentation/controllers/renewals.controller';
import { GymRenewalsController } from './presentation/controllers/gym-renewals.controller';

@Module({
  controllers: [RenewalsController, GymRenewalsController],
  providers: [RenewalsRepository, RenewMembershipUseCase, ListRenewalsUseCase, ListGymRenewalsUseCase],
})
export class RenewalsModule {}
