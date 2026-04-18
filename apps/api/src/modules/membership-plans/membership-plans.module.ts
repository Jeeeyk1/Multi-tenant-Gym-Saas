import { Module } from '@nestjs/common';
import { MembershipPlansRepository } from './infrastructure/persistence/membership-plans.repository';
import { CreatePlanUseCase } from './application/use-cases/create-plan.use-case';
import { UpdatePlanUseCase } from './application/use-cases/update-plan.use-case';
import { ListPlansUseCase } from './application/use-cases/list-plans.use-case';
import { MembershipPlansController } from './presentation/controllers/membership-plans.controller';

@Module({
  controllers: [MembershipPlansController],
  providers: [MembershipPlansRepository, CreatePlanUseCase, UpdatePlanUseCase, ListPlansUseCase],
  exports: [MembershipPlansRepository],
})
export class MembershipPlansModule {}
