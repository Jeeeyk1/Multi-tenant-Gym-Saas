import { Module } from '@nestjs/common';
import { StaffController } from './presentation/controllers/staff.controller';
import { InviteStaffUseCase } from './application/use-cases/invite-staff.use-case';
import { DeactivateStaffUseCase } from './application/use-cases/deactivate-staff.use-case';
import { AssignRoleUseCase } from './application/use-cases/assign-role.use-case';
import { RemoveRoleUseCase } from './application/use-cases/remove-role.use-case';
import { ListStaffUseCase } from './application/use-cases/list-staff.use-case';
import { StaffRepository } from './infrastructure/persistence/staff.repository';

@Module({
  controllers: [StaffController],
  providers: [
    StaffRepository,
    InviteStaffUseCase,
    DeactivateStaffUseCase,
    AssignRoleUseCase,
    RemoveRoleUseCase,
    ListStaffUseCase,
  ],
})
export class StaffModule {}
